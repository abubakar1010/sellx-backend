# Job Category — Frontend Integration Guide

Everything the client needs to publish, edit, browse and filter a **stillingsannonse**.

Job is the one category with no price on its form and no thing being sold. The user picks an
**Annonsetype** first — Heltidsstilling, Deltidsstilling or Lederstilling — and all three then
fill in exactly the same fields. The choice only changes what the ad costs, which is handled by
the listing package, not the form.

Field names below carry the Norwegian label the form shows, next to the JSON key the API expects.
The shared conventions — envelope, auth, pagination, media URLs, the listing-slot purchase — are
identical to [`sellx.md`](./sellx.md).

---

## Contents

- [Annonsetype](#annonsetype)
- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Step 1 — Resolve the Job category id](#step-1--resolve-the-job-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
  - [Uploads](#uploads)
  - [Stillingen](#stillingen)
  - [Om arbeidsgiver](#om-arbeidsgiver)
  - [Kontaktpersoner](#kontaktpersoner)
  - [No price](#no-price)
  - [Create errors](#create-errors)
- [Value reference](#value-reference)
- [Step 4 — Approval and visibility](#step-4--approval-and-visibility)
- [Editing a listing](#editing-a-listing)
- [Browsing and searching](#browsing-and-searching)
- [Filter sheet](#filter-sheet)
- [Response object reference](#response-object-reference)
- [TypeScript types](#typescript-types)
- [Gotchas](#gotchas)
- [Integration checklist](#integration-checklist)
- [Source](#source)

---

## Annonsetype

`employmentType` is **required** and has no default. It is the choice the user makes first:

| Brukeren velger | Send |
| --- | --- |
| **Heltidsstilling** | `employmentType: "heltid"` |
| **Deltidsstilling** | `employmentType: "deltid"` |
| **Lederstilling** | `employmentType: "lederstilling"` |

Unlike the vehicle and property categories, this is **not** a discriminator: all three ad types
validate against one schema with identical fields. Nothing else on the form changes.

---

## Conventions

```
/api/v1
Authorization: Bearer <accessToken>
```

Success and error envelopes, pagination and relative media URLs are as in
[`sellx.md`](./sellx.md#conventions). Validation failures carry `errorCode: "VALIDATION_ERROR"`
and an `errors[]` array of `{ field, message }`, where `field` is a dot path —
`contactPersons.0.email`, `keywords.3`, `location.address`.

---

## The integration flow

```
1. GET  /categories/public                    -> find slug "job", keep its id
2. GET  /listing-packages?category=<id>       -> the packages for Job
3. POST /listing-purchases { packageId }      -> 201 purchase, or 200 { checkoutUrl } to pay first
4. GET  /listing-purchases/active             -> the purchase id to spend
5. POST /products  (multipart: data + images) -> 201, status "draft"
6. (admin approves)                           -> status "active", listingExpiresAt set
7. GET  /products/public?category=<id>        -> the ad is now in the feed
```

The three ad types differ in price, so surface the package list per ad type if your packages are
priced that way — the API does not tie a package to an `employmentType`, it only checks that the
purchase is for the Job category.

---

## Step 1 — Resolve the Job category id

```http
GET /api/v1/categories/public
```

Match on `slug === "job"` and cache the `id`.

---

## Step 2 — Buy a listing slot

Identical to every category — see [`sellx.md`](./sellx.md#step-2--buy-a-listing-slot).

---

## Step 3 — Create the listing

```http
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Uploads

| Part | Required | Rules |
| --- | --- | --- |
| `data` | ✔ | The **entire** listing body as a JSON string |
| `images` | ✔ | 1–10 files — the employer's logo, or pictures of the workplace. 5 MB each, no SVG. |
| `documents` | – | 0–5 PDFs. Not part of the job spec, but accepted. |

At least one image is still required, so ask for the employer logo if nothing else.

### Stillingen

| Norsk | Field | Type | Kreves | Rules |
| --- | --- | --- | --- | --- |
| — | `category` | ObjectId string | ✔ | The Job category id |
| — | `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| Annonsetype | `employmentType` | enum | ✔ | `heltid` \| `deltid` \| `lederstilling` |
| Overskrift | `title` | string | ✔ | 2–120 |
| Stillingstittel | `jobTitle` | string | ✔ | 2–120 |
| Antall stillinger | `numberOfPositions` | integer | ✔ | At least 1 |
| Ansettelsesform | `contractType` | enum | ✔ | [8 values](#ansettelsesform) |
| Sektor | `sector` | enum | ✔ | [5 values](#sektor) |
| Bransje | `industry` | string | ✔ | 2–120, free text — "Eiendom", "Bygg og anlegg", "Farmasi og legemiddel" |
| Stillingsfunksjon | `jobFunction` | string | – | Max 120, free text — "Analyse", "Biolog", "Brannvern" |
| Mulighet for hjemmearbeid | `remoteWorkType` | enum | – | `delvis_hjemmearbeid` \| `kun_hjemmearbeid` |
| Stillingsbeskrivelse | `description` | string | – | 5–5000 |
| Nøkkelord | `keywords` | string[] | – | **Max 5**, each 1–40 characters |
| Arbeidsspråk | `workLanguage` | enum | – | `norsk` \| `engelsk` |
| Lønn beskrivelse | `salaryDescription` | string | – | Max 2000, free text |
| Andre informasjon | `otherInfo` | string | – | Max 2000 |

`industry` and `jobFunction` are **free text**, not pickers — the spec gives examples, not a
closed list. If you want a picker, supply your own suggestions and let the user type anything.

`keywords` is capped at five, matching *"Velg inntil 5 ord du tror kandidatene søker på."* A
sixth is a `400` on `keywords`.

### Om arbeidsgiver

| Norsk | Field | Type | Kreves | Rules |
| --- | --- | --- | --- | --- |
| Arbeidsgiver | `employerName` | string | ✔ | 1–120 — "Ikea" |
| Informasjon om firma | `companyInfo` | string | – | Max 4000 |
| Hjemmeside | `website` | URL string | – | Absolute URL |
| Arbeidsgiver på LinkedIn | `linkedin` | URL string | – | Absolute URL |
| Adresse | `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |

`location` is the whole address in one `address` string plus `city`, `country` and the
coordinates. `latitude` and `longitude` are required — geocode before submitting.

### Kontaktpersoner

*"med mulighet for å legge flere kontaktpersoner"* — send an array, up to **10**:

| Norsk | Field | Type | Kreves |
| --- | --- | --- | --- |
| Kontaktperson | `contactPersons[].name` | string | ✔ within an entry, min 2 |
| Tittel på kontaktperson | `contactPersons[].title` | string | – |
| Telefon | `contactPersons[].phone` | string | – |
| E-post | `contactPersons[].email` | string | – | Validated, lower-cased |

```json
"contactPersons": [
  { "name": "Kari Nordmann", "title": "Daglig leder", "phone": "+47 900 12 345", "email": "kari@example.com" },
  { "name": "Ola Hansen", "title": "HR-sjef", "email": "ola@example.com" }
]
```

`contactPersons` is the job form's own field. The generic `contacts` array works too, but the
spec's per-person block maps onto `contactPersons`.

### No price

The job form has no price field. `price` may be omitted; the server pins it to `0` for every job
listing whatever is sent, and `totalPrice` follows. Do not render a price input.

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema |
| `400` | `employmentType: Invalid option…` | Missing or unknown ad type |
| `400` | `contractType: Invalid option…` | Not one of the eight |
| `400` | `keywords: Too big…` | More than five keywords |
| `400` | `At least one image is required` | No `images` part |
| `400` | `A listing purchase or active subscription is required to create a product` | No slot |
| `401` | `UNAUTHORIZED` | Missing or expired token |

---

## Value reference

### Annonsetype

`employmentType` — `heltid` (Heltidsstilling), `deltid` (Deltidsstilling), `lederstilling`
(Lederstilling).

### Ansettelsesform

`contractType` — the **8** the form offers.

| Value | Norsk |
| --- | --- |
| `engasjement` | Engasjement |
| `fast` | Fast |
| `laerling` | Lærling |
| `prosjekt` | Prosjekt |
| `selvstendig_naeringsdrivende` | Selvstendig næringsdrivende |
| `sommer_sesong` | Sommer/Sesong |
| `trainee` | Trainee |
| `vikariat` | Vikariat |

The filter sheet additionally offers `bemanningsbyra` (Bemanningsbyrå). **No form accepts it**, so
it returns a `400` on create and an empty list when filtered. Drop it from the listing picker.

### Sektor

`sector` — 5 values.

| Value | Norsk |
| --- | --- |
| `franchise_selvstendig` | Selvstendig næringsdrivende / Franchise |
| `offentlig` | Offentlig |
| `organisasjoner` | Organisasjoner |
| `privat` | Privat |
| `samvirke` | Samvirke |

### Mulighet for hjemmearbeid

`remoteWorkType` — `delvis_hjemmearbeid` (Delvis hjemmearbeid), `kun_hjemmearbeid` (Kun
hjemmearbeid). Optional: leave it out when the role is on-site.

### Arbeidsspråk

`workLanguage` — `norsk`, `engelsk`.

---

## Step 4 — Approval and visibility

A new ad is created with `status: "draft"` and is **not** in the public feed until an admin
approves it, which stamps `listingExpiresAt` from the package's `durationHours`.

Show `draft` ads in "My listings" with a pending badge — a job ad takes a while to write, and
silence after submitting reads as failure.

---

## Editing a listing

```http
PATCH /api/v1/products/:id
```

A **full replace**: the body is validated with the same schema as `POST`, so `employmentType`,
`jobTitle`, `numberOfPositions`, `contractType`, `sector`, `industry`, `employerName`, `title` and
`location` must all be present. Re-sending `images` replaces the whole set.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<job id>&employmentType=heltid&sector=privat
```

Shared parameters — `page`, `limit`, `sort`, `search`, `category`, `city`, `near`, `radius`,
`userId` — behave as in [`sellx.md`](./sellx.md#browsing-and-searching). `search` matches the
`title` and `description`. Job-specific:

| Param | Type | Matches |
| --- | --- | --- |
| `employmentType` | string | Exact — `heltid`, `deltid`, `lederstilling` |
| `contractType` | string | Exact |
| `sector` | string | Exact |
| `workLanguage` | string | Exact |
| `remoteWorkType` | string | Exact — `delvis_hjemmearbeid`, `kun_hjemmearbeid` |

Price sorting is meaningless here — every job ad has `price: 0`. Use `relevance` (the sheet's
default), `-createdAt` or `nearest`.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=job
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `employmentType` | `single_select` | Employment type / Stillingstype | `employmentType` — all three ad types |
| `remoteWorkType` | `single_select` | Remote work / Hjemmekontor | `remoteWorkType` — the two answers |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `workLanguage` | `single_select` | Work language / Arbeidsspråk | `workLanguage` |
| `contractType` | `single_select` | Contract type / Ansettelsesform | `contractType` — 9 options, one of which no ad can carry |
| `sector` | `single_select` | Sector / Sektor | `sector` |

Two things were corrected here and are worth knowing if you built against the old sheet:

- **The ad-type chip now offers Lederstilling.** It listed only Heltid and Deltid, so a third of
  the ad types could not be filtered for at all.
- **Remote work is now `remoteWorkType`, not a `remoteWork` yes/no.** The old chip filtered a
  boolean the job form never writes, so *both* answers returned an empty list.

The sheet has no `industry` or `jobFunction` chip — both are free text on the form, so there is no
list to offer. Use `search`.

---

## Response object reference

Job ads return the shared listing object (see
[`sellx.md`](./sellx.md#response-object-reference)) plus:

| Field | Type | Notes |
| --- | --- | --- |
| `employmentType`, `contractType`, `sector`, `workLanguage`, `remoteWorkType` | `string` | Omitted when unset |
| `jobTitle`, `industry`, `jobFunction`, `employerName`, `companyInfo`, `salaryDescription`, `otherInfo` | `string` | |
| `website`, `linkedin` | `string` | |
| `numberOfPositions` | `number` | |
| `keywords` | `string[]` | `[]` when none |
| `contactPersons` | `{ name, title?, phone?, email? }[]` | `[]` when none |
| `price`, `totalPrice` | `number` | Always `0` |

Seller privacy applies here too: `hideName`, `hideProfile` and `hidePhone` mask the `seller`
object and phone-bearing `contacts`. They do **not** mask `contactPersons` — those are the
employer's published contacts, which is the point of the ad.

---

## TypeScript types

```ts
export const EMPLOYMENT_TYPES = ['heltid', 'deltid', 'lederstilling'] as const;

export const CONTRACT_TYPES = [
  'engasjement', 'fast', 'laerling', 'prosjekt', 'selvstendig_naeringsdrivende',
  'sommer_sesong', 'trainee', 'vikariat',
] as const;

export const SECTORS = ['franchise_selvstendig', 'offentlig', 'organisasjoner', 'privat', 'samvirke'] as const;
export const REMOTE_WORK_TYPES = ['delvis_hjemmearbeid', 'kun_hjemmearbeid'] as const;
export const WORK_LANGUAGES = ['norsk', 'engelsk'] as const;

export interface JobListingInput {
  category: string;
  purchaseId?: string;
  storeId?: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  /** Overskrift. */
  title: string;
  /** Stillingstittel. */
  jobTitle: string;
  numberOfPositions: number;
  contractType: (typeof CONTRACT_TYPES)[number];
  sector: (typeof SECTORS)[number];
  /** Bransje — free text. */
  industry: string;
  /** Stillingsfunksjon — free text. */
  jobFunction?: string;
  remoteWorkType?: (typeof REMOTE_WORK_TYPES)[number];
  /** Stillingsbeskrivelse. */
  description?: string;
  /** Maks 5. */
  keywords?: string[];
  workLanguage?: (typeof WORK_LANGUAGES)[number];
  salaryDescription?: string;
  otherInfo?: string;
  employerName: string;
  companyInfo?: string;
  website?: string;
  linkedin?: string;
  location: { address: string; city?: string; country?: string; latitude: number; longitude: number };
  contactPersons?: { name: string; title?: string; phone?: string; email?: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
}
```

---

## Gotchas

1. **`employmentType` is required and is not a discriminator.** All three ad types share one
   schema; only the package price differs.
2. **There is no price field.** `price` is pinned to `0` server-side. Do not render an input, and
   do not offer price sorting on the job feed.
3. **At least one image is still required** — use the employer logo.
4. **`keywords` is capped at five.** A sixth is a `400`.
5. **`industry` and `jobFunction` are free text**, not enums. The spec's lists are examples.
6. **`bemanningsbyra` is filter-only** — it is a `400` on the form.
7. **`contactPersons` is the job form's contact block**, and privacy flags do not mask it.
8. **`remoteWorkType`, not `remoteWork`.** The old boolean filter matched nothing; the field the
   form stores is the enum.
9. **A new ad is `draft`** until an admin approves it.
10. **Numeric inputs must never be submitted empty.** `numberOfPositions: ""` is a `400`.

---

## Integration checklist

- [ ] Make the user pick the Annonsetype first, and map it to `employmentType`
- [ ] Resolve the Job `category` id from `GET /categories/public` by `slug`
- [ ] Gate the form behind an active listing purchase; price the three ad types via the packages
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Require at least one image — the employer logo counts
- [ ] Render no price field anywhere on the job form
- [ ] Enforce all eight required fields client-side: overskrift, stillingstittel, antall stillinger, ansettelsesform, sektor, bransje, arbeidsgiver, adresse
- [ ] Offer the eight Ansettelsesform values; leave `bemanningsbyra` out
- [ ] Cap `keywords` at five in the UI
- [ ] Use free-text inputs for Bransje and Stillingsfunksjon
- [ ] Send `remoteWorkType` (two values), never a `remoteWork` boolean
- [ ] Support several kontaktpersoner, up to ten
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Map every entry of `errors[]` onto its field by the dot path

---

## Source

| Concern | File |
| --- | --- |
| Job body schema | `src/modules/products/schemas/job.schema.ts` |
| Shared fields, numbers, `location`, `contactPersonSchema` | `src/modules/products/schemas/common.schema.ts` |
| Value lists | `src/modules/products/product.enum.ts` |
| `price` pinned to 0 | `src/modules/products/product.service.ts` (`applyDerivedFields`) |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| Privacy enforcement | `src/modules/products/product.serializer.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` (`JOB_FILTERS`) |
| Everything else | [`sellx.md`](./sellx.md) |
