import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { HeaderClient } from './header-client';

export function Header() {
  return <HeaderClient initialTools={serverToolSummaries()} />;
}
