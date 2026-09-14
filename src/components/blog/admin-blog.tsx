'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  LayoutDashboard,
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  FileText,
  Pencil,
  Copy,
  Trash2,
  RotateCcw,
  Heart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { accountFetch, authClient } from '@/lib/auth-client';
import { postStatus, type BlogSummary } from '@/lib/blog';
import { Logo } from '../logo';
import { Dropdown } from '../dropdown';
import { Skeleton, LoadingLabel } from '../skeleton';
import { BlogAccess, BlogDialog, BlogToast } from './admin-shared';
import s from './admin-blog.module.css';
export function AdminBlog() {
  return (
    <BlogAccess destination="/admin/blog">
      <PostManager />
    </BlogAccess>
  );
}
function PostManager() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogSummary[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null),
    [deleting, setDeleting] = useState<BlogSummary | null>(null),
    [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController(),
      current = ++generation.current;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      void accountFetch(
        `/api/admin/blog?${new URLSearchParams({ page: String(page), q: query, status })}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((data) => {
          if (current === generation.current) {
            setPosts(data.posts);
            setTotal(data.total);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, query, status, refresh]);
  const clearNotice = useCallback(() => setNotice(null), []);
  async function create(sourceId?: string) {
    setBusy(true);
    try {
      const { post } = await (
        await accountFetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: crypto.randomUUID(), sourceId }),
        })
      ).json();
      router.push(`/admin/blog/${post.id}`);
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : 'The draft could not be created.',
        error: true,
      });
      setBusy(false);
    }
  }
  async function change(post: BlogSummary, operation: 'trash' | 'restore') {
    setBusy(true);
    try {
      const { post: full } = await (await accountFetch(`/api/admin/blog/${post.id}`)).json();
      await accountFetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: post.version, draft: full.draft, operation }),
      });
      setDeleting(null);
      setRefresh((n) => n + 1);
      setNotice({
        text:
          operation === 'trash'
            ? 'Post moved to Trash. It is no longer public.'
            : 'Post restored as a private draft.',
      });
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : 'The post could not be updated.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <span className="admin-label">
          <ShieldCheck size={13} />
          SUPER ADMIN
        </span>
        <nav aria-label="Admin navigation">
          <Link href="/admin">
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link href="/admin/blog" aria-current="page">
            <BookOpen size={18} />
            Blog posts
          </Link>
        </nav>
        <Link className="admin-back" href="/blog">
          Open the journal
          <ArrowUpRight size={16} />
        </Link>
        <Link className="admin-back" href="/admin">
          All admin tools
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <main id="main" className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">FOLIO EDITORIAL</span>
            <h1>Blog posts</h1>
            <p className={s.intro}>A space for ideas that make paperwork a little better.</p>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await authClient()!.auth.signOut({ scope: 'local' });
                  if (result.error) throw result.error;
                  router.replace('/account');
                } catch {
                  setNotice({ text: 'Sign-out could not finish. Please try again.', error: true });
                  setBusy(false);
                }
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
            <button className="button primary" disabled={busy} onClick={() => void create()}>
              <Plus size={17} />
              New post
            </button>
          </div>
        </header>
        <section className={`admin-card ${s.manager}`}>
          <div className={s.managerToolbar}>
            <div className={s.managerSearch}>
              <Search size={17} />
              <input
                placeholder="Search posts…"
                aria-label="Search posts"
                value={query}
                maxLength={120}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Dropdown
              label="Post status"
              hideLabel
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All posts' },
                { value: 'draft', label: 'Drafts' },
                { value: 'published', label: 'Published' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'trashed', label: 'Trash' },
              ]}
            />
            <button
              className="icon-button"
              aria-label="Refresh posts"
              disabled={loading}
              onClick={() => setRefresh((n) => n + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {error ? (
            <div className={s.empty} role="alert">
              <BookOpen size={32} />
              <h2>We couldn’t open your posts.</h2>
              <p>{error}</p>
              <button className="button secondary" onClick={() => setRefresh((n) => n + 1)}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div aria-busy="true">
              <LoadingLabel>Loading blog posts…</LoadingLabel>
              {[0, 1, 2, 3, 4].map((i) => (
                <div className={s.postRow} aria-hidden="true" key={i}>
                  <Skeleton width={62} height={62} radius={8} />
                  <div className={s.postName}>
                    <Skeleton width="75%" height={15} />
                    <p>
                      <Skeleton width={120} height={10} />
                    </p>
                  </div>
                  <Skeleton width={65} height={25} radius={20} />
                  <Skeleton width={80} height={16} />
                </div>
              ))}
            </div>
          ) : !posts.length ? (
            <div className={s.empty}>
              <BookOpen size={38} />
              <h2>
                {query
                  ? 'No matching posts.'
                  : status === 'trashed'
                    ? 'Trash is empty.'
                    : 'Your next story starts here.'}
              </h2>
              <p>
                {query
                  ? 'Try another title or change the filter.'
                  : 'Create a draft, find the right words, and publish when you’re ready.'}
              </p>
              {!query && status !== 'trashed' && (
                <button className="button primary" disabled={busy} onClick={() => void create()}>
                  <Plus size={16} />
                  Write your first post
                </button>
              )}
            </div>
          ) : (
            <div>
              {posts.map((post) => (
                <article className={s.postRow} key={post.id}>
                  {post.draft.cover ? (
                    <img className={s.postThumb} src={post.draft.cover} alt="" />
                  ) : (
                    <span className={s.postThumb}>
                      <FileText size={24} />
                    </span>
                  )}
                  <div className={s.postName}>
                    {post.status === 'trashed' ? (
                      <strong>{post.draft.title || 'Untitled post'}</strong>
                    ) : (
                      <Link href={`/admin/blog/${post.id}`}>
                        {post.draft.title || 'Untitled post'}
                      </Link>
                    )}
                    <p>
                      {post.draft.category}{' '}
                      <span>· {new Date(post.updated_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className={s.rowStatus}>
                    <span className={`${s.badge} ${post.status === 'published' ? s.live : ''}`}>
                      {postStatus(post)}
                    </span>
                    {post.status === 'published' && post.version !== post.published_version && (
                      <small>Unpublished edits</small>
                    )}
                  </div>
                  <span className={s.rowLikes}>
                    <Heart size={13} />
                    {post.like_count}
                  </span>
                  <div className={s.rowActions}>
                    {post.status === 'trashed' ? (
                      <button
                        aria-label={`Restore ${post.draft.title || 'post'}`}
                        title="Restore as draft"
                        disabled={busy}
                        onClick={() => void change(post, 'restore')}
                      >
                        <RotateCcw size={17} />
                      </button>
                    ) : (
                      <>
                        <Link
                          href={`/admin/blog/${post.id}`}
                          aria-label={`Edit ${post.draft.title || 'post'}`}
                          title="Edit post"
                        >
                          <Pencil size={17} />
                        </Link>
                        <button
                          aria-label={`Duplicate ${post.draft.title || 'post'}`}
                          title="Duplicate as draft"
                          disabled={busy}
                          onClick={() => void create(post.id)}
                        >
                          <Copy size={17} />
                        </button>
                        <button
                          aria-label={`Trash ${post.draft.title || 'post'}`}
                          title="Move to Trash"
                          disabled={busy}
                          onClick={() => setDeleting(post)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && (
            <footer className={s.listFooter}>
              <span>
                {total} {total === 1 ? 'post' : 'posts'}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous posts"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>Page {page}</span>
                <button
                  className="icon-button"
                  aria-label="Next posts"
                  disabled={total <= page * 15}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          )}
        </section>
      </main>
      <BlogToast notice={notice} onClose={clearNotice} />
      {deleting && (
        <BlogDialog
          title="Move this post to Trash?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setDeleting(null)}
              >
                Keep post
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void change(deleting, 'trash')}
              >
                {busy ? 'Moving…' : 'Move to Trash'}
              </button>
            </>
          }
        >
          <p>
            “{deleting.draft.title || 'Untitled post'}” will be removed from the public blog. You
            can restore it as a draft from Trash.
          </p>
        </BlogDialog>
      )}
    </div>
  );
}
