import type { Guide } from '../guides';
import type { Locale } from './config';
import { translator, type Messages } from './translate';
import { guideEdition } from '../guide-edition';
import { localizedGuidePractice } from '../localized-tutorials';

export function localizeGuide(source: Guide, messages: Messages, locale: Locale = 'en'): Guide {
  const guide = guideEdition(source, locale);
  const tr = translator(messages);
  const localized = {
    ...guide,
    title: tr(guide.title),
    description: tr(guide.description),
    category: tr(guide.category),
    readTime: tr(guide.readTime),
    summary: guide.summary ? tr(guide.summary) : undefined,
    sections: guide.sections.map((section) => ({
      ...section,
      title: tr(section.title),
      text: tr(section.text),
      steps: section.steps?.map((step) => tr(step)),
      figure: section.figure
        ? { ...section.figure, alt: tr(section.figure.alt), caption: tr(section.figure.caption) }
        : undefined,
      links: section.links?.map((link) => ({ ...link, label: tr(link.label) })),
      table: section.table
        ? {
            ...section.table,
            caption: tr(section.table.caption),
            columns: section.table.columns.map((column) => tr(column)),
            rows: section.table.rows.map((row) => ({
              ...row,
              name: tr(row.name),
              cells: row.cells.map((cell) => tr(cell)),
            })),
          }
        : undefined,
    })),
  };
  return locale === 'en' ? localized : localizedGuidePractice(localized, messages);
}
