-- Apply after migrations 001 through 006. Does not delete existing accounts.
begin;

-- Keep a minimal tombstone after deletion so retries are safe and old JWTs
-- cannot recreate recovery objects. No email, document contents or profile.
create table public.user_deletions (
  user_id uuid primary key,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'deleting' check (status in ('deleting','deleted')),
  reason text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.user_deletions enable row level security;
revoke all on public.user_deletions from public, anon, authenticated;
grant all on public.user_deletions to service_role;

create function public.begin_user_deletion(actor uuid, target_user uuid, reason_text text)
returns jsonb language plpgsql set search_path = '' as $$
declare job public.user_deletions;
begin
  perform public.assert_super_admin(actor);
  if actor=target_user or exists(select 1 from public.super_admins where user_id=target_user) then
    raise exception 'protected_admin';
  end if;
  if length(trim(reason_text))<3 or length(reason_text)>500 then raise exception 'invalid_action'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_user::text,17));
  select * into job from public.user_deletions where user_id=target_user for update;
  if found then return to_jsonb(job); end if;
  if not exists(select 1 from auth.users where id=target_user) then raise exception 'user_missing'; end if;
  if exists(select 1 from public.billing_customers where user_id=target_user and checkout_lock_until>now()) then
    raise exception 'deletion_checkout_busy';
  end if;
  insert into public.user_deletions(user_id,requested_by,reason)
    values(target_user,actor,trim(reason_text)) returning * into job;
  insert into public.account_controls(user_id,suspended,reason)
    values(target_user,true,'Account deletion in progress')
    on conflict(user_id) do update set suspended=true,reason=excluded.reason,updated_at=now();
  update public.cloud_documents set status='deleting' where user_id=target_user;
  return to_jsonb(job);
end;
$$;

-- Serialize writes with deletion and block reactivation, new uploads, checkout
-- records and support/grant writes once permanent deletion has started.
create function public.guard_deleting_account() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,17));
  if exists(select 1 from public.user_deletions where user_id=new.user_id) then
    if tg_table_name='account_controls' and (to_jsonb(new)->>'suspended')::boolean then return new; end if;
    if tg_table_name='cloud_documents' and to_jsonb(new)->>'status'='deleting' then return new; end if;
    raise exception 'deletion_in_progress';
  end if;
  return new;
end;
$$;
create trigger guard_cloud_deletion before insert or update on public.cloud_documents
  for each row execute function public.guard_deleting_account();
create trigger guard_account_activation before insert or update on public.account_controls
  for each row execute function public.guard_deleting_account();
create trigger guard_billing_deletion before insert or update on public.billing_customers
  for each row execute function public.guard_deleting_account();
create trigger guard_support_deletion before insert or update on public.support_tickets
  for each row execute function public.guard_deleting_account();
create trigger guard_grant_deletion before insert or update on public.access_grants
  for each row execute function public.guard_deleting_account();

-- Storage bytes are removed using the Storage API, never by deleting its SQL
-- metadata. Include claimed guest PDFs and orphaned uploads in the user folder.
create function public.user_deletion_objects(actor uuid, target_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_super_admin(actor);
  if not exists(select 1 from public.user_deletions where user_id=target_user and status='deleting') then
    raise exception 'deletion_not_started';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name)) from (
    select o.bucket_id,o.name from storage.objects o
      where o.bucket_id in ('folio-documents','folio-recovery')
        and (split_part(o.name,'/',1)=target_user::text or o.owner_id=target_user::text
          or (o.bucket_id='folio-documents' and exists(
            select 1 from public.cloud_documents d where d.user_id=target_user and d.object_path=o.name)))
    union select 'folio-documents',object_path from public.cloud_documents where user_id=target_user
  ) objects),'[]'::jsonb);
end;
$$;

-- Auth deletion cascades billing, workspace, quota and grant rows. These extra
-- references otherwise retain support text or prevent auth.users deletion.
create function public.cleanup_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.super_admins where user_id=old.id) then raise exception 'protected_admin'; end if;
  delete from public.admin_audit where actor_id=old.id or target=old.id::text
    or target in (select id::text from public.support_tickets where user_id=old.id
      or (user_id is null and lower(email)=lower(old.email)))
    or target in (select stripe_subscription_id from public.billing_subscriptions where user_id=old.id);
  delete from public.support_tickets where user_id=old.id
    or (user_id is null and lower(email)=lower(old.email));
  delete from public.support_messages where author_id=old.id;
  update public.access_grants set granted_by=null where granted_by=old.id;
  -- Complete the job in the same transaction as Auth deletion. A lost HTTP
  -- response must not leave an invisible pending job after the user disappears.
  with completed as (
    update public.user_deletions set status='deleted',completed_at=now()
      where user_id=old.id and status='deleting' returning requested_by,reason
  ) insert into public.admin_audit(actor_id,action,target,detail)
      select requested_by,'user.delete',old.id::text,jsonb_build_object('reason',reason) from completed;
  return old;
end;
$$;
create trigger folio_cleanup_deleted_user before delete on auth.users
  for each row execute function public.cleanup_deleted_user();

create function public.finish_user_deletion(actor uuid, target_user uuid)
returns void language plpgsql set search_path = '' as $$
declare job public.user_deletions;
begin
  perform public.assert_super_admin(actor);
  select * into job from public.user_deletions where user_id=target_user for update;
  if not found then raise exception 'deletion_not_started'; end if;
  if job.status='deleted' then return; end if;
  if exists(select 1 from auth.users where id=target_user) then raise exception 'deletion_incomplete'; end if;
  update public.user_deletions set status='deleted',completed_at=now() where user_id=target_user;
  insert into public.admin_audit(actor_id,action,target,detail)
    values(actor,'user.delete',target_user::text,jsonb_build_object('reason',job.reason));
end;
$$;

create or replace function public.admin_users(actor uuid, query_text text, page_number integer)
returns jsonb language plpgsql set search_path=public as $$
begin
  perform assert_super_admin(actor);
  if page_number<1 or length(query_text)>120 then raise exception 'invalid_query'; end if;
  return jsonb_build_object('total',(select count(*) from auth.users u where position(lower(query_text) in lower(coalesce(u.email,'')||u.id::text))>0),
    'rows',coalesce((select jsonb_agg(row_to_json(r)) from (
      select u.id,u.email,u.created_at,u.last_sign_in_at,coalesce(c.suspended,false) as suspended,
        (a.user_id is not null) as is_admin,g.until_at as grant_until,
        (d.status='deleting') is true as deletion_pending
      from auth.users u left join account_controls c on c.user_id=u.id
        left join super_admins a on a.user_id=u.id left join access_grants g on g.user_id=u.id
        left join user_deletions d on d.user_id=u.id
      where position(lower(query_text) in lower(coalesce(u.email,'')||u.id::text))>0
      order by u.created_at desc,u.id limit 25 offset (page_number-1)*25
    ) r),'[]'::jsonb));
end;
$$;

-- A deleted account's previously issued JWT must not recreate recovery files.
create function public.recovery_account_exists() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=(select auth.uid()))
    and not exists(select 1 from public.user_deletions where user_id=(select auth.uid()));
$$;
revoke all on function public.recovery_account_exists() from public,anon;
grant execute on function public.recovery_account_exists() to authenticated;
create policy folio_recovery_deleted_user on storage.objects as restrictive for all to authenticated
  using(bucket_id<>'folio-recovery' or public.recovery_account_exists())
  with check(bucket_id<>'folio-recovery' or public.recovery_account_exists());

revoke all on function public.begin_user_deletion(uuid,uuid,text),public.user_deletion_objects(uuid,uuid),public.finish_user_deletion(uuid,uuid),public.guard_deleting_account(),public.cleanup_deleted_user() from public,anon,authenticated;
grant execute on function public.begin_user_deletion(uuid,uuid,text),public.user_deletion_objects(uuid,uuid),public.finish_user_deletion(uuid,uuid) to service_role;
commit;
