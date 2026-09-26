/**
 * One valid listing body per category, and per variant where a category has a discriminated
 * union behind it.
 *
 * Every test that needs a listing starts from one of these and mutates a single field, so a
 * failure names the field under test rather than a fixture that was never valid to begin with.
 * The bodies are the *minimum* the schema accepts plus a light sprinkle of optional fields —
 * deliberately not maximal, so "requires X" tests cannot pass by accident.
 */

/** A stand-in ObjectId. Category is resolved by the middleware before a schema ever runs. */
export const CATEGORY_ID = '507f1f77bcf86cd799439011';

export const LOCATION = {
    address: 'Karl Johans gate 1',
    city: 'Oslo',
    country: 'Norge',
    latitude: 59.9139,
    longitude: 10.7522,
} as const;

/** The six categories that share `simple.schema.ts`. */
export const SIMPLE_SLUGS = [
    'sellx',
    'electronics',
    'furniture',
    'clothing',
    'book',
    'bike',
] as const;

/** Every slug the registry knows, in `registry.ts` order. */
export const ALL_SLUGS = [
    'sellx',
    'property',
    'car',
    'boat',
    'motorcycle',
    'bike',
    'job',
    'electronics',
    'book',
    'furniture',
    'clothing',
] as const;

export type ProductSlug = (typeof ALL_SLUGS)[number];

export interface ListingVariant {
    /** The category slug the registry dispatches on. */
    slug: ProductSlug;
    /** The field the category's discriminated union switches on, if it has one. */
    discriminator?: string;
    /** A valid body for this variant. */
    body: Record<string, unknown>;
    /**
     * Fields the schema rejects when absent, excluding the discriminator.
     *
     * Written out by hand rather than derived from the Zod schema on purpose: derived, the test
     * would assert whatever the schema happens to say and could never fail. Written out, this
     * list is the audit's record of what each of the 11 forms actually demands.
     */
    required: readonly string[];
    /** Fields that belong to a different category and must be stripped, not stored. */
    foreign: readonly string[];
}

/** Required on every category. `price` is exempt on `job`, where it defaults to 0. */
const ALWAYS_REQUIRED = ['title', 'price', 'location'] as const;

const common = {
    category: CATEGORY_ID,
    location: LOCATION,
};

/**
 * Keyed `slug` for a flat category, `slug:discriminator` for a union member. The key doubles as
 * the test name, so `it.each(VARIANT_IDS)` reads as a list of the forms the app actually has.
 */
const VARIANTS = {
    // --- The six simple categories. `description` is required here and nowhere else. ---
    sellx: {
        slug: 'sellx',
        body: {
            ...common,
            title: 'Rolex Submariner',
            description: 'Boxed, papers included, barely worn.',
            price: 95000,
            brand: 'Rolex',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['horsepower', 'bikeType', 'bookCategory', 'usableArea'],
    },
    electronics: {
        slug: 'electronics',
        body: {
            ...common,
            title: 'MacBook Pro 14"',
            description: 'M3 Pro, 18 GB RAM, 92 % battery health.',
            price: 18500,
            brand: 'Apple',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['horsepower', 'bikeType', 'bookCategory'],
    },
    furniture: {
        slug: 'furniture',
        body: {
            ...common,
            title: 'Ikea Billy bookcase',
            description: 'White, 80x28x202, collected from Oslo.',
            price: 400,
            brand: 'Ikea',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['horsepower', 'bikeType', 'bookCategory'],
    },
    clothing: {
        slug: 'clothing',
        body: {
            ...common,
            title: 'Holzweiler scarf',
            description: 'Wool blend, worn twice, no pulls.',
            price: 900,
            brand: 'Holzweiler',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['horsepower', 'bikeType', 'bookCategory'],
    },
    book: {
        slug: 'book',
        body: {
            ...common,
            title: 'Kalkulus for ingeniører',
            description: 'Sixth edition, light pencil notes in chapter 3.',
            price: 350,
            bookCategory: 'universitet',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['brand', 'horsepower', 'bikeType'],
    },
    bike: {
        slug: 'bike',
        body: {
            ...common,
            title: 'Scott Scale 970',
            description: 'Hardtail 29", size L, serviced this spring.',
            price: 8900,
            brand: 'Scott',
            bikeType: 'terreng',
            condition: 'used',
        },
        required: [...ALWAYS_REQUIRED, 'description'],
        foreign: ['horsepower', 'bookCategory', 'usableArea'],
    },

    // --- Property: a union on `transactionType`. ---
    'property:for_sell': {
        slug: 'property',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'for_sell',
            title: 'Bright 3-room apartment',
            type: 'leilighet',
            ownershipType: 'eier_selveier',
            municipalityNumber: '0301',
            farmNumber: '208',
            usageNumber: '145',
            apartmentNumber: 'H0201',
            usableArea: 78,
            yearBuilt: 2004,
            bedrooms: 2,
            floorLevel: 'kjeller',
            facilities: ['heis', 'takterrasse', 'bredband'],
            commonExpenses: 3400,
            sharedCostsInclude: 'Heating, cable TV and building insurance.',
            propertyTaxValue: 2400000,
            price: 6500000,
            additionalCosts: 165000,
            additionalCostsInclude: 'Document duty and registration fees.',
            sharedDebt: 250000,
            viewings: [{ date: '2026-09-14', fromTime: '17:00', toTime: '18:00' }],
        },
        required: [
            ...ALWAYS_REQUIRED,
            'type',
            'ownershipType',
            'municipalityNumber',
            'farmNumber',
            'usageNumber',
            'commonExpenses',
            'sharedCostsInclude',
            'propertyTaxValue',
            'additionalCosts',
            'additionalCostsInclude',
            'sharedDebt',
            'usableArea',
            'yearBuilt',
            'bedrooms',
        ],
        foreign: ['horsepower', 'mileage', 'bikeType', 'totalPrice'],
    },
    'property:for_rent': {
        slug: 'property',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'for_rent',
            title: 'Furnished 2-room near Majorstuen',
            type: 'leilighet',
            primaryRoomArea: 46,
            bedrooms: 1,
            furnishing: 'mobelert',
            deposit: 45000,
            price: 15000,
        },
        required: [...ALWAYS_REQUIRED, 'primaryRoomArea', 'bedrooms'],
        foreign: ['municipalityNumber', 'horsepower', 'sharedDebt'],
    },
    'property:wants_to_rent': {
        slug: 'property',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'wants_to_rent',
            title: 'Quiet couple looking for a 2-room flat',
            preferredArea: 'oslo',
            preferredPropertyType: 'leilighet',
            numberOfTenants: 2,
            price: 18000,
        },
        required: [...ALWAYS_REQUIRED],
        foreign: ['usableArea', 'yearBuilt', 'bedrooms', 'viewings', 'ownershipType'],
    },

    // --- Car: a union on `vehicleType`. ---
    'car:personbil': {
        slug: 'car',
        discriminator: 'vehicleType',
        body: {
            ...common,
            vehicleType: 'personbil',
            title: 'BMW 320d xDrive',
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
            equipment: ['abs_bremser', 'ryggekamera'],
        },
        required: [
            ...ALWAYS_REQUIRED,
            'taxClass',
            'manufacturedYear',
            'brand',
            'carModel',
            'fuel',
            'transmission',
            'driveType',
            'bodyType',
            'seats',
            'bodyColor',
            'mileage',
            'reRegistrationFee',
        ],
        foreign: ['bookCategory', 'usableArea', 'sleepingPlaces', 'bikeType'],
    },
    'car:bobil': {
        slug: 'car',
        discriminator: 'vehicleType',
        body: {
            ...common,
            vehicleType: 'bobil',
            title: 'Hymer B-Klasse',
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
        },
        required: [
            ...ALWAYS_REQUIRED,
            'manufacturedYear',
            'fuel',
            'cylinderCapacity',
            'horsepower',
            'driveType',
            'weight',
            'totalWeight',
            'length',
            'registeredSeats',
            'sleepingPlaces',
        ],
        foreign: ['taxClass', 'bodyType', 'bookCategory', 'usableArea'],
    },
    'car:campingvogn': {
        slug: 'car',
        discriminator: 'vehicleType',
        body: {
            ...common,
            vehicleType: 'campingvogn',
            title: 'Kabe Royal',
            manufacturedYear: 2018,
            sleepingPlaces: 5,
            weight: 1400,
            totalWeight: 1800,
            condition: 'used',
            price: 245000,
            reRegistrationExempt: true,
        },
        required: [
            ...ALWAYS_REQUIRED,
            'manufacturedYear',
            'sleepingPlaces',
            'weight',
            'totalWeight',
            'condition',
        ],
        foreign: ['fuel', 'driveType', 'registrationNumber', 'bodyType'],
    },

    // --- Boat: a union on `transactionType`. ---
    'boat:for_sell': {
        slug: 'boat',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'for_sell',
            title: 'Askeladden C65',
            type: 'bowrider',
            manufacturedYear: 2016,
            length: 21,
            price: 420000,
            motorIncluded: true,
            motorType: 'utenbords',
            fuel: 'bensin',
            color: 'White/Grey',
            equipmentDescription: 'Chartplotter, VHF, bathing ladder.',
        },
        required: [...ALWAYS_REQUIRED, 'type', 'manufacturedYear', 'length'],
        foreign: ['condition', 'equipment', 'mileage', 'bikeType'],
    },
    'boat:for_rent': {
        slug: 'boat',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'for_rent',
            title: 'Rib for day charter',
            type: 'rib',
            manufacturedYear: 2022,
            length: 24,
            price: 3500,
        },
        required: [...ALWAYS_REQUIRED, 'type', 'manufacturedYear', 'length'],
        foreign: ['condition', 'equipment', 'mileage'],
    },
    'boat:wants_to_buy': {
        slug: 'boat',
        discriminator: 'transactionType',
        body: {
            ...common,
            transactionType: 'wants_to_buy',
            title: 'Looking for a daycruiser up to 25 ft',
            price: 500000,
        },
        required: [...ALWAYS_REQUIRED],
        foreign: ['manufacturedYear', 'length', 'motorType', 'buildMaterial'],
    },

    // --- Motorcycle: a union on `mcType`. ---
    'motorcycle:motorsykkel': {
        slug: 'motorcycle',
        discriminator: 'mcType',
        body: {
            ...common,
            mcType: 'motorsykkel',
            title: 'Yamaha MT-07',
            motorcycleType: 'classic_nakne',
            manufacturedYear: 2020,
            price: 89000,
            reRegistrationFee: 2500,
            fuel: 'bensin',
            equipment: ['abs', 'varmehandtak'],
        },
        required: [...ALWAYS_REQUIRED, 'motorcycleType', 'manufacturedYear', 'reRegistrationFee'],
        foreign: ['mopedType', 'bodyType', 'bookCategory'],
    },
    'motorcycle:moped': {
        slug: 'motorcycle',
        discriminator: 'mcType',
        body: {
            ...common,
            mcType: 'moped',
            title: 'Vespa Primavera 50',
            mopedType: 'scooter',
            manufacturedYear: 2021,
            price: 32000,
            reRegistrationExempt: true,
        },
        required: [...ALWAYS_REQUIRED, 'mopedType', 'manufacturedYear'],
        foreign: ['motorcycleType', 'bodyType', 'seats'],
    },
    'motorcycle:atv': {
        slug: 'motorcycle',
        discriminator: 'mcType',
        body: {
            ...common,
            mcType: 'atv',
            title: 'Can-Am Outlander 650',
            manufacturedYear: 2019,
            price: 115000,
            reRegistrationFee: 1800,
        },
        required: [...ALWAYS_REQUIRED, 'manufacturedYear', 'reRegistrationFee'],
        foreign: ['motorcycleType', 'mopedType', 'bodyType'],
    },
    'motorcycle:snoscooter': {
        slug: 'motorcycle',
        discriminator: 'mcType',
        body: {
            ...common,
            mcType: 'snoscooter',
            title: 'Ski-Doo Summit 850',
            manufacturedYear: 2022,
            price: 165000,
            reRegistrationExempt: true,
        },
        required: [...ALWAYS_REQUIRED, 'manufacturedYear'],
        foreign: ['motorcycleType', 'mopedType', 'bodyType'],
    },

    // --- Job: one flat form, no transactionType at all. ---
    job: {
        slug: 'job',
        body: {
            ...common,
            title: 'Senior utvikler',
            employmentType: 'lederstilling',
            jobTitle: 'Teamleder',
            numberOfPositions: 2,
            contractType: 'fast',
            sector: 'privat',
            industry: 'IT og teknologi',
            employerName: 'Ikea',
            keywords: ['node', 'typescript'],
            workLanguage: 'norsk',
            website: 'https://example.com',
            contactPersons: [
                { name: 'Kari Nordmann', title: 'Daglig leder', email: 'kari@example.com' },
            ],
        },
        required: [
            'title',
            'location',
            'employmentType',
            'jobTitle',
            'numberOfPositions',
            'contractType',
            'sector',
            'industry',
            'employerName',
        ],
        foreign: ['transactionType', 'condition', 'brand', 'bookCategory', 'mileage'],
    },
} as const satisfies Record<string, ListingVariant>;

export type VariantId = keyof typeof VARIANTS;

/** Every form the app has: 11 categories across 20 shapes. */
export const VARIANT_IDS = Object.keys(VARIANTS) as VariantId[];

/** The registry slug a variant dispatches to. */
export const slugOf = (id: VariantId): ProductSlug => VARIANTS[id].slug;

/** The union field a variant switches on, or `undefined` for a flat category. */
export const discriminatorOf = (id: VariantId): string | undefined =>
    (VARIANTS[id] as ListingVariant).discriminator;

/** The fields this variant's schema rejects when absent, excluding the discriminator. */
export const requiredOf = (id: VariantId): string[] => [...VARIANTS[id].required];

/** Fields owned by other forms, which this one must strip rather than store. */
export const foreignOf = (id: VariantId): string[] => [...VARIANTS[id].foreign];

/** Variant ids for one slug, e.g. `variantsOf('car')` -> the three vehicle types. */
export const variantsOf = (slug: ProductSlug): VariantId[] =>
    VARIANT_IDS.filter((id) => VARIANTS[id].slug === slug);

/**
 * A valid body for a variant, with `overrides` merged in.
 *
 * Deep-cloned every call, so a test that mutates a nested array or pushes a viewing cannot leak
 * into the next one. Setting a key to `undefined` removes it — that is how the "requires X"
 * tests are written.
 */
export const validListing = (
    id: VariantId,
    overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
    const body: Record<string, unknown> = {
        ...structuredClone(VARIANTS[id].body as Record<string, unknown>),
        ...overrides,
    };

    for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete body[key];
    }

    return body;
};
