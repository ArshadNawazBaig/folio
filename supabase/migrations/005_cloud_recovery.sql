-- Cloud-only checkout recovery. One bounded slot per tool per authenticated user.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('folio-recovery','folio-recovery',false,41943040,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=41943040,allowed_mime_types=array['application/json'];

create function public.cloud_recovery_access(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and split_part(object_name,'/',1) = (select auth.uid())::text
    and object_name in (
      (select auth.uid())::text || '/pro-text.json',
      (select auth.uid())::text || '/translate-pdf.json',
      (select auth.uid())::text || '/pdf-to-word.json',
      (select auth.uid())::text || '/pdf-to-excel.json',
      (select auth.uid())::text || '/pdf-to-powerpoint.json'
    )
    and not exists(select 1 from public.account_controls where user_id=(select auth.uid()) and suspended);
$$;
revoke all on function public.cloud_recovery_access(text) from public,anon;
grant execute on function public.cloud_recovery_access(text) to authenticated;

create policy folio_recovery_owner on storage.objects for all to authenticated
  using(bucket_id='folio-recovery' and public.cloud_recovery_access(name))
  with check(bucket_id='folio-recovery' and public.cloud_recovery_access(name));
create policy folio_recovery_guard on storage.objects as restrictive for all to authenticated
  using(bucket_id<>'folio-recovery' or public.cloud_recovery_access(name))
  with check(bucket_id<>'folio-recovery' or public.cloud_recovery_access(name));
create policy folio_recovery_no_anon on storage.objects as restrictive for all to anon
  using(bucket_id<>'folio-recovery') with check(bucket_id<>'folio-recovery');
commit;
