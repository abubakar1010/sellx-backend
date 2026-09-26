import { z } from 'zod';

export const couponTypeEnum = z.enum(['percentage', 'flat']);

export const createCouponBodySchema = z.object({
    code: z.string().trim().min(1).max(50),
    type: couponTypeEnum,
    value: z.number().positive(),
    categories: z.array(z.string()).optional(),
    expiryDate: z.string().datetime({ offset: true }),
    usageLimit: z.number().int().positive(),
});

export const updateCouponBodySchema = z.object({
    code: z.string().trim().min(1).max(50).optional(),
    type: couponTypeEnum.optional(),
    value: z.number().positive().optional(),
    categories: z.array(z.string()).optional(),
    expiryDate: z.string().datetime({ offset: true }).optional(),
    usageLimit: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
});

export const validateCouponQuerySchema = z.object({
    code: z.string().trim().min(1),
    categoryId: z.string().optional(),
});

export type CreateCouponBody = z.infer<typeof createCouponBodySchema>;
export type UpdateCouponBody = z.infer<typeof updateCouponBodySchema>;
export type ValidateCouponQuery = z.infer<typeof validateCouponQuerySchema>;
