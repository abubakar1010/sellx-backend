import z from 'zod';

import { BikeType, BookCategory, Condition, TransactionType } from '../product.enum';
import { productCommonSchema } from './common.schema';

/**
 * The six categories that share one form: SellX, Electronics, Furniture,
 * Clothing, Book and Bike. They differ only in the field at position 6
 * (brand, or book category) and — for Bike — an extra bike type.
 *
 * `description` is required here; the spec marks it `(Required)` on every one
 * of these forms, unlike the vehicle and property forms.
 */
const simpleBaseSchema = productCommonSchema.extend({
    description: z.string().trim().min(5).max(5000),
    /**
     * The listing form's three choices only: Sell, Buy and Give away. The filter
     * page also lists "Til leie", but a rental filter on these categories just
     * returns nothing — preferred over storing a type the form never offers.
     */
    transactionType: z
        .enum([
            TransactionType.FOR_SELL,
            TransactionType.WANTS_TO_BUY,
            TransactionType.GIVE_AWAY,
        ])
        .optional()
        .default(TransactionType.FOR_SELL),
    condition: z.enum(Condition).optional(),
});

/** Giving something away means it has no price; buying means `price` is the buyer's cap. */
const withGiveAwayPriceRule = <T extends typeof simpleBaseSchema>(schema: T) =>
    schema.superRefine((data, ctx) => {
        if (data.transactionType === TransactionType.GIVE_AWAY && data.price > 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['price'],
                message: 'Price must be 0 when giving an item away',
            });
        }
    });

export const sellxSchema = withGiveAwayPriceRule(
    simpleBaseSchema.extend({
        brand: z.string().trim().max(100).optional(),
    }),
);

export const electronicsSchema = sellxSchema;
export const furnitureSchema = sellxSchema;
export const clothingSchema = sellxSchema;

export const bookSchema = withGiveAwayPriceRule(
    simpleBaseSchema.extend({
        bookCategory: z.enum(BookCategory).optional(),
    }),
);

export const bikeSchema = withGiveAwayPriceRule(
    simpleBaseSchema.extend({
        brand: z.string().trim().max(100).optional(),
        bikeType: z.enum(BikeType).optional(),
    }),
);
