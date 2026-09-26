import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createSavedSearchBodySchema = z.object({
    text: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    sort: z.string().trim().optional(),
}).refine(d => d.text || (d.filters && Object.keys(d.filters).length > 0), {
    message: 'Either text or filters must be provided',
});

export const updateSavedSearchBodySchema = z.object({
    text: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    sort: z.string().trim().optional(),
}).refine(d => Object.keys(d).length > 0, {
    message: 'At least one field is required',
});

export const savedSearchIdParamSchema = z.object({
    id: z.string().regex(objectIdRegex, 'Invalid saved search id.'),
});

export const listSavedSearchesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    category: z.string().trim().optional(),
});
