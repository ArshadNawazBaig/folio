-- Automatic editor upload and versioned recovery for accounts and private 24-hour guests.
begin;
alter table public.cloud_documents alter column user_id drop not null;
alter table public.cloud_documents
  add column guest_hash text,
  add column expires_at timestamptz,
  add column workspace jsonb,
  add column workspace_write_id uuid,
  add column workspace_revision bigint not null default 0,
  add column workspace_size bigint generated always as (coalesce(octet_length(workspace::text),0)) stored,
  add constraint cloud_owner check (
    (user_id is not null and guest_hash is null and expires_at is null)
    or (user_id is null and guest_hash is not null and guest_hash ~ '^[a-f0-9]{64}$' and expires_at is not null)
  ),
  add constraint workspace_bound check (workspace_size <= 8388608);
create index cloud_documents_guest on public.cloud_documents(guest_hash,expires_at) where guest_hash is not null;

create function public.reserve_editor_workspace(actor uuid, guest text, file_id uuid, file_name text, file_size bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; used_count bigint; capacity bigint;
begin
  if (actor is null and (guest is null or guest !~ '^[a-f0-9]{64}$')) or file_size not between 1 and 52428800 or length(file_name) not between 5 and 160 then raise exception 'invalid_file'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(actor::text,guest),17));
  select * into doc from public.cloud_documents where id=file_id;
  if found then
    if not ((actor is not null and doc.user_id=actor) or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now())) then raise exception 'workspace_missing'; end if;
    if doc.size<>file_size or doc.name<>file_name or doc.status='deleting' then raise exception 'workspace_conflict'; end if;
    return to_jsonb(doc);
  end if;
  select coalesce(sum(case when status='ready' then size+workspace_size else 52428800+workspace_size end),0),count(*) into used_bytes,used_count
    from public.cloud_documents where (actor is not null and user_id=actor) or (actor is null and guest_hash=guest and expires_at>now());
  capacity := case when actor is null then 104857600 else 524288000 end;
  if used_bytes+52428800>capacity or used_count>=(case when actor is null then 4 else 200 end) then raise exception 'storage_limit'; end if;
  insert into public.cloud_documents(id,user_id,guest_hash,expires_at,name,object_path,size)
    values(file_id,actor,case when actor is null then guest end,case when actor is null then now()+interval '24 hours' end,file_name,
      coalesce(actor::text,'guest-'||guest)||'/'||file_id::text||'.pdf',file_size) returning * into doc;
  return to_jsonb(doc);
end;
$$;
-- Existing account-library reservations share the same quota and now count saved editor state.
create or replace function public.reserve_cloud_document(actor uuid, file_name text, file_size bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin return public.reserve_editor_workspace(actor,null,gen_random_uuid(),file_name,file_size); end;
$$;

create function public.save_editor_workspace(actor uuid, guest text, document_id uuid, expected_revision bigint, snapshot jsonb, file_name text, write_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; payload_size bigint; capacity bigint;
begin
  select * into doc from public.cloud_documents where id=document_id;
  if not found or not (coalesce(doc.user_id=actor,false) or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now())) then raise exception 'workspace_missing'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(doc.user_id::text,doc.guest_hash),17));
  select * into doc from public.cloud_documents where id=document_id for update;
  if not found or not (coalesce(doc.user_id=actor,false) or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now())) then raise exception 'workspace_missing'; end if;
  if doc.status='ready' and doc.workspace_write_id=write_id then
    return jsonb_build_object('revision',doc.workspace_revision,'updatedAt',doc.updated_at,'expiresAt',doc.expires_at);
  end if;
  if doc.status<>'ready' or doc.workspace_revision<>expected_revision then raise exception 'workspace_conflict'; end if;
  payload_size := octet_length(snapshot::text);
  if payload_size>8388608 or jsonb_typeof(snapshot)<>'object' or length(file_name) not between 5 and 160 then raise exception 'invalid_workspace'; end if;
  select coalesce(sum(case when status='ready' then size+workspace_size else 52428800+workspace_size end),0) into used_bytes
    from public.cloud_documents where (doc.user_id is not null and user_id=doc.user_id) or (doc.user_id is null and guest_hash=doc.guest_hash and expires_at>now());
  capacity := case when doc.user_id is null then 104857600 else 524288000 end;
  if used_bytes-doc.workspace_size+payload_size>capacity then raise exception 'storage_limit'; end if;
  update public.cloud_documents set workspace=snapshot,workspace_write_id=write_id,workspace_revision=workspace_revision+1,name=file_name,updated_at=now() where id=document_id returning * into doc;
  return jsonb_build_object('revision',doc.workspace_revision,'updatedAt',doc.updated_at,'expiresAt',doc.expires_at);
end;
$$;

create function public.claim_editor_workspace(actor uuid, guest text, document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; used_count bigint;
begin
  if actor is null then raise exception 'workspace_missing'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(guest,''),17));
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  select * into doc from public.cloud_documents where id=document_id for update;
  if not found or doc.status='deleting' then raise exception 'workspace_missing'; end if;
  if doc.user_id=actor then return; end if;
  if doc.user_id is not null or doc.guest_hash is distinct from guest or doc.expires_at<=now() then raise exception 'workspace_missing'; end if;
  select coalesce(sum(case when status='ready' then size+workspace_size else 52428800+workspace_size end),0),count(*) into used_bytes,used_count from public.cloud_documents where user_id=actor;
  if used_bytes+(case when doc.status='ready' then doc.size else 52428800 end)+doc.workspace_size>524288000 or used_count>=200 then raise exception 'storage_limit'; end if;
  update public.cloud_documents set user_id=actor,guest_hash=null,expires_at=null,updated_at=now() where id=document_id;
end;
$$;
revoke all on function public.reserve_editor_workspace(uuid,text,uuid,text,bigint), public.save_editor_workspace(uuid,text,uuid,bigint,jsonb,text,uuid), public.claim_editor_workspace(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_editor_workspace(uuid,text,uuid,text,bigint), public.save_editor_workspace(uuid,text,uuid,bigint,jsonb,text,uuid), public.claim_editor_workspace(uuid,text,uuid) to service_role;
commit;
