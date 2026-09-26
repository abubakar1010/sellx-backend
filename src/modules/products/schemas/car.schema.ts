import z from 'zod';

import {
    BedType,
    CarBodyType,
    CarFuelType,
    Condition,
    ConditionReportProvider,
    DriveType,
    MotorhomeType,
    RemainingWarrantyType,
    TaxClass,
    TransactionType,
    TransmissionType,
    VehicleLocation,
    VehicleType,
    WarrantyType,
} from '../product.enum';
import { CAR_EQUIPMENT_VALUES } from '../data/car-equipment.constants';
import { CARAVAN_EQUIPMENT_VALUES } from '../data/caravan-equipment.constants';
import { MOTORHOME_EQUIPMENT_VALUES } from '../data/motorhome-equipment.constants';
import { CAR_BRANDS, CAR_BRAND_VALUES } from '../data/car-brands.constants';
import { CARAVAN_BRANDS } from '../data/caravan-brands.constants';
import { MOTORHOME_BRANDS } from '../data/motorhome-brands.constants';
import {
    OTHER_MODEL,
    brandField,
    count,
    measure,
    modelYear,
    money,
    oneOf,
    productCommonSchema,
} from './common.schema';

const MAX_MILEAGE = 5_000_000;
const MAX_KG = 100_000;
const MAX_CM = 100_000;
const MAX_LITRES = 100_000;
const MAX_ON_BOARD = 100;

const kilograms = (label: string, min?: number) => measure(label, { unit: 'kg', max: MAX_KG, min });
const centimetres = (label: string, min?: number) => measure(label, { unit: 'cm', max: MAX_CM, min });

/** Sale or rent; the spec defaults every vehicle form to selling. */
const saleOrRent = z
    .enum([TransactionType.FOR_SELL, TransactionType.FOR_RENT])
    .optional()
    .default(TransactionType.FOR_SELL);

/**
 * Fields on all three vehicle forms: what it is, where it is, how far it has
 * gone, and what it costs to re-register.
 */
const vehicleBaseSchema = productCommonSchema.extend({
    brand: z.string().trim().max(100).optional(),
    carModel: z.string().trim().max(100).optional(),
    vehicleLocation: z.enum(VehicleLocation).optional(),
    mileage: count('Mileage', { max: MAX_MILEAGE }).optional(),

    // `price` from the common schema is the sales price excluding re-registration.
    reRegistrationFee: money('Re-registration fee').optional(),
    reRegistrationExempt: z.boolean().optional().default(false),
});

/**
 * The vehicle registration document and its history.
 *
 * On the car and motorhome forms only — a caravan is not a registered motor
 * vehicle on the spec's form, which asks for none of this.
 */
const registrationFields = {
    registrationNumber: z.string().trim().max(20).optional(),
    chassisNumber: z.string().trim().max(40).optional(),
    numberOfOwners: count('Number of owners', { max: MAX_ON_BOARD }).optional(),
    firstRegistered: z.coerce.date().optional(),
    maintenanceProgramFollowed: z.boolean().optional(),
};

/** A passenger car for sale or rent. */
const carSchema = vehicleBaseSchema.extend({
    ...registrationFields,
    vehicleType: z.literal(VehicleType.PERSONBIL),
    transactionType: saleOrRent,

    // General info
    taxClass: z.enum(TaxClass),
    manufacturedYear: modelYear,
    brand: brandField(CAR_BRAND_VALUES, 'car'),
    carModel: z.string().trim().min(1).max(100),
    variant: z.string().trim().max(70).optional(),
    fuel: z.enum(CarFuelType),
    horsepower: count('Horsepower', { max: 5_000 }).optional(),
    engineTuned: z.boolean().optional(),
    /** The car form offers only these two; `semi_automatic` belongs to other vehicles. */
    transmission: z.enum([TransmissionType.MANUAL, TransmissionType.AUTOMATIC]),
    transmissionDesignation: z.string().trim().max(60).optional(),
    driveType: z.enum(DriveType),
    driveTypeDesignation: z.string().trim().max(60).optional(),

    // Body and colour. Colours stay free text on purpose.
    bodyType: z.enum(CarBodyType),
    seats: count('Number of seats', { min: 1, max: MAX_ON_BOARD }),
    doors: count('Number of doors', { max: MAX_ON_BOARD }).optional(),
    trunkVolume: measure('Trunk volume', { unit: 'l', max: MAX_LITRES }).optional(),
    weight: kilograms('Vehicle weight').optional(),
    trailerWeight: kilograms('Max trailer weight').optional(),
    bodyColor: z.string().trim().min(1).max(60),
    colorDescription: z.string().trim().max(120).optional(),
    interiorColor: z.string().trim().max(120).optional(),

    equipment: z.array(oneOf(CAR_EQUIPMENT_VALUES)).optional().default([]),

    // Condition and warranty
    /** Required on the car form only; caravans and motorhomes leave it optional. */
    mileage: count('Mileage', { max: MAX_MILEAGE }),
    hasDamage: z.boolean().optional(),
    hasRepairs: z.boolean().optional(),
    lastEuApprovedAt: z.coerce.date().optional(),
    nextEuInspectionAt: z.coerce.date().optional(),
    warrantyType: z.enum(WarrantyType).optional(),
    conditionReportProvider: z.enum(ConditionReportProvider).optional(),

    hasLiens: z.boolean().optional(),
});

/** Motorhome ("bobil"). */
const motorhomeSchema = vehicleBaseSchema.extend({
    ...registrationFields,
    vehicleType: z.literal(VehicleType.BOBIL),
    transactionType: saleOrRent,

    motorhomeType: z.enum(MotorhomeType).optional(),
    manufacturedYear: modelYear,
    /** The spec lets the owner type the model free-hand; only the brand is a list. */
    brand: brandField(MOTORHOME_BRANDS, 'motorhome').optional(),
    chassisType: z.string().trim().max(100).optional(),
    fuel: z.enum(CarFuelType),
    cylinderCapacity: measure('Cylinder capacity', { unit: 'l', max: MAX_ON_BOARD, min: 0.1 }),
    horsepower: count('Horsepower', { min: 1, max: 5_000 }),
    transmission: z.enum(TransmissionType).optional(),
    driveType: z.enum(DriveType),

    weight: kilograms('Weight', 1),
    totalWeight: kilograms('Total weight', 1),
    length: centimetres('Length', 1),
    width: centimetres('Width').optional(),
    registeredSeats: count('Number of registered seats', { min: 1, max: MAX_ON_BOARD }),
    sleepingPlaces: count('Number of sleeping places', { min: 1, max: MAX_ON_BOARD }),
    bedType: z.enum(BedType).optional(),

    equipment: z.array(oneOf(MOTORHOME_EQUIPMENT_VALUES)).optional().default([]),
    condition: z.enum(Condition).optional(),
    warrantyType: z.enum(RemainingWarrantyType).optional(),
    hasConditionReport: z.boolean().optional(),
});

/** Caravan ("campingvogn"). */
const caravanSchema = vehicleBaseSchema.extend({
    vehicleType: z.literal(VehicleType.CAMPINGVOGN),
    transactionType: saleOrRent,

    manufacturedYear: modelYear,
    /** The spec lets the owner type the model free-hand; only the brand is a list. */
    brand: brandField(CARAVAN_BRANDS, 'caravan').optional(),
    sleepingPlaces: count('Number of sleeping places', { min: 1, max: MAX_ON_BOARD }),
    weight: kilograms('Weight', 1),
    totalWeight: kilograms('Total weight', 1),
    totalLength: centimetres('Total length').optional(),
    interiorLength: centimetres('Interior length').optional(),
    width: centimetres('Width').optional(),

    equipment: z.array(oneOf(CARAVAN_EQUIPMENT_VALUES)).optional().default([]),
    condition: z.enum(Condition),
    hasConditionReport: z.boolean().optional(),
    hasWarranty: z.boolean().optional(),
});

export const carCategorySchema = z
    .discriminatedUnion('vehicleType', [carSchema, motorhomeSchema, caravanSchema])
    .superRefine((data, ctx) => {
        // "Re-registration fee in NOK (required if Exemption from re-registration fee? = no)"
        if (!data.reRegistrationExempt && data.reRegistrationFee == null) {
            ctx.addIssue({
                code: 'custom',
                path: ['reRegistrationFee'],
                message: 'Re-registration fee is required unless the listing is exempt',
            });
        }

        // A car's model is a dropdown that depends on the chosen brand, so the
        // pair has to agree — `brandField` alone would accept an Audi "Model S".
        if (data.vehicleType === VehicleType.PERSONBIL) {
            const models = CAR_BRANDS[data.brand as keyof typeof CAR_BRANDS] as
                | readonly string[]
                | undefined;

            if (models && data.carModel !== OTHER_MODEL && !models.includes(data.carModel)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['carModel'],
                    message: `"${data.carModel}" is not a listed ${data.brand} model. Choose one from GET /api/v1/filters/models?category=car&brand=${data.brand}`,
                });
            }
        }
    });
