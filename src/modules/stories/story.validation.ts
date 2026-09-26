import { z } from 'zod';

const textOverlaySchema = z.object({
    text: z.string().trim().min(1).max(500),
    style: z
        .object({
            fontSize: z.number().int().min(8).max(200).optional(),
            color: z.string().trim().optional(),
            fontWeight: z.enum(['normal', 'bold']).optional(),
            fontFamily: z.string().trim().optional(),
            textAlign: z.enum(['left', 'center', 'right']).optional(),
            position: z
                .object({
                    x: z.number().min(0).max(100),
                    y: z.number().min(0).max(100),
                })
                .optional(),
        })
        .optional(),
});

export const createStoryBodySchema = z.object({
    texts: z.array(textOverlaySchema).max(20).optional().default([]),
    product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID').optional(),
    purchaseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid purchase ID'),
});

export const listStoriesQuerySchema = z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    storeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateStoryBodySchema = z.object({
    texts: z.array(textOverlaySchema).max(20).optional(),
    product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID').optional().nullable(),
});

export type CreateStoryBody = z.infer<typeof createStoryBodySchema>;
export type ListStoriesQuery = z.infer<typeof listStoriesQuerySchema>;
export type UpdateStoryBody = z.infer<typeof updateStoryBodySchema>;
