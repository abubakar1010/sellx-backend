import { z } from 'zod';

export const createListingPurchaseBodySchema = z.object({
    packageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID'),
});

export const listListingPurchasesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['active', 'exhausted', 'expired']).optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
});

export type CreateListingPurchaseBody = z.infer<typeof createListingPurchaseBodySchema>;
export type ListListingPurchasesQuery = z.infer<typeof listListingPurchasesQuerySchema>;
