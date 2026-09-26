/**
 * The edges of every bounded field: the last value each one accepts, and the first it refuses.
 *
 * Before this file the only cap with a test was `MAX_PRICE`. The caps live in four different
 * schema files with four different sets of local constants, and two of them disagree — a boat
 * may weigh 1 000 000 kg while a car may weigh 100 000 — so the numbers below are written out
 * rather than imported: an accidental edit to a cap should fail here, not be mirrored.
 */
import { getProductSchema } from '@/modules/products/schemas/registry';
import { currentYear, MAX_AREA, MAX_COUNT, MAX_PRICE } from '@/modules/products/schemas/common.schema';
import { validListing, type VariantId } from '@tests/factories/product.factory';

const parse = (slug: string, body: unknown) => getProductSchema(slug).safeParse(body);

const failedFields = (slug: string, body: unknown): string[] => {
    const result = parse(slug, body);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

const messagesFor = (slug: string, body: unknown, field: string): string[] => {
    const result = parse(slug, body);
    return result.success
        ? []
        : result.error.issues.filter((i) => i.path.join('.') === field).map((i) => i.message);
};

const slugOfVariant = (id: VariantId): string => id.split(':')[0]!;

const accepts = (id: VariantId, field: string, value: unknown): boolean =>
    parse(slugOfVariant(id), validListing(id, { [field]: value })).success;

/** `[variant, field, ceiling]` — the highest value the field takes. */
const CEILINGS: [VariantId, string, number][] = [
    ['sellx', 'price', MAX_PRICE],
    ['sellx', 'quantity', MAX_COUNT],
    ['property:for_sell', 'usableArea', MAX_AREA],
    ['property:for_sell', 'plotSize', MAX_AREA],
    ['property:for_sell', 'commonExpenses', MAX_PRICE],
    ['property:for_sell', 'bedrooms', MAX_COUNT],
    ['property:for_rent', 'primaryRoomArea', MAX_AREA],
    ['car:personbil', 'mileage', 5_000_000],
    ['car:personbil', 'horsepower', 5_000],
    ['car:personbil', 'seats', 100],
    ['car:personbil', 'doors', 100],
    ['car:personbil', 'trunkVolume', 100_000],
    ['car:personbil', 'weight', 100_000],
    ['car:personbil', 'numberOfOwners', 100],
    ['car:bobil', 'cylinderCapacity', 100],
    ['car:bobil', 'length', 100_000],
    ['car:bobil', 'sleepingPlaces', 100],
    ['boat:for_sell', 'length', 1_000],
    ['boat:for_sell', 'maxSpeedKnots', 200],
    ['boat:for_sell', 'width', 100_000],
    ['boat:for_sell', 'weight', 1_000_000],
    ['boat:for_sell', 'sleepingPlaces', 100],
    ['motorcycle:motorsykkel', 'displacement', 10_000],
    ['motorcycle:motorsykkel', 'weight', 100_000],
    ['motorcycle:motorsykkel', 'numberOfOwners', 100],
    ['job', 'numberOfPositions', 10_000],
];

/** `[variant, field, floor]` — the lowest value the field takes, where that is above zero. */
const FLOORS: [VariantId, string, number][] = [
    ['car:personbil', 'seats', 1],
    ['car:bobil', 'cylinderCapacity', 0.1],
    ['car:bobil', 'horsepower', 1],
    ['car:bobil', 'weight', 1],
    ['car:bobil', 'totalWeight', 1],
    ['car:bobil', 'length', 1],
    ['car:bobil', 'registeredSeats', 1],
    ['car:bobil', 'sleepingPlaces', 1],
    ['car:campingvogn', 'weight', 1],
    ['car:campingvogn', 'totalWeight', 1],
    ['car:campingvogn', 'sleepingPlaces', 1],
    ['boat:for_sell', 'length', 1],
    ['property:wants_to_rent', 'numberOfTenants', 1],
    ['job', 'numberOfPositions', 1],
];

describe('numeric ceilings', () => {
    it.each(CEILINGS)('%s accepts %s at its ceiling of %p', (id, field, ceiling) => {
        expect(accepts(id, field, ceiling)).toBe(true);
    });

    it.each(CEILINGS)('%s rejects %s one above %p', (id, field, ceiling) => {
        expect(failedFields(slugOfVariant(id), validListing(id, { [field]: ceiling + 1 }))).toContain(
            field,
        );
    });

    it('spells the ceiling out with thousands separators', () => {
        expect(messagesFor('sellx', validListing('sellx', { quantity: 10_001 }), 'quantity')).toEqual([
            'Quantity cannot exceed 10,000',
        ]);
        expect(
            messagesFor('boat', validListing('boat:for_sell', { maxSpeedKnots: 201 }), 'maxSpeedKnots'),
        ).toEqual(['Top speed cannot exceed 200 knots']);
    });

    // The same field name carries a different cap on different forms. Not a bug, but the kind of
    // asymmetry that gets "tidied" into a single constant by someone who has not read both files.
    it('lets a boat weigh ten times what a car may weigh', () => {
        expect(accepts('boat:for_sell', 'weight', 1_000_000)).toBe(true);
        expect(accepts('car:personbil', 'weight', 1_000_000)).toBe(false);
    });
});

describe('numeric floors', () => {
    it.each(FLOORS)('%s accepts %s at its floor of %p', (id, field, floor) => {
        expect(accepts(id, field, floor)).toBe(true);
    });

    it.each(FLOORS)('%s rejects %s below %p', (id, field, floor) => {
        const below = floor === 0.1 ? 0.09 : floor - 1;
        expect(failedFields(slugOfVariant(id), validListing(id, { [field]: below }))).toContain(field);
    });

    it('says what the floor is, with the unit', () => {
        expect(
            messagesFor('car', validListing('car:bobil', { cylinderCapacity: 0 }), 'cylinderCapacity'),
        ).toEqual(['Cylinder capacity must be at least 0.1 l']);
        expect(messagesFor('boat', validListing('boat:for_sell', { length: 0 }), 'length')).toEqual([
            'Length must be at least 1 ft',
        ]);
    });

    it('calls a negative value negative rather than quoting the floor', () => {
        expect(messagesFor('sellx', validListing('sellx', { price: -1 }), 'price')).toEqual([
            'Price cannot be negative',
        ]);
    });

    // Reported, not fixed: `horsepower` has a floor of 1 on the motorhome branch and none on the
    // car branch of the same union, so a 0 hp car parses while a 0 hp motorhome does not.
    it('has an inconsistent horsepower floor across the car union', () => {
        expect(accepts('car:personbil', 'horsepower', 0)).toBe(true);
        expect(accepts('car:bobil', 'horsepower', 0)).toBe(false);
    });
});

describe('the four ways a number is refused', () => {
    const cases: [string, unknown][] = [
        ['an empty string', ''],
        ['whitespace', '   '],
        ['null', null],
        ['a boolean', true],
        ['an array', []],
        ['an object', {}],
        ['a word', 'abc'],
        ['a Norwegian thousands separator', '1.500'],
        ['a comma decimal', '1,5'],
        ['a space separator', '1 500'],
        ['hex', '0x10'],
        ['exponential', '1e5'],
        ['NaN', NaN],
        ['Infinity', Infinity],
    ];

    it.each(cases)('rejects %s rather than reading it as a price', (_label, price) => {
        expect(failedFields('sellx', validListing('sellx', { price }))).toContain('price');
    });

    it('accepts a plain number and a plain numeric string', () => {
        expect(accepts('sellx', 'price', 1500)).toBe(true);
        expect(accepts('sellx', 'price', '1500')).toBe(true);
        expect(accepts('sellx', 'price', '1500.50')).toBe(true);
        expect(accepts('sellx', 'price', '  4500  ')).toBe(true);
    });

    it('allows two decimals on money and no more', () => {
        expect(accepts('sellx', 'price', 1500.5)).toBe(true);
        expect(accepts('sellx', 'price', 1500.55)).toBe(true);
        expect(messagesFor('sellx', validListing('sellx', { price: 1500.555 }), 'price')).toEqual([
            'Price cannot have more than two decimals',
        ]);
    });

    it('allows no decimals at all on a count', () => {
        expect(messagesFor('sellx', validListing('sellx', { quantity: 1.5 }), 'quantity')).toEqual([
            'Quantity must be a whole number',
        ]);
    });

    it('names the unit in the message for a measurement but not for a count', () => {
        expect(messagesFor('boat', validListing('boat:for_sell', { length: 'x' }), 'length')).toEqual([
            'Length must be a number in ft, for example 1500 or 1500.50',
        ]);
        expect(messagesFor('sellx', validListing('sellx', { quantity: 'x' }), 'quantity')).toEqual([
            'Quantity must be a whole number, for example 3',
        ]);
    });
});

describe('manufacturedYear and the other model years', () => {
    it('accepts 1900 through next year', () => {
        for (const year of [1900, 2000, currentYear, currentYear + 1]) {
            expect(accepts('car:personbil', 'manufacturedYear', year)).toBe(true);
        }
    });

    it.each([[1899], [1000], [0]])('rejects the year %p as too early', (year) => {
        expect(failedFields('car', validListing('car:personbil', { manufacturedYear: year }))).toContain(
            'manufacturedYear',
        );
    });

    it('rejects a year beyond next year', () => {
        expect(accepts('car:personbil', 'manufacturedYear', currentYear + 2)).toBe(false);
    });

    it.each([[2019.5], [''], [null], [true], [[]], ['abc']])(
        'rejects %p as a year',
        (manufacturedYear) => {
            expect(
                failedFields('car', validListing('car:personbil', { manufacturedYear })),
            ).toContain('manufacturedYear');
        },
    );

    it('accepts a year sent as a string', () => {
        expect(accepts('car:personbil', 'manufacturedYear', '2019')).toBe(true);
    });

    it('applies the same rule on the boat and motorcycle forms', () => {
        expect(accepts('boat:for_sell', 'manufacturedYear', 1899)).toBe(false);
        expect(accepts('motorcycle:motorsykkel', 'manufacturedYear', currentYear + 2)).toBe(false);
    });
});

describe('string lengths', () => {
    it('takes a title of 2 to 120 characters', () => {
        expect(accepts('sellx', 'title', 'ab')).toBe(true);
        expect(accepts('sellx', 'title', 'a'.repeat(120))).toBe(true);
        expect(accepts('sellx', 'title', 'a')).toBe(false);
        expect(accepts('sellx', 'title', 'a'.repeat(121))).toBe(false);
    });

    it('measures the title after trimming', () => {
        expect(accepts('sellx', 'title', '  a  ')).toBe(false);
        expect(accepts('sellx', 'title', '  ab  ')).toBe(true);
    });

    it('takes a description of 5 to 5000 characters', () => {
        expect(accepts('sellx', 'description', 'abcde')).toBe(true);
        expect(accepts('sellx', 'description', 'a'.repeat(5000))).toBe(true);
        expect(accepts('sellx', 'description', 'abcd')).toBe(false);
        expect(accepts('sellx', 'description', 'a'.repeat(5001))).toBe(false);
    });

    it.each([
        ['car:personbil', 'bodyColor', 60],
        ['car:personbil', 'variant', 70],
        // Measured on the motorhome branch: a personbil `carModel` also has to be a listed model
        // of its brand, so a 100-character string fails the pairing rule before the length rule.
        ['car:bobil', 'carModel', 100],
        ['car:personbil', 'interiorColor', 120],
        ['property:for_sell', 'neighborhood', 120],
        ['property:for_sell', 'sharedCostsInclude', 2000],
        ['property:for_sell', 'rightOfFirstRefusal', 1000],
        ['boat:for_sell', 'equipmentDescription', 2000],
        ['job', 'companyInfo', 4000],
        ['job', 'salaryDescription', 2000],
    ] as [VariantId, string, number][])('%s caps %s at %p characters', (id, field, cap) => {
        expect(accepts(id, field, 'a'.repeat(cap))).toBe(true);
        expect(accepts(id, field, 'a'.repeat(cap + 1))).toBe(false);
    });

    it.each([
        ['sellx', 'title'],
        ['sellx', 'description'],
        ['car:personbil', 'bodyColor'],
        ['car:personbil', 'carModel'],
        ['property:for_sell', 'municipalityNumber'],
        ['property:for_sell', 'farmNumber'],
        ['property:for_sell', 'usageNumber'],
        ['property:for_sell', 'sharedCostsInclude'],
        ['property:for_sell', 'additionalCostsInclude'],
        ['job', 'jobTitle'],
        ['job', 'industry'],
        ['job', 'employerName'],
    ] as [VariantId, string][])('%s refuses an empty %s', (id, field) => {
        expect(failedFields(slugOfVariant(id), validListing(id, { [field]: '' }))).toContain(field);
    });
});

describe('the apartment number format', () => {
    it.each([['H0201'], ['L0101'], ['U0001'], ['K9999']])('accepts %s', (apartmentNumber) => {
        expect(accepts('property:for_sell', 'apartmentNumber', apartmentNumber)).toBe(true);
    });

    it('upper-cases what the user typed', () => {
        const result = parse('property', validListing('property:for_sell', { apartmentNumber: 'h0201' }));
        expect(result.success && (result.data as Record<string, unknown>).apartmentNumber).toBe('H0201');
    });

    it.each([['A0201'], ['H021'], ['H02010'], ['H-0201'], ['0201'], ['']])(
        'rejects %p',
        (apartmentNumber) => {
            expect(
                failedFields('property', validListing('property:for_sell', { apartmentNumber })),
            ).toContain('apartmentNumber');
        },
    );
});

describe('the keyword list on a job ad', () => {
    it('takes up to five words', () => {
        expect(accepts('job', 'keywords', ['a', 'b', 'c', 'd', 'e'])).toBe(true);
        expect(accepts('job', 'keywords', ['a', 'b', 'c', 'd', 'e', 'f'])).toBe(false);
    });

    it('caps each word at 40 characters and refuses an empty one', () => {
        expect(accepts('job', 'keywords', ['a'.repeat(40)])).toBe(true);
        expect(accepts('job', 'keywords', ['a'.repeat(41)])).toBe(false);
        expect(accepts('job', 'keywords', [''])).toBe(false);
    });

    it('defaults to an empty list', () => {
        const result = parse('job', validListing('job', { keywords: undefined }));
        expect(result.success && (result.data as Record<string, unknown>).keywords).toEqual([]);
    });
});
