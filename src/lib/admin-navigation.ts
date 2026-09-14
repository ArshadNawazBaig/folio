import { CreditCard, History, Inbox, LayoutDashboard, Settings, Tag, Users } from 'lucide-react';
import type { AdminSection } from './platform';

export const adminNavigation = [
  ['overview', 'Overview', LayoutDashboard],
  ['users', 'Users', Users],
  ['subscriptions', 'Subscriptions', CreditCard],
  ['pricing', 'Pricing plans', Tag],
  ['support', 'Support inbox', Inbox],
  ['settings', 'Site settings', Settings],
  ['audit', 'Activity log', History],
] as const;

export function adminSection(value: unknown): AdminSection {
  return adminNavigation.find(([key]) => key === value)?.[0] || 'overview';
}
