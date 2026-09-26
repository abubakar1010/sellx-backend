import { z } from 'zod';

import {
    formatZodError,
    humanizeFieldName,
    registerZodErrorMessages,
} from '@/shared/utils/zodErrors';

const messagesOf = (schema: z.ZodType, input: unknown): string[] => {
    const result = schema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('zodErrors', () => {
    beforeAll(() => {
        registerZodErrorMessages();
    });

    afterAll(() => {
        z.config({ customError: undefined });
    });

    describe('humanizeFieldName', () => {
        it.each([
            ['listingDurationHours', 'Listing duration hours'],
            ['category_id', 'Category ID'],
            ['imageUrl', 'Image URL'],
            ['name', 'Name'],
        ])('turns %s into %s', (key, label) => {
            expect(humanizeFieldName(key)).toBe(label);
        });
    });

    describe('default messages', () => {
        it('reports missing and mistyped fields', () => {
            const schema = z.object({
                durationDays: z.number(),
                title: z.string(),
                count: z.coerce.number(),
                qty: z.number().int(),
                isActive: z.boolean(),
                tags: z.array(z.string()),
            });

            expect(
                messagesOf(schema, {
                    title: 5,
                    count: 'abc',
                    qty: 1.5,
                    isActive: 'yes',
                    tags: 'a',
                }),
            ).toEqual([
                'Duration days is required.',
                'Title must be text.',
                'Count must be a number.',
                'Qty must be a whole number.',
                'Is active must be true or false.',
                'Tags must be a list.',
            ]);
        });

        it('describes size limits', () => {
            const schema = z.object({
                name: z.string().min(3).max(5),
                note: z.string().min(1),
                price: z.number().min(0),
                ratio: z.number().gt(0),
                limit: z.number().max(10),
                images: z.array(z.string()).min(1).max(1),
            });

            expect(
                messagesOf(schema, {
                    name: 'ab',
                    note: '',
                    price: -1,
                    ratio: 0,
                    limit: 11,
                    images: [],
                }),
            ).toEqual([
                'Name must be at least 3 characters.',
                'Note cannot be empty.',
                'Price must be at least 0.',
                'Ratio must be greater than 0.',
                'Limit must be at most 10.',
                'Images must have at least one item.',
            ]);
            expect(messagesOf(schema.pick({ name: true }), { name: 'abcdef' })).toEqual([
                'Name must be at most 5 characters.',
            ]);
        });

        it('lists allowed options, formats and unknown keys', () => {
            const schema = z
                .object({
                    status: z.enum(['active', 'paused']),
                    email: z.email(),
                    website: z.url(),
                    tags: z.array(z.string()),
                })
                .strict();

            expect(
                messagesOf(schema, {
                    status: 'x',
                    email: 'no',
                    website: 'nope',
                    tags: [1],
                    extra: 1,
                }),
            ).toEqual([
                'Status must be one of: active, paused.',
                'Please enter a valid email address.',
                'Website must be a valid URL.',
                'Tags (item 1) must be text.',
                'Unexpected field: extra.',
            ]);
        });

        it('reports a missing request body', () => {
            expect(messagesOf(z.object({ a: z.string() }), undefined)).toEqual([
                'Request data is required.',
            ]);
        });

        it('never overrides a message set on the schema', () => {
            expect(messagesOf(z.string().min(1, 'Address is required'), '')).toEqual([
                'Address is required',
            ]);
        });
    });

    describe('formatZodError', () => {
        it('uses the first issue as the summary and keeps every field error', () => {
            const result = z.object({ a: z.string(), b: z.number() }).safeParse({});

            expect(formatZodError(result.error!)).toEqual({
                message: 'A is required.',
                errors: [
                    { field: 'a', message: 'A is required.' },
                    { field: 'b', message: 'B is required.' },
                ],
            });
        });
    });
});
