import 'server-only';
import { adminDb, authReady, requireUser } from './auth';
import { ApiError } from './http';
import { createAsyncCache } from '../async-cache';
import {
  DEFAULT_CATALOG,
  DEFAULT_SETTINGS,
  type PricingCatalog,
  type SiteSettings,
} from '../platform';

export function catalogFromRow(row: Record<string, unknown>): PricingCatalog {
  return {
    version: String(row.id),
    name: String(row.name),
    currency: 'usd',
    monthlyAmount: Number(row.monthly_amount),
    trialAmount: Number(row.trial_amount),
    trialDays: Number(row.trial_days),
    trialEnabled: Boolean(row.trial_enabled),
    monthlyPriceId:
      (row.monthly_price_id as string | null) ||
      (row.id === 'initial' ? process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID || null : null),
    trialPriceId:
      (row.trial_price_id as string | null) ||
      (row.id === 'initial' ? process.env.LEMON_SQUEEZY_TRIAL_VARIANT_ID || null : null),
  };
}
const platformCache = createAsyncCache(async () => {
  const db = adminDb();
  const { data: settings, error } = await db
    .from('platform_settings')
    .select('*')
    .eq('id', true)
    .single();
  if (error) throw new ApiError(503, 'Site settings are unavailable. Please try again shortly.');
  const { data: pricing, error: priceError } = await db
    .from('pricing_versions')
    .select('*')
    .eq('id', settings.pricing_version)
    .single();
  if (priceError) throw new ApiError(503, 'Plan information is unavailable.');
  return {
    settings: {
      maintenance: settings.maintenance,
      maintenanceMessage: settings.maintenance_message,
      purchasesEnabled: settings.purchases_enabled,
      announcement: settings.announcement,
    } as SiteSettings,
    catalog: catalogFromRow(pricing),
  };
}, 3000);
const serviceSettingsCache = createAsyncCache(async () => {
  const { data, error } = await adminDb()
    .from('platform_settings')
    .select('maintenance,maintenance_message')
    .eq('id', true)
    .single();
  if (error) throw new ApiError(503, 'Site settings are unavailable. Please try again shortly.');
  return { maintenance: data.maintenance, maintenanceMessage: data.maintenance_message };
}, 3000);
export function clearPlatformCache() {
  platformCache.clear();
  serviceSettingsCache.clear();
}
export async function getPlatform(fresh = false) {
  if (!authReady())
    return {
      settings: DEFAULT_SETTINGS,
      catalog: {
        ...DEFAULT_CATALOG,
        monthlyPriceId: process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID || null,
        trialPriceId: process.env.LEMON_SQUEEZY_TRIAL_VARIANT_ID || null,
      },
    };
  return platformCache.get(fresh);
}
export async function requireAdmin(request: Request) {
  const user = await requireUser(request, { allowSuspended: false });
  const { data, error } = await adminDb()
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new ApiError(503, 'Admin access could not be verified.');
  if (!data) throw new ApiError(403, 'Super admin access is required.');
  return user;
}
// The public request gate needs only the maintenance switch, not the pricing
// catalogue. Keep its existing three-second freshness and fail-closed behavior.
export async function getServiceSettings() {
  if (!authReady()) return DEFAULT_SETTINGS;
  return platformCache.peek()?.settings ?? serviceSettingsCache.get();
}
export async function assertServiceAvailable() {
  const settings = await getServiceSettings();
  if (settings.maintenance) throw new ApiError(503, settings.maintenanceMessage);
}
export function databaseError(error: { message?: string } | null) {
  if (!error) return;
  const message = error.message || '';
  if (message.includes('deletion_checkout_busy'))
    throw new ApiError(
      409,
      'A checkout is still open or awaiting confirmation. Retry deletion after the payment link and its delivery grace period expire (up to 45 minutes).',
    );
  if (message.includes('deletion_in_progress'))
    throw new ApiError(
      409,
      'This account is being permanently deleted. Retry deletion to finish; it cannot be activated.',
    );
  if (message.includes('user_missing'))
    throw new ApiError(404, 'This user no longer exists. Refresh the user list.');
  if (message.includes('pricing_changed'))
    throw new ApiError(
      409,
      'Pricing changed while you were editing. Reload and review the latest plan.',
    );
  if (message.includes('protected_admin'))
    throw new ApiError(400, 'Super admin accounts cannot be suspended or deleted here.');
  if (/admin_required|ticket_forbidden/.test(message))
    throw new ApiError(403, 'You do not have access to this action.');
  throw new ApiError(503, 'The change could not be saved. Please try again.');
}
