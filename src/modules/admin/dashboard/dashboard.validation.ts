import z from 'zod';

export const dashboardSummaryQuerySchema = z.object({
    timespan: z.enum(['monthly', 'yearly']).optional().default('monthly'),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
