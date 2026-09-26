import z from 'zod';

import {
    Condition,
    McFuelType,
    McType,
    MopedType,
    MotorcycleType,
    RemainingWarrantyType,
    TransactionType,
} from '../product.enum';
import { MC_EQUIPMENT_VALUES } from '../data/mc-equipment.constants';
import { MC_BRANDS } from '../data/mc-brands.constants';
import { brandField, count, measure, modelYear, money, oneOf, productCommonSchema } from './common.schema';

const MAX_MILEAGE = 5_000_000;
const MAX_CCM = 10_000;

const mcBaseSchema = productCommonSchema.extend({
    transactionType: z
        .enum([TransactionType.FOR_SELL, TransactionType.FOR_RENT])
        .optional()
        .default(TransactionType.FOR_SELL),

    registrationNumber: z.string().trim().max(20).optional(),
    chassisNumber: z.string().trim().max(40).optional(),
    /** The spec lets the owner type the model free-hand; only the make is a list. */
    brand: brandField(MC_BRANDS, 'motorcycle').optional(),
    carModel: z.string().trim().max(100).optional(),
    manufacturedYear: modelYear,

    fuel: z.enum(McFuelType).optional(),
    horsepower: count('Horsepower', { max: 5_000 }).optional(),
    displacement: measure('Displacement', { unit: 'ccm', max: MAX_CCM }).optional(),
    weight: measure('Weight', { unit: 'kg', max: 100_000 }).optional(),

    equipment: z.array(oneOf(MC_EQUIPMENT_VALUES)).optional().default([]),
    condition: z.enum(Condition).optional(),
    mileage: count('Mileage', { max: MAX_MILEAGE }).optional(),
    numberOfOwners: count('Number of owners', { max: 100 }).optional(),
    hasConditionReport: z.boolean().optional(),
    maintenanceProgramFollowed: z.boolean().optional(),
    warrantyType: z.enum(RemainingWarrantyType).optional(),

    // `price` from the common schema is the sales price excluding re-registration.
    reRegistrationFee: money('Re-registration fee').optional(),
    reRegistrationExempt: z.boolean().optional().default(false),
});

const motorcycleVariantSchema = mcBaseSchema.extend({
    mcType: z.literal(McType.MOTORSYKKEL),
    motorcycleType: z.enum(MotorcycleType),
});

const mopedVariantSchema = mcBaseSchema.extend({
    mcType: z.literal(McType.MOPED),
    mopedType: z.enum(MopedType),
});

/** ATVs and snowmobiles skip the sub-type question entirely ("don't need"). */
const atvVariantSchema = mcBaseSchema.extend({
    mcType: z.literal(McType.ATV),
});

const snowmobileVariantSchema = mcBaseSchema.extend({
    mcType: z.literal(McType.SNOSCOOTER),
});

export const motorcycleSchema = z
    .discriminatedUnion('mcType', [
        motorcycleVariantSchema,
        mopedVariantSchema,
        atvVariantSchema,
        snowmobileVariantSchema,
    ])
    .superRefine((data, ctx) => {
        if (!data.reRegistrationExempt && data.reRegistrationFee == null) {
            ctx.addIssue({
                code: 'custom',
                path: ['reRegistrationFee'],
                message: 'Re-registration fee is required unless the listing is exempt',
            });
        }
    });
