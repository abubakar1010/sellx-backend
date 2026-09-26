import z from 'zod';

export const createAdCampaignBodySchema = z.object({
    thumbnail: z.string().trim().min(1).optional(),
    destination: z.string().trim().url().min(1),
    adTitle: z.string().trim().min(2).max(200),
    description: z.string().trim().max(500).optional(),
    packageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID'),
});

export const updateAdCampaignBodySchema = z.object({
    thumbnail: z.string().trim().min(1).optional(),
    destination: z.string().trim().url().optional(),
    adTitle: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(500).optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
});

export const listAdsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    adType: z.string().trim().optional(),
});

export const publicAdsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    adType: z.string().trim().optional(),
    sort: z.enum(['adType', '-adType', 'createdAt', '-createdAt']).optional().default('-createdAt'),
});

export type CreateAdCampaignBody = z.infer<typeof createAdCampaignBodySchema>;
export type UpdateAdCampaignBody = z.infer<typeof updateAdCampaignBodySchema>;
export type ListAdsQuery = z.infer<typeof listAdsQuerySchema>;
export type PublicAdsQuery = z.infer<typeof publicAdsQuerySchema>;
