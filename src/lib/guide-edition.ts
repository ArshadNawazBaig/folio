import type { Guide } from './guides';
import { withGuideExercises } from './guide-exercise-revisions';
import { withTutorialDepth } from './tutorial-exercises';

/** Keep reviewed translations until an English revision has translated replacements. */
export function guideEdition(guide: Guide, locale = 'en'): Guide {
  if (locale !== 'en') return { ...guide, updated: '2026-10-31' };
  return withTutorialDepth(
    withGuideExercises(guide.englishRevision ? { ...guide, ...guide.englishRevision } : guide),
  );
}
