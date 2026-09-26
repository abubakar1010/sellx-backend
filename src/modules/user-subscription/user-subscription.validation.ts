import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createUserSubscriptionBodySchema = z.object({
    subscriptionId: z.string().regex(objectIdRegex, 'Invalid subscription ID'),
    storeId: z.string().regex(objectIdRegex, 'Invalid store ID'),
});

export const listUserSubscriptionsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['active', 'expired', 'cancelled']).optional(),
});

export const cancelUserSubscriptionBodySchema = z.object({
    immediate: z.boolean().optional().default(false),
});

export type CreateUserSubscriptionBody = z.infer<typeof createUserSubscriptionBodySchema>;
export type ListUserSubscriptionsQuery = z.infer<typeof listUserSubscriptionsQuerySchema>;
export type CancelUserSubscriptionBody = z.infer<typeof cancelUserSubscriptionBodySchema>;
