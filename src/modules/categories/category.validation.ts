/* ========================================================================== */
/*                                  Category                                   */
/* ========================================================================== */

import z from 'zod';

const thumbnailSchema = z.string().trim().refine(
    (val) => val.startsWith('/uploads/') || z.string().url().safeParse(val).success,
    { message: 'Thumbnail must be a valid URL or an upload path' },
);

/** POST /admin/categories */
export const createCategoryBodySchema = z.object({
    title: z.string().trim().min(2).max(100),
    thumbnail: thumbnailSchema,
    description: z.string().trim().max(500).optional(),
    basicPricing: z.coerce.number().min(0).optional(),
    plusPricing: z.coerce.number().min(0).optional(),
    sortOrder: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes')
        .min(2)
        .max(120)
        .optional(), // auto-generated if missing
});

/** PATCH /admin/categories/:id */
export const updateCategoryBodySchema = z.object({
    title: z.string().trim().min(2).max(100).optional(),
    thumbnail: thumbnailSchema.optional(),
    description: z.string().trim().max(500).optional(),
    basicPricing: z.coerce.number().min(0).optional(),
    plusPricing: z.coerce.number().min(0).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
});

/** GET /categories */
export const listCategoriesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().trim().optional().default('sortOrder'),
    search: z.string().trim().optional(),
});

/* ========================================================================== */
/*                                Inferred Types                              */
/* ========================================================================== */

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
