import z from 'zod';

import {
    EnergyRating,
    FloorLevel,
    Furnishing,
    HeatingRating,
    OwnershipType,
    PreferredPropertyType,
    PropertyType,
    TransactionType,
} from '../product.enum';
import { NORWEGIAN_AREA_VALUES } from '../data/norwegian-areas.constants';
import { PROPERTY_FORM_FACILITY_VALUES } from '../data/property-facilities.constants';
import {
    count,
    link,
    modelYear,
    money,
    oneOf,
    productCommonSchema,
    squareMetres,
    viewingSchema,
} from './common.schema';

/** Assigned when the unit is sectioned: a letter plus four digits, e.g. H0201. */
const APARTMENT_NUMBER = /^[HLUK]\d{4}$/;

/**
 * The property types the listing form offers: the spec's seven, plus the two the
 * "Cabins" and "Land Plot" choices pin.
 *
 * `PropertyType` also carries `bygaard_flermannsbolig` and `produksjon_industri`,
 * which appear on the filter page but on no form. Filtering by them returns an
 * empty list — the same resolution the six simple categories use for "Til leie".
 */
export const FORM_PROPERTY_TYPES = [
    PropertyType.ENEBOLIG,
    PropertyType.GARASJE_PARKERING,
    PropertyType.GAARDSBRUK,
    PropertyType.LEILIGHET,
    PropertyType.REKKEHUS,
    PropertyType.TOMANNSBOLIG,
    PropertyType.HYTTE,
    PropertyType.TOMTER,
    PropertyType.ANDRE,
] as const;

/**
 * Areas, rooms and viewing slots — the fields that describe a real unit.
 *
 * Shared by "For Sale" and "For Rent" only. A tenant's "wanted to rent" ad
 * describes the person, not a property, so it carries none of them.
 */
const unitFields = {
    type: z.enum(FORM_PROPERTY_TYPES).optional(),
    internalArea: squareMetres('Internal usable area').optional(),
    externalArea: squareMetres('External usable area').optional(),
    balconyArea: squareMetres('Terrace and balcony area').optional(),
    primaryRoomArea: squareMetres('Primary rooms area').optional(),
    bedrooms: count('Number of bedrooms').optional(),
    viewings: z.array(viewingSchema).optional().default([]),
};

/**
 * "For Sale" — also the form behind the Cabins and Land Plot choices, which are
 * the same fields with `type` pinned to `hytte` / `tomter` ("akkurat samme som for salg").
 *
 * `usableArea`, `yearBuilt` and `bedrooms` are declared optional here and made
 * required by `requireBuildingFields` below, which exempts Land Plot: bare ground
 * has no build year and no bedrooms.
 */
const propertyForSaleSchema = productCommonSchema.extend({
    ...unitFields,
    transactionType: z.literal(TransactionType.FOR_SELL),

    // Basic information
    accessDescription: z.string().trim().max(2000).optional(),
    locationDescription: z.string().trim().max(2000).optional(),
    neighborhood: z.string().trim().max(120).optional(),
    type: z.enum(FORM_PROPERTY_TYPES),
    ownershipType: z.enum(OwnershipType),

    // Official identification numbers
    municipalityNumber: z.string().trim().min(1).max(10),
    farmNumber: z.string().trim().min(1).max(10),
    usageNumber: z.string().trim().min(1).max(10),
    sectionNumber: z.string().trim().max(10).optional(),
    leaseholdNumber: z.string().trim().max(10).optional(),
    apartmentNumber: z
        .string()
        .trim()
        .toUpperCase()
        .regex(APARTMENT_NUMBER, 'Apartment number must be a letter (H, L, U or K) and four digits, e.g. H0201')
        .optional(),

    // Area details
    usableArea: squareMetres('Usable area').optional(),
    groundArea: squareMetres('Ground area').optional(),
    areaDescription: z.string().trim().max(2000).optional(),

    // Construction details
    yearBuilt: modelYear.optional(),
    renovatedYear: modelYear.optional(),
    energyRating: z.enum(EnergyRating).optional(),
    heatingRating: z.enum(HeatingRating).optional(),

    // Rooms and facilities
    totalRooms: count('Total number of rooms').optional(),
    floorLevel: z.enum(FloorLevel).optional(),
    facilities: z.array(oneOf(PROPERTY_FORM_FACILITY_VALUES)).optional().default([]),

    // Land details
    plotSize: squareMetres('Plot size').optional(),
    leaseTerm: z.string().trim().max(200).optional(),
    leaseFee: money('Lease fee').optional(),
    plotCharacteristics: z.string().trim().max(2000).optional(),

    // Financial information. `price` from the common schema is the listing price;
    // `totalPrice` is computed by the service and never accepted from the client.
    commonExpenses: money('Shared costs'),
    sharedCostsAfterInterestFree: money('Shared costs after the interest-free period').optional(),
    sharedCostsInclude: z.string().trim().min(1).max(2000),
    propertyTaxValue: money('Property tax value'),
    additionalCosts: money('Additional costs'),
    additionalCostsInclude: z.string().trim().min(1).max(2000),
    sharedDebt: money('Shared debt'),
    appraisalValue: money('Appraisal value').optional(),
    loanValue: money('Loan value').optional(),
    sharedEquity: money('Shared equity').optional(),
    annualMunicipalFees: money('Annual municipal fees').optional(),
    annualPropertyTax: money('Annual property tax').optional(),
    debtAndCostsInfo: z.string().trim().max(2000).optional(),
    rightOfFirstRefusal: z.string().trim().max(1000).optional(),

    // Additional property details
    virtualTourLink: link.optional(),
});

const propertyForRentSchema = productCommonSchema.extend({
    ...unitFields,
    transactionType: z.literal(TransactionType.FOR_RENT),

    primaryRoomArea: squareMetres('Primary rooms area'),
    bedrooms: count('Number of bedrooms'),
    furnishing: z.enum(Furnishing).optional(),

    // `price` from the common schema is the monthly rent.
    deposit: money('Deposit').optional(),
    rentIncludes: z.string().trim().max(1000).optional(),
    rentalPeriodStart: z.coerce.date().optional(),
    rentalPeriodEnd: z.coerce.date().optional(),
    additionalRemarks: z.string().trim().max(2000).optional(),
});

const propertyWantedToRentSchema = productCommonSchema.extend({
    transactionType: z.literal(TransactionType.WANTS_TO_RENT),

    preferredArea: oneOf(NORWEGIAN_AREA_VALUES).optional(),
    preferredPropertyType: z.enum(PreferredPropertyType).optional(),
    numberOfTenants: count('Number of tenants', { min: 1 }).optional(),
    furnishing: z.enum(Furnishing).optional(),
    moveInDate: z.coerce.date().optional(),
    // `price` from the common schema is the maximum monthly rent.
});

/** The three "For Sale" fields that describe a building rather than the plot under it. */
const BUILDING_FIELD_LABELS = {
    usableArea: 'Usable area',
    yearBuilt: 'Year built',
    bedrooms: 'Number of bedrooms',
} as const;

export const propertySchema = z
    .discriminatedUnion('transactionType', [
        propertyForSaleSchema,
        propertyForRentSchema,
        propertyWantedToRentSchema,
    ])
    .superRefine((data, ctx) => {
        if (data.transactionType === TransactionType.FOR_SELL && data.type !== PropertyType.TOMTER) {
            const values = {
                usableArea: data.usableArea,
                yearBuilt: data.yearBuilt,
                bedrooms: data.bedrooms,
            };

            for (const [field, label] of Object.entries(BUILDING_FIELD_LABELS)) {
                if (values[field as keyof typeof values] === undefined) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [field],
                        message: `${label} is required unless the property type is a land plot`,
                    });
                }
            }
        }

        if (
            data.transactionType === TransactionType.FOR_RENT &&
            data.rentalPeriodStart &&
            data.rentalPeriodEnd &&
            data.rentalPeriodEnd <= data.rentalPeriodStart
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['rentalPeriodEnd'],
                message: 'Rental period end must be after the start date',
            });
        }
    });
