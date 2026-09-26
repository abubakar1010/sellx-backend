import z from 'zod';

export const adminStoriesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    search: z.string().trim().optional(),
    userId: z.string().optional(),
    isActive: z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export type AdminStoriesQuery = z.infer<typeof adminStoriesQuerySchema>;
