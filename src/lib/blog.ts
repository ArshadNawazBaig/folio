import { z } from 'zod';

export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export const emptyContent: RichNode = { type: 'doc', content: [{ type: 'paragraph' }] };
const nodeTypes = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'image',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);
const markTypes = new Set(['bold', 'italic', 'strike', 'underline', 'code', 'link', 'highlight']);
export function safeBlogUrl(value: unknown, image = false): string | null {
  // oxlint-disable-next-line no-control-regex -- Reject whitespace and control characters in links before URL parsing.
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\]/.test(value))
    return null;
  if (!image && /^\/(?!\/)/.test(value)) return value;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || (!image && ['http:', 'mailto:'].includes(url.protocol))) &&
      !url.username &&
      !url.password
      ? value
      : null;
  } catch {
    return null;
  }
}
export function validRichContent(value: unknown): value is RichNode {
  let count = 0,
    chars = 0;
  function visit(raw: unknown, depth: number): boolean {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || depth > 16 || ++count > 5000)
      return false;
    const n = raw as RichNode;
    if (!nodeTypes.has(n.type)) return false;
    if (n.text !== undefined && (typeof n.text !== 'string' || (chars += n.text.length) > 150000))
      return false;
    if (n.type === 'text' && typeof n.text !== 'string') return false;
    if (n.attrs && (typeof n.attrs !== 'object' || Array.isArray(n.attrs))) return false;
    if (n.type === 'image' && !safeBlogUrl(n.attrs?.src, true)) return false;
    if (n.type === 'heading' && ![2, 3, 4].includes(Number(n.attrs?.level))) return false;
    if (
      n.marks &&
      (!Array.isArray(n.marks) ||
        n.marks.length > 10 ||
        !n.marks.every(
          (m) => m && markTypes.has(m.type) && (m.type !== 'link' || !!safeBlogUrl(m.attrs?.href)),
        ))
    )
      return false;
    return (
      !n.content ||
      (Array.isArray(n.content) && n.content.every((child) => visit(child, depth + 1)))
    );
  }
  return visit(value, 0) && (value as RichNode).type === 'doc';
}
export function blogText(node: RichNode): string {
  return node.type === 'text'
    ? node.text || ''
    : (node.content || [])
        .map(blogText)
        .join(['paragraph', 'heading'].includes(node.type) ? '' : ' ');
}
export function readingMinutes(content: RichNode) {
  return Math.max(1, Math.ceil(blogText(content).trim().split(/\s+/).filter(Boolean).length / 220));
}
export function blogSlug(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-$/g, '');
}
export const blogDraftSchema = z
  .object({
    title: z.string().trim().max(180),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    excerpt: z.string().trim().max(360),
    author: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(50),
    tags: z.array(z.string().trim().min(1).max(32)).max(8),
    cover: z
      .string()
      .max(2048)
      .refine((v) => !v || !!safeBlogUrl(v, true)),
    coverAlt: z.string().trim().max(200),
    seoTitle: z.string().trim().max(70),
    seoDescription: z.string().trim().max(170),
    featured: z.boolean(),
    content: z.custom<RichNode>(validRichContent, 'Review the article content.'),
  })
  .strict();
export type BlogDraft = z.infer<typeof blogDraftSchema>;
export const blankDraft = (slug: string): BlogDraft => ({
  title: '',
  slug,
  excerpt: '',
  author: 'Folio editorial',
  category: 'PDF tips',
  tags: [],
  cover: '',
  coverAlt: '',
  seoTitle: '',
  seoDescription: '',
  featured: false,
  content: emptyContent,
});
export type BlogPost = {
  id: string;
  draft: BlogDraft;
  status: 'draft' | 'published' | 'trashed';
  version: number;
  published_version: number | null;
  published_at: string | null;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
};
export type BlogSummary = Omit<BlogPost, 'draft'> & { draft: Omit<BlogDraft, 'content'> };
export type PublicPost = BlogDraft & {
  id: string;
  publishedAt: string;
  updatedAt: string;
  likes: number;
  minutes: number;
};
export type BlogRevision = { id: string; version: number; draft: BlogDraft; created_at: string };
export function postStatus(post: Pick<BlogPost, 'status' | 'published_at'>) {
  return post.status === 'published' &&
    post.published_at &&
    Date.parse(post.published_at) > Date.now()
    ? 'Scheduled'
    : post.status === 'trashed'
      ? 'Trash'
      : post.status === 'published'
        ? 'Published'
        : 'Draft';
}
export function publicationError(draft: BlogDraft) {
  if (draft.title.length < 3) return 'Add a title of at least 3 characters.';
  if (draft.excerpt.length < 10) return 'Add a short excerpt for the blog listing.';
  if (blogText(draft.content).trim().length < 20)
    return 'Add your article content before publishing.';
  if (draft.cover && !draft.coverAlt)
    return 'Describe your cover image for readers using screen readers.';
  return '';
}
