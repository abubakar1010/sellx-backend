/**
 * The breadth pass: every category, every variant, every discriminator.
 *
 * `product.validation.test.ts` covers the same schemas in depth, one describe block per
 * category, with fixtures declared inline. This file goes the other way — one assertion applied
 * across all 20 forms from the factory's table — so a category that is added, renamed or
 * silently de-aliased shows up as a failure rather than as a form nobody wrote a test for.
 */
import { BikeType } from '@/modules/products/product.enum';
import { getProductSchema, PRODUCT_CATEGORY_SLUGS } from '@/modules/products/schemas/registry';
import {
    ALL_SLUGS,
    discriminatorOf,
    foreignOf,
    requiredOf,
    SIMPLE_SLUGS,
    slugOf,
    validListing,
    VARIANT_IDS,
    variantsOf,
    type VariantId,
} from '@tests/factories/product.factory';

const parse = (slug: string, body: unknown) => getProductSchema(slug).safeParse(body);

const failedFields = (slug: string, body: unknown): string[] => {
    const result = parse(slug, body);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

/** `[variantId, field]` for every required field of every variant — one test per pair. */
const requiredPairs: [VariantId, string][] = VARIANT_IDS.flatMap((id) =>
    requiredOf(id).map((field): [VariantId, string] => [id, field]),
);

describe('the registry covers all 11 categories', () => {
    it('knows exactly the 11 documented slugs', () => {
        expect([...PRODUCT_CATEGORY_SLUGS].sort()).toEqual([...ALL_SLUGS].sort());
    });

    it.each([...ALL_SLUGS])('resolves a schema for %s', (slug) => {
        expect(getProductSchema(slug)).toBeDefined();
    });

    it.each([['not-a-category'], [''], ['Car'], ['CAR']])(
        'falls back to the SellX schema for %p',
        (slug) => {
            expect(getProductSchema(slug)).toBe(getProductSchema('sellx'));
        },
    );

    // electronics/furniture/clothing are literally `export const electronicsSchema = sellxSchema`.
    // Pinning the identity means a future divergence has to be deliberate.
    it.each([['electronics'], ['furniture'], ['clothing']])(
        '%s shares the SellX schema object',
        (slug) => {
            expect(getProductSchema(slug)).toBe(getProductSchema('sellx'));
        },
    );

    it.each([['book'], ['bike'], ['car'], ['property'], ['boat'], ['motorcycle'], ['job']])(
        '%s has a schema of its own',
        (slug) => {
            expect(getProductSchema(slug)).not.toBe(getProductSchema('sellx'));
        },
    );
});

describe('every form accepts a complete listing', () => {
    it('covers 11 categories across 20 forms', () => {
        expect(VARIANT_IDS).toHaveLength(20);
        expect(new Set(VARIANT_IDS.map(slugOf)).size).toBe(11);
    });

    it.each(VARIANT_IDS)('%s', (id) => {
        const result = parse(slugOf(id), validListing(id));

        if (!result.success) {
            throw new Error(
                `${id} fixture is not valid: ${result.error.issues
                    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                    .join(', ')}`,
            );
        }

        expect(result.success).toBe(true);
    });
});

describe('required fields', () => {
    it.each(requiredPairs)('%s requires %s', (id, field) => {
        expect(failedFields(slugOf(id), validListing(id, { [field]: undefined }))).toContain(field);
    });
});

describe('foreign fields never survive', () => {
    // The middleware writes `result.data` back over `req.body`, so anything the schema drops here
    // never reaches the database. A book listing must not be able to smuggle in `horsepower`.
    it.each(VARIANT_IDS)('%s drops fields belonging to other forms', (id) => {
        const foreign = foreignOf(id);
        const injected = Object.fromEntries(foreign.map((field) => [field, 1]));
        const result = parse(slugOf(id), validListing(id, injected));

        expect(result.success).toBe(true);

        if (result.success) {
            for (const field of foreign) {
                expect(result.data).not.toHaveProperty(field);
            }
        }
    });
});

describe('discriminators', () => {
    const unions = [
        ['car', 'vehicleType'],
        ['property', 'transactionType'],
        ['boat', 'transactionType'],
        ['motorcycle', 'mcType'],
    ] as const;

    it.each(unions)('%s rejects a missing %s', (slug, field) => {
        const first = variantsOf(slug)[0]!;
        expect(failedFields(slug, validListing(first, { [field]: undefined }))).toContain(field);
    });

    it.each(unions)('%s rejects an unknown %s', (slug, field) => {
        const first = variantsOf(slug)[0]!;
        expect(failedFields(slug, validListing(first, { [field]: 'traktor' }))).toContain(field);
    });

    it.each(VARIANT_IDS.filter((id) => discriminatorOf(id)))('%s routes to its own branch', (id) => {
        const field = discriminatorOf(id)!;
        const body = validListing(id);
        const result = parse(slugOf(id), body);

        expect(result.success).toBe(true);
        if (result.success) {
            expect((result.data as Record<string, unknown>)[field]).toBe(body[field]);
        }
    });

    // Only two of the four unions default their discriminator; the other two are a hard failure.
    it('motorcycle defaults transactionType to for_sell', () => {
        const result = parse('motorcycle', validListing('motorcycle:atv'));
        expect(result.success && (result.data as Record<string, unknown>).transactionType).toBe(
            'for_sell',
        );
    });

    it('car defaults transactionType to for_sell', () => {
        const result = parse('car', validListing('car:personbil'));
        expect(result.success && (result.data as Record<string, unknown>).transactionType).toBe(
            'for_sell',
        );
    });

    it.each([...SIMPLE_SLUGS])('%s defaults transactionType to for_sell', (slug) => {
        const id = (slug === 'sellx' ? 'sellx' : slug) as VariantId;
        const result = parse(slug, validListing(id));
        expect(result.success && (result.data as Record<string, unknown>).transactionType).toBe(
            'for_sell',
        );
    });
});

describe('transaction types each category accepts', () => {
    const ALL = ['for_sell', 'for_rent', 'give_away', 'wants_to_buy', 'wants_to_rent'] as const;

    /** What each form legally offers, transcribed from the schemas. */
    const legal: Record<string, readonly string[]> = {
        sellx: ['for_sell', 'wants_to_buy', 'give_away'],
        property: ['for_sell', 'for_rent', 'wants_to_rent'],
        car: ['for_sell', 'for_rent'],
        boat: ['for_sell', 'for_rent', 'wants_to_buy'],
        motorcycle: ['for_sell', 'for_rent'],
    };

    it.each([...SIMPLE_SLUGS])('%s takes only sale, wanted and giveaway', (slug) => {
        const id = slug as VariantId;

        for (const transactionType of ALL) {
            const allowed = legal.sellx!.includes(transactionType);
            // A giveaway must carry a zero price, so vary the price alongside the type.
            const price = transactionType === 'give_away' ? 0 : 100;
            const result = parse(slug, validListing(id, { transactionType, price }));

            expect([transactionType, result.success]).toEqual([transactionType, allowed]);
        }
    });

    it.each([['car', 'car:personbil'], ['motorcycle', 'motorcycle:motorsykkel']] as const)(
        '%s takes only for_sell and for_rent',
        (slug, id) => {
            for (const transactionType of ALL) {
                const result = parse(slug, validListing(id as VariantId, { transactionType }));
                expect([transactionType, result.success]).toEqual([
                    transactionType,
                    legal[slug]!.includes(transactionType),
                ]);
            }
        },
    );

    it.each([
        ['property', ['for_sell', 'for_rent', 'wants_to_rent']],
        ['boat', ['for_sell', 'for_rent', 'wants_to_buy']],
    ] as const)('%s has one form per transaction type', (slug, types) => {
        expect(variantsOf(slug).map((id) => validListing(id).transactionType)).toEqual([...types]);
    });
});

describe('the four categories with the thinnest coverage', () => {
    // bike, electronics, furniture and clothing had no field-level tests before this file.
    it.each([['bike'], ['electronics'], ['furniture'], ['clothing']])(
        '%s requires a description, unlike the vehicle and property forms',
        (slug) => {
            expect(failedFields(slug, validListing(slug as VariantId, { description: undefined }))).toContain(
                'description',
            );
        },
    );

    it.each([['electronics'], ['furniture'], ['clothing'], ['bike']])(
        '%s takes brand as free text, with no list behind it',
        (slug) => {
            const result = parse(slug, validListing(slug as VariantId, { brand: 'Never Heard Of It' }));
            expect(result.success && (result.data as Record<string, unknown>).brand).toBe(
                'Never Heard Of It',
            );
        },
    );

    it.each([['electronics'], ['furniture'], ['clothing'], ['bike']])(
        '%s caps brand at 100 characters',
        (slug) => {
            expect(parse(slug, validListing(slug as VariantId, { brand: 'x'.repeat(100) })).success).toBe(
                true,
            );
            expect(
                failedFields(slug, validListing(slug as VariantId, { brand: 'x'.repeat(101) })),
            ).toContain('brand');
        },
    );

    it('bike accepts every bikeType and rejects anything else', () => {
        for (const bikeType of Object.values(BikeType)) {
            expect([bikeType, parse('bike', validListing('bike', { bikeType })).success]).toEqual([
                bikeType,
                true,
            ]);
        }

        expect(failedFields('bike', validListing('bike', { bikeType: 'enhjuling' }))).toContain(
            'bikeType',
        );
    });

    it('bikeType is optional', () => {
        expect(parse('bike', validListing('bike', { bikeType: undefined })).success).toBe(true);
    });

    it('book takes a bookCategory but no brand', () => {
        const result = parse('book', validListing('book', { brand: 'Gyldendal' }));
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).not.toHaveProperty('brand');
    });
});
