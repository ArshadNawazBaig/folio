import { localizeSummary, type PageLanguage } from '@/lib/i18n/translate';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { HeaderClient } from './header-client';

export function Header({ messages = {} }: PageLanguage = {}) {
  return (
    <HeaderClient
      initialTools={serverToolSummaries().map((tool) => localizeSummary(tool, messages))}
    />
  );
}
