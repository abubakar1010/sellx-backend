import z from 'zod';

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;

const coordinatesSchema = z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .describe('[longitude, latitude]');

const locationSchema = z.object({
    type: z.literal('Point').default('Point'),
    coordinates: coordinatesSchema,
});

const addressSchema = z.object({
    label: z.string().trim().max(50).optional(),
    addressLine: z.string().trim().min(3).max(255),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    location: locationSchema,
    isDefault: z.boolean().optional().default(false),
});

export const completeProfileBodySchema = z.object({
    phone: z.string().trim().regex(phoneRegex, 'Invalid phone number').optional(),
    location: locationSchema.optional(),
    address: z
        .string({ error: 'Address is required' })
        .trim()
        .min(3, 'Address must be at least 3 characters')
        .max(255, 'Address must be at most 255 characters'),
});

export const selectCategoriesBodySchema = z.object({
    categories: z.array(z.string().trim()).min(1, 'At least one category is required'),
});

export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type SelectCategoriesBody = z.infer<typeof selectCategoriesBodySchema>;