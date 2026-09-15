// Local-only Supabase transport for SSR and reader browser tests. No external account is used.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
const userId = '00000000-0000-4000-8000-000000000099';
const postId = '00000000-0000-4000-8000-000000000080';
const user = {
  id: userId,
  email: 'reader@example.test',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'google' },
  user_metadata: { name: 'Journal Reader' },
  identities: [],
};
const now = Math.floor(Date.now() / 1000);
const token = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: userId, exp: now + 3600, iat: now, aud: 'authenticated', role: 'authenticated' },
  'fixture',
]
  .map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'))
  .join('.');
const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const published = {
  title: 'Make room for better paperwork.',
  slug: 'better-paperwork',
  excerpt:
    'A considered approach to the documents that shape your day. A few useful habits, a little less friction.',
  author: 'Folio editorial',
  category: 'Working better',
  tags: ['PDF', 'Productivity'],
  cover: 'https://images.example.test/journal.webp',
  coverAlt: 'An organized desk with documents and a plant',
  seoTitle: 'Better paperwork with Folio',
  seoDescription: 'Simple ways to organize, edit, and share everyday PDF documents.',
  featured: true,
  content: {
    type: 'doc',
    content: [
      paragraph(
        'Good work begins with a little clarity. Before you open another document, take a moment to consider what needs to happen next.',
      ),
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Give every document a home.' }],
      },
      paragraph(
        'Keep related files together, use names that make sense, and make it easy to pick up where you left off.',
      ),
      {
        type: 'blockquote',
        content: [paragraph('A small habit, repeated, can make the whole day feel lighter.')],
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Make the next step simple.' }],
      },
      paragraph(
        'Review the details, share a clear version, and keep only the files you still need. Your future self will thank you.',
      ),
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              { type: 'tableHeader', content: [paragraph('Habit')] },
              { type: 'tableHeader', content: [paragraph('Purpose')] },
            ],
          },
          {
            type: 'tableRow',
            content: [
              { type: 'tableCell', content: [paragraph('Name files clearly')] },
              { type: 'tableCell', content: [paragraph('Find the right document quickly')] },
            ],
          },
        ],
      },
    ],
  },
};
const rows = [
  {
    id: postId,
    published,
    public_slug: published.slug,
    status: 'published',
    published_at: '2026-08-13T12:00:00Z',
    published_updated_at: '2026-08-14T12:00:00Z',
    like_count: 17,
  },
  ...['Small steps, clearer documents.', 'A fresh start for your files.'].map((title, i) => ({
    id: `00000000-0000-4000-8000-00000000008${i + 1}`,
    published: { ...published, title, slug: `journal-story-${i + 1}`, featured: false },
    public_slug: `journal-story-${i + 1}`,
    status: 'published',
    published_at: '2026-08-12T12:00:00Z',
    published_updated_at: '2026-08-12T12:00:00Z',
    like_count: 4,
  })),
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 200).padStart(12, '0')}`,
    published: {
      ...published,
      title: `Pagination guide ${i + 1}`,
      slug: `pagination-guide-${i + 1}`,
      category: 'Pagination guides',
      featured: false,
    },
    public_slug: `pagination-guide-${i + 1}`,
    status: 'published',
    published_at: '2026-08-11T12:00:00Z',
    published_updated_at: '2026-08-11T12:00:00Z',
    like_count: 0,
  })),
  {
    id: 'private',
    published: { ...published, slug: 'secret-draft' },
    public_slug: 'secret-draft',
    status: 'draft',
    published_at: '2026-08-12T12:00:00Z',
    like_count: 0,
  },
  {
    id: 'future',
    published: { ...published, slug: 'scheduled-story' },
    public_slug: 'scheduled-story',
    status: 'published',
    published_at: '2100-01-01T12:00:00Z',
    like_count: 0,
  },
];
let liked = false;
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, 'http://127.0.0.1:54324');
  const send = (value, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(value));
  };
  if (url.pathname === '/auth/v1/authorize') {
    const callback = new URL(url.searchParams.get('redirect_to'));
    callback.searchParams.set('code', 'blog-fixture-code');
    res.writeHead(302, { location: callback.href });
    res.end();
    return;
  }
  if (url.pathname === '/auth/v1/token') {
    send({
      access_token: token,
      refresh_token: 'fixture-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user,
    });
    return;
  }
  if (url.pathname === '/auth/v1/user') {
    if (req.headers.authorization !== `Bearer ${token}`) {
      send({ message: 'Invalid token' }, 401);
      return;
    }
    send(user);
    return;
  }
  if (url.pathname === '/rest/v1/platform_settings') {
    send({
      id: true,
      pricing_version: 'initial',
      maintenance: false,
      maintenance_message: 'Maintenance',
      purchases_enabled: false,
      announcement: '',
    });
    return;
  }
  if (url.pathname === '/rest/v1/pricing_versions') {
    send({
      id: 'initial',
      name: 'Folio Pro',
      currency: 'usd',
      monthly_amount: 2500,
      trial_amount: 100,
      trial_days: 7,
      trial_enabled: true,
    });
    return;
  }
  if (url.pathname === '/rest/v1/account_controls') {
    send([]);
    return;
  }
  if (url.pathname === '/rest/v1/blog_likes') {
    send(liked ? [{ post_id: postId, user_id: userId }] : []);
    return;
  }
  if (url.pathname === '/rest/v1/rpc/blog_set_like') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (body.actor !== userId || body.target_post !== postId) {
      send({ message: 'blog_forbidden' }, 403);
      return;
    }
    liked = body.liked;
    rows[0].like_count = 17 + (liked ? 1 : 0);
    send({ liked, count: rows[0].like_count });
    return;
  }
  if (url.pathname === '/rest/v1/blog_posts') {
    let result = rows.filter((p) =>
      [...url.searchParams].every(([key, v]) => {
        const value = v.slice(v.indexOf('.') + 1);
        if (key === 'status') return p.status === value;
        if (key === 'public_slug') return p.public_slug === value;
        if (key === 'id') return p.id === value;
        if (key === 'published_at') return Date.parse(p.published_at) <= Date.parse(value);
        if (key === 'published->>title')
          return p.published.title.toLowerCase().includes(value.replaceAll('%', '').toLowerCase());
        if (key === 'published->>category') return p.published.category === value;
        return true;
      }),
    );
    const count = result.length,
      offset = Number(url.searchParams.get('offset') || 0);
    if (offset > 0 && offset >= count && req.headers.prefer?.includes('count=exact')) {
      send({ code: 'PGRST103', message: 'Requested range not satisfiable' }, 416);
      return;
    }
    result = result.slice(offset, offset + Number(url.searchParams.get('limit') || 1000));
    res.setHeader('content-range', `0-${Math.max(0, result.length - 1)}/${count}`);
    send(result);
    return;
  }
  send({ message: `Unimplemented fixture route: ${url.pathname}` }, 404);
});
await new Promise((resolve) => server.listen(54324, '127.0.0.1', resolve));
const env = {
  ...process.env,
  FOLIO_TEST_OUTPUT: 'auth',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54324',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-public',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service',
  NEXT_PUBLIC_SITE_URL: 'https://folio.example',
  NEXT_PUBLIC_INDEXABLE: 'true',
  LEMON_SQUEEZY_API_KEY: '',
  LEMON_SQUEEZY_WEBHOOK_SECRET: '',
  LEMON_SQUEEZY_STORE_ID: '',
  LEMON_SQUEEZY_MONTHLY_VARIANT_ID: '',
  LEMON_SQUEEZY_TRIAL_VARIANT_ID: '',
  LEMON_SQUEEZY_TEST_MODE: 'true',
  GOOGLE_TRANSLATION_PROJECT_ID: '',
  GOOGLE_TRANSLATION_CLIENT_EMAIL: '',
  GOOGLE_TRANSLATION_PRIVATE_KEY: '',
  CONVERTAPI_TOKEN: '',
  CLOUDCONVERT_API_KEY: '',
  DOCUMENT_RESULT_KEY: '',
};
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3001'],
  { env, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    child.kill(signal);
    server.close();
  });
child.on('exit', (code) => {
  server.close();
  process.exit(code ?? 0);
});
