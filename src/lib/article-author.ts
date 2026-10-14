export const articleAuthor = {
  name: 'Iram Shams',
  email: 'erushbaig@gmail.com',
  image: '/images/authors/iram-shams.jpg',
  profilePath: '/about#iram-shams',
} as const;

/** Existing Folio bylines use the owner's profile without republishing stored articles. */
export function articleAuthorName(name: string) {
  return /^(?:folio(?: editorial| team| field notes)?|iram shams)$/i.test(name.trim())
    ? articleAuthor.name
    : name;
}
