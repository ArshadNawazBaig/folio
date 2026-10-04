-- Free launch: apply after 015. There is no automatic expiry or subscription creation.
-- Existing files and billing history are retained. Accounts above 1 GB may delete/export files.
begin;
alter table public.platform_settings add column free_access_enabled boolean not null default true;
update public.platform_settings set purchases_enabled=false, updated_at=now();
alter table public.platform_settings add constraint no_purchases_during_free_launch
  check (not (free_access_enabled and purchases_enabled));
create function public.free_access_enabled() returns boolean
language sql stable security definer set search_path='' as $$
  select free_access_enabled from public.platform_settings where id=true;
$$;
revoke all on function public.free_access_enabled() from public, anon, authenticated;
grant execute on function public.free_access_enabled() to service_role;


create or replace function public.account_storage_limit(actor uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select case when public.free_access_enabled() then 1073741824::bigint when exists(
    select 1 from public.billing_subscriptions where user_id=actor and monthly_paid
      and not access_revoked and status in ('active','trialing')
      and paid_until>now() and current_period_end>now()
  ) then null::bigint
  when exists(
    select 1 from public.billing_subscriptions where user_id=actor and not access_revoked
      and status in ('active','trialing') and paid_until>now() and current_period_end>now()
  ) or exists(select 1 from public.access_grants where user_id=actor and until_at>now())
    then 1073741824::bigint else 104857600::bigint end;
$$;

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
  capacity := public.account_storage_limit(actor);
  if capacity is not null and (used_bytes+file_size>capacity or used_count>=200) then raise exception 'storage_limit'; end if;
  insert into public.cloud_documents(id,user_id,guest_hash,expires_at,name,object_path,size)
    values(file_id,actor,case when actor is null then guest end,case when actor is null then now()+interval '24 hours' end,file_name,
      coalesce(actor::text,'guest-'||guest)||'/'||file_id::text||'.pdf',file_size) returning * into doc;
  return to_jsonb(doc);
end;
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
  capacity := public.account_storage_limit(doc.user_id);
  if payload_size>doc.workspace_size and used_bytes-doc.workspace_size+payload_size>capacity then raise exception 'storage_limit'; end if;
  update public.cloud_documents set workspace=snapshot,workspace_write_id=write_id,workspace_revision=workspace_revision+1,name=file_name,updated_at=now() where id=document_id returning * into doc;
  return jsonb_build_object('revision',doc.workspace_revision,'updatedAt',doc.updated_at,'expiresAt',doc.expires_at);
end;
$$;

create or replace function public.short_link_pro(actor uuid) returns boolean
language sql stable set search_path='' as $$
  select (public.free_access_enabled() and actor is not null) or exists(select 1 from public.billing_subscriptions where user_id=actor
    and not access_revoked and status in ('active','trialing') and paid_until>now() and current_period_end>now())
    or exists(select 1 from public.access_grants where user_id=actor and until_at>now());
$$;

create or replace function public.consume_pro_request(account_id uuid) returns text language plpgsql set search_path=public as $$
declare usage pro_usage; current_minute timestamptz:=date_trunc('minute',now());
begin
  if exists(select 1 from account_controls where user_id=account_id and suspended) then return 'suspended'; end if;
  if not public.free_access_enabled() and not exists(select 1 from billing_subscriptions where user_id=account_id and status in ('active','trialing') and paid_until>now() and current_period_end>now()) and not exists(select 1 from access_grants where user_id=account_id and until_at>now()) then return 'not_subscribed'; end if;
  insert into pro_usage values(account_id,current_date,0,current_minute,0) on conflict do nothing;
  select * into usage from pro_usage where user_id=account_id for update;
  if usage.day<>current_date then usage.count:=0; end if;
  if usage.minute<>current_minute then usage.minute_count:=0; end if;
  if usage.count>=500 or usage.minute_count>=20 then return 'limited'; end if;
  update pro_usage set day=current_date,count=usage.count+1,minute=current_minute,minute_count=usage.minute_count+1 where user_id=account_id;
  return 'allowed';
end; $$;

commit;
