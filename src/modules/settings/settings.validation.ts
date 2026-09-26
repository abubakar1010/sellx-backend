import z from 'zod';

export const settingSlugEnum = z.enum(['about_us', 'privacy_policy', 'terms_and_conditions']);

export const upsertSettingBodySchema = z.object({
    slug: settingSlugEnum,
    title: z.string().trim().min(2).max(200),
    content: z.string().trim().min(1),
});

export type UpsertSettingBody = z.infer<typeof upsertSettingBodySchema>;
