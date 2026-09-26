import z from 'zod';

import {
    BoatFuelType,
    BoatType,
    BuildMaterial,
    MotorType,
    TransactionType,
    VehicleLocation,
} from '../product.enum';
import { BOAT_BRANDS } from '../data/boat-brands.constants';
import { brandField, count, measure, modelYear, productCommonSchema } from './common.schema';

const MAX_FEET = 1_000;
const MAX_CM = 100_000;
const MAX_KG = 1_000_000;
const MAX_KNOTS = 200;
const MAX_ON_BOARD = 100;

const boatBaseSchema = productCommonSchema.extend({
    type: z.enum(BoatType).optional(),
});

/** A boat offered for sale or for rent — the full form. */
const boatForSaleOrRentSchema = boatBaseSchema.extend({
    type: z.enum(BoatType),
    registrationNumber: z.string().trim().max(40).optional(),
    manufacturedYear: modelYear,
    /** The spec lets the owner type the model free-hand; only the brand is a list. */
    brand: brandField(BOAT_BRANDS, 'boat').optional(),
    carModel: z.string().trim().max(100).optional(),
    vehicleLocation: z.enum(VehicleLocation).optional(),

    motorIncluded: z.boolean().optional(),
    engineBrand: z.string().trim().max(100).optional(),
    motorType: z.enum(MotorType).optional(),
    horsepower: count('Horsepower', { max: 5_000 }).optional(),
    fuel: z.enum(BoatFuelType).optional(),
    maxSpeedKnots: measure('Top speed', { unit: 'knots', max: MAX_KNOTS }).optional(),

    /** Feet, as the spec specifies for boats. */
    length: measure('Length', { unit: 'ft', max: MAX_FEET, min: 1 }),
    width: measure('Width', { unit: 'cm', max: MAX_CM }).optional(),
    depth: measure('Depth', { unit: 'cm', max: MAX_CM }).optional(),
    weight: measure('Weight', { unit: 'kg', max: MAX_KG }).optional(),
    buildMaterial: z.enum(BuildMaterial).optional(),
    // Colour stays free text on purpose.
    color: z.string().trim().max(60).optional(),
    seats: count('Number of seats', { max: MAX_ON_BOARD }).optional(),
    sleepingPlaces: count('Number of berths', { max: MAX_ON_BOARD }).optional(),

    /** Only meaningful for sailboats; issued by Norlys, e.g. "1.15". */
    lysNumber: z.string().trim().max(20).optional(),
    /** Boats take equipment as free text rather than checkboxes. */
    equipmentDescription: z.string().trim().max(2000).optional(),
});

const boatForSaleSchema = boatForSaleOrRentSchema.extend({
    transactionType: z.literal(TransactionType.FOR_SELL),
});

/** `price` is the "makspris" for a rental. */
const boatForRentSchema = boatForSaleOrRentSchema.extend({
    transactionType: z.literal(TransactionType.FOR_RENT),
});

/** The "wanted to buy" form is deliberately short. */
const boatWantedSchema = boatBaseSchema.extend({
    transactionType: z.literal(TransactionType.WANTS_TO_BUY),
});

export const boatSchema = z.discriminatedUnion('transactionType', [
    boatForSaleSchema,
    boatForRentSchema,
    boatWantedSchema,
]);
