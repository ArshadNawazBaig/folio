import { languagePath, isTranslatedPath, type Locale } from './config';
import type { ToolSummary } from '../tool-summary';
import type { Tool } from '../tools';
import type { Guide } from '../guides';

export type Messages = Record<string, string>;
export type PageLanguage = { locale?: Locale; messages?: Messages };

export function translator(messages: Messages = {}) {
  return (message: string, values: Record<string, string | number> = {}) =>
    (messages[message] ?? message).replace(/\{(\w+)\}/g, (match, key: string) =>
      String(values[key] ?? match),
    );
}

// Keep links to resources that do not yet have a translated page working.
export function localizedHref(locale: Locale, href: string) {
  const path = href.split(/[?#]/)[0];
  return isTranslatedPath(path) ? languagePath(locale, path) + href.slice(path.length) : href;
}

export function localizeSummary<T extends ToolSummary>(tool: T, messages: Messages): T {
  const t = translator(messages);
  return {
    ...tool,
    name: t(tool.name),
    short: t(tool.short),
    keywords: [...tool.keywords, tool.name],
  };
}

export function localizeTool(tool: Tool, messages: Messages): Tool {
  const t = translator(messages);
  return {
    ...localizeSummary(tool, messages),
    description: t(tool.description),
    detail: t(tool.detail),
    action: t(tool.action),
    steps: [t(tool.steps[0]), t(tool.steps[1]), t(tool.steps[2])],
    faq: tool.faq.map(([question, answer]) => [t(question), t(answer)]),
  };
}

export function localizeGuide(guide: Guide, messages: Messages): Guide {
  const tr = translator(messages);
  return {
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
}
