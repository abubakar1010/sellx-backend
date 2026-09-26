import { z } from 'zod';

export const filterOptionsQuerySchema = z.object({
    category: z.string().trim().min(1),
});

export const filterModelsQuerySchema = z.object({
    category: z.string().trim().min(1),
    brand: z.string().trim().min(1),
});

export type FilterOptionsQuery = z.infer<typeof filterOptionsQuerySchema>;
export type FilterModelsQuery = z.infer<typeof filterModelsQuerySchema>;
