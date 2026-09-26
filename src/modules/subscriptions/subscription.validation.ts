import z from 'zod';

import { CURRENCY, CURRENCY_ERROR } from '@/core/constants/currency';

/**
 * Accepts numbers sent as JSON numbers or as strings (form fields). Blank values become
 * `undefined` so a missing field reports "is required" instead of `z.coerce`'s
 * "expected number, received NaN".
 */
const toNumber = (value: unknown): unknown => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value.trim() === '' ? undefined : Number(value);
    return value;
};

const numberField = (label: string, refine: (schema: z.ZodNumber) => z.ZodNumber) =>
    z.preprocess(
        toNumber,
        refine(
            z.number({
                error: (issue) =>
                    issue.input === undefined
                        ? `${label} is required.`
                        : `${label} must be a number.`,
            }),
        ),
    );

const nameField = z
    .string({ error: 'Plan name is required.' })
    .trim()
    .min(2, 'Plan name must be at least 2 characters.')
    .max(100, 'Plan name must be at most 100 characters.');

const descriptionField = z
    .string({ error: 'Description must be text.' })
    .trim()
    .max(500, 'Description must be at most 500 characters.');

const featuresField = z.array(z.string({ error: 'Each feature must be text.' }).trim(), {
    error: 'Features must be a list.',
});

const billingTypeField = z.enum(['weekly', 'monthly'], {
    error: 'Billing type must be either "weekly" or "monthly".',
});

const priceField = numberField('Price', (schema) => schema.min(0, 'Price cannot be negative.'));

const durationDaysField = numberField('Plan duration (days)', (schema) =>
    schema
        .int('Plan duration must be a whole number of days.')
        .min(1, 'Plan duration must be at least 1 day.'),
);

const maxListingsField = numberField('Max listings', (schema) =>
    schema
        .int('Max listings must be a whole number.')
        .min(-1, 'Max listings must be 0 or more, or -1 for unlimited.'),
);

const listingDurationHoursField = numberField('Listing duration (hours)', (schema) =>
    schema
        .int('Listing duration must be a whole number of hours.')
        .min(1, 'Listing duration must be at least 1 hour.'),
);

const isActiveField = z.boolean({ error: 'Active status must be true or false.' });

export const createSubscriptionBodySchema = z.object({
    name: nameField,
    icon: z.string().trim().optional().default(''),
    features: featuresField.optional().default([]),
    description: descriptionField.optional(),
    price: priceField,
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).optional().default(CURRENCY),
    billingType: billingTypeField,
    durationDays: durationDaysField,
    maxListings: maxListingsField,
    listingDurationHours: listingDurationHoursField,
    isActive: isActiveField.optional().default(true),
});

export const updateSubscriptionBodySchema = z
    .object({
        name: nameField.optional(),
        icon: z.string().trim().optional(),
        features: featuresField.optional(),
        description: descriptionField.optional(),
        price: priceField.optional(),
        currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).optional(),
        billingType: billingTypeField.optional(),
        durationDays: durationDaysField.optional(),
        maxListings: maxListingsField.optional(),
        listingDurationHours: listingDurationHoursField.optional(),
        isActive: isActiveField.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
        message: 'Please provide at least one field to update.',
    });

export type CreateSubscriptionBody = z.infer<typeof createSubscriptionBodySchema>;
export type UpdateSubscriptionBody = z.infer<typeof updateSubscriptionBodySchema>;
