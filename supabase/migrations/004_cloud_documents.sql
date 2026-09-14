-- Private account library. Apply after 003 in the Supabase SQL editor.
begin;
create table public.cloud_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 5 and 160),
  object_path text not null unique,
  size bigint not null check (size between 1 and 52428800),
  status text not null default 'pending' check (status in ('pending','ready','deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cloud_documents_owner on public.cloud_documents(user_id, updated_at desc);
alter table public.cloud_documents enable row level security;
revoke all on public.cloud_documents from public, anon, authenticated;
grant all on public.cloud_documents to service_role;

-- Pending uploads reserve the maximum object size, so an understated client size
-- cannot bypass the account limit. Failed uploads remain visible for retry/removal.
create function public.reserve_cloud_document(actor uuid, file_name text, file_size bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  doc public.cloud_documents;
  used_bytes bigint;
  used_count bigint;
  file_id uuid := gen_random_uuid();
begin
  if file_size < 1 or file_size > 52428800 or length(file_name) not between 5 and 160 then
    raise exception 'invalid_file';
  end if;
  if exists(select 1 from public.account_controls where user_id = actor and suspended) then
    raise exception 'suspended';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 17));
  select coalesce(sum(case when status = 'ready' then size else 52428800 end),0), count(*)
    into used_bytes, used_count from public.cloud_documents where user_id = actor;
  if used_bytes + 52428800 > 524288000 or used_count >= 200 then
    raise exception 'storage_limit';
  end if;
  insert into public.cloud_documents(id,user_id,name,object_path,size)
    values(file_id,actor,file_name,actor::text || '/' || file_id::text || '.pdf',file_size)
    returning * into doc;
  return to_jsonb(doc);
end;
$$;
revoke all on function public.reserve_cloud_document(uuid,text,bigint) from public, anon, authenticated;
grant execute on function public.reserve_cloud_document(uuid,text,bigint) to service_role;

create function public.cloud_storage_access(object_name text, uploading boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cloud_documents d
    where d.object_path = object_name and d.user_id = (select auth.uid())
      and ((uploading and d.status = 'pending' and d.created_at > now() - interval '24 hours')
        or (not uploading and d.status = 'ready'))
      and not exists(select 1 from public.account_controls c where c.user_id=d.user_id and c.suspended)
  );
$$;
revoke all on function public.cloud_storage_access(text,boolean) from public, anon;
grant execute on function public.cloud_storage_access(text,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('folio-documents','folio-documents',false,52428800,array['application/pdf'])
on conflict(id) do update set public=false, file_size_limit=52428800, allowed_mime_types=array['application/pdf'];

create policy folio_upload on storage.objects for insert to authenticated
  with check(bucket_id='folio-documents' and public.cloud_storage_access(name,true));
create policy folio_read on storage.objects for select to authenticated
  using(bucket_id='folio-documents' and public.cloud_storage_access(name,false));
-- Restrictive policies protect this bucket even if another bucket has a broad policy.
create policy folio_upload_guard on storage.objects as restrictive for insert to authenticated
  with check(bucket_id<>'folio-documents' or public.cloud_storage_access(name,true));
create policy folio_read_guard on storage.objects as restrictive for select to authenticated
  using(bucket_id<>'folio-documents' or public.cloud_storage_access(name,false));
create policy folio_no_update on storage.objects as restrictive for update to authenticated
  using(bucket_id<>'folio-documents') with check(bucket_id<>'folio-documents');
create policy folio_no_delete on storage.objects as restrictive for delete to authenticated
  using(bucket_id<>'folio-documents');
create policy folio_no_anon on storage.objects as restrictive for all to anon
  using(bucket_id<>'folio-documents') with check(bucket_id<>'folio-documents');
commit;
