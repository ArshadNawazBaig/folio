-- Browser-private guest libraries: 100 MB, 200 PDFs, and the existing 24-hour expiry.
begin;
create or replace function public.reserve_editor_workspace(actor uuid, guest text, file_id uuid, file_name text, file_size bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; used_count bigint; capacity bigint;
begin
  if (actor is null and (guest is null or guest !~ '^[a-f0-9]{64}$')) or file_size not between 1 and 52428800 or length(file_name) not between 5 and 160 then raise exception 'invalid_file'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(actor::text,guest),17));
  select * into doc from public.cloud_documents where id=file_id;
  if found then
    if not coalesce(doc.user_id=actor or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now()),false) then raise exception 'workspace_missing'; end if;
    if doc.size<>file_size or doc.name<>file_name or doc.status='deleting' then raise exception 'workspace_conflict'; end if;
    return to_jsonb(doc);
  end if;
  select coalesce(sum(size+workspace_size),0),count(*) into used_bytes,used_count
    from public.cloud_documents where (actor is not null and user_id=actor) or (actor is null and guest_hash=guest and expires_at>now());
  if actor is not null then used_bytes := public.account_storage_used(actor); end if;
  capacity := case when actor is null then 104857600 else public.account_storage_limit(actor) end;
  if used_bytes+file_size>capacity or used_count>=200 then raise exception 'storage_limit'; end if;
  insert into public.cloud_documents(id,user_id,guest_hash,expires_at,name,object_path,size)
    values(file_id,actor,case when actor is null then guest end,case when actor is null then now()+interval '24 hours' end,file_name,
      coalesce(actor::text,'guest-'||guest)||'/'||file_id::text||'.pdf',file_size) returning * into doc;
  return to_jsonb(doc);
end;
$$;

-- Service-only callers derive the guest hash from the HttpOnly session cookie.
-- Move all files that fit; leave the rest visible in the same browser for removal or retry.
create function public.claim_guest_workspaces(actor uuid, guest text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; used_count bigint; capacity bigint; claimed integer := 0; remaining integer;
begin
  if actor is null or guest is null or guest !~ '^[a-f0-9]{64}$' then raise exception 'workspace_missing'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(guest,17));
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  used_bytes := public.account_storage_used(actor);
  capacity := public.account_storage_limit(actor);
  select count(*) into used_count from public.cloud_documents where user_id=actor;
  for doc in select * from public.cloud_documents
    where user_id is null and guest_hash=guest and expires_at>now() and status<>'deleting'
    order by created_at,id for update
  loop
    if used_count<200 and used_bytes+doc.size+doc.workspace_size<=capacity then
      update public.cloud_documents set user_id=actor,guest_hash=null,expires_at=null,updated_at=now() where id=doc.id;
      used_bytes := used_bytes+doc.size+doc.workspace_size;
      used_count := used_count+1;
      claimed := claimed+1;
    end if;
  end loop;
  select count(*) into remaining from public.cloud_documents where user_id is null and guest_hash=guest and expires_at>now();
  return jsonb_build_object('claimed',claimed,'remaining',remaining);
end;
$$;

create function public.manage_editor_workspace(actor uuid, guest text, document_id uuid, operation text, file_name text, expected_revision bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents;
begin
  select * into doc from public.cloud_documents where id=document_id;
  if not found or not coalesce(doc.user_id=actor or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now()),false) then raise exception 'workspace_missing'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(doc.user_id::text,doc.guest_hash),17));
  select * into doc from public.cloud_documents where id=document_id for update;
  if not found or not coalesce(doc.user_id=actor or (doc.user_id is null and doc.guest_hash=guest and doc.expires_at>now()),false) then raise exception 'workspace_missing'; end if;
  if operation='delete' then
    update public.cloud_documents set status='deleting' where id=document_id;
  elsif operation='rename' then
    if doc.status='deleting' or expected_revision is null or doc.workspace_revision<>expected_revision then raise exception 'workspace_conflict'; end if;
    if file_name is null or length(file_name) not between 5 and 160 then raise exception 'invalid_file'; end if;
    update public.cloud_documents set name=file_name,workspace_revision=workspace_revision+1,updated_at=now() where id=document_id;
  else
    raise exception 'invalid_action';
  end if;
end;
$$;
revoke all on function public.claim_guest_workspaces(uuid,text), public.manage_editor_workspace(uuid,text,uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.claim_guest_workspaces(uuid,text), public.manage_editor_workspace(uuid,text,uuid,text,text,bigint) to service_role;
commit;
