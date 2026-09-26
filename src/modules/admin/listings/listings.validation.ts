import z from 'zod';

export const adminListingsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['all', 'pending', 'active', 'rejected', 'sold', 'expired']).optional().default('all'),
    search: z.string().trim().optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
});

export const updateListingStatusBodySchema = z.object({
    status: z.enum(['active', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional(),
});

export type AdminListingsQuery = z.infer<typeof adminListingsQuerySchema>;
export type UpdateListingStatusBody = z.infer<typeof updateListingStatusBodySchema>;
