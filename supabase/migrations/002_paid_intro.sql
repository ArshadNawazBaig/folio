-- Apply after 001_billing.sql. A trial receives paid_until only after its
-- configured $1 invoice line has been verified by the server's Stripe webhook.
create or replace function public.consume_pro_request(account_id uuid)
returns text language plpgsql set search_path = public as $$
declare
  usage pro_usage;
  current_minute timestamptz := date_trunc('minute',now());
begin
  if not exists (
    select 1 from billing_subscriptions
    where user_id=account_id and status in ('active','trialing')
      and paid_until>now() and current_period_end>now()
  ) then return 'not_subscribed'; end if;
  insert into pro_usage values(account_id,current_date,0,current_minute,0) on conflict do nothing;
  select * into usage from pro_usage where user_id=account_id for update;
  if usage.day<>current_date then usage.count:=0; end if;
  if usage.minute<>current_minute then usage.minute_count:=0; end if;
  if usage.count>=500 or usage.minute_count>=20 then return 'limited'; end if;
  update pro_usage set day=current_date,count=usage.count+1,minute=current_minute,minute_count=usage.minute_count+1 where user_id=account_id;
  return 'allowed';
end; $$;
revoke all on function public.consume_pro_request(uuid) from public, anon, authenticated;
grant execute on function public.consume_pro_request(uuid) to service_role;
