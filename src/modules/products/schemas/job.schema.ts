import z from 'zod';

import {
    ContractType,
    EmploymentType,
    RemoteWorkType,
    Sector,
    WorkLanguage,
} from '../product.enum';
import { contactPersonSchema, count, link, priceField, productCommonSchema } from './common.schema';

/**
 * Job listings ("stillingsannonser"). The three ad types — Heltidsstilling,
 * Deltidsstilling and Lederstilling — carry identical fields and differ only in
 * listing price, so there is one schema rather than a discriminated union.
 *
 * There is no price field on this form; the service pins `price` to 0.
 */
/**
 * "Ansettelsesform" as the listing form prints it — eight choices.
 *
 * `ContractType` also carries `bemanningsbyra`, which is on the filter page but
 * on no form. Filtering by it returns an empty list, the same resolution the
 * property and simple-category forms use for their filter-only values.
 */
export const FORM_CONTRACT_TYPES = [
    ContractType.ENGASJEMENT,
    ContractType.FAST,
    ContractType.LAERLING,
    ContractType.PROSJEKT,
    ContractType.SELVSTENDIG,
    ContractType.SOMMER_SESONG,
    ContractType.TRAINEE,
    ContractType.VIKARIAT,
] as const;

export const jobSchema = productCommonSchema.extend({
    price: priceField.optional().default(0),

    /** "Annonsetype" — the choice the user makes first. */
    employmentType: z.enum(EmploymentType),

    jobTitle: z.string().trim().min(2).max(120),
    numberOfPositions: count('Antall stillinger', { min: 1, max: 10_000 }),
    contractType: z.enum(FORM_CONTRACT_TYPES),
    sector: z.enum(Sector),
    industry: z.string().trim().min(2).max(120),
    jobFunction: z.string().trim().max(120).optional(),
    remoteWorkType: z.enum(RemoteWorkType).optional(),

    /** "Velg inntil 5 ord du tror kandidatene søker på." */
    keywords: z.array(z.string().trim().min(1).max(40)).max(5).optional().default([]),
    workLanguage: z.enum(WorkLanguage).optional(),
    salaryDescription: z.string().trim().max(2000).optional(),
    otherInfo: z.string().trim().max(2000).optional(),

    // Om arbeidsgiver
    employerName: z.string().trim().min(1).max(120),
    companyInfo: z.string().trim().max(4000).optional(),
    website: link.optional(),
    linkedin: link.optional(),
    contactPersons: z.array(contactPersonSchema).max(10).optional().default([]),
});
