-- Requires migrations 001–013. Explicitly saved invoice drafts only.
begin;
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document jsonb not null check (jsonb_typeof(document)='object' and octet_length(document::text)<=600000),
  summary jsonb not null check (jsonb_typeof(summary)='object' and octet_length(summary::text)<=2000),
  revision integer not null default 1 check (revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_owner on public.invoices(user_id,updated_at desc,id);
alter table public.invoices enable row level security;
revoke all on public.invoices from public,anon,authenticated;
grant all on public.invoices to service_role;
create trigger guard_invoice_deletion before insert or update on public.invoices
  for each row execute function public.guard_deleting_account();

create function public.save_invoice(actor uuid, invoice_id uuid, expected_revision integer, invoice_document jsonb, invoice_summary jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare saved public.invoices;
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text,19));
  if actor is null or not exists(select 1 from auth.users where id=actor) then raise exception 'invoice_account_required'; end if;
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  if exists(select 1 from public.user_deletions where user_id=actor) then raise exception 'deletion_in_progress'; end if;
  if invoice_id is not null then
    select * into saved from public.invoices where id=invoice_id and user_id=actor for update;
    if not found then raise exception 'invoice_missing'; end if;
    if saved.revision<>expected_revision then raise exception 'invoice_conflict'; end if;
  end if;
  if not public.short_link_pro(actor) then raise exception 'invoice_pro_required'; end if;
  if invoice_id is null then
    if (select count(*) from public.invoices where user_id=actor)>=200 then raise exception 'invoice_limit'; end if;
    insert into public.invoices(user_id,document,summary) values(actor,invoice_document,invoice_summary) returning * into saved;
  else
    update public.invoices set document=invoice_document,summary=invoice_summary,revision=revision+1,updated_at=now()
      where id=invoice_id and user_id=actor returning * into saved;
  end if;
  return to_jsonb(saved)-'user_id';
end; $$;
create function public.delete_invoice(actor uuid, invoice_id uuid) returns boolean
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(actor::text,19));
  if exists(select 1 from public.account_controls where user_id=actor and suspended) then raise exception 'suspended'; end if;
  delete from public.invoices where id=invoice_id and user_id=actor;
  if not found then raise exception 'invoice_missing'; end if;
  return true;
end; $$;
revoke all on function public.save_invoice(uuid,uuid,integer,jsonb,jsonb),public.delete_invoice(uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_invoice(uuid,uuid,integer,jsonb,jsonb),public.delete_invoice(uuid,uuid) to service_role;
commit;
