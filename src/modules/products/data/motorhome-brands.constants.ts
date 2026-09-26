import { CARAVAN_BRANDS } from './caravan-brands.constants';

/**
 * Motorhome ("bobil") brands, from the motorhome listing form in the product
 * spec (Onboarding Screens, pp. 83-86).
 *
 * The spec prints the same 135 brands as the caravan form, in the same order,
 * but that copy went through a translator: 17 entries come out corrupted
 * (`Hymer` -> "Humming", `Pøssl` -> "Sausage", `KABE` -> "CABLE",
 * `Norgeshengern` -> "The Norwegian hanger", and so on). The caravan page is the
 * clean transcription of the same list, so it is reused here rather than
 * shipping mistranslated brand names to users.
 *
 * Motorhome *models* are free text by design ("user writes himself").
 */
export const MOTORHOME_BRANDS = CARAVAN_BRANDS;

export type MotorhomeBrand = (typeof MOTORHOME_BRANDS)[number];
