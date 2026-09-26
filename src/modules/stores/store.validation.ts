import z from 'zod';

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;

const contactSchema = z.object({
    type: z.enum(['phone', 'email', 'whatsapp']),
    value: z.string().trim().min(2),
});

export const createStoreBodySchema = z.object({
    name: z.string().trim().min(2).max(100),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
    logo: z.string().trim().url().optional(),
    banner: z.string().trim().url().optional(),
    description: z.string().trim().max(1000).optional(),
    contacts: z.array(contactSchema).optional().default([]),
});

export const updateStoreBodySchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    logo: z.string().trim().url().optional().nullable(),
    banner: z.string().trim().url().optional().nullable(),
    description: z.string().trim().max(1000).optional(),
    contacts: z.array(contactSchema).optional(),
}).refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
});

export const storeReviewsQuerySchema = z.object({
    filter: z.enum(['overview', 'received']),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const storeProductsQuerySchema = z.object({
    filter: z.enum(['active', 'draft', 'promoted', 'sold']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateStoreBody = z.infer<typeof createStoreBodySchema>;
export type UpdateStoreBody = z.infer<typeof updateStoreBodySchema>;
export type StoreReviewsQuery = z.infer<typeof storeReviewsQuerySchema>;
export type StoreProductsQuery = z.infer<typeof storeProductsQuerySchema>;
