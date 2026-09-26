import {
    createSubscriptionBodySchema,
    updateSubscriptionBodySchema,
} from '@/modules/subscriptions/subscription.validation';

const validPlan = (overrides: Record<string, unknown> = {}) => ({
    name: 'Professional Seller',
    price: 199,
    billingType: 'monthly',
    durationDays: 30,
    maxListings: -1,
    listingDurationHours: 720,
    ...overrides,
});

const errorsOf = (result: {
    success: boolean;
    error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
    Object.fromEntries(
        (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
    );

describe('createSubscriptionBodySchema', () => {
    it('accepts a complete plan and applies defaults', () => {
        const result = createSubscriptionBodySchema.parse(validPlan());

        expect(result).toMatchObject({
            durationDays: 30,
            maxListings: -1,
            isActive: true,
            currency: 'NOK',
        });
    });

    it('accepts numbers sent as strings', () => {
        const result = createSubscriptionBodySchema.parse(
            validPlan({
                price: '49.5',
                durationDays: '7',
                maxListings: '10',
                listingDurationHours: '48',
            }),
        );

        expect(result).toMatchObject({
            price: 49.5,
            durationDays: 7,
            maxListings: 10,
            listingDurationHours: 48,
        });
    });

    it('reports missing numeric fields as required, not as NaN', () => {
        const body = validPlan();
        delete (body as Record<string, unknown>).durationDays;
        const result = createSubscriptionBodySchema.safeParse({
            ...body,
            maxListings: '',
            listingDurationHours: null,
        });

        expect(errorsOf(result)).toEqual({
            durationDays: 'Plan duration (days) is required.',
            maxListings: 'Max listings is required.',
            listingDurationHours: 'Listing duration (hours) is required.',
        });
    });

    it('explains invalid numeric values in plain language', () => {
        const result = createSubscriptionBodySchema.safeParse(
            validPlan({
                price: 'abc',
                durationDays: 1.5,
                maxListings: -2,
                listingDurationHours: 0,
            }),
        );

        expect(errorsOf(result)).toEqual({
            price: 'Price must be a number.',
            durationDays: 'Plan duration must be a whole number of days.',
            maxListings: 'Max listings must be 0 or more, or -1 for unlimited.',
            listingDurationHours: 'Listing duration must be at least 1 hour.',
        });
    });

    it('rejects unsupported billing types with the allowed options', () => {
        const result = createSubscriptionBodySchema.safeParse(
            validPlan({ billingType: 'onetime' }),
        );

        expect(errorsOf(result)).toEqual({
            billingType: 'Billing type must be either "weekly" or "monthly".',
        });
    });

    it('requires a plan name', () => {
        const result = createSubscriptionBodySchema.safeParse(validPlan({ name: undefined }));

        expect(errorsOf(result)).toEqual({ name: 'Plan name is required.' });
    });
});

describe('updateSubscriptionBodySchema', () => {
    it('accepts a partial update', () => {
        expect(updateSubscriptionBodySchema.parse({ durationDays: '14' })).toEqual({
            durationDays: 14,
        });
    });

    it('asks for at least one field when the body is empty', () => {
        const result = updateSubscriptionBodySchema.safeParse({});

        expect(result.error?.issues[0]?.message).toBe(
            'Please provide at least one field to update.',
        );
    });
});
