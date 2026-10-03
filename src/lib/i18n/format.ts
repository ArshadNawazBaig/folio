import { money, type offerTerms } from '../platform';
import type { translator } from './translate';

type Translate = ReturnType<typeof translator>;
export function localizedOfferTerms(
  catalog: Parameters<typeof offerTerms>[0],
  plan: 'trial' | 'month',
  tr: Translate,
) {
  return plan === 'trial'
    ? tr(
        '{trial} USD today for {days} days, then {monthly} USD per month automatically. Cancel before the {days} days end to avoid the monthly charge.',
        {
          trial: money(catalog.trialAmount),
          days: catalog.trialDays,
          monthly: money(catalog.monthlyAmount),
        },
      )
    : tr(
        '{monthly} USD per month, starting today. Renews automatically. Cancel before your next renewal.',
        { monthly: money(catalog.monthlyAmount) },
      );
}
