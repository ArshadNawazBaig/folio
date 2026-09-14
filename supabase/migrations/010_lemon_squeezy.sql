-- Additive gateway replacement. Legacy stripe_* column names remain internal
-- for compatibility with the existing quota, storage and audit functions.
begin;
create table public.lemon_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pricing_version text not null references public.pricing_versions(id),
  plan text not null check(plan in ('trial','month')),
  variant_id text not null check(variant_id ~ '^[1-9][0-9]*$'),
  store_id text not null,
  test_mode boolean not null,
  terms jsonb not null,
  checkout_id text unique,
  url text,
  expires_at timestamptz not null,
  subscription_id text unique,
  customer_id text,
  order_id text unique,
  created_at timestamptz not null default now()
);
create index lemon_checkouts_user on public.lemon_checkouts(user_id,created_at desc);
alter table public.lemon_checkouts enable row level security;
revoke all on public.lemon_checkouts from public,anon,authenticated;
grant all on public.lemon_checkouts to service_role;
alter table public.billing_subscriptions add column access_revoked boolean not null default false;
create trigger guard_lemon_checkout_deletion before insert or update on public.lemon_checkouts
  for each row execute function public.guard_deleting_account();

-- Unlike Stripe, the checkout API cannot expire an issued link. Do not delete
-- an identity while a payable link (plus webhook delivery grace) remains open.
create function public.guard_lemon_deletion() returns trigger language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,17));
  if exists(select 1 from public.lemon_checkouts where user_id=new.user_id
      and subscription_id is null and expires_at + interval '30 minutes'>now()) then
    raise exception 'deletion_checkout_busy';
  end if;
  return new;
end; $$;
create trigger guard_lemon_pending_deletion before insert on public.user_deletions
  for each row execute function public.guard_lemon_deletion();

-- Serialize issuance with deletion and other tabs. Reserving before calling
-- the provider also prevents duplicate checkouts after a lost API response.
create function public.reserve_lemon_checkout(account_id uuid, token uuid, version_value text,
  plan_value text, variant_value text, store_value text, test_value boolean, terms_value jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare existing public.lemon_checkouts;
begin
  perform pg_advisory_xact_lock(hashtextextended(account_id::text,17));
  if exists(select 1 from public.user_deletions where user_id=account_id) then raise exception 'deletion_in_progress'; end if;
  if exists(select 1 from public.account_controls where user_id=account_id and suspended) then raise exception 'account_suspended'; end if;
  if exists(select 1 from public.billing_subscriptions where user_id=account_id and
    (status not in ('canceled','incomplete_expired') or (paid_until>now() and current_period_end>now()))) then
    raise exception 'subscription_exists';
  end if;
  if plan_value='trial' and exists(select 1 from public.lemon_checkouts where user_id=account_id
    and plan='trial' and subscription_id is not null) then raise exception 'intro_used'; end if;
  select * into existing from public.lemon_checkouts where user_id=account_id and subscription_id is null
    and expires_at+interval '2 minutes'>now() order by created_at desc limit 1;
  if found then return to_jsonb(existing); end if;
  insert into public.lemon_checkouts(id,user_id,pricing_version,plan,variant_id,store_id,test_mode,terms,expires_at)
    values(token,account_id,version_value,plan_value,variant_value,store_value,test_value,terms_value,now()+interval '15 minutes')
    returning * into existing;
  return to_jsonb(existing);
end; $$;

-- Signed custom data is only a lookup token; ownership and offer terms come
-- from this server-owned row. Binding and entitlement updates are atomic.
create function public.record_lemon_subscription(token uuid, provider_subscription text,
  provider_customer text, provider_order text, event_id text, event_created bigint,
  subscription_status text, paid_until_value timestamptz, period_end_value timestamptz, cancel_value boolean)
returns void language plpgsql set search_path='' as $$
declare checkout public.lemon_checkouts; revoked boolean;
begin
  select * into checkout from public.lemon_checkouts where id=token;
  if not found then raise exception 'checkout_missing'; end if;
  perform pg_advisory_xact_lock(hashtextextended(checkout.user_id::text,17));
  select * into checkout from public.lemon_checkouts where id=token for update;
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
end; $$;

revoke all on function public.guard_lemon_deletion(),
  public.reserve_lemon_checkout(uuid,uuid,text,text,text,text,boolean,jsonb),
  public.record_lemon_subscription(uuid,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean)
  from public,anon,authenticated;
grant execute on function public.reserve_lemon_checkout(uuid,uuid,text,text,text,text,boolean,jsonb),
  public.record_lemon_subscription(uuid,text,text,text,text,bigint,text,timestamptz,timestamptz,boolean) to service_role;
commit;
