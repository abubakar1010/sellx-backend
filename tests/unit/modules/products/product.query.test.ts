/**
 * The read path: the query and body schemas in `product.validation.ts`.
 *
 * None of these had a test. They are also where the audit's fourth coercion hole lived: every
 * numeric filter was a `z.coerce.number()`, so a browser submitting an untouched "max price" box
 * as `?maxPrice=` reached the service as the number 0. It never became a user-visible bug —
 * `if (query.minPrice || query.maxPrice)` skips a falsy zero — but the filter meant the opposite
 * of what it said, and stayed harmless only by accident.
 */
import { REPORT_REASONS } from '@/modules/products/product.constants';
import {
    listProductsQuerySchema,
    markSoldBodySchema,
    myProductsQuerySchema,
    promoteProductBodySchema,
    recentlyViewedQuerySchema,
    reportProductBodySchema,
} from '@/modules/products/product.validation';

const OBJECT_ID = '507f1f77bcf86cd799439011';

const list = (query: Record<string, unknown>) => listProductsQuerySchema.safeParse(query);

const listData = (query: Record<string, unknown>): Record<string, unknown> => {
    const result = list(query);
    if (!result.success) throw new Error(`expected a valid query: ${result.error.message}`);
    return result.data as Record<string, unknown>;
};

const listFields = (query: Record<string, unknown>): string[] => {
    const result = list(query);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('listProductsQuerySchema paging and sorting', () => {
    it('defaults to the first page of twenty, newest first', () => {
        expect(listData({})).toMatchObject({ page: 1, limit: 20, sort: '-createdAt' });
    });

    it('takes paging as numbers or as the strings a query string actually carries', () => {
        expect(listData({ page: 2, limit: 50 })).toMatchObject({ page: 2, limit: 50 });
        expect(listData({ page: '2', limit: '50' })).toMatchObject({ page: 2, limit: 50 });
    });

    it.each([[0], [-1], [1.5]])('rejects the page %p', (page) => {
        expect(listFields({ page })).toContain('page');
    });

    it.each([[0], [51], [2.5]])('rejects the limit %p', (limit) => {
        expect(listFields({ limit })).toContain('limit');
    });
});

describe('blank numeric filters', () => {
    // FIXED. Every one of these used to coerce an empty box to 0, so `?maxPrice=` arrived at the
    // service as "nothing over zero kroner". The damage was masked by the service's truthiness
    // guards — `if (query.minPrice || query.maxPrice)` skips a zero — so no user ever saw an
    // empty result set from it. The value is nonetheless now `undefined`, which is what "not
    // set" means, instead of a 0 that only happens to be harmless because of a check elsewhere.
    //
    // Zod keeps the key and sets it to `undefined` rather than omitting it, which the service
    // handles: it tests `!= null`, not `in`.
    it.each([
        ['minPrice'],
        ['maxPrice'],
        ['radius'],
        ['minMileage'],
        ['maxMileage'],
        ['minYear'],
        ['maxYear'],
        ['minUsableArea'],
        ['maxUsableArea'],
        ['minBedrooms'],
        ['minLength'],
        ['maxMaxSpeedKnots'],
        ['minDisplacement'],
        ['showingDate'],
    ])('an empty %s reads as unset, not as zero', (field) => {
        for (const blank of ['', '   ', null]) {
            expect([blank, listData({ [field]: blank })[field]]).toEqual([blank, undefined]);
        }
    });

    it('leaves an empty page or limit on its default rather than failing', () => {
        expect(listData({ page: '', limit: '' })).toMatchObject({ page: 1, limit: 20 });
    });

    it('still reads a real number, including zero', () => {
        expect(listData({ minPrice: '0' })).toMatchObject({ minPrice: 0 });
        expect(listData({ minPrice: 100, maxPrice: '5000' })).toMatchObject({
            minPrice: 100,
            maxPrice: 5000,
        });
    });

    it('still refuses a value that is not a number at all', () => {
        expect(listFields({ minPrice: 'abc' })).toContain('minPrice');
        expect(listFields({ minYear: 2019.5 })).toContain('minYear');
    });

    it('reads a real showingDate', () => {
        expect(listData({ showingDate: '2026-09-14' }).showingDate).toEqual(
            new Date('2026-09-14T00:00:00.000Z'),
        );
    });
});

describe('listProductsQuerySchema identifiers and enums', () => {
    it.each([
        ['category', 'Invalid category ID'],
        ['userId', 'Invalid user ID'],
    ])('%s must be an ObjectId', (field, message) => {
        expect(listData({ [field]: OBJECT_ID })).toMatchObject({ [field]: OBJECT_ID });

        const result = list({ [field]: 'nope' });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0]!.message).toBe(message);
    });

    it.each([['new'], ['used']])('accepts the condition %s', (condition) => {
        expect(listData({ condition })).toMatchObject({ condition });
    });

    it('rejects an unknown condition', () => {
        expect(listFields({ condition: 'refurbished' })).toContain('condition');
    });

    it.each([['today_best'], ['recently_viewed']])('accepts the filter %s', (filter) => {
        expect(listData({ filter })).toMatchObject({ filter });
    });

    it('rejects an unknown filter', () => {
        expect(listFields({ filter: 'trending' })).toContain('filter');
    });

    it('drops a query parameter it does not know', () => {
        expect(listData({ nonsense: 'x' })).not.toHaveProperty('nonsense');
    });
});

describe('the deliberate looseness of the category filters', () => {
    // The write path enum-checks these; the read path does not, so a filter-only value that no
    // form can produce is accepted here and simply matches nothing. Locking this down means the
    // asymmetry is a decision on record rather than an oversight.
    it.each([
        ['contractType', 'bemanningsbyra'],
        ['type', 'bygaard_flermannsbolig'],
        ['type', 'produksjon_industri'],
        ['transactionType', 'for_rent'],
        ['vehicleType', 'traktor'],
        ['mcType', 'nonsense'],
    ])('accepts %s=%s and lets the query return nothing', (field, value) => {
        expect(listData({ [field]: value })).toMatchObject({ [field]: value });
    });
});

describe('the smaller schemas', () => {
    it('recentlyViewedQuerySchema pages like the main list', () => {
        expect(recentlyViewedQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
        expect(recentlyViewedQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    });

    it.each([['active'], ['draft'], ['promoted'], ['sold'], ['expired']])(
        'myProductsQuerySchema accepts the %s filter',
        (filter) => {
            expect(myProductsQuerySchema.parse({ filter })).toMatchObject({ filter });
        },
    );

    it('myProductsQuerySchema rejects an unknown filter', () => {
        expect(myProductsQuerySchema.safeParse({ filter: 'archived' }).success).toBe(false);
    });

    it('promoteProductBodySchema demands an ObjectId plan', () => {
        expect(promoteProductBodySchema.parse({ planId: OBJECT_ID }).planId).toBe(OBJECT_ID);

        const result = promoteProductBodySchema.safeParse({ planId: 'basic' });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues[0]!.message).toBe('Invalid plan ID');
    });

    it('markSoldBodySchema takes an optional whole quantity of at least one', () => {
        expect(markSoldBodySchema.parse({}).quantity).toBeUndefined();
        expect(markSoldBodySchema.parse({ quantity: '3' }).quantity).toBe(3);

        for (const quantity of [0, -1, 1.5, '', null]) {
            expect(markSoldBodySchema.safeParse({ quantity }).success).toBe(false);
        }
    });

    it.each(Object.values(REPORT_REASONS).map((reason) => [reason]))(
        'reportProductBodySchema accepts the reason %s',
        (reason) => {
            expect(reportProductBodySchema.parse({ reason }).reason).toBe(reason);
        },
    );

    it('reportProductBodySchema rejects an unknown reason and caps the details', () => {
        expect(reportProductBodySchema.safeParse({ reason: 'i_dont_like_it' }).success).toBe(false);
        expect(
            reportProductBodySchema.safeParse({ reason: 'scam_or_fraud', details: 'a'.repeat(500) })
                .success,
        ).toBe(true);
        expect(
            reportProductBodySchema.safeParse({ reason: 'scam_or_fraud', details: 'a'.repeat(501) })
                .success,
        ).toBe(false);
    });
});
