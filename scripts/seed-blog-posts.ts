import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { starterPosts } from '../content/blog/starter-posts';
import { blogDraftSchema, blogText, publicationError } from '../src/lib/blog';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';

// This is an explicit editorial import, never an application-startup seed.
// Default: validate locally. --drafts saves private drafts; --publish makes them public.
const { values } = parseArgs({
  options: {
    check: { type: 'boolean' },
    drafts: { type: 'boolean' },
    publish: { type: 'boolean' },
    only: { type: 'string' },
  },
});
if ([values.check, values.drafts, values.publish].filter(Boolean).length > 1)
  throw new Error('Use --check (default), --drafts, or --publish, optionally with --only <slug>.');
const publish = values.publish === true;
const write = publish || values.drafts === true;
const selectedPosts =
  values.only === undefined
    ? starterPosts
    : starterPosts.filter((post) => post.draft.slug === values.only);
if (!selectedPosts.length) throw new Error('The --only slug must match an editorial article.');

const allowedPaths = new Set([
  '/tools',
  '/convert',
  '/pricing',
  '/privacy',
  ...tools.map((tool) => `/${tool.slug}`),
  ...guides.map((guide) => `/guides/${guide.slug}`),
  ...starterPosts.map((post) => `/blog/${post.draft.slug}`),
]);
const ids = new Set<string>();
const slugs = new Set<string>();
for (const post of starterPosts) {
  blogDraftSchema.parse(post.draft);
  const invalid = publicationError(post.draft);
  if (invalid) throw new Error(`${post.draft.slug}: ${invalid}`);
  if (ids.has(post.id) || slugs.has(post.draft.slug)) throw new Error('Duplicate editorial post.');
  ids.add(post.id);
  slugs.add(post.draft.slug);
  const words = blogText(post.draft.content).split(/\s+/).filter(Boolean).length;
  if (words < 600) throw new Error(`${post.draft.slug}: article is shorter than 600 words.`);
  const serialized = JSON.stringify(post.draft.content);
  for (const match of serialized.matchAll(/"href":"(\/[^"]+)"/g)) {
    if (!allowedPaths.has(match[1])) throw new Error(`Unknown article link: ${match[1]}`);
  }
  if ('file' in post.image) {
    const source = readFileSync(post.image.file);
    if (
      !source.length ||
      source.length > 5 * 1024 * 1024 ||
      !serialized.includes(post.image.credit)
    )
      throw new Error('Each local cover must be under 5 MB and include its editorial credit.');
  } else if (
    new URL(post.draft.cover).hostname !== 'images.unsplash.com' ||
    new URL(post.image.page).hostname !== 'unsplash.com' ||
    !serialized.includes(post.image.page)
  )
    throw new Error('Each article must include its Unsplash cover and credit.');
  console.log(`Validated: ${post.draft.title} (${words} words)`);
}

async function importPosts() {
  nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configure the existing Supabase URL and service role key.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admins, error: adminError } = await db.from('super_admins').select('user_id');
  if (adminError) throw new Error('Could not verify the super admin account.');
  const configuredActor = process.env.FOLIO_BLOG_ACTOR_ID;
  const actor = configuredActor || (admins?.length === 1 ? admins[0].user_id : null);
  if (!actor || !admins?.some((admin) => admin.user_id === actor))
    throw new Error('Set FOLIO_BLOG_ACTOR_ID to an existing super admin UUID for this command.');
  const { error: accessError } = await db.rpc('assert_super_admin', { actor });
  if (accessError) throw new Error('The selected super admin is not allowed to publish.');
  const { data: bucket, error: bucketError } = await db.storage.getBucket('folio-blog');
  if (bucketError || !bucket?.public) throw new Error('Apply 009_blog.sql before importing posts.');

  for (const post of selectedPosts) {
    const { data: matches, error: lookupError } = await db
      .from('blog_posts')
      .select('id,status,version,draft')
      .or(`id.eq.${post.id},public_slug.eq.${post.draft.slug},draft->>slug.eq.${post.draft.slug}`);
    if (lookupError) throw new Error('Blog storage is unavailable. Apply 009_blog.sql first.');
    if (matches?.some((match) => match.id !== post.id)) {
      console.log(`Skipped existing slug: ${post.draft.slug}`);
      continue;
    }
    let saved = matches?.[0];
    if (saved && saved.status !== 'draft') {
      console.log(`Kept existing ${saved.status} post: ${post.draft.slug}`);
      continue;
    }
    const path = `${post.id}/${'file' in post.image ? '' : 'unsplash-'}${post.image.id}.webp`;
    const cover = db.storage.from('folio-blog').getPublicUrl(path).data.publicUrl;
    const draft = blogDraftSchema.parse({ ...post.draft, cover });
    if (saved && !isDeepStrictEqual(saved.draft, draft)) {
      console.log(`Kept edited draft: ${post.draft.slug}`);
      continue;
    }
    if (!saved) {
      let source: Buffer;
      if ('file' in post.image) {
        source = readFileSync(post.image.file);
      } else {
        const response = await fetch(post.draft.cover, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
          throw new Error(`Could not download the Unsplash cover for ${post.draft.slug}.`);
        source = Buffer.from(await response.arrayBuffer());
      }
      if (source.byteLength > 5 * 1024 * 1024) throw new Error('Source image exceeds 5 MB.');
      const image = await sharp(source, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(1600, 1067, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
      const { error: uploadError } = await db.storage.from('folio-blog').upload(path, image, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      });
      // A previous interrupted import may have uploaded this immutable cover already.
      if (uploadError && !/already exists|duplicate/i.test(uploadError.message))
        throw new Error(`Could not upload the cover for ${post.draft.slug}.`);
      const coverResponse = await fetch(cover, { signal: AbortSignal.timeout(15000) });
      if (!coverResponse.ok || !coverResponse.headers.get('content-type')?.startsWith('image/'))
        throw new Error(`The stored cover for ${post.draft.slug} is not readable.`);
      await coverResponse.body?.cancel();
      const { data, error } = await db.rpc('blog_save', {
        actor,
        post_id: post.id,
        expected_version: 0,
        draft_value: draft,
        operation: 'save',
      });
      if (error) throw new Error(`Could not save ${post.draft.slug} (${error.code}).`);
      saved = data;
      console.log(`Created draft: ${post.draft.slug}`);
    }
    if (publish && saved) {
      const { error } = await db.rpc('blog_save', {
        actor,
        post_id: post.id,
        expected_version: saved.version,
        draft_value: draft,
        operation: 'publish',
        publish_time: new Date().toISOString(),
      });
      if (error) throw new Error(`Could not publish ${post.draft.slug} (${error.code}).`);
      console.log(`Published: /blog/${post.draft.slug}`);
    }
  }
  const { data: result, error } = await db
    .from('blog_posts')
    .select('id,status,public_slug,published_at')
    .in(
      'id',
      selectedPosts.map((post) => post.id),
    );
  if (error) throw new Error('Could not verify the imported posts.');
  console.log(`Verified ${result?.length || 0} editorial posts in Supabase.`);
}

if (write) {
  try {
    await importPosts();
  } catch (error) {
    // Do not log connection objects or credentials.
    console.error(error instanceof Error ? error.message : 'The editorial import failed.');
    process.exitCode = 1;
  }
} else {
  console.log('Validation complete. No database changes were made.');
}
