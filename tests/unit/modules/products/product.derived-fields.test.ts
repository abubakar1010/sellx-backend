/**
 * `applyDerivedFields` — the fields the client must not be able to set, per category.
 *
 * The schemas deliberately let some of these through: a job body carrying `price: 500` parses
 * fine, and it is this method that pins it to zero. That means the schema tests alone cannot
 * prove a job ad is free, or that `totalPrice` is computed rather than accepted.
 *
 * Pure and synchronous, so no database is involved.
 */
import type { IProductWritePayload } from '@/modules/products/product.interface';
import { productService } from '@/modules/products/product.service';

const derive = (payload: Record<string, unknown>, slug: string): Record<string, unknown> => {
    const copy = { ...payload } as IProductWritePayload;
    productService.applyDerivedFields(copy, slug);
    return copy as Record<string, unknown>;
};

describe('price is forced to zero where the category says it must be', () => {
    it('zeroes a job ad even when the client sent a salary in the price field', () => {
        expect(derive({ price: 500 }, 'job').price).toBe(0);
    });

    it.each([['sellx'], ['electronics'], ['furniture'], ['clothing'], ['book'], ['bike']])(
        'zeroes a %s giveaway',
        (slug) => {
            expect(derive({ price: 250, transactionType: 'give_away' }, slug).price).toBe(0);
        },
    );

    it('leaves an ordinary sale price alone', () => {
        expect(derive({ price: 250, transactionType: 'for_sell' }, 'sellx').price).toBe(250);
    });
});

describe('totalPrice is computed, never accepted', () => {
    it('adds shared debt and additional costs on a property', () => {
        expect(derive({ price: 6_500_000, sharedDebt: 250_000, additionalCosts: 165_000 }, 'property'))
            .toMatchObject({ totalPrice: 6_915_000 });
    });

    it('treats a missing property component as zero', () => {
        expect(derive({ price: 6_500_000 }, 'property').totalPrice).toBe(6_500_000);
        expect(derive({ price: 100, sharedDebt: 50 }, 'property').totalPrice).toBe(150);
    });

    it.each([['car'], ['motorcycle']])('adds the re-registration fee on a %s', (slug) => {
        expect(derive({ price: 349_000, reRegistrationFee: 6_800 }, slug).totalPrice).toBe(355_800);
    });

    it.each([['car'], ['motorcycle']])('leaves an exempt %s at its asking price', (slug) => {
        expect(
            derive({ price: 349_000, reRegistrationFee: 6_800, reRegistrationExempt: true }, slug)
                .totalPrice,
        ).toBe(349_000);
    });

    it.each([['sellx'], ['boat'], ['bike'], ['book'], ['electronics'], ['furniture'], ['clothing']])(
        'leaves %s totalPrice equal to the price',
        (slug) => {
            expect(derive({ price: 4200 }, slug).totalPrice).toBe(4200);
        },
    );

    it('overwrites a totalPrice the client tried to set', () => {
        expect(derive({ price: 100, totalPrice: 1 }, 'sellx').totalPrice).toBe(100);
    });

    it('follows the zeroed price on a job ad and a giveaway', () => {
        expect(derive({ price: 500 }, 'job').totalPrice).toBe(0);
        expect(derive({ price: 500, transactionType: 'give_away' }, 'sellx').totalPrice).toBe(0);
    });

    it('reads a price sent as a numeric string', () => {
        expect(derive({ price: '4500' }, 'sellx').totalPrice).toBe(4500);
    });
});

describe('showingDate mirrors the first viewing', () => {
    it('copies the first slot so the existing showing-date filter keeps working', () => {
        const first = new Date('2026-09-14');
        const derived = derive(
            { price: 1, viewings: [{ date: first }, { date: new Date('2026-09-16') }] },
            'property',
        );

        expect(derived.showingDate).toBe(first);
    });

    it.each([[[]], [undefined]])('leaves showingDate untouched for viewings %p', (viewings) => {
        expect(derive({ price: 1, viewings }, 'property')).not.toHaveProperty('showingDate');
    });
});
