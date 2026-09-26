import { usdToNok } from '../../../src/seeds/migrate-currency-to-nok.seed';

describe('usdToNok', () => {
    // Rate 10, rounded up to the next value ending in 9 (agreed charm pricing).
    it.each([
        [49.99, 509],
        [29.99, 309],
        [14.99, 159],
        [9.99, 109],
        [4.99, 59],
        [2, 29],
        [5, 59],
        [9, 99],
        [18, 189],
        [30, 309],
    ])('converts %p USD to %p NOK', (usd, expected) => {
        expect(usdToNok(usd)).toBe(expected);
    });

    it('always lands on a value ending in 9', () => {
        for (let usd = 0.5; usd <= 200; usd += 0.5) {
            expect(usdToNok(usd) % 10).toBe(9);
        }
    });

    it('never rounds down below the converted amount', () => {
        for (let usd = 0.5; usd <= 200; usd += 0.5) {
            expect(usdToNok(usd)).toBeGreaterThanOrEqual(usd * 10);
        }
    });

    it('keeps free items free', () => {
        expect(usdToNok(0)).toBe(0);
    });

    it('treats missing or negative amounts as zero', () => {
        expect(usdToNok(undefined as unknown as number)).toBe(0);
        expect(usdToNok(-5)).toBe(0);
    });

    it('stays above the Stripe minimum charge for NOK (~3 kr)', () => {
        expect(usdToNok(0.01)).toBeGreaterThanOrEqual(3);
    });
});
