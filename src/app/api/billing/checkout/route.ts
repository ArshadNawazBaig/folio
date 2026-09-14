import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { availablePlans, billingReady } from '@/lib/server/billing';
import { lemonConfig, lemonRequest } from '@/lib/server/lemon-squeezy';
import { isLemonUrl } from '@/lib/lemon-squeezy';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { siteUrl } from '@/lib/seo';
import { assertServiceAvailable, getPlatform } from '@/lib/server/platform';
import { offerTerms } from '@/lib/platform';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    await assertServiceAvailable();
    if (!billingReady()) throw new ApiError(503, 'Checkout is not connected yet.');
    const parsed = z
      .object({ plan: z.enum(['trial', 'month']), pricingVersion: z.string().min(1).max(80) })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()));
    if (!parsed.success)
      throw new ApiError(400, 'Choose an available introductory offer or the monthly plan.');
    const { plan, pricingVersion } = parsed.data;
    const { catalog } = await getPlatform(true);
    if (pricingVersion !== catalog.version)
      throw new ApiError(
        409,
        'Pricing has changed. Close this checkout prompt and review the current plan before buying.',
      );
    if (!(await availablePlans()).some((p) => p.id === plan))
      throw new ApiError(400, 'This plan is not available.');
    const variantId = (plan === 'trial' ? catalog.trialPriceId : catalog.monthlyPriceId)!;
    const config = lemonConfig(),
      db = adminDb(),
      token = randomUUID();
    const reserved = await db.rpc('reserve_lemon_checkout', {
      account_id: user.id,
      token,
      version_value: catalog.version,
      plan_value: plan,
      variant_value: variantId,
      store_value: config.storeId,
      test_value: config.testMode,
      terms_value: catalog,
    });
    if (reserved.error) {
      if (reserved.error.message.includes('subscription_exists'))
        throw new ApiError(
          409,
          'You already have a subscription. Use Manage billing in your account.',
        );
      if (reserved.error.message.includes('intro_used'))
        throw new ApiError(
          409,
          'The introductory offer is available once per account. Choose the monthly plan.',
        );
      throw new ApiError(
        503,
        'Checkout could not be prepared. Check the billing database setup and try again.',
      );
    }
    const row = reserved.data;
    if (row.id !== token) {
      if (
        row.plan === plan &&
        row.pricing_version === catalog.version &&
        row.variant_id === variantId &&
        row.store_id === config.storeId &&
        row.test_mode === config.testMode &&
        Date.parse(row.expires_at) > Date.now() &&
        row.url &&
        isLemonUrl(row.url, 'checkout')
      )
        return Response.json({ url: row.url });
      throw new ApiError(
        409,
        'A checkout is already open or awaiting confirmation. Complete it, or wait up to 17 minutes for it to expire before opening another plan.',
      );
    }
    const result = await lemonRequest<{
      data: { id: string; attributes: { url: string; test_mode: boolean } };
    }>('/checkouts', 'POST', {
      data: {
        type: 'checkouts',
        attributes: {
          // No custom_price: that would also replace every recurring payment.
          product_options: {
            name: catalog.name,
            description: offerTerms(catalog, plan),
            enabled_variants: [Number(variantId)],
            redirect_url: `${siteUrl}/dashboard?view=billing&checkout=success`,
            receipt_button_text: 'Return to Folio',
            receipt_link_url: `${siteUrl}/dashboard?view=billing`,
          },
          checkout_options: {
            embed: false,
            discount: false,
            skip_trial: plan === 'month',
            subscription_preview: true,
            button_color: '#c44934',
          },
          checkout_data: {
            email: user.email,
            custom: { folio_checkout: token },
            variant_quantities: [{ variant_id: Number(variantId), quantity: 1 }],
          },
          expires_at: row.expires_at,
          test_mode: config.testMode,
        },
        relationships: {
          store: { data: { type: 'stores', id: config.storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    });
    const checkout = result.data;
    if (
      !checkout?.id ||
      checkout.attributes.test_mode !== config.testMode ||
      !isLemonUrl(checkout.attributes.url, 'checkout')
    )
      throw new ApiError(503, 'Checkout returned an unexpected payment link.');
    const saved = await db
      .from('lemon_checkouts')
      .update({ checkout_id: checkout.id, url: checkout.attributes.url })
      .eq('id', token);
    if (saved.error)
      throw new ApiError(503, 'Checkout could not be saved. Please try again shortly.');
    return Response.json({ url: checkout.attributes.url });
  } catch (error) {
    return apiError(error);
  }
}
