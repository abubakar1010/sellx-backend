import z from 'zod';

import {
    CURRENCY,
    CURRENCY_ERROR,
    CURRENCY_MINOR_UNIT_FACTOR,
} from '@/core/constants/currency';
import { locationSchema, contactSchema, privacySchema } from '../product.validation';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** The only string form an amount may take: digits, optionally with øre. */
const AMOUNT = /^\d+(\.\d{1,2})?$/;
/** The only string form a count may take. */
const WHOLE = /^\d+$/;

/** `z.enum` needs a tuple; the option lists in `data/` are plain arrays. */
export const oneOf = (values: readonly string[]) => z.enum(values as [string, ...string[]]);

/**
 * Brand lists run to hundreds of entries (799 for boats), so they are matched
 * against a `Set` rather than compiled into a `z.enum` union — the union blows
 * up `tsc` inference time for no gain, and the error message below is clearer
 * than a 799-value "expected one of" dump.
 */
export const brandField = (brands: readonly string[], label: string) => {
    const allowed = new Set(brands);
    return z
        .string()
        .trim()
        .max(100)
        .refine((v) => allowed.has(v), {
            message: `Unknown ${label} brand. Choose one from GET /api/v1/filters/options`,
        });
};

/**
 * The spec's own "Other" escape hatch. 16 of the 117 car brands are simply
 * missing it (Nissan, Chevrolet, Citroën and Tesla among them), which would
 * otherwise leave those owners unable to file a model the spec skipped, so it
 * is accepted for every brand rather than only where the spec prints it.
 */
export const OTHER_MODEL = 'Andre';

export const objectId = (message: string) => z.string().regex(OBJECT_ID, message);

/** A billion kroner — above any real listing, and it keeps a fat-fingered price out of the index. */
export const MAX_PRICE = 1_000_000_000;
/** Ten square kilometres: room for a farm's outfields, tight enough to catch a stray digit. */
export const MAX_AREA = 10_000_000;
/** Bedrooms, rooms, tenants, items in stock. */
export const MAX_COUNT = 10_000;

/**
 * Strict numeric input, shared by every money, area and count field.
 *
 * `z.coerce.number()` cannot be used for any of them. It reads `''`, `'  '`,
 * `null` and `[]` as 0 and `true` as 1, so an empty input silently becomes a
 * real value — a *free* listing, a zero shared debt that understates the total
 * price, a zero-square-metre flat. It also reads the Norwegian thousands form
 * `'1.500'` as 1.5. Only a number, or a string that is entirely a numeral, is
 * accepted; everything else is rejected on the field that carried it.
 */
interface NumberOptions {
    max: number;
    /** Defaults to 0. Set it where zero is not a real value — seats, weights, lengths. */
    min?: number;
    unit?: string;
    integer?: boolean;
}

const strictNumber = (
    label: string,
    { max, min = 0, unit, integer = false }: NumberOptions,
) => {
    const suffix = unit ? ` ${unit}` : '';
    const bounded = z
        .union([z.number(), z.string().trim().regex(integer ? WHOLE : AMOUNT).transform(Number)], {
            error: integer
                ? `${label} must be a whole number, for example 3`
                : `${label} must be a number${unit ? ` in ${unit}` : ''}, for example 1500 or 1500.50`,
        })
        .refine((value) => value >= min, {
            message:
                min === 0
                    ? `${label} cannot be negative`
                    : `${label} must be at least ${min}${suffix}`,
        })
        .refine((value) => value <= max, {
            message: `${label} cannot exceed ${max.toLocaleString('en-US')}${suffix}`,
        });

    return integer
        ? bounded.refine(Number.isInteger, { message: `${label} must be a whole number` })
        : bounded.refine(
              (value) =>
                  Math.round(value * CURRENCY_MINOR_UNIT_FACTOR) / CURRENCY_MINOR_UNIT_FACTOR ===
                  value,
              { message: `${label} cannot have more than two decimals` },
          );
};

/** An amount in NOK. */
export const money = (label: string) => strictNumber(label, { max: MAX_PRICE, unit: 'NOK' });

/** A measurement with a unit — kilometres, kilograms, centimetres, litres. */
export const measure = (label: string, options: { unit: string; max: number; min?: number }) =>
    strictNumber(label, options);

/** A measurement in square metres. */
export const squareMetres = (label: string) => measure(label, { unit: 'm²', max: MAX_AREA });

/** A whole count — bedrooms, seats, owners, stock. */
export const count = (label: string, options: { max?: number; min?: number } = {}) =>
    strictNumber(label, { max: options.max ?? MAX_COUNT, min: options.min, integer: true });

export const priceField = money('Price');

/**
 * Video, virtual tour, homepage and LinkedIn links.
 *
 * The scheme is pinned to http(s): `z.url()` alone accepts `javascript:alert(1)`, which the
 * client renders straight into an `href`.
 */
export const link = z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), {
        message: 'Link must start with http:// or https://',
    });

export const currentYear = new Date().getFullYear();
export const modelYear = z.coerce.number().int().min(1900).max(currentYear + 1);

const VIEWING_DATE_ERROR = 'Viewing date must be a valid date, for example 2026-09-14';

/**
 * A viewing date.
 *
 * Not `z.coerce.date()`, for two reasons. It hands back an `Invalid Date` rather than throwing,
 * so an unparseable date surfaced as Zod's own "expected date, received Date" — which is the
 * message the client put in front of the user. And `new Date(null)`, `new Date(true)` and
 * `new Date([])` are all 1 January 1970, so a null viewing date was silently accepted and
 * stored as the Unix epoch.
 */
const viewingDate = z
    .union([z.date(), z.string().trim().min(1, VIEWING_DATE_ERROR), z.number()], {
        error: VIEWING_DATE_ERROR,
    })
    .transform((value) => new Date(value as string | number | Date))
    .refine((value) => !Number.isNaN(value.getTime()), { message: VIEWING_DATE_ERROR });

export const viewingSchema = z.object({
    date: viewingDate,
    fromTime: z.string().trim().regex(HH_MM, 'Time must be in HH:MM format').optional(),
    toTime: z.string().trim().regex(HH_MM, 'Time must be in HH:MM format').optional(),
});

export const contactPersonSchema = z.object({
    name: z.string().trim().min(2),
    title: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
});

/**
 * Fields every category shares.
 *
 * `category` is optional here on purpose: `resolveCategoryContext` has already
 * resolved and verified it before this schema runs, and rejects a create without one.
 * `location` is reused unchanged — the address shape is deliberately untouched.
 */
export const productCommonSchema = z.object({
    purchaseId: objectId('Invalid purchase ID').optional(),
    category: objectId('Invalid category ID').optional(),
    storeId: objectId('Invalid store ID').optional(),

    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(5).max(5000).optional(),
    price: priceField,
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).default(CURRENCY),

    videoLink: link.optional(),
    location: locationSchema,
    contacts: z.array(contactSchema).optional().default([]),
    privacy: privacySchema,
    quantity: count('Quantity').optional(),
});
