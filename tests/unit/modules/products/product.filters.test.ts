import { colorMatcher } from '../../../../src/modules/products/product.service';

/**
 * `bodyColor` and `interiorColor` are free text on the listing form, so the old
 * exact `$in` match landed only when the filter string matched the stored one
 * character for character.
 */
describe('colour filtering', () => {
    const matches = (filter: { $in: RegExp[] } | undefined, value: string): boolean =>
        (filter?.$in ?? []).some((pattern) => pattern.test(value));

    it('matches case-insensitively', () => {
        expect(matches(colorMatcher('sort'), 'Sort')).toBe(true);
        expect(matches(colorMatcher('SORT'), 'Sort')).toBe(true);
    });

    it('matches a colour described at length', () => {
        expect(matches(colorMatcher('sort'), 'Obsidian Black Sort metallic')).toBe(true);
    });

    it('still accepts a comma-separated list', () => {
        const filter = colorMatcher('sort, hvit');

        expect(filter!.$in).toHaveLength(2);
        expect(matches(filter, 'Hvit')).toBe(true);
        expect(matches(filter, 'Sort')).toBe(true);
        expect(matches(filter, 'Rød')).toBe(false);
    });

    it('does not match an unrelated colour', () => {
        expect(matches(colorMatcher('sort'), 'Hvit')).toBe(false);
    });

    it('escapes regular expression characters in the term', () => {
        expect(matches(colorMatcher('.*'), 'Sort')).toBe(false);
        expect(matches(colorMatcher('.*'), 'a.*b')).toBe(true);
    });

    it.each([[undefined], [''], ['   '], [' , ,  ']])(
        'builds no filter from %p',
        (value) => {
            expect(colorMatcher(value)).toBeUndefined();
        },
    );
});
