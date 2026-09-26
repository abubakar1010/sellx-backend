/**
 * SellX is a NOK-only marketplace. Every price, package, plan and payment is
 * denominated in Norwegian kroner — this is the single source of truth.
 */
export const CURRENCY = 'NOK' as const;

export type Currency = typeof CURRENCY;

/** NOK is a two-decimal currency, so minor units (øre) are 1/100 of a krone. */
export const CURRENCY_MINOR_UNIT_FACTOR = 100;

export const CURRENCY_ERROR = 'Only NOK is supported.';
