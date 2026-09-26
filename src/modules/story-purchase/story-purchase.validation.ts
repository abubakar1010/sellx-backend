import { z } from 'zod';

export const createStoryPurchaseBodySchema = z.object({
    packageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID'),
});

export const listStoryPurchasesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['active', 'exhausted', 'expired']).optional(),
});

export type CreateStoryPurchaseBody = z.infer<typeof createStoryPurchaseBodySchema>;
export type ListStoryPurchasesQuery = z.infer<typeof listStoryPurchasesQuerySchema>;
