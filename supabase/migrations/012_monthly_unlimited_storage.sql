-- Apply after 011. No files are deleted. Only verified monthly payments lift quotas.
begin;
alter table public.billing_subscriptions add column monthly_paid boolean not null default false;

-- The default preserves compatibility during rollout. Re-sync existing Lemon
-- subscriptions after deployment to derive this flag from canonical paid invoices.
drop function public.record_lemon_subscription(uuid,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean);
create function public.record_lemon_subscription(token uuid, provider_subscription text,
  provider_customer text, provider_order text, event_id text, event_created bigint,
  subscription_status text, paid_until_value timestamptz, period_end_value timestamptz, cancel_value boolean,
  monthly_paid_value boolean default false)
returns void language plpgsql set search_path='' as $$
declare checkout public.lemon_checkouts; revoked boolean;
begin
  select * into checkout from public.lemon_checkouts where id=token;
  if not found then raise exception 'checkout_missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended(checkout.user_id::text,17));
  select * into checkout from public.lemon_checkouts where id=token for update;
  if exists(select 1 from public.billing_events where id=event_id) then return; end if;
  if checkout.subscription_id is not null and checkout.subscription_id<>provider_subscription then raise exception 'checkout_already_used'; end if;
  if checkout.customer_id is not null and checkout.customer_id<>provider_customer then raise exception 'customer_mismatch'; end if;
  if checkout.order_id is not null and checkout.order_id<>provider_order then raise exception 'order_mismatch'; end if;
  if not exists(select 1 from public.user_deletions where user_id=checkout.user_id) then
    update public.lemon_checkouts set subscription_id=provider_subscription,customer_id=provider_customer,order_id=provider_order where id=token;
  end if;
  select access_revoked into revoked from public.billing_subscriptions where stripe_subscription_id='lemon_'||provider_subscription;
  perform public.record_billing_event(event_id,event_created,checkout.user_id,'lemon_'||provider_subscription,
    case when revoked then 'canceled' else subscription_status end,
    'lemon_'||checkout.id::text,case when revoked then null else paid_until_value end,period_end_value,cancel_value);
  update public.billing_subscriptions set monthly_paid=coalesce(monthly_paid_value,false)
    where stripe_subscription_id='lemon_'||provider_subscription and user_id=checkout.user_id
      and last_event_created=event_created and status=subscription_status and not access_revoked;
end; $$;

revoke all on function public.record_lemon_subscription(uuid,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean,boolean) from public,anon,authenticated;
grant execute on function public.record_lemon_subscription(uuid,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean,boolean) to service_role;

-- NULL explicitly means unlimited. An active provider status alone is not
-- enough: cancelled trials can also have that status while retaining trial access.
create or replace function public.account_storage_limit(actor uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select case when exists(
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

create or replace function public.account_storage_status(actor uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('limit',capacity,'used',used_bytes,
    'available',case when capacity is null then null else greatest(0,capacity-used_bytes) end,
    'full',capacity is not null and (used_bytes>=capacity or file_count>=200),
    'recovery',coalesce((select jsonb_agg(jsonb_build_object(
      'slot',split_part(split_part(name,'/',2),'.',1),'size',coalesce((metadata->>'size')::bigint,41943040)))
      from storage.objects where bucket_id='folio-recovery' and split_part(name,'/',1)=actor::text),'[]'::jsonb))
  from (select public.account_storage_limit(actor) capacity,public.account_storage_used(actor) used_bytes,
    (select count(*) from public.cloud_documents where user_id=actor) file_count) totals;
$$;

-- The existing final-object and workspace-save quota checks compare bytes to
-- account_storage_limit; NULL skips only the total-byte check. Ownership,
-- suspension, per-file sizes, locking and revision checks stay enforced.
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
  if capacity is not null and (used_bytes+file_size>capacity or used_count>=200) then raise exception 'storage_limit'; end if;
  insert into public.cloud_documents(id,user_id,guest_hash,expires_at,name,object_path,size)
    values(file_id,actor,case when actor is null then guest end,case when actor is null then now()+interval '24 hours' end,file_name,
      coalesce(actor::text,'guest-'||guest)||'/'||file_id::text||'.pdf',file_size) returning * into doc;
  return to_jsonb(doc);
end;
$$;

create or replace function public.claim_editor_workspace(actor uuid, guest text, document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare doc public.cloud_documents; used_bytes bigint; used_count bigint; capacity bigint;
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
  capacity := public.account_storage_limit(actor);
  if capacity is not null and (used_bytes+doc.size+doc.workspace_size>capacity or used_count>=200) then raise exception 'storage_limit'; end if;
  update public.cloud_documents set user_id=actor,guest_hash=null,expires_at=null,updated_at=now() where id=document_id;
end;
$$;
create or replace function public.claim_guest_workspaces(actor uuid, guest text)
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
    if capacity is null or (used_count<200 and used_bytes+doc.size+doc.workspace_size<=capacity) then
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

commit;
