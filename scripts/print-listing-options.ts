/**
 * Prints the option-value reference for the listing forms, straight from the code.
 *
 *   node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/print-listing-options.ts
 *   ... scripts/print-listing-options.ts --markdown     # only the doc tables
 *   ... scripts/print-listing-options.ts --typescript   # only the client constants module
 *
 * `docs/listing-forms-api.md` and `docs/frontend/listing-constants.ts` are generated from
 * this, so the documented values can never drift from what the schemas actually accept.
 *
 * English and Norwegian labels come from `FILTER_DEFINITIONS` wherever the value already
 * appears in a filter (287 of them do) and from the `data/*` option lists; LABEL_OVERRIDES
 * below covers the remainder.
 */
import {
    BedType,
    BikeType,
    BoatFuelType,
    BoatType,
    BookCategory,
    BuildMaterial,
    CarBodyType,
    CarFuelType,
    Condition,
    ConditionReportProvider,
    DriveType,
    EmploymentType,
    EnergyRating,
    FloorLevel,
    Furnishing,
    HeatingRating,
    McFuelType,
    McType,
    MopedType,
    MotorType,
    MotorcycleType,
    MotorhomeType,
    OwnershipType,
    PreferredPropertyType,
    ProductCategory,
    PromotionPlanType,
    RemainingWarrantyType,
    RemoteWorkType,
    Sector,
    TaxClass,
    TransactionType,
    TransmissionType,
    ProductStatus,
    VehicleLocation,
    VehicleType,
    WorkLanguage,
    WarrantyType,
} from '@/modules/products/product.enum';
import { REPORT_REASONS } from '@/modules/products/product.constants';
import { FORM_CONTRACT_TYPES } from '@/modules/products/schemas/job.schema';
import { FORM_PROPERTY_TYPES } from '@/modules/products/schemas/property.schema';
import {
    CLOTHING_BRANDS,
    ELECTRONICS_BRANDS,
    FILTER_DEFINITIONS,
    FURNITURE_BRANDS,
} from '@/modules/filter-options/filter-options.constants';
import { BOAT_BRANDS } from '@/modules/products/data/boat-brands.constants';
import { CAR_BRANDS, CAR_BRAND_VALUES } from '@/modules/products/data/car-brands.constants';
import { CAR_EQUIPMENT_GROUPS } from '@/modules/products/data/car-equipment.constants';
import { CARAVAN_BRANDS } from '@/modules/products/data/caravan-brands.constants';
import { MC_BRANDS } from '@/modules/products/data/mc-brands.constants';
import { MOTORHOME_BRANDS } from '@/modules/products/data/motorhome-brands.constants';
import { CARAVAN_EQUIPMENT } from '@/modules/products/data/caravan-equipment.constants';
import { MC_EQUIPMENT } from '@/modules/products/data/mc-equipment.constants';
import { MOTORHOME_EQUIPMENT } from '@/modules/products/data/motorhome-equipment.constants';
import { NORWEGIAN_AREAS } from '@/modules/products/data/norwegian-areas.constants';
import { PROPERTY_FORM_FACILITIES } from '@/modules/products/data/property-facilities.constants';

interface Label {
    en: string;
    no: string;
}

/** Values that appear in no filter and carry no label in a `data/*` list. */
const LABEL_OVERRIDES: Record<string, Label> = {
    // Product categories - the capitalised `category` values, not the filter slugs.
    Car: { en: 'Car', no: 'Bil' },
    Property: { en: 'Property', no: 'Eiendom' },
    Boat: { en: 'Boat', no: 'Båt' },
    Motorcycle: { en: 'Motorcycle', no: 'MC' },
    Bike: { en: 'Bike', no: 'Sykkel' },
    Job: { en: 'Job', no: 'Jobb' },
    Electronics: { en: 'Electronics', no: 'Elektronikk' },
    Book: { en: 'Book', no: 'Bøker' },
    Furniture: { en: 'Furniture', no: 'Møbler' },
    Clothing: { en: 'Clothing', no: 'Klær' },
    SellX: { en: 'SellX', no: 'SellX' },

    // Transaction and status
    wants_to_rent: { en: 'Wanted to rent', no: 'Ønskes leid' },
    draft: { en: 'Draft', no: 'Utkast' },
    active: { en: 'Active', no: 'Aktiv' },
    sold: { en: 'Sold', no: 'Solgt' },
    expired: { en: 'Expired', no: 'Utløpt' },
    removed: { en: 'Removed', no: 'Fjernet' },
    rejected: { en: 'Rejected', no: 'Avvist' },
    semi_automatic: { en: 'Semi-automatic', no: 'Halvautomatisk' },

    // Property
    hytte: { en: 'Cabin', no: 'Hytte' },
    gul: { en: 'Yellow', no: 'Gul' },
    lysegronn: { en: 'Light green', no: 'Lysegrønn' },
    morkegronn: { en: 'Dark green', no: 'Mørkegrønn' },
    oransje: { en: 'Orange', no: 'Oransje' },
    rod: { en: 'Red', no: 'Rød' },
    mobelert: { en: 'Furnished', no: 'Møblert' },
    delvis_mobelert: { en: 'Partially furnished', no: 'Delvis møblert' },
    umobelert: { en: 'Unfurnished', no: 'Umøblert' },
    hybel: { en: 'Studio apartment', no: 'Hybel' },
    rom_i_bofellesskap: { en: 'Room in shared housing', no: 'Rom i bofellesskap' },

    // Vehicles
    alkove: { en: 'Alcove', no: 'Alkove' },
    bybobil: { en: 'City motorhome', no: 'Bybobil' },
    camper: { en: 'Camper', no: 'Camper' },
    delintegrert: { en: 'Semi-integrated', no: 'Delintegrert' },
    integrert: { en: 'Integrated', no: 'Integrert' },
    enkelseng: { en: 'Single bed', no: 'Enkelseng' },
    dobbeltseng: { en: 'Double bed', no: 'Dobbeltseng' },
    fransk_senglosning: { en: 'French bed', no: 'Fransk sengløsning' },
    tversgaende_seng: { en: 'Transverse bed', no: 'Tversgående seng' },
    naf: { en: 'NAF', no: 'NAF' },
    viking: { en: 'Viking', no: 'Viking' },
    resterende_ny_garanti: { en: 'Remaining new warranty', no: 'Resterende ny garanti' },
    resterende_brukt_garanti: { en: 'Remaining used warranty', no: 'Resterende brukt garanti' },

    // Jobs
    lederstilling: { en: 'Management position', no: 'Lederstilling' },
    delvis_hjemmearbeid: { en: 'Partly remote', no: 'Delvis hjemmearbeid' },
    kun_hjemmearbeid: { en: 'Fully remote', no: 'Kun hjemmearbeid' },

    // Promotion plans
    free: { en: 'Free', no: 'Gratis' },
    basic: { en: 'Basic', no: 'Basis' },
    standard: { en: 'Standard', no: 'Standard' },
    premium: { en: 'Premium', no: 'Premium' },
    featured: { en: 'Featured', no: 'Fremhevet' },
    urgent: { en: 'Urgent', no: 'Haster' },
    spotlight: { en: 'Spotlight', no: 'Spotlight' },

    // Report reasons
    spam_or_misleading: { en: 'Spam or misleading', no: 'Spam eller villedende' },
    scam_or_fraud: { en: 'Scam or fraud', no: 'Svindel' },
    inappropriate_content: { en: 'Inappropriate content', no: 'Upassende innhold' },
    wrong_category: { en: 'Wrong category', no: 'Feil kategori' },
    duplicate_listing: { en: 'Duplicate listing', no: 'Duplikatannonse' },
    fake_seller: { en: 'Fake seller', no: 'Falsk selger' },
    other: { en: 'Other', no: 'Andre' },
};

/** value -> label, assembled once from every source available. */
const buildLabelIndex = (): Map<string, Label> => {
    const index = new Map<string, Label>();

    for (const fields of Object.values(FILTER_DEFINITIONS)) {
        for (const field of fields) {
            for (const option of field.options ?? []) {
                if (!index.has(option.value)) index.set(option.value, option.label);
            }
        }
    }

    const labelled: Record<string, Label>[] = [
        PROPERTY_FORM_FACILITIES as unknown as Record<string, Label>,
        MOTORHOME_EQUIPMENT as unknown as Record<string, Label>,
        CARAVAN_EQUIPMENT as unknown as Record<string, Label>,
        MC_EQUIPMENT as unknown as Record<string, Label>,
        ...Object.values(CAR_EQUIPMENT_GROUPS).map((g) => g as unknown as Record<string, Label>),
    ];

    for (const source of labelled) {
        for (const [value, label] of Object.entries(source)) index.set(value, label);
    }

    for (const [value, label] of Object.entries(NORWEGIAN_AREAS)) {
        index.set(value, { en: label, no: label });
    }

    // Energy ratings are single letters in both languages.
    for (const value of Object.values(EnergyRating)) index.set(value, { en: value, no: value });

    for (const [value, label] of Object.entries(LABEL_OVERRIDES)) index.set(value, label);

    return index;
};

const LABELS = buildLabelIndex();

const labelFor = (value: string): Label =>
    LABELS.get(value) ?? { en: value.replace(/_/g, ' '), no: value.replace(/_/g, ' ') };

interface OptionSet {
    /** Identifier used in the generated TypeScript module. */
    name: string;
    /** Heading used in the markdown reference. */
    title: string;
    /** The listing field(s) this set applies to. */
    field: string;
    note?: string;
    values: string[];
}

const valuesOf = (source: Record<string, string>): string[] => Object.values(source);
const keysOf = (source: Record<string, unknown>): string[] => Object.keys(source);

const OPTION_SETS: OptionSet[] = [
    // --- Shared ---
    {
        name: 'PRODUCT_CATEGORY',
        title: 'Product category',
        field: 'category',
        note: 'Sent capitalised on a listing. The filter endpoints take the lower-case slug instead — see `CATEGORY_FILTER_SLUGS`.',
        values: valuesOf(ProductCategory),
    },
    {
        name: 'TRANSACTION_TYPE',
        title: 'Transaction type',
        field: 'transactionType',
        note: 'Which values are legal depends on the category — see each form.',
        values: valuesOf(TransactionType),
    },
    { name: 'CONDITION', title: 'Condition', field: 'condition', values: valuesOf(Condition) },
    {
        name: 'PRODUCT_STATUS',
        title: 'Listing status',
        field: 'status',
        note: 'Read-only. A new listing starts as `draft` and becomes `active` on admin approval.',
        values: valuesOf(ProductStatus),
    },
    {
        name: 'PROMOTION_PLAN',
        title: 'Promotion plan',
        field: 'promotion.plan',
        note: 'Read-only.',
        values: valuesOf(PromotionPlanType),
    },
    {
        name: 'REPORT_REASON',
        title: 'Report reason',
        field: 'reason (POST /products/:id/report)',
        values: valuesOf(REPORT_REASONS),
    },

    // --- Property ---
    {
        name: 'PROPERTY_TYPE',
        title: 'Property type',
        field: 'type',
        note:
            'The values the listing form accepts. `PropertyType` also carries ' +
            '`bygaard_flermannsbolig` and `produksjon_industri`, which are on the filter page but ' +
            'on no form — creating with either is a `400`, and filtering by either returns an ' +
            'empty list.',
        values: [...FORM_PROPERTY_TYPES],
    },
    {
        name: 'OWNERSHIP_TYPE',
        title: 'Ownership type',
        field: 'ownershipType',
        values: valuesOf(OwnershipType),
    },
    {
        name: 'ENERGY_RATING',
        title: 'Energy rating',
        field: 'energyRating',
        note: 'A is the most efficient, G the least.',
        values: valuesOf(EnergyRating),
    },
    {
        name: 'HEATING_RATING',
        title: 'Heating rating',
        field: 'heatingRating',
        note: 'Share of fossil fuel and electricity used for heating: dark green under 30%, red over 82.5%.',
        values: valuesOf(HeatingRating),
    },
    {
        name: 'FLOOR_LEVEL',
        title: 'Floor level',
        field: 'floorLevel',
        note: 'Send as a **string**, including the numeric floors.',
        values: valuesOf(FloorLevel),
    },
    { name: 'FURNISHING', title: 'Furnishing', field: 'furnishing', values: valuesOf(Furnishing) },
    {
        name: 'PREFERRED_PROPERTY_TYPE',
        title: 'Preferred property type',
        field: 'preferredPropertyType',
        note: 'Wanted-to-rent only. Differs from `type`: it adds hybel and rom_i_bofellesskap.',
        values: valuesOf(PreferredPropertyType),
    },
    {
        name: 'NORWEGIAN_AREA',
        title: 'Rental areas',
        field: 'preferredArea',
        values: keysOf(NORWEGIAN_AREAS),
    },
    {
        name: 'PROPERTY_FACILITY',
        title: 'Property facilities',
        field: 'facilities',
        note: 'All 24 form options. The first ten are also filterable via `GET /filters/options`.',
        values: keysOf(PROPERTY_FORM_FACILITIES),
    },

    // --- Vehicles ---
    {
        name: 'VEHICLE_TYPE',
        title: 'Vehicle type',
        field: 'vehicleType',
        note: 'Selects which car form applies.',
        values: valuesOf(VehicleType),
    },
    {
        name: 'VEHICLE_LOCATION',
        title: 'Vehicle location',
        field: 'vehicleLocation',
        values: valuesOf(VehicleLocation),
    },
    { name: 'TAX_CLASS', title: 'Tax class', field: 'taxClass', values: valuesOf(TaxClass) },
    { name: 'CAR_BODY_TYPE', title: 'Body type', field: 'bodyType', values: valuesOf(CarBodyType) },
    { name: 'CAR_FUEL_TYPE', title: 'Fuel (car and motorhome)', field: 'fuel', values: valuesOf(CarFuelType) },
    { name: 'DRIVE_TYPE', title: 'Wheel drive', field: 'driveType', values: valuesOf(DriveType) },
    { name: 'TRANSMISSION', title: 'Transmission', field: 'transmission', values: valuesOf(TransmissionType) },
    { name: 'CAR_WARRANTY_TYPE', title: 'Car warranty type', field: 'warrantyType', values: valuesOf(WarrantyType) },
    {
        name: 'REMAINING_WARRANTY_TYPE',
        title: 'Remaining warranty (motorhome and motorcycle)',
        field: 'warrantyType',
        values: valuesOf(RemainingWarrantyType),
    },
    {
        name: 'CONDITION_REPORT_PROVIDER',
        title: 'Condition report provider',
        field: 'conditionReportProvider',
        values: valuesOf(ConditionReportProvider),
    },
    { name: 'MOTORHOME_TYPE', title: 'Motorhome type', field: 'motorhomeType', values: valuesOf(MotorhomeType) },
    { name: 'BED_TYPE', title: 'Bed type', field: 'bedType', values: valuesOf(BedType) },
    {
        name: 'MOTORHOME_EQUIPMENT',
        title: 'Motorhome equipment',
        field: 'equipment (vehicleType: bobil)',
        values: keysOf(MOTORHOME_EQUIPMENT),
    },
    {
        name: 'CARAVAN_EQUIPMENT',
        title: 'Caravan equipment',
        field: 'equipment (vehicleType: campingvogn)',
        values: keysOf(CARAVAN_EQUIPMENT),
    },

    // --- Boat ---
    { name: 'BOAT_TYPE', title: 'Boat type', field: 'type', values: valuesOf(BoatType) },
    { name: 'BOAT_FUEL_TYPE', title: 'Fuel (boat)', field: 'fuel', values: valuesOf(BoatFuelType) },
    { name: 'MOTOR_TYPE', title: 'Engine type', field: 'motorType', values: valuesOf(MotorType) },
    {
        name: 'BUILD_MATERIAL',
        title: 'Build material',
        field: 'buildMaterial',
        values: valuesOf(BuildMaterial),
    },

    // --- Motorcycle ---
    {
        name: 'MC_TYPE',
        title: 'Motorcycle category',
        field: 'mcType',
        note: 'Selects which motorcycle form applies.',
        values: valuesOf(McType),
    },
    {
        name: 'MOTORCYCLE_TYPE',
        title: 'Motorcycle sub-type',
        field: 'motorcycleType',
        note: 'Required when mcType is motorsykkel.',
        values: valuesOf(MotorcycleType),
    },
    {
        name: 'MOPED_TYPE',
        title: 'Moped sub-type',
        field: 'mopedType',
        note: 'Required when mcType is moped.',
        values: valuesOf(MopedType),
    },
    { name: 'MC_FUEL_TYPE', title: 'Fuel (motorcycle)', field: 'fuel', values: valuesOf(McFuelType) },
    {
        name: 'MC_EQUIPMENT',
        title: 'Motorcycle equipment',
        field: 'equipment',
        values: keysOf(MC_EQUIPMENT),
    },

    // --- Bike and book ---
    { name: 'BIKE_TYPE', title: 'Bike type', field: 'bikeType', values: valuesOf(BikeType) },
    { name: 'BOOK_CATEGORY', title: 'Book category', field: 'bookCategory', values: valuesOf(BookCategory) },

    // --- Job ---
    {
        name: 'EMPLOYMENT_TYPE',
        title: 'Ad type (annonsetype)',
        field: 'employmentType',
        values: valuesOf(EmploymentType),
    },
    {
        name: 'CONTRACT_TYPE',
        title: 'Employment form (ansettelsesform)',
        field: 'contractType',
        note:
            'The values the listing form accepts. `ContractType` also carries `bemanningsbyra`, ' +
            'which is on the filter page but on no form — creating with it is a `400`, and ' +
            'filtering by it returns an empty list.',
        values: [...FORM_CONTRACT_TYPES],
    },
    { name: 'SECTOR', title: 'Sector', field: 'sector', values: valuesOf(Sector) },
    { name: 'WORK_LANGUAGE', title: 'Work language', field: 'workLanguage', values: valuesOf(WorkLanguage) },
    { name: 'REMOTE_WORK_TYPE', title: 'Remote work', field: 'remoteWorkType', values: valuesOf(RemoteWorkType) },
];

interface BrandSet {
    /** Identifier used in the generated TypeScript module, minus the `_OPTIONS` suffix. */
    name: string;
    /** Heading used in the markdown reference. */
    title: string;
    /** The listing field(s) this list applies to. */
    field: string;
    note?: string;
    brands: readonly string[];
    /** Brand -> models, for the one category whose models are a fixed list. */
    models?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Brand and model lists, one per category that has one.
 *
 * Brand names are proper nouns and read the same in English and Norwegian, so they are emitted
 * as plain string arrays rather than `{ value, en, no }` triples — `brandOptions()` in the
 * generated module wraps a list when a select needs the option shape.
 *
 * Categories not listed here (property, job, bike, book, sellx) take `brand` as free text.
 */
const BRAND_SETS: BrandSet[] = [
    {
        name: 'CAR_BRAND',
        title: 'Car brands',
        field: 'brand (category: Car, vehicleType: personbil)',
        note:
            'Required, and `carModel` must be a model of that same brand. ' +
            'Every list ends with `Andre` ("Other").',
        brands: CAR_BRAND_VALUES,
        models: CAR_BRANDS as unknown as Record<string, readonly string[]>,
    },
    {
        name: 'CARAVAN_BRAND',
        title: 'Caravan brands',
        field: 'brand (category: Car, vehicleType: campingvogn)',
        note: 'Optional. Caravan models are free text.',
        brands: CARAVAN_BRANDS,
    },
    {
        name: 'MOTORHOME_BRAND',
        title: 'Motorhome brands',
        field: 'brand (category: Car, vehicleType: bobil)',
        note: 'Optional, and the same list as the caravan form. Motorhome models are free text.',
        brands: MOTORHOME_BRANDS,
    },
    {
        name: 'BOAT_BRAND',
        title: 'Boat brands',
        field: 'brand (category: Boat)',
        note: 'Optional. Boat models are free text, and the source list has no brand starting G-L — those go under `Andre`.',
        brands: BOAT_BRANDS,
    },
    {
        name: 'MC_BRAND',
        title: 'Motorcycle makes',
        field: 'brand (category: Motorcycle)',
        note: 'Optional, and shared by motorsykkel, moped, ATV and snøscooter. MC models are free text.',
        brands: MC_BRANDS,
    },
    {
        name: 'ELECTRONICS_BRAND',
        title: 'Electronics brands',
        field: 'brand (category: Electronics)',
        note: 'Suggestions only — the field is free text (max 100) and accepts anything.',
        brands: ELECTRONICS_BRANDS,
    },
    {
        name: 'FURNITURE_BRAND',
        title: 'Furniture brands',
        field: 'brand (category: Furniture)',
        note: 'Suggestions only — the field is free text (max 100) and accepts anything.',
        brands: FURNITURE_BRANDS,
    },
    {
        name: 'CLOTHING_BRAND',
        title: 'Clothing brands',
        field: 'brand (category: Clothing)',
        note: 'Suggestions only — the field is free text (max 100) and accepts anything.',
        brands: CLOTHING_BRANDS,
    },
];

/** Category slugs the filter endpoints take, keyed by the `category` value on a listing. */
const CATEGORY_FILTER_SLUGS: Record<string, string> = Object.fromEntries(
    Object.values(ProductCategory).map((category) => [category, category.toLowerCase()]),
);

// The slug map is only useful if it matches what `GET /filters/options` actually serves.
for (const slug of Object.values(CATEGORY_FILTER_SLUGS)) {
    if (!FILTER_DEFINITIONS[slug]) {
        throw new Error(`No filter definition for category slug "${slug}" - the map has drifted.`);
    }
}

const write = (line = ''): void => {
    process.stdout.write(`${line}\n`);
};

const markdownTable = (values: string[]): void => {
    write('| Value | English | Norsk |');
    write('|---|---|---|');
    for (const value of values) {
        const label = labelFor(value);
        write(`| \`${value}\` | ${label.en} | ${label.no} |`);
    }
};

const printMarkdown = (): void => {
    for (const set of OPTION_SETS) {
        write(`#### ${set.title}`);
        write();
        write(`Field: \`${set.field}\` — ${set.values.length} values.`);
        if (set.note) {
            write();
            write(set.note);
        }
        write();
        markdownTable(set.values);
        write();
    }

    // Car equipment keeps the five groups the spec renders it in.
    const total = Object.values(CAR_EQUIPMENT_GROUPS).reduce((n, g) => n + Object.keys(g).length, 0);
    write('#### Car equipment');
    write();
    write(`Field: \`equipment\` (vehicleType: personbil) — ${total} values across five groups.`);
    write();
    for (const [group, options] of Object.entries(CAR_EQUIPMENT_GROUPS)) {
        write(`**${group.replace(/_/g, ' ')}**`);
        write();
        markdownTable(Object.keys(options));
        write();
    }

    printBrandSummary();
};

/**
 * Brands are counted rather than tabulated: the five vehicle lists run to thousands of rows,
 * which no one reads in a markdown table. The values themselves ship in the generated
 * TypeScript module and from `GET /filters/options`.
 */
const printBrandSummary = (): void => {
    const modelCount = BRAND_SETS.reduce(
        (n, set) => n + Object.values(set.models ?? {}).reduce((m, list) => m + list.length, 0),
        0,
    );

    write('#### Brands and models');
    write();
    write(`Fields: \`brand\` and \`carModel\` — ${BRAND_SETS.length} brand lists, ${modelCount} car models.`);
    write();
    write('Every value is generated into `docs/frontend/listing-constants.ts`, and the server');
    write('serves the same strings from `GET /filters/options` and `GET /filters/models`.');
    write();
    write('| List | Field | Entries | Constant |');
    write('|---|---|---|---|');
    for (const set of BRAND_SETS) {
        write(
            `| ${set.title} | \`${set.field}\` | ${set.brands.length} | \`${set.name}_OPTIONS\` |`,
        );
    }
    write(
        `| Car models | \`carModel\` | ${modelCount} across ${CAR_BRAND_VALUES.length} brands ` +
            '| `CAR_MODELS_BY_BRAND` |',
    );
    write();
    write('`brand` is free text (max 100) on property, job, bike, book and SellX listings.');
    write();
};

const tsIdentifier = (name: string): string => `${name}_OPTIONS`;

/**
 * A single-quoted TypeScript string literal. Brand and model names are plain text, but a few
 * carry an apostrophe, so anything JSON would have to escape is emitted as JSON instead.
 */
const quote = (value: string): string => {
    const json = JSON.stringify(value);
    return /^"[^"'\\]*"$/.test(json) ? `'${value}'` : json;
};

/** A JSDoc comment, wrapped to the print width when it does not fit on one line. */
const writeDocComment = (text: string): void => {
    if (`/** ${text} */`.length <= 100) {
        write(`/** ${text} */`);
        return;
    }

    write('/**');
    let line = '';

    for (const word of text.split(' ')) {
        if (line && ` * ${line} ${word}`.length > 100) {
            write(` * ${line}`);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }

    if (line) write(` * ${line}`);
    write(' */');
};

/** A string array, packed to the 100-column print width rather than one value per line. */
const writePackedStrings = (values: readonly string[], indent: string): void => {
    let line = '';

    for (const value of values) {
        const item = `${quote(value)},`;
        if (line && `${indent}${line} ${item}`.length > 100) {
            write(`${indent}${line}`);
            line = item;
        } else {
            line = line ? `${line} ${item}` : item;
        }
    }

    if (line) write(`${indent}${line}`);
};

/** TRANSACTION_TYPE -> TransactionType */
const typeName = (name: string): string =>
    name
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

const printTypeScript = (): void => {
    write('// Generated by scripts/print-listing-options.ts — do not edit by hand.');
    write('// Regenerate with:');
    write('//   node -r ts-node/register/transpile-only -r tsconfig-paths/register \\');
    write('//     scripts/print-listing-options.ts --typescript');
    write();
    write('export interface ListingOption {');
    write('    value: string;');
    write('    en: string;');
    write('    no: string;');
    write('}');
    write();

    for (const set of OPTION_SETS) {
        writeDocComment(set.note ? `${set.field} — ${set.note}` : set.field);

        write(`export const ${tsIdentifier(set.name)} = [`);
        for (const value of set.values) {
            const label = labelFor(value);
            write(
                `    { value: '${value}', en: ${JSON.stringify(label.en)}, no: ${JSON.stringify(label.no)} },`,
            );
        }
        write('] as const satisfies readonly ListingOption[];');
        write(
            `export type ${typeName(set.name)} = (typeof ${tsIdentifier(set.name)})[number]['value'];`,
        );
        write();
    }

    write('/** equipment (vehicleType: personbil), grouped as the form renders it. */');
    write('export const CAR_EQUIPMENT_GROUPS = {');
    for (const [group, options] of Object.entries(CAR_EQUIPMENT_GROUPS)) {
        write(`    ${group}: [`);
        for (const value of Object.keys(options)) {
            const label = labelFor(value);
            write(
                `        { value: '${value}', en: ${JSON.stringify(label.en)}, no: ${JSON.stringify(label.no)} },`,
            );
        }
        write('    ],');
    }
    write('} as const;');
    write();
    write('/** Every car equipment value, flattened. */');
    write('export const CAR_EQUIPMENT_OPTIONS = [');
    for (const options of Object.values(CAR_EQUIPMENT_GROUPS)) {
        for (const value of Object.keys(options)) {
            const label = labelFor(value);
            write(
                `    { value: '${value}', en: ${JSON.stringify(label.en)}, no: ${JSON.stringify(label.no)} },`,
            );
        }
    }
    write('] as const satisfies readonly ListingOption[];');
    write("export type CarEquipment = (typeof CAR_EQUIPMENT_OPTIONS)[number]['value'];");
    write();
    printBrandTypeScript();
};

/** Brand lists, the car brand -> model map, and the category-slug map. */
const printBrandTypeScript = (): void => {
    write('/* ---------- Categories ---------- */');
    write();
    write('/**');
    write(' * `category` on a listing -> the slug the filter endpoints take,');
    write(' * e.g. `GET /filters/options?category=car`.');
    write(' */');
    write('export const CATEGORY_FILTER_SLUGS = {');
    for (const [category, slug] of Object.entries(CATEGORY_FILTER_SLUGS)) {
        write(`    ${quote(category)}: ${quote(slug)},`);
    }
    write('} as const satisfies Record<ProductCategory, string>;');
    write();

    write('/* ---------- Brands and models ---------- */');
    write();
    write('/**');
    write(' * Brand names are proper nouns and read the same in both languages, so the lists ship as');
    write(' * plain strings. Wrap one with `brandOptions()` where a select wants `ListingOption`.');
    write(' * The server validates against these exact strings, so do not re-case or re-sort them.');
    write(' */');
    write('export const brandOptions = (brands: readonly string[]): ListingOption[] =>');
    write('    brands.map((value) => ({ value, en: value, no: value }));');
    write();

    /** Lists emitted so far, so an identical second list becomes an alias, not a copy. */
    const emitted = new Map<string, string>();

    for (const set of BRAND_SETS) {
        const id = tsIdentifier(set.name);
        const fingerprint = set.brands.join(' | ');
        const alias = emitted.get(fingerprint);

        const note = set.note ? ` ${set.note}` : '';
        writeDocComment(`${set.field} — ${set.brands.length} entries.${note}`);

        if (alias) {
            write(`export const ${id} = ${alias};`);
        } else {
            write(`export const ${id} = [`);
            writePackedStrings(set.brands, '    ');
            write('] as const;');
            emitted.set(fingerprint, id);
        }

        write(`export type ${typeName(set.name)} = (typeof ${id})[number];`);
        write();

        if (set.models) printModelMap(set, id);
    }
};

/** The brand -> models map for a category whose models are a fixed list. */
const printModelMap = (set: BrandSet, brandsId: string): void => {
    const models = set.models ?? {};
    const total = Object.values(models).reduce((n, list) => n + list.length, 0);
    const mapId = `${set.name.replace(/_BRAND$/, '')}_MODELS_BY_BRAND`;
    const brandType = typeName(set.name);

    write(
        `/** carModel — ${total} models across ${Object.keys(models).length} brands. ` +
            'A model is only valid under its own brand. */',
    );
    write(`export const ${mapId} = {`);

    for (const [brand, list] of Object.entries(models)) {
        const inline = `    ${quote(brand)}: [${list.map(quote).join(', ')}],`;

        if (inline.length <= 100) {
            write(inline);
            continue;
        }

        write(`    ${quote(brand)}: [`);
        writePackedStrings(list, '        ');
        write('    ],');
    }

    write(`} as const satisfies Record<${brandType}, readonly string[]>;`);
    write();
    write(`/** The models listed for a brand — \`[]\` for a brand that is not in ${brandsId}. */`);
    const helper = `${typeName(set.name).replace(/Brand$/, '').toLowerCase()}ModelsFor`;

    write(`export const ${helper} = (brand: string): readonly string[] =>`);
    write(`    (${mapId} as Record<string, readonly string[]>)[brand] ?? [];`);
    write();
};

const main = (): void => {
    const wantsMarkdown = process.argv.includes('--markdown');
    const wantsTypeScript = process.argv.includes('--typescript');

    if (wantsTypeScript && !wantsMarkdown) {
        printTypeScript();
        return;
    }

    printMarkdown();

    if (!wantsMarkdown) {
        write();
        write('/* ---------- TypeScript constants ---------- */');
        write();
        printTypeScript();
    }
};

main();
