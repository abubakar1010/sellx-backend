import { getProductSchema } from '../../../../src/modules/products/schemas/registry';
import { CAR_BRANDS } from '../../../../src/modules/products/data/car-brands.constants';
import { BOAT_BRANDS } from '../../../../src/modules/products/data/boat-brands.constants';
import { MC_BRANDS } from '../../../../src/modules/products/data/mc-brands.constants';
import { CARAVAN_BRANDS } from '../../../../src/modules/products/data/caravan-brands.constants';
import { MOTORHOME_BRANDS } from '../../../../src/modules/products/data/motorhome-brands.constants';
import { MOTORHOME_EQUIPMENT_VALUES } from '../../../../src/modules/products/data/motorhome-equipment.constants';
import { CARAVAN_EQUIPMENT_VALUES } from '../../../../src/modules/products/data/caravan-equipment.constants';
import { CAR_EQUIPMENT_VALUES } from '../../../../src/modules/products/data/car-equipment.constants';

const CATEGORY_ID = '507f1f77bcf86cd799439011';

const location = {
    address: 'Karl Johans gate 1',
    city: 'Oslo',
    country: 'Norge',
    latitude: 59.9139,
    longitude: 10.7522,
};

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

/** The six categories that share `simple.schema.ts`. */
const SIMPLE_SLUGS = ['sellx', 'electronics', 'furniture', 'clothing', 'book', 'bike'] as const;

const simpleItem = {
    category: CATEGORY_ID,
    title: 'Ikea Billy bookcase',
    description: 'White, 80x28x202, collected from Oslo.',
    price: 400,
    location: {
        address: 'Karl Johans gate 1',
        city: 'Oslo',
        country: 'Norge',
        latitude: 59.9139,
        longitude: 10.7522,
    },
};

const car = {
    category: CATEGORY_ID,
    vehicleType: 'personbil',
    title: 'BMW 320d xDrive',
    location,
    taxClass: 'personbil',
    manufacturedYear: 2019,
    brand: 'BMW',
    carModel: '3-serie',
    fuel: 'diesel',
    transmission: 'automatic',
    driveType: 'firehjulsdrift',
    bodyType: 'sedan',
    seats: 5,
    bodyColor: 'Obsidian Black',
    mileage: 120000,
    price: 349000,
    reRegistrationFee: 6800,
};

const caravan = {
    category: CATEGORY_ID,
    vehicleType: 'campingvogn',
    title: 'Kabe Royal',
    location,
    manufacturedYear: 2018,
    sleepingPlaces: 5,
    weight: 1400,
    totalWeight: 1800,
    condition: 'used',
    price: 245000,
    reRegistrationExempt: true,
};

const motorhome = {
    category: CATEGORY_ID,
    vehicleType: 'bobil',
    title: 'Hymer B-Klasse',
    location,
    motorhomeType: 'integrert',
    manufacturedYear: 2021,
    fuel: 'diesel',
    cylinderCapacity: 2.3,
    horsepower: 140,
    driveType: 'forhjulsdrift',
    weight: 3200,
    totalWeight: 3500,
    length: 720,
    registeredSeats: 4,
    sleepingPlaces: 4,
    price: 890000,
    reRegistrationExempt: true,
};

const boat = {
    category: CATEGORY_ID,
    transactionType: 'for_sell',
    title: 'Askeladden C65',
    location,
    type: 'bowrider',
    manufacturedYear: 2016,
    length: 21,
    price: 420000,
};

const mc = {
    category: CATEGORY_ID,
    mcType: 'motorsykkel',
    title: 'Yamaha MT-07',
    location,
    motorcycleType: 'classic_nakne',
    manufacturedYear: 2020,
    price: 89000,
    reRegistrationFee: 2500,
};

describe('vehicle brand and model validation', () => {
    describe('reference data matches the spec', () => {
        it('carries every car brand and model from the spec', () => {
            expect(Object.keys(CAR_BRANDS)).toHaveLength(117);
            expect(Object.values(CAR_BRANDS).reduce((n, m) => n + m.length, 0)).toBe(1457);
        });

        it.each([
            ['boat', BOAT_BRANDS, 799],
            ['motorcycle', MC_BRANDS, 263],
            ['caravan', CARAVAN_BRANDS, 135],
        ])('carries the %s brand list', (_label, list, size) => {
            expect(list).toHaveLength(size);
        });

        it('reuses the clean caravan spelling for motorhomes', () => {
            // The spec's motorhome page is a mistranslated copy of the caravan page.
            expect(MOTORHOME_BRANDS).toContain('Hymer');
            expect(MOTORHOME_BRANDS).not.toContain('Humming');
            expect(MOTORHOME_BRANDS).toContain('Pøssl');
            expect(MOTORHOME_BRANDS).not.toContain('Sausage');
        });

        it.each([['Ferrari'], ['Lamborghini'], ['Aston Martin'], ['SEAT'], ['Mini'], ['Lucid']])(
            'includes %s, which the old hand-written list dropped',
            (brand) => {
                expect(Object.keys(CAR_BRANDS)).toContain(brand);
            },
        );
    });

    describe('cars', () => {
        it('accepts a brand and model the spec pairs together', () => {
            expect(parse('car', car).success).toBe(true);
            expect(parse('car', { ...car, brand: 'Ferrari', carModel: '488 Pista' }).success).toBe(true);
        });

        it('rejects a brand that is not in the spec', () => {
            expect(failedFields('car', { ...car, brand: 'DeLorean Motors' })).toContain('brand');
        });

        it('rejects a model that belongs to a different brand', () => {
            expect(failedFields('car', { ...car, brand: 'Audi', carModel: 'Model S' })).toContain(
                'carModel',
            );
        });

        it('accepts the Andre escape hatch even where the spec omits it', () => {
            // Tesla is one of 16 brands the spec never gives an "Andre" entry.
            expect(CAR_BRANDS.Tesla).not.toContain('Andre');
            expect(parse('car', { ...car, brand: 'Tesla', carModel: 'Andre' }).success).toBe(true);
            expect(parse('car', { ...car, brand: 'Toyota', carModel: 'Andre' }).success).toBe(true);
        });

        it('still requires both fields', () => {
            expect(failedFields('car', { ...car, brand: undefined })).toContain('brand');
            expect(failedFields('car', { ...car, carModel: undefined })).toContain('carModel');
        });
    });

    describe('caravans and motorhomes', () => {
        it('accepts a listed caravan brand and rejects an unlisted one', () => {
            expect(parse('car', { ...caravan, brand: 'Bürstner' }).success).toBe(true);
            expect(failedFields('car', { ...caravan, brand: 'Totally Made Up' })).toContain('brand');
        });

        it('accepts a listed motorhome brand and rejects an unlisted one', () => {
            expect(parse('car', { ...motorhome, brand: 'Hymer' }).success).toBe(true);
            expect(failedFields('car', { ...motorhome, brand: 'Humming' })).toContain('brand');
        });

        it('leaves the brand optional, as the spec does', () => {
            expect(parse('car', caravan).success).toBe(true);
            expect(parse('car', motorhome).success).toBe(true);
        });

        it('leaves the model free text, as the spec does', () => {
            expect(parse('car', { ...caravan, brand: 'KABE', carModel: 'Royal 560 XL' }).success).toBe(
                true,
            );
        });
    });

    describe('boats', () => {
        it('accepts a listed brand and rejects an unlisted one', () => {
            expect(parse('boat', { ...boat, brand: 'Askeladden' }).success).toBe(true);
            expect(failedFields('boat', { ...boat, brand: 'SS Minnow' })).toContain('brand');
        });

        it('keeps the model free text', () => {
            expect(parse('boat', { ...boat, brand: 'Askeladden', carModel: 'C65 Cabin' }).success).toBe(
                true,
            );
        });
    });

    describe('car form fields the spec pins down', () => {
        it('requires mileage on a car, per spec field 27', () => {
            expect(failedFields('car', { ...car, mileage: undefined })).toContain('mileage');
            expect(parse('car', { ...car, mileage: 0 }).success).toBe(true);
        });

        it('leaves mileage optional on caravans and motorhomes, as the spec does', () => {
            expect(parse('car', caravan).success).toBe(true);
            expect(parse('car', motorhome).success).toBe(true);
        });

        it('offers only manual and automatic gearboxes, per spec field 13', () => {
            expect(parse('car', { ...car, transmission: 'manual' }).success).toBe(true);
            expect(parse('car', { ...car, transmission: 'automatic' }).success).toBe(true);
            expect(failedFields('car', { ...car, transmission: 'semi_automatic' })).toContain(
                'transmission',
            );
        });
    });

    describe('equipment checkbox lists match the spec', () => {
        it.each([
            ['car', CAR_EQUIPMENT_VALUES, 61],
            ['caravan', CARAVAN_EQUIPMENT_VALUES, 26],
            ['motorhome', MOTORHOME_EQUIPMENT_VALUES, 48],
        ])('offers every %s option', (_label, values, size) => {
            expect(values).toHaveLength(size);
        });

        it.each([
            ['dieselpartikkelfilter'],
            ['sentrallas'],
            ['luftfjaering'],
            ['elvarme'],
            ['gulvvarme'],
            ['varmtvann'],
            ['myggdor'],
            ['gassuttak'],
            ['kjoleskap'],
            ['mikrobolgeovn'],
            ['stekeovn'],
            ['skinninterior'],
            ['roykfri'],
            ['cruisekontroll'],
            ['ryggekamera'],
            ['kjorecomputer'],
            ['navigasjonssystem'],
        ])('accepts motorhome equipment %s, which was previously missing', (value) => {
            expect(MOTORHOME_EQUIPMENT_VALUES).toContain(value);
            expect(parse('car', { ...motorhome, equipment: [value] }).success).toBe(true);
        });

        it('still rejects an option outside the list', () => {
            expect(failedFields('car', { ...motorhome, equipment: ['helipad'] })).toContain(
                'equipment.0',
            );
        });
    });

    describe('validation errors point at a real endpoint', () => {
        it('sends an unknown brand to GET /api/v1/filters/options', () => {
            const [message] = messagesFor('car', { ...car, brand: 'DeLorean Motors' }, 'brand');

            expect(message).toContain('/api/v1/filters/options');
            expect(message).not.toContain('filter-options');
        });

        it('sends a mismatched model to GET /api/v1/filters/models', () => {
            const [message] = messagesFor(
                'car',
                { ...car, brand: 'Audi', carModel: 'Model S' },
                'carModel',
            );

            expect(message).toContain('/api/v1/filters/models?category=car&brand=Audi');
            expect(message).not.toContain('filter-options');
        });
    });

    describe('simple categories accept only the listing form transaction types', () => {
        it.each(SIMPLE_SLUGS.map((s) => [s]))('rejects a %s listing offered for rent', (slug) => {
            expect(failedFields(slug, { ...simpleItem, transactionType: 'for_rent' })).toContain(
                'transactionType',
            );
        });

        it.each(SIMPLE_SLUGS.map((s) => [s]))('accepts the three form types on %s', (slug) => {
            expect(parse(slug, { ...simpleItem, transactionType: 'for_sell' }).success).toBe(true);
            expect(parse(slug, { ...simpleItem, transactionType: 'wants_to_buy' }).success).toBe(true);
            expect(parse(slug, { ...simpleItem, price: 0, transactionType: 'give_away' }).success).toBe(
                true,
            );
        });

        it('defaults to for_sell when the type is omitted', () => {
            const result = parse('sellx', simpleItem);

            expect(result.success).toBe(true);
            if (result.success) {
                expect((result.data as Record<string, unknown>).transactionType).toBe('for_sell');
            }
        });

        it('keeps the giveaway price rule intact', () => {
            expect(
                failedFields('sellx', { ...simpleItem, transactionType: 'give_away', price: 400 }),
            ).toContain('price');
        });

        it('rejects a type these categories do not offer', () => {
            expect(
                failedFields('sellx', { ...simpleItem, transactionType: 'wants_to_rent' }),
            ).toContain('transactionType');
        });
    });

    describe('motorcycles', () => {
        it('accepts a listed make and rejects an unlisted one', () => {
            expect(parse('motorcycle', { ...mc, brand: 'Yamaha' }).success).toBe(true);
            expect(failedFields('motorcycle', { ...mc, brand: 'Not A Make' })).toContain('brand');
        });

        it('keeps the model free text', () => {
            expect(parse('motorcycle', { ...mc, brand: 'Yamaha', carModel: 'MT-07' }).success).toBe(true);
        });
    });
});
