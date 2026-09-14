-- Apply after 008. Drafts and revisions are accessible only through authenticated admin routes.
create table public.blog_posts (
  id uuid primary key,
  draft jsonb not null,
  published jsonb,
  public_slug text unique,
  status text not null default 'draft' check(status in ('draft','published','trashed')),
  version integer not null default 1,
  published_version integer,
  published_at timestamptz,
  published_updated_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  like_count integer not null default 0 check(like_count >= 0),
  check(jsonb_typeof(draft)='object' and octet_length(draft::text) <= 1048576)
);
create index blog_posts_public on public.blog_posts(published_at desc,id) where status='published';
create index blog_posts_admin on public.blog_posts(status,updated_at desc);
create table public.blog_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  version integer not null,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  unique(post_id,version)
);
create table public.blog_likes (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create index blog_likes_user on public.blog_likes(user_id);
do $$ declare t text; begin
  foreach t in array array['blog_posts','blog_revisions','blog_likes'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

create function public.blog_save(actor uuid, post_id uuid, expected_version integer, draft_value jsonb, operation text default 'save', publish_time timestamptz default null)
returns jsonb language plpgsql set search_path=public as $$
declare p blog_posts; begin
  perform assert_super_admin(actor);
  if operation not in ('save','publish','unpublish','trash','restore') then raise exception 'blog_invalid'; end if;
  if jsonb_typeof(draft_value)<>'object' or octet_length(draft_value::text)>1048576 then raise exception 'blog_invalid'; end if;
  -- Serialize first saves as well as edits. Versions prevent lost updates from another tab.
  perform pg_advisory_xact_lock(hashtextextended(post_id::text, 19));
  select * into p from blog_posts where id=post_id for update;
  if not found then
    if expected_version<>0 or operation<>'save' then raise exception 'blog_missing'; end if;
    insert into blog_posts(id,draft,created_by) values(post_id,draft_value,actor) returning * into p;
  else
    if p.version<>expected_version then raise exception 'blog_conflict'; end if;
    if p.status='trashed' and operation not in ('restore','trash') then raise exception 'blog_trashed'; end if;
    insert into blog_revisions(post_id,version,draft) values(p.id,p.version,p.draft);
    update blog_posts set draft=draft_value,version=version+1,updated_at=now() where id=p.id returning * into p;
  end if;
  if operation='publish' then
    if length(trim(draft_value->>'title'))<3 or coalesce(draft_value->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'blog_invalid'; end if;
    -- A saved edit never changes the live article until explicitly published.
    update blog_posts set status='published',published=draft_value,public_slug=draft_value->>'slug',published_version=version,
      published_at=coalesce(publish_time,p.published_at,now()),published_updated_at=now() where id=p.id returning * into p;
  elsif operation in ('unpublish','restore') then
    update blog_posts set status='draft' where id=p.id returning * into p;
  elsif operation='trash' then
    update blog_posts set status='trashed' where id=p.id returning * into p;
  end if;
  delete from blog_revisions where id in (select id from blog_revisions where blog_revisions.post_id=p.id order by version desc offset 30);
  if operation<>'save' or expected_version=0 then
    insert into admin_audit(actor_id,action,target,detail) values(actor,'blog.' || case when expected_version=0 then 'create' else operation end,p.id::text,jsonb_build_object('title',draft_value->>'title','version',p.version));
  end if;
  return to_jsonb(p)-'published'-'created_by'-'published_updated_at';
end $$;

-- Maintain counts on unlike and account deletion too. One row per user prevents repeat likes.
create function public.blog_like_count() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then update blog_posts set like_count=like_count+1 where id=new.post_id; return new;
  else update blog_posts set like_count=greatest(0,like_count-1) where id=old.post_id; return old; end if;
end $$;
create trigger blog_like_counter after insert or delete on public.blog_likes for each row execute function public.blog_like_count();
create function public.blog_set_like(actor uuid, target_post uuid, liked boolean) returns jsonb language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from auth.users where id=actor) or exists(select 1 from account_controls where user_id=actor and suspended) then raise exception 'blog_forbidden'; end if;
  perform 1 from blog_posts where id=target_post and status='published' and published_at<=now() for update;
  if not found then raise exception 'blog_missing'; end if;
  if liked then insert into blog_likes(post_id,user_id) values(target_post,actor) on conflict do nothing;
  else delete from blog_likes where post_id=target_post and user_id=actor; end if;
  return jsonb_build_object('liked',liked,'count',(select like_count from blog_posts where id=target_post));
end $$;
revoke all on function public.blog_save(uuid,uuid,integer,jsonb,text,timestamptz),public.blog_set_like(uuid,uuid,boolean),public.blog_like_count() from public,anon,authenticated;
grant execute on function public.blog_save(uuid,uuid,integer,jsonb,text,timestamptz),public.blog_set_like(uuid,uuid,boolean) to service_role;

-- Editorial images are separate from users' private PDF storage. Only the server uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('folio-blog','folio-blog',true,5242880,array['image/webp']) on conflict(id) do nothing;
create policy folio_blog_no_client_insert on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'folio-blog');
create policy folio_blog_no_client_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'folio-blog') with check(bucket_id<>'folio-blog');
create policy folio_blog_no_client_delete on storage.objects as restrictive for delete to anon,authenticated
  using(bucket_id<>'folio-blog');
