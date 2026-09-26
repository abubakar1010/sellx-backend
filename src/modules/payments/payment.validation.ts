import z from 'zod';

export const listPaymentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    paymentType: z.enum(['boost', 'story', 'listing', 'subscription', 'ad']).nullish(),
    status: z.enum(['pending', 'approved', 'rejected']).nullish(),
    search: z.string().trim().optional(),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
