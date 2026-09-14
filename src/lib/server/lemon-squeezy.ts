import 'server-only';
import { ApiError } from './http';
import { validLemonPrice, type LemonPrice, type LemonResource } from '../lemon-squeezy';
import type { PricingCatalog } from '../platform';

export function lemonConfigured() {
  return (
    !!process.env.LEMON_SQUEEZY_API_KEY &&
    !!process.env.LEMON_SQUEEZY_WEBHOOK_SECRET &&
    /^[1-9]\d*$/.test(process.env.LEMON_SQUEEZY_STORE_ID || '') &&
    ['true', 'false'].includes(process.env.LEMON_SQUEEZY_TEST_MODE || '')
  );
}
export function lemonConfig() {
  if (!lemonConfigured()) throw new ApiError(503, 'Lemon Squeezy is not connected yet.');
  return {
    storeId: process.env.LEMON_SQUEEZY_STORE_ID!,
    testMode: process.env.LEMON_SQUEEZY_TEST_MODE === 'true',
  };
}
export async function lemonRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  lemonConfig();
  if (!/^\/[a-z-]+(?:\/\d+|\/[a-f0-9-]+)?(?:\?|$)/.test(path))
    throw new Error('Invalid billing resource.');
  let response: Response;
  try {
    response = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
      method,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(503, 'Lemon Squeezy could not be reached. Please try again.');
  }
  if (!response.ok)
    throw new ApiError(
      503,
      'Lemon Squeezy could not complete this request. Check the billing configuration or try again shortly.',
    );
  return response.json() as Promise<T>;
}
export async function lemonGet<T>(type: string, id: string | number) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new ApiError(400, 'Invalid billing identifier.');
  const result = await lemonRequest<{ data: LemonResource<T> }>(`/${type}/${id}`);
  if (result.data?.type !== type || result.data.id !== String(id))
    throw new ApiError(503, 'Billing returned an unexpected record.');
  return result.data.attributes;
}
export async function lemonList<T>(type: string, filters: Record<string, string>, page = 1) {
  // These endpoints already return newest records first. Do not share a sort
  // key: prices accepts created_at, but subscription-invoices rejects it.
  const params = new URLSearchParams({
    'page[size]': '100',
    'page[number]': String(page),
  });
  for (const [key, value] of Object.entries(filters)) params.set(`filter[${key}]`, value);
  return lemonRequest<{ data: LemonResource<T>[]; meta?: { page?: { lastPage: number } } }>(
    `/${type}?${params}`,
  );
}
export async function validateLemonVariant(
  id: string | null,
  plan: 'trial' | 'month',
  catalog: PricingCatalog,
) {
  if (!id || !/^[1-9]\d*$/.test(id)) return false;
  const config = lemonConfig();
  const variant = await lemonGet<{ product_id: number; status: string; test_mode: boolean }>(
    'variants',
    id,
  );
  const [product, store, prices] = await Promise.all([
    lemonGet<{ store_id: number; status: string; test_mode: boolean }>(
      'products',
      variant.product_id,
    ),
    lemonGet<{ currency: string }>('stores', config.storeId),
    lemonList<LemonPrice>('prices', { variant_id: id }),
  ]);
  const price = prices.data[0]?.attributes;
  return (
    String(product.store_id) === config.storeId &&
    product.status === 'published' &&
    ['published', 'pending'].includes(variant.status) &&
    variant.test_mode === config.testMode &&
    product.test_mode === config.testMode &&
    store.currency.toLowerCase() === catalog.currency &&
    !!price &&
    String(price.variant_id) === id &&
    validLemonPrice(price, plan, catalog)
  );
}
