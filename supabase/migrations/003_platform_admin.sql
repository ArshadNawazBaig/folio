-- Apply after 001 and 002. Provision super admins through the SQL editor only.
grant usage on schema auth to service_role;
grant select(id,email,created_at,last_sign_in_at) on auth.users to service_role;
create table public.super_admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.account_controls (user_id uuid primary key references auth.users(id) on delete cascade, suspended boolean not null default false, reason text not null default '', updated_at timestamptz not null default now());
create table public.access_grants (user_id uuid primary key references auth.users(id) on delete cascade, until_at timestamptz not null, reason text not null, granted_by uuid references auth.users(id), updated_at timestamptz not null default now());
create table public.pricing_versions (
  id text primary key, name text not null, currency text not null check(currency='usd'),
  monthly_amount integer not null check(monthly_amount between 100 and 100000),
  trial_amount integer not null check(trial_amount between 50 and 100000),
  trial_days integer not null check(trial_days between 1 and 30), trial_enabled boolean not null,
  monthly_price_id text unique, trial_price_id text unique, created_at timestamptz not null default now()
);
insert into public.pricing_versions values('initial','Folio Pro','usd',2500,100,7,true,null,null,now());
create table public.platform_settings (
  id boolean primary key default true check(id), pricing_version text not null references public.pricing_versions(id),
  maintenance boolean not null default false, maintenance_message text not null,
  purchases_enabled boolean not null default true, announcement text not null default '', updated_at timestamptz not null default now()
);
insert into public.platform_settings(id,pricing_version,maintenance_message) values(true,'initial','Folio is getting a little care. Please come back shortly. Your local documents are still on your device.');
create table public.admin_audit (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, target text not null, detail jsonb not null default '{}', created_at timestamptz not null default now());
create index admin_audit_created on public.admin_audit(created_at desc);
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  email text not null, name text not null, subject text not null, message text not null,
  status text not null default 'open' check(status in ('open','pending','resolved')),
  priority text not null default 'normal' check(priority in ('low','normal','high')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support_tickets_owner on public.support_tickets(user_id,updated_at desc);
create index support_tickets_email on public.support_tickets(lower(email));
create index support_tickets_status on public.support_tickets(status,updated_at desc);
create table public.support_messages (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade, author_id uuid references auth.users(id) on delete set null, staff boolean not null, message text not null, created_at timestamptz not null default now());
create index support_messages_ticket on public.support_messages(ticket_id,created_at);
do $$ declare table_name text; begin
  foreach table_name in array array['super_admins','account_controls','access_grants','pricing_versions','platform_settings','admin_audit','support_tickets','support_messages'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on public.%I from public, anon, authenticated',table_name);
    execute format('grant all on public.%I to service_role',table_name);
  end loop;
end $$;

create function public.assert_super_admin(actor uuid) returns void language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from super_admins where user_id=actor) or exists(select 1 from account_controls where user_id=actor and suspended) then raise exception 'admin_required'; end if;
end; $$;
create function public.admin_overview(actor uuid) returns jsonb language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  return jsonb_build_object('users',(select count(*) from auth.users),'paid',(select count(*) from billing_subscriptions where status='active' and paid_until>now() and current_period_end>now()),'trials',(select count(*) from billing_subscriptions where status='trialing' and paid_until>now() and current_period_end>now()),'openTickets',(select count(*) from support_tickets where status<>'resolved'),'operations',(select coalesce(sum(count),0) from pro_usage where day=current_date),'suspended',(select count(*) from account_controls where suspended));
end; $$;
create function public.admin_users(actor uuid, query_text text, page_number integer) returns jsonb language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  if page_number<1 or page_number>100000 or length(query_text)>120 then raise exception 'invalid_query'; end if;
  return jsonb_build_object('total',(select count(*) from auth.users u where position(lower(query_text) in lower(coalesce(u.email,'')||u.id::text))>0), 'rows',coalesce((select jsonb_agg(row_to_json(r)) from (select u.id,u.email,u.created_at,u.last_sign_in_at,coalesce(c.suspended,false) as suspended,(a.user_id is not null) as is_admin,g.until_at as grant_until from auth.users u left join account_controls c on c.user_id=u.id left join super_admins a on a.user_id=u.id left join access_grants g on g.user_id=u.id where position(lower(query_text) in lower(coalesce(u.email,'')||u.id::text))>0 order by u.created_at desc,u.id limit 25 offset (page_number-1)*25) r),'[]'::jsonb));
end; $$;
create function public.admin_subscriptions(actor uuid, query_text text, page_number integer) returns jsonb language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  if page_number<1 or page_number>100000 or length(query_text)>120 then raise exception 'invalid_query'; end if;
  return jsonb_build_object('total',(select count(*) from billing_subscriptions b join auth.users u on u.id=b.user_id where position(lower(query_text) in lower(coalesce(u.email,'')||b.stripe_subscription_id))>0),'rows',coalesce((select jsonb_agg(row_to_json(r)) from (select b.*,u.email from billing_subscriptions b join auth.users u on u.id=b.user_id where position(lower(query_text) in lower(coalesce(u.email,'')||b.stripe_subscription_id))>0 order by b.current_period_end desc nulls last,b.stripe_subscription_id limit 25 offset (page_number-1)*25) r),'[]'::jsonb));
end; $$;
create function public.admin_user_action(actor uuid, target_user uuid, action_name text, reason_text text, grant_days integer default 30) returns void language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  if length(trim(reason_text))<3 or length(reason_text)>500 or not exists(select 1 from auth.users where id=target_user) then raise exception 'invalid_action'; end if;
  if action_name in ('suspend','restore') then
    if exists(select 1 from super_admins where user_id=target_user) then raise exception 'protected_admin'; end if;
    insert into account_controls(user_id,suspended,reason) values(target_user,action_name='suspend',reason_text) on conflict(user_id) do update set suspended=excluded.suspended,reason=excluded.reason,updated_at=now();
  elsif action_name='grant' then
    if grant_days<1 or grant_days>365 then raise exception 'invalid_duration'; end if;
    insert into access_grants(user_id,until_at,reason,granted_by) values(target_user,now()+make_interval(days=>grant_days),reason_text,actor) on conflict(user_id) do update set until_at=excluded.until_at,reason=excluded.reason,granted_by=actor,updated_at=now();
  elsif action_name='revoke_grant' then delete from access_grants where user_id=target_user;
  else raise exception 'invalid_action'; end if;
  insert into admin_audit(actor_id,action,target,detail) values(actor,action_name,target_user::text,jsonb_build_object('reason',reason_text,'days',grant_days));
end; $$;
create function public.admin_save_settings(actor uuid, settings_value jsonb) returns void language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  if length(settings_value->>'maintenanceMessage') not between 10 and 500 or length(settings_value->>'announcement')>240 then raise exception 'invalid_settings'; end if;
  update platform_settings set maintenance=(settings_value->>'maintenance')::boolean,maintenance_message=settings_value->>'maintenanceMessage',purchases_enabled=(settings_value->>'purchasesEnabled')::boolean,announcement=settings_value->>'announcement',updated_at=now() where id;
  insert into admin_audit(actor_id,action,target,detail) values(actor,'settings.update','platform',settings_value);
end; $$;
create function public.admin_publish_pricing(actor uuid, expected_version text, version_value text, pricing jsonb) returns void language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  perform 1 from platform_settings where id for update;
  if (select pricing_version from platform_settings where id)<>expected_version then raise exception 'pricing_changed'; end if;
  insert into pricing_versions(id,name,currency,monthly_amount,trial_amount,trial_days,trial_enabled,monthly_price_id,trial_price_id) values(version_value,pricing->>'name',pricing->>'currency',(pricing->>'monthlyAmount')::integer,(pricing->>'trialAmount')::integer,(pricing->>'trialDays')::integer,(pricing->>'trialEnabled')::boolean,pricing->>'monthlyPriceId',pricing->>'trialPriceId');
  update platform_settings set pricing_version=version_value,updated_at=now() where id;
  insert into admin_audit(actor_id,action,target,detail) values(actor,'pricing.publish',version_value,pricing);
end; $$;
create function public.support_reply(actor uuid, verified_email text, ticket uuid, reply_text text, as_staff boolean, next_status text default 'open', next_priority text default 'normal') returns void language plpgsql set search_path=public as $$
begin
  if length(reply_text)>5000 then raise exception 'invalid_message'; end if;
  if as_staff then perform assert_super_admin(actor);
  elsif not exists(select 1 from support_tickets where id=ticket and (user_id=actor or (user_id is null and lower(email)=lower(verified_email)))) then raise exception 'ticket_forbidden'; end if;
  if not exists(select 1 from support_tickets where id=ticket) then raise exception 'ticket_missing'; end if;
  if length(trim(reply_text))>0 then insert into support_messages(ticket_id,author_id,staff,message) values(ticket,actor,as_staff,reply_text); end if;
  update support_tickets set status=case when as_staff then next_status else 'open' end, priority=case when as_staff then next_priority else priority end, updated_at=now() where id=ticket;
  if as_staff then insert into admin_audit(actor_id,action,target,detail) values(actor,'support.update',ticket::text,jsonb_build_object('status',next_status,'priority',next_priority,'replyAdded',length(trim(reply_text))>0)); end if;
end; $$;
create or replace function public.consume_pro_request(account_id uuid) returns text language plpgsql set search_path=public as $$
declare usage pro_usage; current_minute timestamptz:=date_trunc('minute',now());
begin
  if exists(select 1 from account_controls where user_id=account_id and suspended) then return 'suspended'; end if;
  if not exists(select 1 from billing_subscriptions where user_id=account_id and status in ('active','trialing') and paid_until>now() and current_period_end>now()) and not exists(select 1 from access_grants where user_id=account_id and until_at>now()) then return 'not_subscribed'; end if;
  insert into pro_usage values(account_id,current_date,0,current_minute,0) on conflict do nothing;
  select * into usage from pro_usage where user_id=account_id for update;
  if usage.day<>current_date then usage.count:=0; end if;
  if usage.minute<>current_minute then usage.minute_count:=0; end if;
  if usage.count>=500 or usage.minute_count>=20 then return 'limited'; end if;
  update pro_usage set day=current_date,count=usage.count+1,minute=current_minute,minute_count=usage.minute_count+1 where user_id=account_id;
  return 'allowed';
end; $$;
revoke all on function public.assert_super_admin(uuid),public.admin_overview(uuid),public.admin_users(uuid,text,integer),public.admin_subscriptions(uuid,text,integer),public.admin_user_action(uuid,uuid,text,text,integer),public.admin_save_settings(uuid,jsonb),public.admin_publish_pricing(uuid,text,text,jsonb),public.support_reply(uuid,text,uuid,text,boolean,text,text),public.consume_pro_request(uuid) from public,anon,authenticated;
grant execute on function public.assert_super_admin(uuid),public.admin_overview(uuid),public.admin_users(uuid,text,integer),public.admin_subscriptions(uuid,text,integer),public.admin_user_action(uuid,uuid,text,text,integer),public.admin_save_settings(uuid,jsonb),public.admin_publish_pricing(uuid,text,text,jsonb),public.support_reply(uuid,text,uuid,text,boolean,text,text),public.consume_pro_request(uuid) to service_role;
