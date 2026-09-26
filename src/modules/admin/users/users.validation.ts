import z from 'zod';

export const adminUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    filter: z.enum(['all', 'active', 'blocked']).optional().default('all'),
    search: z.string().trim().optional(),
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const userProductsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(['all', 'draft', 'active', 'rejected', 'sold', 'expired', 'removed']).optional().default('all'),
    search: z.string().trim().optional().default(''),
});

export type UserProductsQuery = z.infer<typeof userProductsQuerySchema>;

export const toggleUserStatusBodySchema = z.object({
    status: z.enum(['blocked', 'active']),
});

export type ToggleUserStatusBody = z.infer<typeof toggleUserStatusBodySchema>;
