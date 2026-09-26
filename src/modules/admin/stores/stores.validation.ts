import z from 'zod';

export const adminStoresQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    filter: z.enum(['all', 'active', 'pending', 'blocked']).optional().default('all'),
    search: z.string().trim().optional(),
});

export type AdminStoresQuery = z.infer<typeof adminStoresQuerySchema>;

export const toggleStoreStatusBodySchema = z.object({
    status: z.enum(['active', 'pending', 'blocked']),
});

export type ToggleStoreStatusBody = z.infer<typeof toggleStoreStatusBodySchema>;

export const storeAdsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type StoreAdsQuery = z.infer<typeof storeAdsQuerySchema>;

export const storeProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['all', 'draft', 'active', 'rejected', 'sold', 'expired', 'removed']).optional().default('all'),
    search: z.string().trim().optional(),
});

export type StoreProductsQuery = z.infer<typeof storeProductsQuerySchema>;
