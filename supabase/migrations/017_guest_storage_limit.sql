-- Guests receive 100 MB; signed-in accounts keep 1 GB during the free launch.
-- Existing files are preserved. Reservation and snapshot RPCs enforce this
-- quota under their existing transaction locks; over-quota guests can delete
-- files, reduce workspace size, or sign in to claim files into their account.
begin;

create or replace function public.account_storage_limit(actor uuid) returns bigint
language sql stable security definer set search_path = '' as $$
  select case when actor is null then 104857600::bigint
  when public.free_access_enabled() then 1073741824::bigint when exists(
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

commit;
