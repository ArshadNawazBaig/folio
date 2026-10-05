import type { Guide } from './guides';

/** Keep reviewed translations until an English revision has translated replacements. */
export function guideEdition(guide: Guide, locale = 'en'): Guide {
  return locale === 'en' && guide.englishRevision ? { ...guide, ...guide.englishRevision } : guide;
}
