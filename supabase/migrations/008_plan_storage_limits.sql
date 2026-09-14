-- Apply after 001–007. Existing files are preserved, including over-limit accounts.
begin;

create function public.account_storage_limit(actor uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select case when exists(
    select 1 from public.billing_subscriptions where user_id=actor
      and status in ('active','trialing') and paid_until>now() and current_period_end>now()
  ) or exists(select 1 from public.access_grants where user_id=actor and until_at>now())
    then 1073741824::bigint else 104857600::bigint end;
$$;

-- Reservations count the exact PDF size. Actual stored bytes protect against
-- oversized legacy uploads. Recovery drafts and unreferenced account files count too.
create function public.account_storage_used(actor uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(greatest(d.size,coalesce((o.metadata->>'size')::bigint,0))+d.workspace_size)
    from public.cloud_documents d left join storage.objects o
      on o.bucket_id='folio-documents' and o.name=d.object_path where d.user_id=actor),0)::bigint
    + coalesce((select sum(coalesce((o.metadata->>'size')::bigint,
        case when o.bucket_id='folio-recovery' then 41943040 else 52428800 end))
      from storage.objects o where o.bucket_id in ('folio-documents','folio-recovery')
        and split_part(o.name,'/',1)=actor::text
        and not (o.bucket_id='folio-documents' and exists(
          select 1 from public.cloud_documents d where d.object_path=o.name))),0)::bigint;
$$;

create function public.account_storage_status(actor uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('limit',capacity,'used',used_bytes,'available',greatest(0,capacity-used_bytes),
    'full',used_bytes>=capacity,'recovery',coalesce((select jsonb_agg(jsonb_build_object(
      'slot',split_part(split_part(name,'/',2),'.',1),'size',coalesce((metadata->>'size')::bigint,41943040)))
      from storage.objects where bucket_id='folio-recovery' and split_part(name,'/',1)=actor::text),'[]'::jsonb))
  from (select public.account_storage_limit(actor) capacity,public.account_storage_used(actor) used_bytes) totals;
$$;
revoke all on function public.account_storage_limit(uuid),public.account_storage_used(uuid),public.account_storage_status(uuid) from public,anon,authenticated;
grant execute on function public.account_storage_limit(uuid),public.account_storage_used(uuid),public.account_storage_status(uuid) to service_role;

-- Validate final Storage metadata as well as API reservations. Storage completes
-- uploads with elevated privileges, so RLS alone cannot enforce size or quota.
-- This trigger never writes Storage metadata or deletes object bytes.
create function public.enforce_folio_storage_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; actor uuid; used_bytes bigint; previous_size bigint;
  incoming_size bigint := (new.metadata->>'size')::bigint;
begin
  if new.bucket_id not in ('folio-documents','folio-recovery') then return new; end if;
  if new.bucket_id='folio-documents' then
    select * into doc from public.cloud_documents where object_path=new.name;
    if not found then raise exception 'workspace_missing'; end if;
    perform pg_advisory_xact_lock(hashtextextended(coalesce(doc.user_id::text,doc.guest_hash),17));
    select * into doc from public.cloud_documents where object_path=new.name;
    if not found or doc.status='deleting' or doc.expires_at<=now() then raise exception 'workspace_missing'; end if;
    if incoming_size is not null and (incoming_size<1 or incoming_size>doc.size) then raise exception 'storage_upload_size'; end if;
    actor := doc.user_id;
  else
    if split_part(new.name,'/',1) !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'workspace_missing'; end if;
    actor := split_part(new.name,'/',1)::uuid;
    if incoming_size is not null and incoming_size not between 1 and 41943040 then raise exception 'storage_upload_size'; end if;
  end if;
  if actor is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  if not exists(select 1 from auth.users where id=actor)
    or exists(select 1 from public.user_deletions where user_id=actor)
    or exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  used_bytes := public.account_storage_used(actor);
  if new.bucket_id='folio-documents' then
    if used_bytes>public.account_storage_limit(actor) then raise exception 'storage_limit'; end if;
  elsif incoming_size is not null then
    select coalesce((metadata->>'size')::bigint,41943040) into previous_size from storage.objects
      where bucket_id=new.bucket_id and name=new.name;
    previous_size := coalesce(previous_size,0);
    if incoming_size>previous_size and used_bytes-previous_size+incoming_size>public.account_storage_limit(actor) then raise exception 'storage_limit'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_folio_storage_quota() from public,anon,authenticated;
create trigger folio_storage_quota before insert or update of bucket_id,name,metadata on storage.objects
  for each row execute function public.enforce_folio_storage_quota();

create or replace function public.reserve_editor_workspace(actor uuid, guest text, file_id uuid, file_name text, file_size bigint)
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
  select coalesce(sum(size+workspace_size),0),count(*) into used_bytes,used_count
    from public.cloud_documents where (actor is not null and user_id=actor) or (actor is null and guest_hash=guest and expires_at>now());
  if actor is not null then used_bytes := public.account_storage_used(actor); end if;
  capacity := case when actor is null then 104857600 else public.account_storage_limit(actor) end;
  if used_bytes+file_size>capacity or used_count>=(case when actor is null then 4 else 200 end) then raise exception 'storage_limit'; end if;
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

create or replace function public.save_editor_workspace(actor uuid, guest text, document_id uuid, expected_revision bigint, snapshot jsonb, file_name text, write_id uuid)
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
  select coalesce(sum(size+workspace_size),0) into used_bytes
    from public.cloud_documents where (doc.user_id is not null and user_id=doc.user_id) or (doc.user_id is null and guest_hash=doc.guest_hash and expires_at>now());
  if doc.user_id is not null then used_bytes := public.account_storage_used(doc.user_id); end if;
  capacity := case when doc.user_id is null then 104857600 else public.account_storage_limit(doc.user_id) end;
  if payload_size>doc.workspace_size and used_bytes-doc.workspace_size+payload_size>capacity then raise exception 'storage_limit'; end if;
  update public.cloud_documents set workspace=snapshot,workspace_write_id=write_id,workspace_revision=workspace_revision+1,name=file_name,updated_at=now() where id=document_id returning * into doc;
  return jsonb_build_object('revision',doc.workspace_revision,'updatedAt',doc.updated_at,'expiresAt',doc.expires_at);
end;
$$;

create or replace function public.claim_editor_workspace(actor uuid, guest text, document_id uuid)
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
  select coalesce(sum(size+workspace_size),0),count(*) into used_bytes,used_count from public.cloud_documents where user_id=actor;
  used_bytes := public.account_storage_used(actor);
  if used_bytes+doc.size+doc.workspace_size>public.account_storage_limit(actor) or used_count>=200 then raise exception 'storage_limit'; end if;
  update public.cloud_documents set user_id=actor,guest_hash=null,expires_at=null,updated_at=now() where id=document_id;
end;
$$;
revoke all on function public.reserve_editor_workspace(uuid,text,uuid,text,bigint), public.save_editor_workspace(uuid,text,uuid,bigint,jsonb,text,uuid), public.claim_editor_workspace(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_editor_workspace(uuid,text,uuid,text,bigint), public.save_editor_workspace(uuid,text,uuid,bigint,jsonb,text,uuid), public.claim_editor_workspace(uuid,text,uuid) to service_role;
commit;
