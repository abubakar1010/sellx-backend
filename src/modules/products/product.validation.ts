import z from 'zod';
import { Condition } from './product.enum';
import { REPORT_REASONS } from './product.constants';

/** The only string form a coordinate may take: signed, with as many decimals as the client has. */
const COORDINATE = /^-?\d+(\.\d+)?$/;

/**
 * A latitude or longitude.
 *
 * Deliberately not `z.coerce.number()`: coercion reads `''`, `null` and `false` as **0**, so a
 * listing with an empty coordinate field used to be stored at (0, 0) — in the Gulf of Guinea —
 * and every `near`/`radius` search saw it there. The union below rejects those outright, the
 * same way `strictNumber` does for every other number on a listing.
 *
 * `money` and `measure` are the wrong tool here: their `AMOUNT` regex forbids a leading `-` and
 * caps at two decimals, and a coordinate needs both the sign and the precision.
 */
const coordinate = (label: string, limit: number) =>
    z
        .union([z.number(), z.string().trim().regex(COORDINATE).transform(Number)], {
            error: `${label} must be a number, for example ${limit === 90 ? '59.9139' : '10.7522'}`,
        })
        .refine((value) => Number.isFinite(value), { message: `${label} must be a number` })
        .refine((value) => value >= -limit && value <= limit, {
            message: `${label} must be between -${limit} and ${limit}`,
        });

export const locationSchema = z.object({
    address: z.string().trim().min(2),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
    latitude: coordinate('Latitude', 90),
    longitude: coordinate('Longitude', 180),
});

export const contactSchema = z.object({
    type: z.enum(['phone', 'email', 'whatsapp']),
    value: z.string().trim().min(2),
});

export const privacySchema = z
    .object({
        hideName: z.boolean().optional().default(false),
        hideProfile: z.boolean().optional().default(false),
        hidePhone: z.boolean().optional().default(false),
    })
    .optional();

// Listing bodies are validated per category by `schemas/registry.ts`, which
// `validateByCategory` selects from once the category has been resolved.

/**
 * A browser submits an untouched filter box as `?maxPrice=`, and `z.coerce.number()` reads that
 * empty string as **0** — so an empty "max price" used to filter out every listing rather than
 * none, and an empty `radius` searched a circle of zero metres. A blank query parameter means
 * "not set", so it is dropped before coercion rather than read as a number.
 *
 * This is the read-path counterpart of the write path's `strictNumber`, which rejects the same
 * input outright. A query parameter is the looser case on purpose: an empty box is a normal
 * thing for a form to submit, not a client bug worth a 400.
 */
const blank = (value: unknown): unknown =>
    value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value;

const numberParam = z.preprocess(blank, z.coerce.number().optional());
const intParam = z.preprocess(blank, z.coerce.number().int().optional());
const dateParam = z.preprocess(blank, z.coerce.date().optional());
const pageParam = z.preprocess(blank, z.coerce.number().int().min(1).default(1));
const limitParam = z.preprocess(blank, z.coerce.number().int().min(1).max(50).default(20));

export const listProductsQuerySchema = z.object({
    page: pageParam,
    limit: limitParam,
    sort: z.string().trim().optional().default('-createdAt'),
    search: z.string().trim().optional(),

    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
    condition: z.enum(Condition).optional(),
    brand: z.string().trim().optional(),
    minPrice: numberParam,
    maxPrice: numberParam,
    city: z.string().trim().optional(),

    near: z.string().trim().optional(),
    radius: numberParam,

    filter: z.enum(['today_best', 'recently_viewed']).optional(),

    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),

    // --- Extended filters ---

    // Transaction / sale type
    transactionType: z.string().trim().optional(),

    // Vehicle filters
    carModel: z.string().trim().optional(),
    vehicleLocation: z.string().trim().optional(),
    vehicleType: z.string().trim().optional(),
    fuel: z.string().trim().optional(),
    transmission: z.string().trim().optional(),
    bodyType: z.string().trim().optional(),
    bodyColor: z.string().trim().optional(),
    interiorColor: z.string().trim().optional(),
    driveType: z.string().trim().optional(),
    warrantyType: z.string().trim().optional(),
    taxClass: z.string().trim().optional(),
    equipment: z.string().trim().optional(),
    minMileage: numberParam,
    maxMileage: numberParam,
    minYear: intParam,
    maxYear: intParam,
    minHorsepower: numberParam,
    maxHorsepower: numberParam,
    minSeats: intParam,
    maxSeats: intParam,
    minTrailerWeight: numberParam,
    maxTrailerWeight: numberParam,

    // Property filters
    type: z.string().trim().optional(),
    ownershipType: z.string().trim().optional(),
    energyRating: z.string().trim().optional(),
    floorLevel: z.string().trim().optional(),
    facilities: z.string().trim().optional(),
    minUsableArea: numberParam,
    maxUsableArea: numberParam,
    minBedrooms: intParam,
    maxBedrooms: intParam,
    minYearBuilt: intParam,
    maxYearBuilt: intParam,
    minPlotSize: numberParam,
    maxPlotSize: numberParam,
    minCommonExpenses: numberParam,
    maxCommonExpenses: numberParam,
    showingDate: dateParam,

    // Boat filters
    motorIncluded: z.string().trim().optional(),
    motorType: z.string().trim().optional(),
    buildMaterial: z.string().trim().optional(),
    minLength: numberParam,
    maxLength: numberParam,
    minWidth: numberParam,
    maxWidth: numberParam,
    minMaxSpeedKnots: numberParam,
    maxMaxSpeedKnots: numberParam,
    minSleepingPlaces: intParam,
    maxSleepingPlaces: intParam,

    // Motorcycle filters
    mcType: z.string().trim().optional(),
    mopedType: z.string().trim().optional(),
    motorcycleType: z.string().trim().optional(),
    minDisplacement: numberParam,
    maxDisplacement: numberParam,

    // Bike filters
    bikeType: z.string().trim().optional(),

    // Job filters
    employmentType: z.string().trim().optional(),
    remoteWorkType: z.string().trim().optional(),
    workLanguage: z.string().trim().optional(),
    contractType: z.string().trim().optional(),
    sector: z.string().trim().optional(),

    // Book filters
    bookCategory: z.string().trim().optional(),
});

export const recentlyViewedQuerySchema = z.object({
    page: pageParam,
    limit: limitParam,
});

export const reportProductBodySchema = z.object({
    reason: z.enum(Object.values(REPORT_REASONS) as [string, ...string[]]),
    details: z.string().trim().max(500).optional(),
});

export const myProductsQuerySchema = z.object({
    page: pageParam,
    limit: limitParam,
    filter: z.enum(['active', 'draft', 'promoted', 'sold', 'expired']).optional(),
    search: z.string().trim().optional(),
});

export const promoteProductBodySchema = z.object({
    planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid plan ID'),
});

export const markSoldBodySchema = z.object({
    quantity: z.coerce.number().int().min(1).optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ReportProductBody = z.infer<typeof reportProductBodySchema>;
export type RecentlyViewedQuery = z.infer<typeof recentlyViewedQuerySchema>;
export type MyProductsQuery = z.infer<typeof myProductsQuerySchema>;
export type PromoteProductBody = z.infer<typeof promoteProductBodySchema>;
export type MarkSoldBody = z.infer<typeof markSoldBodySchema>;
