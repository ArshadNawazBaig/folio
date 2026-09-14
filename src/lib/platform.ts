import { z } from 'zod';

export const pricingSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    currency: z.literal('usd'),
    monthlyAmount: z.number().int().min(100).max(100000),
    trialAmount: z.number().int().min(50).max(100000),
    trialDays: z.number().int().min(1).max(30),
    trialEnabled: z.boolean(),
  })
  .strict();
export type PricingValues = z.infer<typeof pricingSchema>;
export type PricingCatalog = PricingValues & {
  version: string;
  monthlyPriceId: string | null;
  trialPriceId: string | null;
};
export const DEFAULT_CATALOG: PricingCatalog = {
  version: 'initial',
  name: 'Folio Pro',
  currency: 'usd',
  monthlyAmount: 2500,
  trialAmount: 100,
  trialDays: 7,
  trialEnabled: true,
  monthlyPriceId: null,
  trialPriceId: null,
};
export const settingsSchema = z
  .object({
    maintenance: z.boolean(),
    maintenanceMessage: z.string().trim().min(10).max(500),
    purchasesEnabled: z.boolean(),
    announcement: z.string().trim().max(240),
  })
  .strict();
export type SiteSettings = z.infer<typeof settingsSchema>;
export const DEFAULT_SETTINGS: SiteSettings = {
  maintenance: false,
  maintenanceMessage:
    'Folio is getting a little care. Please come back shortly. Your local documents are still on your device.',
  purchasesEnabled: true,
  announcement: '',
};
export function money(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 100 ? 2 : 0,
  }).format(amount / 100);
}
export function offerTerms(catalog: PricingValues, plan: 'trial' | 'month') {
  return plan === 'trial'
    ? `${money(catalog.trialAmount)} USD today for ${catalog.trialDays} days, then ${money(catalog.monthlyAmount)} USD per month automatically. Cancel before the ${catalog.trialDays} days end to avoid the monthly charge.`
    : `${money(catalog.monthlyAmount)} USD per month, starting today. Renews automatically. Cancel before your next renewal.`;
}
export type AdminSection =
  'overview' | 'users' | 'subscriptions' | 'pricing' | 'settings' | 'support' | 'audit';
export type SupportTicket = {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
};
export type SupportMessage = {
  id: string;
  ticket_id: string;
  staff: boolean;
  message: string;
  created_at: string;
};
export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  suspended: boolean;
  is_admin: boolean;
  grant_until: string | null;
};
export type AdminSubscription = {
  stripe_subscription_id: string;
  user_id: string;
  email: string;
  status: string;
  price_id: string;
  paid_until: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};
export type AuditEntry = {
  id: string;
  actor_id: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
  created_at: string;
};
export type AdminOverview = {
  users: number;
  paid: number;
  trials: number;
  openTickets: number;
  operations: number;
  suspended: number;
};
