import z from 'zod';
import { ACTIVITY_TYPES } from './activity.interface';

export const activityListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    type: z.enum(ACTIVITY_TYPES as unknown as [string, ...string[]]).optional(),
    actorId: z.string().optional(),
});

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
