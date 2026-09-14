import { z } from 'zod';
import { pricingSchema, settingsSchema } from './platform';
const reason = z.string().trim().min(3).max(500);
export const adminAction = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('delete_user'),
      userId: z.uuid(),
      confirmation: z.literal('DELETE'),
      reason,
    })
    .strict(),
  z.object({ action: z.literal('settings'), settings: settingsSchema }).strict(),
  z
    .object({
      action: z.literal('user'),
      userId: z.uuid(),
      operation: z.enum(['suspend', 'restore', 'grant', 'revoke_grant']),
      reason,
      days: z.number().int().min(1).max(365).default(30),
    })
    .strict(),
  z
    .object({
      action: z.literal('pricing'),
      requestId: z.uuid(),
      expectedVersion: z.string().min(1).max(80),
      pricing: pricingSchema,
      monthlyVariantId: z.string().regex(/^[1-9]\d*$/),
      trialVariantId: z
        .string()
        .regex(/^[1-9]\d*$/)
        .nullable(),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('subscription'),
      requestId: z.uuid(),
      subscriptionId: z.string().regex(/^lemon_[1-9]\d*$/),
      operation: z.enum(['cancel_end', 'resume', 'cancel_now']),
      reason,
    })
    .strict(),
  z
    .object({
      action: z.literal('support'),
      ticketId: z.uuid(),
      message: z.string().trim().max(5000),
      status: z.enum(['open', 'pending', 'resolved']),
      priority: z.enum(['low', 'normal', 'high']),
    })
    .strict(),
]);
export type AdminAction = z.infer<typeof adminAction>;
