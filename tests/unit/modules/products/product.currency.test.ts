import { CURRENCY } from '../../../../src/core/constants/currency';
import { MAX_PRICE } from '../../../../src/modules/products/schemas/common.schema';
import { sellxSchema } from '../../../../src/modules/products/schemas/simple.schema';

const baseBody = {
    category: '507f1f77bcf86cd799439011',
    title: 'Refurbished iPhone 15 Pro',
    description: 'Barely used, includes charger and original box.',
    price: 4500,
    location: {
        address: 'Karl Johans gate 1, Oslo',
        city: 'Oslo',
        country: 'Norway',
        latitude: 59.9139,
        longitude: 10.7522,
    },
};

describe('listing currency enforcement', () => {
    it('defaults to NOK when currency is omitted', () => {
        const parsed = sellxSchema.parse(baseBody);
        expect(parsed.currency).toBe(CURRENCY);
    });

    it('accepts an explicit NOK', () => {
        const parsed = sellxSchema.parse({ ...baseBody, currency: CURRENCY });
        expect(parsed.currency).toBe(CURRENCY);
    });

    it.each(['USD', 'EUR', 'GBP', 'nok', 'banana'])('rejects %p', (currency) => {
        const result = sellxSchema.safeParse({ ...baseBody, currency });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0]?.message).toBe('Only NOK is supported.');
        }
    });
});

describe('listing price validation', () => {
    const priceIssues = (price: unknown): string[] => {
        const result = sellxSchema.safeParse({ ...baseBody, price });
        return result.success
            ? []
            : result.error.issues.filter((i) => i.path.join('.') === 'price').map((i) => i.message);
    };

    it.each([
        [4500, 4500],
        [0, 0],
        [1500.5, 1500.5],
        ['4500', 4500],
        ['1500.50', 1500.5],
        ['  4500  ', 4500],
        [MAX_PRICE, MAX_PRICE],
    ])('accepts %p as %p', (price, expected) => {
        expect(sellxSchema.parse({ ...baseBody, price }).price).toBe(expected);
    });

    /**
     * `z.coerce.number()` read every one of these as 0 — an empty price input
     * posted a free listing instead of failing — and `true` as 1.
     */
    it.each([[''], ['   '], [null], [[]], [true], [undefined]])(
        'rejects %p instead of reading it as a price',
        (price) => {
            expect(priceIssues(price)).toHaveLength(1);
        },
    );

    /** Norwegian thousands separators used to parse as a fraction of a krone. */
    it.each([['1.500'], ['1 500'], ['1,500']])('rejects the formatted number %p', (price) => {
        expect(priceIssues(price)).toHaveLength(1);
    });

    it.each([['abc'], ['0x10'], ['1e5'], [NaN], [Infinity], [{}], [['5']]])(
        'rejects %p',
        (price) => {
            expect(priceIssues(price)).toHaveLength(1);
        },
    );

    it('rejects more than two decimals', () => {
        expect(priceIssues(99.999)).toEqual(['Price cannot have more than two decimals']);
    });

    it('rejects a negative price', () => {
        expect(priceIssues(-5)).toEqual(['Price cannot be negative']);
    });

    it('rejects a price above the cap', () => {
        expect(priceIssues(MAX_PRICE + 1)).toEqual([
            `Price cannot exceed ${MAX_PRICE.toLocaleString('en-US')} NOK`,
        ]);
    });
});
