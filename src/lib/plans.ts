export const PRO_PRICING = {
  currency: 'usd',
  trialAmount: 100,
  trialDays: 7,
  monthlyAmount: 2500,
  offerVersion: 'folio_intro_v1',
} as const;
export type PlanChoice = 'trial' | 'month';
export const PRO_PLANS = {
  trial: { id: 'trial', amount: PRO_PRICING.trialAmount, currency: 'usd', label: '$1' },
  month: { id: 'month', amount: PRO_PRICING.monthlyAmount, currency: 'usd', label: '$25' },
} as const;
export const TRIAL_TERMS =
  '$1 USD today for 7 days, then $25 USD per month automatically. Cancel before the 7 days end to avoid the monthly charge.';
export const MONTHLY_TERMS =
  '$25 USD per month, starting today. Renews automatically. Cancel before your next renewal.';
