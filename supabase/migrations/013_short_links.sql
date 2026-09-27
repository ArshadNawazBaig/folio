-- Apply after 012. Private account links with public, unguessable redirect codes.
begin;
-- Codes remain reserved after deletion, so old links/printed QR codes cannot be hijacked.
create table public.short_link_codes (
  alias text primary key check (alias ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$')
);
create table public.short_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null unique references public.short_link_codes(alias),
  destination text not null check (length(destination) between 8 and 2048 and destination ~ '^https?://[^/]+'),
  title text not null default '' check (length(title)<=100),
  custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index short_links_owner on public.short_links(user_id,created_at desc,id);
create table public.short_link_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_at timestamptz not null,
  minute_count integer not null,
  day_at timestamptz not null,
  day_count integer not null
);
alter table public.short_link_codes enable row level security;
alter table public.short_links enable row level security;
alter table public.short_link_usage enable row level security;
revoke all on public.short_link_codes,public.short_links,public.short_link_usage from public,anon,authenticated;
grant all on public.short_link_codes,public.short_links,public.short_link_usage to service_role;
create trigger guard_short_link_deletion before insert or update on public.short_links
  for each row execute function public.guard_deleting_account();

create function public.short_link_pro(actor uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.billing_subscriptions where user_id=actor
    and not access_revoked and status in ('active','trialing') and paid_until>now() and current_period_end>now())
    or exists(select 1 from public.access_grants where user_id=actor and until_at>now());
$$;

create function public.create_short_link(actor uuid, link_alias text, link_destination text, link_title text, is_custom boolean)
returns jsonb language plpgsql set search_path='' set timezone='UTC' as $$
declare pro boolean; capacity integer; doc public.short_links; usage public.short_link_usage;
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  if actor is null or not exists(select 1 from auth.users where id=actor) then raise exception 'link_account_required'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  if exists(select 1 from public.user_deletions where user_id=actor) then raise exception 'deletion_in_progress'; end if;
  pro := public.short_link_pro(actor);
  capacity := case when pro then 1000 else 10 end;
  if is_custom and not pro then raise exception 'link_pro_required'; end if;
  if (select count(*) from public.short_links where user_id=actor)>=capacity then raise exception 'link_limit'; end if;
  select * into usage from public.short_link_usage where user_id=actor;
  if (usage.minute_at=date_trunc('minute',now()) and usage.minute_count>=20)
    or (usage.day_at=date_trunc('day',now()) and usage.day_count>=case when pro then 1000 else 100 end)
    then raise exception 'link_rate_limit'; end if;
  insert into public.short_link_codes(alias) values(link_alias) on conflict do nothing;
  if not found then raise exception 'link_alias_taken'; end if;
  insert into public.short_links(user_id,alias,destination,title,custom)
    values(actor,link_alias,link_destination,link_title,is_custom) returning * into doc;
  insert into public.short_link_usage values(actor,date_trunc('minute',now()),1,date_trunc('day',now()),1)
    on conflict(user_id) do update set
      minute_count=case when short_link_usage.minute_at=excluded.minute_at then short_link_usage.minute_count+1 else 1 end,
      day_count=case when short_link_usage.day_at=excluded.day_at then short_link_usage.day_count+1 else 1 end,
      minute_at=excluded.minute_at,day_at=excluded.day_at;
  return to_jsonb(doc)-'user_id';
end; $$;

create function public.update_short_link(actor uuid, link_id uuid, link_destination text, link_title text)
returns jsonb language plpgsql set search_path='' as $$
declare doc public.short_links;
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  select * into doc from public.short_links where id=link_id and user_id=actor for update;
  if not found then raise exception 'link_missing'; end if;
  if doc.destination<>link_destination and not public.short_link_pro(actor) then raise exception 'link_pro_required'; end if;
  update public.short_links set destination=link_destination,title=link_title,updated_at=now()
    where id=link_id returning * into doc;
  return to_jsonb(doc)-'user_id';
end; $$;

create function public.delete_short_link(actor uuid, link_id uuid)
returns boolean language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text,17));
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  delete from public.short_links where id=link_id and user_id=actor;
  if not found then raise exception 'link_missing'; end if;
  return true;
end; $$;

-- Redirects expose only the destination; account listings remain private.
create function public.resolve_short_link(link_alias text) returns text
language sql stable set search_path='' as $$
  select destination from public.short_links l where alias=link_alias
    and not exists(select 1 from public.account_controls where user_id=l.user_id and suspended)
    and not exists(select 1 from public.user_deletions where user_id=l.user_id);
$$;
revoke all on function public.short_link_pro(uuid),public.create_short_link(uuid,text,text,text,boolean),
  public.update_short_link(uuid,uuid,text,text),public.delete_short_link(uuid,uuid),public.resolve_short_link(text)
  from public,anon,authenticated;
grant execute on function public.short_link_pro(uuid),public.create_short_link(uuid,text,text,text,boolean),
  public.update_short_link(uuid,uuid,text,text),public.delete_short_link(uuid,uuid),public.resolve_short_link(text) to service_role;
commit;
