'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import {
  ArrowLeft,
  ArrowUpRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Minus,
  Table2,
  Code2,
  Eye,
  Pencil,
  Save,
  Send,
  Settings2,
  X,
  Upload,
  Check,
  Loader2,
  History,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Pagination } from '../pagination';
import { PAGE_SIZE, pageCount } from '@/lib/pagination.mjs';
import { accountFetch } from '@/lib/auth-client';
import {
  blogDraftSchema,
  blogSlug,
  blogText,
  safeBlogUrl,
  readingMinutes,
  publicationError,
  postStatus,
  type BlogDraft,
  type BlogPost,
  type BlogRevision,
  type RichNode,
} from '@/lib/blog';
import { Logo } from '../logo';
import { Dropdown } from '../dropdown';
import { Skeleton, LoadingLabel } from '../skeleton';
import { BlogAccess, BlogDialog, BlogToast } from './admin-shared';
import { RichContent } from './rich-content';
import s from './admin-blog.module.css';
import reading from './blog.module.css';

export function BlogEditor({ id }: { id: string }) {
  return (
    <BlogAccess destination={`/admin/blog/${id}`}>
      <LoadEditor key={id} id={id} />
    </BlogAccess>
  );
}
function LoadEditor({ id }: { id: string }) {
  const [post, setPost] = useState<BlogPost | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    void accountFetch(`/api/admin/blog/${id}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setPost(data.post))
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return (
      <main id="main" className={s.access}>
        <div className="account-card">
          <h1>This draft needs a moment.</h1>
          <p role="alert">{error}</p>
          <button className="button primary" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
          <Link className="button secondary" href="/admin/blog">
            Back to posts
          </Link>
        </div>
      </main>
    );
  if (!post)
    return (
      <main id="main" className={s.editor} aria-busy="true">
        <LoadingLabel>Opening your post…</LoadingLabel>
        <header className={s.editorHeader}>
          <Logo />
          <Skeleton width={180} height={16} />
        </header>
        <div className={s.toolbar}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} width={34} height={34} />
          ))}
        </div>
        <div className={s.editorBody}>
          <div className={s.canvas}>
            <div className={s.paper}>
              <Skeleton width="72%" height={55} />
              <p>
                <Skeleton height={15} />
              </p>
              <Skeleton height={250} />
            </div>
          </div>
          <aside className={s.inspector}>
            <Skeleton height={40} />
            <p>
              <Skeleton height={42} />
            </p>
            <Skeleton height={150} />
          </aside>
        </div>
      </main>
    );
  if (post.status === 'trashed')
    return (
      <main id="main" className={s.access}>
        <div className="account-card">
          <h1>This post is in Trash.</h1>
          <p>Restore it from the post manager to continue editing.</p>
          <Link className="button primary" href="/admin/blog">
            Manage posts
          </Link>
        </div>
      </main>
    );
  return <WritingWorkspace initial={post} />;
}
function WritingWorkspace({ initial }: { initial: BlogPost }) {
  const router = useRouter();
  const [post, setPost] = useState(initial),
    [draft, setDraft] = useState(initial.draft),
    [savedValue, setSavedValue] = useState(JSON.stringify(initial.draft)),
    [tagText, setTagText] = useState(initial.draft.tags.join(', ')),
    [phase, setPhase] = useState<'saved' | 'saving' | 'error'>('saved'),
    [preview, setPreview] = useState(false),
    [panel, setPanel] = useState(true),
    [focus, setFocus] = useState(false),
    [tab, setTab] = useState('post');
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null),
    [modal, setModal] = useState<
      'publish' | 'link' | 'image' | 'leave' | 'unpublish' | 'revision' | null
    >(null),
    [url, setUrl] = useState(''),
    [alt, setAlt] = useState(''),
    [schedule, setSchedule] = useState(''),
    [uploading, setUploading] = useState(false),
    [revisions, setRevisions] = useState<BlogRevision[]>([]),
    [revisionPageSize, setRevisionPageSize] = useState(PAGE_SIZE),
    [revisionPage, setRevisionPage] = useState(1),
    [revisionTotal, setRevisionTotal] = useState(0),
    [historyLoading, setHistoryLoading] = useState(false),
    [revision, setRevision] = useState<BlogRevision | null>(null);
  const [, redraw] = useState(0);
  const current = useRef(initial.draft),
    record = useRef(initial),
    saved = useRef(JSON.stringify(initial.draft)),
    inflight = useRef<Promise<boolean> | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    imageTarget = useRef<'cover' | 'body'>('body');
  const autoSlug = useRef(initial.draft.slug.startsWith('untitled-'));
  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) setPanel(false);
  }, []);
  const clearNotice = useCallback(() => setNotice(null), []);
  const update = useCallback((patch: Partial<BlogDraft>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    setDraft(next);
  }, []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
        },
      }),
      ImageExtension.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Placeholder.configure({ placeholder: 'Start with a good idea. Write your story here…' }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: initial.draft.content,
    editorProps: {
      attributes: {
        class: 'blog-writing-content',
        role: 'textbox',
        'aria-label': 'Post content',
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: instance }) => update({ content: instance.getJSON() as RichNode }),
    onTransaction: () => redraw((n) => n + 1),
  });
  const dirty = JSON.stringify(draft) !== savedValue;
  const save = useCallback(
    async (
      operation: 'save' | 'publish' | 'unpublish' = 'save',
      announce = false,
      publishAt: string | null = null,
    ): Promise<boolean> => {
      while (inflight.current) {
        const ok = await inflight.current;
        if (!ok) return false;
      }
      const snapshot = current.current,
        serialized = JSON.stringify(snapshot);
      if (operation === 'save' && serialized === saved.current) {
        if (announce) setNotice({ text: 'Your latest changes are already saved.' });
        return true;
      }
      const parsed = blogDraftSchema.safeParse(snapshot);
      const message = !parsed.success
        ? 'Review the post settings, image URLs, and content before saving.'
        : operation === 'publish'
          ? publicationError(snapshot)
          : '';
      if (message) {
        setPhase('error');
        setNotice({ text: message, error: true });
        return false;
      }
      setPhase('saving');
      const pending = (async () => {
        try {
          const { post: result } = await (
            await accountFetch(`/api/admin/blog/${initial.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                version: record.current.version,
                draft: snapshot,
                operation,
                publishAt,
              }),
            })
          ).json();
          record.current = result;
          setPost(result);
          saved.current = serialized;
          setSavedValue(serialized);
          setPhase('saved');
          if (announce)
            setNotice({
              text:
                operation === 'publish'
                  ? postStatus(result) === 'Scheduled'
                    ? 'Post scheduled. It will become public at the chosen time.'
                    : 'Your post is published.'
                  : operation === 'unpublish'
                    ? 'Post unpublished. Your draft is still saved.'
                    : 'Your draft has been saved.',
            });
          return true;
        } catch (e) {
          setPhase('error');
          setNotice({
            text:
              e instanceof Error
                ? e.message
                : 'Your changes could not be saved. Keep this tab open and try again.',
            error: true,
          });
          return false;
        } finally {
          inflight.current = null;
        }
      })();
      inflight.current = pending;
      return pending;
    },
    [initial.id],
  );
  useEffect(() => {
    if (!dirty || phase === 'saving' || phase === 'error') return;
    const timer = setTimeout(() => void save(), 2000);
    return () => clearTimeout(timer);
  }, [draft, dirty, phase, save]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(current.current) !== saved.current || inflight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save('save', true);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', shortcut);
    };
  }, [save]);
  async function upload(file: File, target: 'cover' | 'body') {
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ text: 'Choose an image under 5 MB.', error: true });
      return;
    }
    setUploading(true);
    try {
      const data = await (
        await accountFetch(`/api/admin/blog/${initial.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
      ).json();
      if (target === 'cover') update({ cover: data.url });
      else setUrl(data.url);
      setNotice({ text: 'Image uploaded.' });
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : 'The image could not be uploaded.',
        error: true,
      });
    } finally {
      setUploading(false);
    }
  }
  async function history(page = 1, pageSize = revisionPageSize) {
    setRevisionPage(page);
    setRevisionPageSize(pageSize);
    setTab('history');
    setHistoryLoading(true);
    try {
      const data = await (
        await accountFetch(
          `/api/admin/blog/${initial.id}/revisions?page=${page}&pageSize=${pageSize}`,
        )
      ).json();
      setRevisions(data.revisions);
      setRevisionTotal(data.total ?? data.revisions.length);
      if (page > pageCount(data.total ?? data.revisions.length, pageSize))
        return await history(pageCount(data.total ?? data.revisions.length, pageSize), pageSize);
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : 'Revisions could not be loaded.',
        error: true,
      });
    } finally {
      setHistoryLoading(false);
    }
  }
  function tool(
    label: string,
    icon: ReactNode,
    action: () => void,
    active = false,
    disabled = false,
  ) {
    return (
      <button
        type="button"
        className={`${s.tool} ${active ? s.activeTool : ''}`}
        aria-label={label}
        title={label}
        aria-pressed={active}
        disabled={!editor || preview || disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={action}
      >
        {icon}
      </button>
    );
  }
  const count = blogText(draft.content).trim().split(/\s+/).filter(Boolean).length;
  const headings = (draft.content.content || []).filter((n) => n.type === 'heading');
  const saving = phase === 'saving';
  return (
    <main id="main" className={`${s.editor} ${focus ? s.focusMode : ''}`}>
      <h1 className="sr-only">Post editor</h1>
      <header className={s.editorHeader}>
        <div className={s.editorBrand}>
          <Logo />
          <span />
          <Link
            href="/admin/blog"
            aria-label="All posts"
            onClick={(e) => {
              if (dirty || saving) {
                e.preventDefault();
                setModal('leave');
              }
            }}
          >
            <ArrowLeft size={16} />
            <span>All posts</span>
          </Link>
          <div className={s.documentIdentity}>
            <strong>{draft.title || 'Untitled post'}</strong>
            <small>
              {postStatus(post)}{' '}
              {post.status === 'published' && post.version !== post.published_version
                ? '· Unpublished edits'
                : ''}
            </small>
          </div>
        </div>
        <div className={s.headerActions}>
          <button
            className="button secondary"
            aria-label={preview ? 'Write' : 'Preview'}
            onClick={() => setPreview((v) => !v)}
            disabled={!editor}
          >
            {preview ? <Pencil size={15} /> : <Eye size={15} />}
            <span>{preview ? 'Write' : 'Preview'}</span>
          </button>
          <button
            className="button secondary"
            aria-label={saving ? 'Saving draft' : 'Save draft'}
            disabled={saving || uploading}
            onClick={() => void save('save', true)}
          >
            {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
            <span>{saving ? 'Saving…' : 'Save draft'}</span>
          </button>
          <button
            className="button primary"
            disabled={saving || uploading}
            onClick={() => {
              const date =
                post.published_at && Date.parse(post.published_at) > Date.now()
                  ? new Date(post.published_at)
                  : null;
              setSchedule(
                date
                  ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                  : '',
              );
              setModal('publish');
            }}
          >
            <Send size={15} />
            <span>{post.status === 'published' ? 'Publish changes' : 'Publish'}</span>
          </button>
        </div>
      </header>
      <div className={s.toolbar} role="toolbar" aria-label="Post formatting toolbar">
        {tool(
          'Undo',
          <Undo2 size={18} />,
          () => editor?.chain().focus().undo().run(),
          false,
          !editor?.can().undo(),
        )}
        {tool(
          'Redo',
          <Redo2 size={18} />,
          () => editor?.chain().focus().redo().run(),
          false,
          !editor?.can().redo(),
        )}
        <span className={s.divider} />
        <Dropdown
          label="Text style"
          hideLabel
          value={
            editor?.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'paragraph'
          }
          disabled={!editor || preview}
          onValueChange={(v) =>
            v === 'paragraph'
              ? editor?.chain().focus().setParagraph().run()
              : editor
                  ?.chain()
                  .focus()
                  .toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 })
                  .run()
          }
          options={[
            { value: 'paragraph', label: 'Paragraph' },
            { value: 'h2', label: 'Heading 2' },
            { value: 'h3', label: 'Heading 3' },
            { value: 'h4', label: 'Heading 4' },
          ]}
        />
        <span className={s.divider} />
        {tool(
          'Bold',
          <Bold size={18} />,
          () => editor?.chain().focus().toggleBold().run(),
          editor?.isActive('bold'),
        )}
        {tool(
          'Italic',
          <Italic size={18} />,
          () => editor?.chain().focus().toggleItalic().run(),
          editor?.isActive('italic'),
        )}
        {tool(
          'Underline',
          <Underline size={18} />,
          () => editor?.chain().focus().toggleUnderline().run(),
          editor?.isActive('underline'),
        )}
        {tool(
          'Strikethrough',
          <Strikethrough size={18} />,
          () => editor?.chain().focus().toggleStrike().run(),
          editor?.isActive('strike'),
        )}
        {tool(
          'Highlight',
          <Highlighter size={18} />,
          () => editor?.chain().focus().toggleHighlight().run(),
          editor?.isActive('highlight'),
        )}
        <span className={s.divider} />
        {tool(
          'Align left',
          <AlignLeft size={18} />,
          () => editor?.chain().focus().setTextAlign('left').run(),
          editor?.isActive({ textAlign: 'left' }),
        )}
        {tool(
          'Align center',
          <AlignCenter size={18} />,
          () => editor?.chain().focus().setTextAlign('center').run(),
          editor?.isActive({ textAlign: 'center' }),
        )}
        {tool(
          'Align right',
          <AlignRight size={18} />,
          () => editor?.chain().focus().setTextAlign('right').run(),
          editor?.isActive({ textAlign: 'right' }),
        )}
        <span className={s.divider} />
        {tool(
          'Bullet list',
          <List size={18} />,
          () => editor?.chain().focus().toggleBulletList().run(),
          editor?.isActive('bulletList'),
        )}
        {tool(
          'Numbered list',
          <ListOrdered size={18} />,
          () => editor?.chain().focus().toggleOrderedList().run(),
          editor?.isActive('orderedList'),
        )}
        {tool(
          'Block quote',
          <Quote size={18} />,
          () => editor?.chain().focus().toggleBlockquote().run(),
          editor?.isActive('blockquote'),
        )}
        {tool(
          'Code block',
          <Code2 size={18} />,
          () => editor?.chain().focus().toggleCodeBlock().run(),
          editor?.isActive('codeBlock'),
        )}
        <span className={s.divider} />
        {tool(
          'Insert link',
          <LinkIcon size={18} />,
          () => {
            setUrl(editor?.getAttributes('link').href || '');
            setModal('link');
          },
          editor?.isActive('link'),
        )}
        {tool('Insert image', <ImageIcon size={18} />, () => {
          setUrl('');
          setAlt('');
          setModal('image');
        })}
        {tool('Insert table', <Table2 size={18} />, () =>
          editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        )}
        {tool('Horizontal divider', <Minus size={18} />, () =>
          editor?.chain().focus().setHorizontalRule().run(),
        )}
        <span className={s.toolbarSpacer} />
        <button
          className={s.tool}
          aria-label={focus ? 'Exit focus mode' : 'Focus mode'}
          onClick={() => setFocus((v) => !v)}
        >
          {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button
          className={s.tool}
          aria-label="Post settings"
          aria-pressed={panel}
          onClick={() => setPanel((v) => !v)}
        >
          <Settings2 size={18} />
        </button>
      </div>
      {editor?.isActive('table') && !preview && (
        <div className={s.tableTools}>
          <span>TABLE</span>
          <button onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</button>
          <button onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</button>
          <button onClick={() => editor.chain().focus().deleteTable().run()}>Remove table</button>
        </div>
      )}
      <div className={`${s.editorBody} ${!panel || focus ? s.hidePanel : ''}`}>
        <section className={s.canvas} aria-label={preview ? 'Post preview' : 'Writing canvas'}>
          <div className={s.canvasLabel}>
            {preview ? 'READER PREVIEW' : 'YOUR WORDS, A LITTLE ROOM TO BREATHE'}
          </div>
          <article className={`${s.paper} ${preview ? s.previewPaper : ''}`}>
            <span className={reading.eyebrow}>{draft.category}</span>
            {preview ? (
              <>
                <h1 className={s.previewTitle}>{draft.title || 'Untitled post'}</h1>
                {draft.excerpt && <p className={s.previewExcerpt}>{draft.excerpt}</p>}
                <p className={s.previewByline}>
                  {draft.author} · {readingMinutes(draft.content)} min read
                </p>
              </>
            ) : (
              <textarea
                className={s.titleInput}
                aria-label="Post title"
                placeholder="Give your story a title…"
                value={draft.title}
                maxLength={180}
                rows={1}
                onChange={(e) => {
                  const title = e.target.value;
                  update({
                    title,
                    ...(autoSlug.current && blogSlug(title) ? { slug: blogSlug(title) } : {}),
                  });
                }}
              />
            )}
            {draft.cover && (
              <figure className={s.paperCover}>
                <img src={draft.cover} alt={draft.coverAlt} />
              </figure>
            )}
            {preview ? (
              <RichContent content={draft.content} />
            ) : (
              <div className={reading.prose}>
                {editor ? <EditorContent editor={editor} /> : <Skeleton height={260} />}
              </div>
            )}
          </article>
        </section>
        {panel && !focus && (
          <aside className={s.inspector} aria-label="Post settings panel">
            <div className={s.inspectorTabs}>
              <button
                className={tab === 'post' ? s.selectedTab : ''}
                onClick={() => setTab('post')}
              >
                Post
              </button>
              <button
                className={tab === 'outline' ? s.selectedTab : ''}
                onClick={() => setTab('outline')}
              >
                Outline
              </button>
              <button
                className={tab === 'history' ? s.selectedTab : ''}
                onClick={() => void history()}
              >
                Revisions
              </button>
              <button
                className={s.mobileClose}
                aria-label="Close post settings"
                onClick={() => setPanel(false)}
              >
                <X size={17} />
              </button>
            </div>
            <div className={s.inspectorContent}>
              {tab === 'post' ? (
                <>
                  <div className={s.inspectorHeading}>
                    <h2>The finishing touches.</h2>
                    <p>Give your story a home and help readers find it.</p>
                  </div>
                  <label>
                    Web address<span className={s.inputPrefix}>/blog/</span>
                    <input
                      aria-label="Post slug"
                      value={draft.slug}
                      maxLength={120}
                      onChange={(e) => {
                        autoSlug.current = false;
                        update({ slug: e.target.value });
                      }}
                      onBlur={() =>
                        update({
                          slug:
                            blogSlug(current.current.slug) || `untitled-${initial.id.slice(0, 8)}`,
                        })
                      }
                    />
                  </label>
                  <label>
                    Excerpt <small>{draft.excerpt.length}/360</small>
                    <textarea
                      aria-label="Post excerpt"
                      rows={4}
                      value={draft.excerpt}
                      maxLength={360}
                      placeholder="A short introduction for the blog listing…"
                      onChange={(e) => update({ excerpt: e.target.value })}
                    />
                  </label>
                  <div className={s.coverField}>
                    <span>Cover image</span>
                    {draft.cover ? (
                      <>
                        <img src={draft.cover} alt={draft.coverAlt} />
                        <div>
                          <button
                            onClick={() => {
                              imageTarget.current = 'cover';
                              fileInput.current?.click();
                            }}
                            disabled={uploading}
                          >
                            Replace
                          </button>
                          <button onClick={() => update({ cover: '', coverAlt: '' })}>
                            Remove
                          </button>
                        </div>
                        <label>
                          Image description
                          <input
                            value={draft.coverAlt}
                            maxLength={200}
                            placeholder="Describe what the image shows"
                            onChange={(e) => update({ coverAlt: e.target.value })}
                          />
                        </label>
                      </>
                    ) : (
                      <button
                        className={s.uploadCover}
                        disabled={uploading}
                        onClick={() => {
                          imageTarget.current = 'cover';
                          fileInput.current?.click();
                        }}
                      >
                        <ImageIcon size={25} />
                        <strong>{uploading ? 'Uploading…' : 'Add a cover image'}</strong>
                        <small>JPEG, PNG, or WebP · Up to 5 MB</small>
                      </button>
                    )}
                  </div>
                  <label>
                    Author
                    <input
                      value={draft.author}
                      maxLength={100}
                      onChange={(e) => update({ author: e.target.value })}
                    />
                  </label>
                  <label>
                    Category
                    <input
                      value={draft.category}
                      maxLength={50}
                      onChange={(e) => update({ category: e.target.value })}
                    />
                  </label>
                  <label>
                    Tags <small>Up to 8, separated by commas</small>
                    <input
                      aria-label="Post tags"
                      value={tagText}
                      onChange={(e) => {
                        setTagText(e.target.value);
                        const tags = [
                          ...new Set(
                            e.target.value
                              .split(',')
                              .map((v) => v.trim().slice(0, 32))
                              .filter(Boolean),
                          ),
                        ].slice(0, 8);
                        update({ tags });
                      }}
                    />
                  </label>
                  <label className={s.checkbox}>
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) => update({ featured: e.target.checked })}
                    />
                    Mark as an editor’s pick
                  </label>
                  <div className={s.seoFields}>
                    <span className={reading.eyebrow}>SEARCH ENGINE PREVIEW</span>
                    <label>
                      SEO title <small>{draft.seoTitle.length}/70</small>
                      <input
                        value={draft.seoTitle}
                        maxLength={70}
                        placeholder={draft.title || 'Defaults to your post title'}
                        onChange={(e) => update({ seoTitle: e.target.value })}
                      />
                    </label>
                    <label>
                      SEO description <small>{draft.seoDescription.length}/170</small>
                      <textarea
                        rows={3}
                        value={draft.seoDescription}
                        maxLength={170}
                        placeholder={draft.excerpt || 'Defaults to your excerpt'}
                        onChange={(e) => update({ seoDescription: e.target.value })}
                      />
                    </label>
                    <div className={s.searchPreview}>
                      <span>Folio › blog › {draft.slug}</span>
                      <strong>{draft.seoTitle || draft.title || 'Your post title'}</strong>
                      <p>
                        {draft.seoDescription ||
                          draft.excerpt ||
                          'Your description will appear here.'}
                      </p>
                    </div>
                  </div>
                  {post.status === 'published' && (
                    <div className={s.publishDetails}>
                      <span className={s.badge}>{postStatus(post)}</span>
                      <p>{post.published_at && new Date(post.published_at).toLocaleString()}</p>
                      <Link
                        href={`/blog/${post.public_slug || post.draft.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open public post
                        <ArrowUpRight size={14} />
                      </Link>
                      <button onClick={() => setModal('unpublish')}>Unpublish post</button>
                    </div>
                  )}
                </>
              ) : tab === 'outline' ? (
                <>
                  <div className={s.inspectorHeading}>
                    <h2>Your story at a glance.</h2>
                    <p>Headings give your article a clear structure.</p>
                  </div>
                  {headings.length ? (
                    headings.map((n, i) => (
                      <button
                        key={i}
                        className={s.outlineItem}
                        onClick={() => {
                          const nodes = document.querySelectorAll(
                            '.blog-writing-content h2,.blog-writing-content h3,.blog-writing-content h4',
                          );
                          nodes[i]?.scrollIntoView({
                            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                              ? 'instant'
                              : 'smooth',
                            block: 'center',
                          });
                        }}
                      >
                        <span>H{String(n.attrs?.level || 2)}</span>
                        {blogText(n)}
                      </button>
                    ))
                  ) : (
                    <p className={s.sideNote}>
                      Choose a heading from the toolbar to build your outline.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className={s.inspectorHeading}>
                    <h2>A little room to go back.</h2>
                    <p>
                      Your saved versions. Restoring creates an editable draft; it does not change
                      the live post.
                    </p>
                  </div>
                  {historyLoading ? (
                    <div aria-busy="true">
                      <LoadingLabel>Loading revisions…</LoadingLabel>
                      {Array.from({ length: revisionPageSize }, (_, i) => (
                        <p key={i}>
                          <Skeleton height={50} />
                        </p>
                      ))}
                    </div>
                  ) : revisions.length ? (
                    revisions.map((r) => (
                      <button
                        className={s.revisionItem}
                        key={r.id}
                        onClick={() => {
                          setRevision(r);
                          setModal('revision');
                        }}
                      >
                        <History size={16} />
                        <span>
                          <strong>Version {r.version}</strong>
                          <small>{new Date(r.created_at).toLocaleString()}</small>
                        </span>
                        <RotateCcw size={14} />
                      </button>
                    ))
                  ) : (
                    <p className={s.sideNote}>Saved changes will appear here.</p>
                  )}
                  <Pagination
                    page={revisionPage}
                    pageSize={revisionPageSize}
                    onPageSizeChange={(size) => void history(1, size)}
                    total={revisionTotal}
                    onChange={(next) => void history(next)}
                    disabled={historyLoading}
                    label="Revision history pagination"
                  />
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      <footer className={s.editorFooter}>
        <span className={phase === 'error' ? s.saveError : ''}>
          {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}{' '}
          {saving
            ? 'Saving to cloud…'
            : phase === 'error'
              ? 'Not saved — retry Save draft'
              : dirty
                ? 'Unsaved changes'
                : 'All changes saved'}
        </span>
        <span>
          {count.toLocaleString()} words <span>· {readingMinutes(draft.content)} min read</span>
        </span>
        <button onClick={() => setFocus((v) => !v)}>{focus ? 'Exit focus' : 'Focus mode'}</button>
      </footer>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f, imageTarget.current);
        }}
      />
      <BlogToast notice={notice} onClose={clearNotice} />
      {modal === 'publish' && (
        <BlogDialog
          title={
            post.status === 'published' ? 'Publish your changes?' : 'Ready to share your story?'
          }
          onClose={() => {
            if (!saving) setModal(null);
          }}
          footer={
            <>
              <button className="button secondary" disabled={saving} onClick={() => setModal(null)}>
                Keep writing
              </button>
              <button
                className="button primary"
                disabled={saving || uploading}
                onClick={async () => {
                  const publishAt = schedule
                    ? new Date(schedule).toISOString()
                    : post.published_at && Date.parse(post.published_at) <= Date.now()
                      ? null
                      : new Date().toISOString();
                  if (await save('publish', true, publishAt)) setModal(null);
                }}
              >
                <Send size={16} />
                {saving ? 'Publishing…' : schedule ? 'Schedule post' : 'Publish now'}
              </button>
            </>
          }
        >
          <p>
            Your article will be available to everyone at <strong>/blog/{draft.slug}</strong>.
          </p>
          <div className={s.publishSummary}>
            <span>
              {draft.category} · {readingMinutes(draft.content)} min read
            </span>
            <h3>{draft.title || 'Untitled post'}</h3>
            <p>{draft.excerpt || 'Add an excerpt in Post settings before publishing.'}</p>
          </div>
          <label className={s.scheduleField}>
            Publish time <small>Leave empty to publish now. Uses your local time zone.</small>
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </label>
          {publicationError(draft) && (
            <p className={s.validation} role="status">
              {publicationError(draft)}
            </p>
          )}
        </BlogDialog>
      )}
      {modal === 'link' && (
        <BlogDialog
          title="Add a link"
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => {
                  editor?.chain().focus().unsetLink().run();
                  setModal(null);
                }}
              >
                Remove link
              </button>
              <button
                className="button primary"
                disabled={!safeBlogUrl(url)}
                onClick={() => {
                  if (safeBlogUrl(url)) {
                    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                    setModal(null);
                  }
                }}
              >
                Apply link
              </button>
            </>
          }
        >
          <label className={s.dialogField}>
            Link address
            <input
              autoFocus
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <p>Select text in your article, then apply a web address or email link.</p>
        </BlogDialog>
      )}
      {modal === 'image' && (
        <BlogDialog
          title="Add an image"
          onClose={() => {
            if (!uploading) setModal(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={uploading}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={uploading || !safeBlogUrl(url, true)}
                onClick={() => {
                  if (safeBlogUrl(url, true)) {
                    editor?.chain().focus().setImage({ src: url, alt }).run();
                    setModal(null);
                  }
                }}
              >
                Insert image
              </button>
            </>
          }
        >
          <button
            className={`button secondary ${s.imageUploadButton}`}
            disabled={uploading}
            onClick={() => {
              imageTarget.current = 'body';
              fileInput.current?.click();
            }}
          >
            <Upload size={17} />
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
          <p>JPEG, PNG, or WebP under 5 MB. Blog images are public assets.</p>
          <label className={s.dialogField}>
            Or use an HTTPS image address
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className={s.dialogField}>
            Image description
            <input
              value={alt}
              maxLength={200}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
            />
          </label>
          {safeBlogUrl(url, true) && <img className={s.imagePreview} src={url} alt={alt} />}
        </BlogDialog>
      )}
      {modal === 'unpublish' && (
        <BlogDialog
          title="Unpublish this post?"
          onClose={() => {
            if (!saving) setModal(null);
          }}
          footer={
            <>
              <button className="button secondary" disabled={saving} onClick={() => setModal(null)}>
                Keep published
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={async () => {
                  if (await save('unpublish', true)) setModal(null);
                }}
              >
                Unpublish
              </button>
            </>
          }
        >
          <p>
            The article will no longer be public. Its content, images, and likes are kept so you can
            publish it again.
          </p>
        </BlogDialog>
      )}
      {modal === 'leave' && (
        <BlogDialog
          title="Save before leaving?"
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                className="button secondary"
                disabled={saving}
                onClick={() => router.push('/admin/blog')}
              >
                Leave without saving
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={async () => {
                  if (await save('save', true)) router.push('/admin/blog');
                }}
              >
                Save and leave
              </button>
            </>
          }
        >
          <p>
            Your most recent edits haven’t finished saving. Save them before going back to your
            posts.
          </p>
        </BlogDialog>
      )}
      {modal === 'revision' && revision && (
        <BlogDialog
          title={`Restore version ${revision.version}?`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="button secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                disabled={saving}
                onClick={() => {
                  update(revision.draft);
                  setTagText(revision.draft.tags.join(', '));
                  autoSlug.current = false;
                  editor?.commands.setContent(revision.draft.content, { emitUpdate: false });
                  setModal(null);
                  setNotice({
                    text: 'Revision restored in the editor. Save or publish when you’re ready.',
                  });
                }}
              >
                Restore draft
              </button>
            </>
          }
        >
          <p>
            This replaces the current editor content with the selected revision. The published
            article stays as it is.
          </p>
          <h3>{revision.draft.title || 'Untitled post'}</h3>
          <p>{revision.draft.excerpt}</p>
        </BlogDialog>
      )}
    </main>
  );
}
