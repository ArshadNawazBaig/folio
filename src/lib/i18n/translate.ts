import { languagePath, isTranslatedPath, type Locale } from './config';
import type { ToolSummary } from '../tool-summary';
import type { Tool } from '../tools';

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
