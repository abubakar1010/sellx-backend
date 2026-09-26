import { z } from 'zod';

export const updateNotificationPreferenceBodySchema = z
    .object({
        messages: z.boolean().optional(),
        savedSearches: z.boolean().optional(),
        favorites: z.boolean().optional(),
        myListings: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
        general: z.boolean().optional(),
    })
    .strict();
