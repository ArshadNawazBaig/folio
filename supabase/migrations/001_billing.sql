-- Run in the Supabase SQL editor. Only the server service role can mutate billing.
create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  checkout_session_id text,
  checkout_lock_until timestamptz
);
create table public.billing_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  price_id text not null,
  status text not null,
  paid_until timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_created bigint not null default 0
);
create index billing_subscriptions_user on public.billing_subscriptions(user_id);
create table public.billing_events (id text primary key, created_at timestamptz not null default now());
create table public.pro_usage (user_id uuid primary key references auth.users(id) on delete cascade, day date not null, count integer not null, minute timestamptz not null, minute_count integer not null);
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.pro_usage enable row level security;
revoke all on public.billing_customers, public.billing_subscriptions, public.billing_events, public.pro_usage from anon, authenticated;
grant all on public.billing_customers, public.billing_subscriptions, public.billing_events, public.pro_usage to service_role;

create function public.record_billing_event(event_id text, event_created bigint, account_id uuid, subscription_id text, subscription_status text, allowed_price_id text, paid_until_value timestamptz, period_end_value timestamptz, cancel_value boolean)
returns void language plpgsql set search_path = public as $$
begin
  insert into billing_events(id) values(event_id) on conflict do nothing;
  if not found then return; end if;
  insert into billing_subscriptions(stripe_subscription_id,user_id,price_id,status,paid_until,current_period_end,cancel_at_period_end,last_event_created)
  values(subscription_id,account_id,allowed_price_id,subscription_status,paid_until_value,period_end_value,cancel_value,event_created)
  on conflict(stripe_subscription_id) do update set status=excluded.status,price_id=excluded.price_id,paid_until=excluded.paid_until,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,last_event_created=excluded.last_event_created
  where billing_subscriptions.user_id=excluded.user_id and billing_subscriptions.last_event_created<=excluded.last_event_created
    and (billing_subscriptions.status not in ('canceled','incomplete_expired') or excluded.status=billing_subscriptions.status);
end; $$;

create function public.claim_checkout(account_id uuid) returns boolean language plpgsql set search_path = public as $$
begin
  update billing_customers set checkout_lock_until=now()+interval '45 seconds' where user_id=account_id and (checkout_lock_until is null or checkout_lock_until<now());
  return found;
end; $$;

create function public.consume_pro_request(account_id uuid) returns text language plpgsql set search_path = public as $$
declare usage pro_usage; current_minute timestamptz := date_trunc('minute',now());
begin
  if not exists(select 1 from billing_subscriptions where user_id=account_id and status='active' and paid_until>now() and current_period_end>now()) then return 'not_subscribed'; end if;
  insert into pro_usage values(account_id,current_date,0,current_minute,0) on conflict do nothing;
  select * into usage from pro_usage where user_id=account_id for update;
  if usage.day<>current_date then usage.count:=0; end if;
  if usage.minute<>current_minute then usage.minute_count:=0; end if;
  if usage.count>=500 or usage.minute_count>=20 then return 'limited'; end if;
  update pro_usage set day=current_date,count=usage.count+1,minute=current_minute,minute_count=usage.minute_count+1 where user_id=account_id;
  return 'allowed';
end; $$;
revoke all on function public.record_billing_event(text,bigint,uuid,text,text,text,timestamptz,timestamptz,boolean), public.claim_checkout(uuid), public.consume_pro_request(uuid) from public, anon, authenticated;
grant execute on function public.record_billing_event(text,bigint,uuid,text,text,text,timestamptz,timestamptz,boolean), public.claim_checkout(uuid), public.consume_pro_request(uuid) to service_role;
