import { z } from 'zod';

export const createReviewBodySchema = z.object({
    targetId: z.string().min(1, 'Target ID is required'),
    targetType: z.enum(['user', 'store']),
    rating: z.number().int().min(1).max(5),
    feedback: z.string().trim().max(1000).optional(),
});

export const reviewQuerySchema = z.object({
    targetId: z.string().min(1),
    targetType: z.enum(['user', 'store']),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const myReviewsQuerySchema = z.object({
    filter: z.enum(['overview', 'received', 'given']),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const storeReviewsQuerySchema = z.object({
    filter: z.enum(['overview', 'received', 'given']),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const updateReviewBodySchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    feedback: z.string().trim().max(1000).optional(),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
export type MyReviewsQuery = z.infer<typeof myReviewsQuerySchema>;
export type StoreReviewsQuery = z.infer<typeof storeReviewsQuerySchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewBodySchema>;
