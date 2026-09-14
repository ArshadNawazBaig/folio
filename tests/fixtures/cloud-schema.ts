// Minimal Supabase Storage schema for local policy tests. No remote service is used.
export const cloudTestSchema = `
create schema storage;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,owner_id text);
alter table storage.objects enable row level security;
grant usage on schema storage,auth to anon,authenticated,service_role;
grant all on storage.objects to anon,authenticated,service_role;
grant all on storage.buckets to service_role;
`;
