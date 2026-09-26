# Property Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **Property**.

Property is the largest form in the marketplace. It is not one form but **three**, chosen by a
discriminator the user picks first, and the spec's five user-facing choices map onto them. Send
the wrong one and the server validates against the wrong schema, so read
[Pick the form first](#pick-the-form-first) before anything else.

The shared conventions — envelope, auth, pagination, media URLs — are identical to
[`sellx.md`](./sellx.md); they are repeated in brief below so this page stands alone.

---

## Contents

- [Pick the form first](#pick-the-form-first)
- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Endpoint index](#endpoint-index)
- [Step 1 — Resolve the Property category id](#step-1--resolve-the-property-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
  - [Uploads](#uploads)
  - [Fields on every property form](#fields-on-every-property-form)
  - [Numbers](#numbers)
  - [For Sale — `for_sell`](#for-sale--for_sell)
  - [Cabins and Land Plot](#cabins-and-land-plot)
  - [For Rent — `for_rent`](#for-rent--for_rent)
  - [Wanted to Rent — `wants_to_rent`](#wanted-to-rent--wants_to_rent)
  - [Create errors](#create-errors)
- [Step 4 — Approval and visibility](#step-4--approval-and-visibility)
- [Editing a listing](#editing-a-listing)
- [Deleting a listing](#deleting-a-listing)
- [Browsing and searching](#browsing-and-searching)
- [Filter sheet](#filter-sheet)
- [Value reference](#value-reference)
- [Response object reference](#response-object-reference)
- [Errors](#errors)
- [TypeScript types](#typescript-types)
- [Gotchas](#gotchas)
- [Integration checklist](#integration-checklist)
- [Source](#source)

---

## Pick the form first

`transactionType` has **no default** on Property. The user chooses one of five, and the client
maps that choice onto a `transactionType` — plus, for two of them, a pinned `type`:

| User picks | Send | Form |
| --- | --- | --- |
| **For Sale** | `transactionType: "for_sell"` | [For Sale](#for-sale--for_sell) |
| **For Rent** | `transactionType: "for_rent"` | [For Rent](#for-rent--for_rent) |
| **Wanted to Rent** | `transactionType: "wants_to_rent"` | [Wanted to Rent](#wanted-to-rent--wants_to_rent) |
| **Cabins** | `transactionType: "for_sell"` + `type: "hytte"` | For Sale, unchanged |
| **Land Plot** | `transactionType: "for_sell"` + `type: "tomter"` | For Sale, minus three building fields |

Anything else — a missing `transactionType`, `for_sell` misspelled, `give_away`, `wants_to_buy` —
is a `400` on `transactionType`.

Each form validates against **its own schema only**. Fields belonging to another one are stripped:
send `deposit` on a For Sale listing or `ownershipType` on a rental and they are silently dropped,
never stored, never returned. Build three separate forms rather than one with hidden sections.

---

## Conventions

### Base URL and auth

```
/api/v1
Authorization: Bearer <accessToken>
```

Public (no token): `GET /categories/public`, `GET /products/public`, `GET /products/public/:id`,
`GET /filters/options`, `GET /listing-packages`, `GET /products/boost-plans`. Everything else
needs a token; sending one to the public endpoints also fills in `isFavorite` / `isReported`.

### Envelope

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product created successfully",
  "data": {},
  "requestId": "b3f1c2a4-d5e6-4f70-8091-a2b3c4d5e6f7"
}
```

Errors carry `errorCode`, and validation errors add `errors[]`:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Year built is required unless the property type is a land plot",
  "errorCode": "VALIDATION_ERROR",
  "errors": [{ "field": "yearBuilt", "message": "Year built is required unless the property type is a land plot" }],
  "requestId": "b3f1c2a4-d5e6-4f70-8091-a2b3c4d5e6f7"
}
```

`field` is a dot path — `location.address`, `viewings.0.fromTime`, `facilities.2`. Map it straight
onto your form.

Paginated endpoints nest rows and page info inside `data`:

```json
{ "data": { "rows": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } } }
```

### Media URLs

Images and PDFs come back as **relative** paths — `/uploads/products/9f1c2d3e.jpg`. Prefix them
with the API origin before rendering or linking.

### Currency

NOK only. `currency` may be omitted (defaults to `"NOK"`); anything else is
`Only NOK is supported.`

---

## The integration flow

A listing consumes a **paid slot**, and a new listing is not public until an admin approves it.

```
1. GET  /categories/public                    -> find slug "property", keep its id
2. GET  /listing-packages?category=<id>       -> the packages for Property
3. POST /listing-purchases { packageId }      -> 201 purchase, or 200 { checkoutUrl } to pay first
4. GET  /listing-purchases/active             -> the purchase id to spend
5. POST /products  (multipart: data + images) -> 201, status "draft"
6. (admin approves)                           -> status "active", listingExpiresAt set
7. GET  /products/public?category=<id>        -> the listing is now in the feed
```

| Paying for the slot | What to send |
| --- | --- |
| **Per-use purchase** | `purchaseId` in the listing body — the normal path |
| **Store subscription** | `storeId` and no `purchaseId`, when the user's store has an active subscription for Property |

Validation runs **before** a slot is consumed, so a rejected listing never costs the user a slot.
Given how many required fields the For Sale form has, that matters: a half-filled form is free to
retry.

---

## Endpoint index

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/categories/public` | – | Resolve the Property category id |
| `GET` | `/listing-packages?category=<id>` | – | Packages available for Property |
| `POST` | `/listing-purchases` | ✔ | Buy a package |
| `GET` | `/listing-purchases/active` | ✔ | Purchases with slots left |
| `POST` | `/products` | ✔ | **Create a property listing** |
| `PATCH` | `/products/:id` | ✔ | **Edit a listing** (full body) |
| `DELETE` | `/products/:id` | ✔ | Soft-delete a listing |
| `GET` | `/products/public` | – | Browse / search / filter |
| `GET` | `/products/public/:id` | – | Listing detail |
| `GET` | `/filters/options?category=property` | – | Filter sheet definition |
| `GET` | `/products/my` | ✔ | The user's own listings |
| `GET` | `/products/favorites` | ✔ | Favourited listings |
| `POST` | `/products/:id/favorite` | ✔ | Toggle favourite |
| `POST` | `/products/:id/mark-sold` | ✔ | Mark sold |
| `POST` | `/products/:id/promote` | ✔ | Boost a listing |
| `POST` | `/products/:id/report` | ✔ | Report a listing |

---

## Step 1 — Resolve the Property category id

```http
GET /api/v1/categories/public
```

Match on `slug === "property"` and keep the `id`. Never hard-code it — it is a database id.

```json
{
  "data": {
    "rows": [
      {
        "id": "68b3f1c2a4d5e6f708091a30",
        "title": "Property",
        "slug": "property",
        "thumbnail": "/uploads/categories/property.png",
        "sortOrder": 1
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 11, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
  }
}
```

The `slug` is also what tells you to render **this** form rather than the SellX one.

---

## Step 2 — Buy a listing slot

Identical to every other category — see [`sellx.md`](./sellx.md#step-2--buy-a-listing-slot) for
the full walk-through. In brief:

```http
GET  /api/v1/listing-packages?category=68b3f1c2a4d5e6f708091a30
POST /api/v1/listing-purchases        { "packageId": "…" }
GET  /api/v1/listing-purchases/active
```

`POST /listing-purchases` returns either `201` with the purchase (free package) or `200` with
`{ "checkoutUrl": "https://checkout.stripe.com/…" }` — branch on the status code. Offer only
purchases whose `packageSnapshot.category` is the Property id and whose `listingsRemaining > 0`;
use the purchase's `id` as `purchaseId`.

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
| `images` | ✔ (except Wanted to Rent) | 1–10 files. `image/jpeg`, `image/png`, `image/webp`, `image/gif`. 5 MB each. SVG rejected. |
| `documents` | – | 0–5 files, `application/pdf` only, 5 MB each. **Property is the category this exists for** — the valuation report, the prospectus. |

The body goes in `data` as JSON, not as flat form fields: `location`, `viewings`, `facilities`,
`privacy` and `contacts` are nested and would not survive otherwise. 15 files total across both
file fields.

Images are **optional on the Wanted to Rent form only** — a tenant describing what they are
looking for has nothing to photograph. Every other form returns
`400 "At least one image is required"` without one.

### Fields on every property form

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Property category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `transactionType` | enum | ✔ | `for_sell` \| `for_rent` \| `wants_to_rent`. No default. |
| `title` | string | ✔ | Trimmed, 2–120 |
| `description` | string | – | Trimmed, 5–5000. The property description. |
| `price` | number | ✔ | Meaning depends on the form — see each one |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` — `address` min 2, coordinates required |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` — **this is where the phone number goes** |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }`, default `false` |
| `videoLink` | URL string | – | Absolute URL, e.g. the YouTube embed |
| `quantity` | integer | – | 0–10 000. Rarely used on property. |

`location` has no separate postal-code or street field: the whole address is the one `address`
string, plus `city`, `country` and the coordinates. Geocode before submitting — `latitude` and
`longitude` are required and drive the map and "near me" filters.

Anything not listed for the chosen form is **stripped silently**: other-form fields, other
categories' fields, and the server-owned `totalPrice`, `showingDate`, `status`, `media`,
`documents`, `promotion`, `viewCount`.

### Numbers

Every money, area and count field takes a JSON number, or a string that is nothing but digits
(money and areas allow at most two decimals; counts must be whole).

| Sent | Result |
| --- | --- |
| `3400`, `"3400"`, `78.5`, `"78.5"` | Accepted |
| `""`, `"  "`, `null`, `[]`, `true` | `400` — **not** read as 0 |
| `"1.500"`, `"1 500"`, `"1,500"` | `400` — strip thousands separators client-side |
| `78.999` | `400` — at most two decimals |
| `2.5` on `bedrooms` | `400` — counts must be whole |
| negative, or above the cap | `400` — money caps at 1 000 000 000 NOK, areas at 10 000 000 m², counts at 10 000 |

This matters most on the financial block: `sharedDebt` and `additionalCosts` feed the
auto-calculated `totalPrice`, so a blank input used to understate the advertised total. Never
submit a numeric input empty — send `0` when the user means zero.

---

### For Sale — `for_sell`

Also the form behind **Cabins** and **Land Plot**.

**Basic information**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `transactionType` | literal | ✔ | `"for_sell"` |
| `title` | string | ✔ | Listing title, 2–120 |
| `location` | object | ✔ | Address + coordinates |
| `accessDescription` | string | – | Max 2000 |
| `locationDescription` | string | – | Max 2000 |
| `neighborhood` | string | – | Max 120 |
| `type` | enum | ✔ | [Property type](#property-type) — 9 values |
| `ownershipType` | enum | ✔ | [Ownership type](#ownership-type) — 5 values |

**Official identification numbers**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `municipalityNumber` | string | ✔ | 1–10 chars, e.g. `"0301"` (kommunenummer) |
| `farmNumber` | string | ✔ | 1–10 chars (gårdsnummer) |
| `usageNumber` | string | ✔ | 1–10 chars (bruksnummer) |
| `sectionNumber` | string | – | Max 10 (seksjonsnummer) |
| `leaseholdNumber` | string | – | Max 10 (festenummer) |
| `apartmentNumber` | string | – | `H`, `L`, `U` or `K` + exactly four digits, e.g. `"H0201"`. Lower case is accepted and upper-cased server-side. |

**Area** — all in m²

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `usableArea` | number | ✔ * | Bruksareal, from the valuation report |
| `internalArea` | number | – | Inside the unit |
| `externalArea` | number | – | Storage rooms and the like outside the unit |
| `balconyArea` | number | – | Terraces, balconies, open patios |
| `primaryRoomArea` | number | – | Primary rooms only |
| `groundArea` | number | – | The building's footprint |
| `areaDescription` | string | – | Max 2000 |

**Construction**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `yearBuilt` | integer | ✔ * | 1900 – next year |
| `renovatedYear` | integer | – | Same range |
| `energyRating` | enum | – | `A`–`G` |
| `heatingRating` | enum | – | [Heating rating](#heating-rating) — 5 colours |

**Rooms and facilities**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `bedrooms` | integer | ✔ * | |
| `totalRooms` | integer | – | Excluding storage and garages |
| `floorLevel` | enum | – | [Floor level](#floor-level) — a **string**, `"kjeller"`, `"1"`…`"8"`, `"over_8"` |
| `facilities` | string[] | – | [Facilities](#facilities) — the 24 form values. Defaults to `[]`. |

\* `usableArea`, `yearBuilt` and `bedrooms` are required on every choice **except Land Plot** —
see [Cabins and Land Plot](#cabins-and-land-plot).

**Land**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `plotSize` | number | – | m² |
| `leaseTerm` | string | – | Max 200 |
| `leaseFee` | number | – | NOK |
| `plotCharacteristics` | string | – | Max 2000 |

**Financial** — `price` is the listing price

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `price` | number | ✔ | The listing price (minimum selling price) |
| `commonExpenses` | number | ✔ | Shared costs per month |
| `sharedCostsInclude` | string | ✔ | 1–2000, what the shared costs cover |
| `sharedCostsAfterInterestFree` | number | – | Estimate when shared debt applies |
| `propertyTaxValue` | number | ✔ | Ligningsverdi |
| `additionalCosts` | number | ✔ | **Send `0` if there are none** |
| `additionalCostsInclude` | string | ✔ | 1–2000 |
| `sharedDebt` | number | ✔ | **Send `0` if there is none** |
| `appraisalValue` | number | – | |
| `loanValue` | number | – | |
| `sharedEquity` | number | – | |
| `annualMunicipalFees` | number | – | |
| `annualPropertyTax` | number | – | |
| `debtAndCostsInfo` | string | – | Max 2000 |
| `rightOfFirstRefusal` | string | – | Max 1000 |

`totalPrice` is **computed by the server** as `price + sharedDebt + additionalCosts`. Do not send
it — it is stripped. Display the value the response returns.

**Additional details and viewings**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `description` | string | – | 5–5000 |
| `videoLink` | URL | – | YouTube link |
| `virtualTourLink` | URL | – | Matterport, H5\|Property, Diakrit … |
| `viewings` | array | – | `[{ "date": "2026-09-14", "fromTime": "17:00", "toTime": "18:00" }]` — several slots allowed |
| `contacts` | array | – | The phone number for buyers |

`viewings[].date` is any ISO-parseable date; `fromTime` and `toTime` must match `HH:MM` (24-hour)
and are optional. The server copies the **first** slot's date to a `showingDate` field so the
showing-date filter keeps working — that field is derived, never sent.

**Attach a PDF** through the `documents` multipart part, not the JSON body.

#### Example

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a30",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "transactionType": "for_sell",
    "title": "Bright 3-room apartment with balcony",
    "location": {
      "address": "Torshovgata 12",
      "city": "Oslo",
      "country": "Norge",
      "latitude": 59.9352,
      "longitude": 10.7658
    },
    "accessDescription": "Lift from the garage to the fourth floor.",
    "locationDescription": "Quiet side street two minutes from Torshov park.",
    "neighborhood": "Torshov",
    "type": "leilighet",
    "ownershipType": "eier_selveier",
    "municipalityNumber": "0301",
    "farmNumber": "224",
    "usageNumber": "145",
    "sectionNumber": "12",
    "apartmentNumber": "H0401",
    "usableArea": 78,
    "internalArea": 74,
    "externalArea": 4,
    "balconyArea": 9,
    "primaryRoomArea": 71,
    "areaDescription": "Living room 28 m2, two bedrooms of 12 and 9 m2.",
    "yearBuilt": 2004,
    "renovatedYear": 2019,
    "energyRating": "C",
    "heatingRating": "lysegronn",
    "bedrooms": 2,
    "totalRooms": 4,
    "floorLevel": "4",
    "facilities": ["heis", "balkong_terrasse", "bredband", "parkett"],
    "plotSize": 0,
    "price": 6500000,
    "commonExpenses": 3400,
    "sharedCostsInclude": "Heating, cable TV and building insurance.",
    "propertyTaxValue": 2400000,
    "additionalCosts": 165000,
    "additionalCostsInclude": "Document duty and registration fees.",
    "sharedDebt": 250000,
    "appraisalValue": 6700000,
    "description": "Bright corner apartment with a balcony facing south-west.",
    "videoLink": "https://youtu.be/abcdefgh",
    "virtualTourLink": "https://my.matterport.com/show/?m=abcdefgh",
    "viewings": [
      { "date": "2026-09-14", "fromTime": "17:00", "toTime": "18:00" },
      { "date": "2026-09-16", "fromTime": "12:00", "toTime": "13:00" }
    ],
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }],
    "privacy": { "hideName": false, "hideProfile": false, "hidePhone": false }
  }' \
  -F "images=@living-room.jpg" \
  -F "images=@kitchen.jpg" \
  -F "documents=@valuation-report.pdf"
```

---

### Cabins and Land Plot

Both are the For Sale form with `type` pinned by the choice the user made.

**Cabins** — `transactionType: "for_sell"` + `type: "hytte"`. Nothing else changes: same fields,
same required list. *Akkurat samme som for salg.*

**Land Plot** — `transactionType: "for_sell"` + `type: "tomter"`. Bare ground has no build year
and no bedrooms, so three fields drop out of the required list:

| Field | On Land Plot | On every other For Sale choice |
| --- | --- | --- |
| `usableArea` | Optional | **Required** |
| `yearBuilt` | Optional | **Required** |
| `bedrooms` | Optional | **Required** |

Hide those three inputs when the user picks Land Plot. Everything else — `ownershipType`, the
three identification numbers, and the whole financial block — is still required. Omitting one of
the three on any other choice returns, for example:

```json
{ "field": "yearBuilt", "message": "Year built is required unless the property type is a land plot" }
```

---

### For Rent — `for_rent`

`price` is the **monthly rent**.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `transactionType` | literal | ✔ | `"for_rent"` |
| `title` | string | ✔ | Ad title, 2–120 |
| `location` | object | ✔ | Address + coordinates |
| `type` | enum | – | [Property type](#property-type) |
| `primaryRoomArea` | number | ✔ | m², primary rooms only |
| `internalArea` | number | – | m² |
| `externalArea` | number | – | m² |
| `balconyArea` | number | – | m² |
| `bedrooms` | integer | ✔ | |
| `furnishing` | enum | – | [Furnishing](#furnishing) — 3 values |
| `price` | number | ✔ | Monthly rent |
| `deposit` | number | – | NOK |
| `rentIncludes` | string | – | Max 1000, e.g. electricity, internet |
| `rentalPeriodStart` | date | – | ISO date |
| `rentalPeriodEnd` | date | – | ISO date, **must be after** `rentalPeriodStart` |
| `description` | string | – | 5–5000 |
| `viewings` | array | – | Same shape as For Sale |
| `additionalRemarks` | string | – | Max 2000 |
| `contacts` | array | – | The phone number for tenants |

An end date on or before the start date returns
`{ "field": "rentalPeriodEnd", "message": "Rental period end must be after the start date" }`.

The For Sale blocks — identification numbers, the financial block, facilities, `virtualTourLink`,
land details — are **not** on this form and are stripped if sent.

```json
{
  "category": "68b3f1c2a4d5e6f708091a30",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "transactionType": "for_rent",
  "title": "Furnished two-room flat, Grünerløkka",
  "location": { "address": "Thorvald Meyers gate 40", "city": "Oslo", "country": "Norge", "latitude": 59.9227, "longitude": 10.7594 },
  "type": "leilighet",
  "primaryRoomArea": 48,
  "balconyArea": 6,
  "bedrooms": 1,
  "furnishing": "mobelert",
  "price": 16500,
  "deposit": 49500,
  "rentIncludes": "Electricity, internet and shared laundry.",
  "rentalPeriodStart": "2026-10-01",
  "rentalPeriodEnd": "2027-09-30",
  "description": "Bright flat one block from the river, available from October.",
  "viewings": [{ "date": "2026-09-20", "fromTime": "16:00", "toTime": "17:00" }],
  "additionalRemarks": "No pets, non-smoking.",
  "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
}
```

---

### Wanted to Rent — `wants_to_rent`

The tenant's own ad. `price` is the **maximum** monthly rent they will pay.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `transactionType` | literal | ✔ | `"wants_to_rent"` |
| `title` | string | ✔ | Ad title, 2–120 |
| `location` | object | ✔ | Address + coordinates |
| `preferredArea` | enum | – | [Rental areas](#rental-areas) — 20 values |
| `preferredPropertyType` | enum | – | [Preferred property type](#preferred-property-type) — 8 values |
| `numberOfTenants` | integer | – | ≥ 1 |
| `furnishing` | enum | – | [Furnishing](#furnishing) |
| `moveInDate` | date | – | Desired move-in date |
| `price` | number | ✔ | Maximum monthly rent |
| `description` | string | – | 5–5000. A short introduction — tell users **not** to put an email or phone number here. |
| `contacts` | array | – | The phone number belongs here instead |

**Images are optional on this form.** It is the only one where a create with no `images` part
succeeds.

The property measurements are **not** part of this form — `type`, `internalArea`, `externalArea`,
`balconyArea`, `primaryRoomArea`, `bedrooms` and `viewings` are all stripped. The ad describes the
tenant, not a property.

```json
{
  "category": "68b3f1c2a4d5e6f708091a30",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "transactionType": "wants_to_rent",
  "title": "Nurse seeks a quiet one-bedroom",
  "location": { "address": "Trondheim", "city": "Trondheim", "country": "Norge", "latitude": 63.4305, "longitude": 10.3951 },
  "preferredArea": "trondheim",
  "preferredPropertyType": "leilighet",
  "numberOfTenants": 1,
  "furnishing": "delvis_mobelert",
  "moveInDate": "2026-11-01",
  "price": 14000,
  "description": "Nurse at St. Olavs, quiet and tidy, non-smoker, no pets. Looking for a long-term let close to the hospital.",
  "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
}
```

---

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema. `transactionType: Invalid input` means the discriminator is missing or not one of the three. |
| `400` | `At least one image is required` | No `images` part — on every form except Wanted to Rent |
| `400` | `Category is required` / `CATEGORY_REQUIRED` | `category` missing from `data` |
| `404` | `Category not found` / `CATEGORY_NOT_FOUND` | Unknown category id |
| `400` | `A listing purchase or active subscription is required to create a product` | No `purchaseId`, no covering subscription |
| `404` | `Listing purchase not found` | Unknown `purchaseId` |
| `403` | `This listing purchase does not belong to you` | Someone else's purchase |
| `400` | `All listing slots in this purchase have been used` | Purchase exhausted |
| `400` | `This listing purchase has expired` | Past `expiresAt` |
| `400` | `This purchase is for category "…" but you are listing in a different category` | Package bought for another category |
| `400` | `Product category must match store category` | `storeId` from another category |
| `400` | `FILE_TOO_LARGE` | A file over 5 MB |
| `400` | `INVALID_FILE` | Wrong MIME type (a non-PDF on `documents`, an SVG on `images`), or too many files |
| `401` | `UNAUTHORIZED` | Missing or expired token |

---

## Step 4 — Approval and visibility

A new listing is created with `status: "draft"`. `GET /products/public` only returns
`status: "active"`, so it is **not in the feed yet**. An admin approves it, which flips the status
and stamps `listingExpiresAt` from the package's `durationHours`.

| `status` | Meaning | In the public feed |
| --- | --- | --- |
| `draft` | Awaiting admin approval | No |
| `active` | Live | Yes |
| `sold` | Marked sold by the owner | No |
| `expired` | Past `listingExpiresAt` | No |
| `removed` | Soft-deleted by the owner | No |
| `rejected` | Rejected by an admin (`rejectionReason` set) | No |

Show the owner their `draft` listings in "My listings" with a pending badge — a property form
takes a long time to fill in, and silence after submitting reads as failure.

---

## Editing a listing

```http
PATCH /api/v1/products/:id
```

`PATCH` by name, **full replace** in practice: the body is validated with the same schema as
`POST`, so every required field for the form must be present. Submit the complete listing.

| Behaviour | Detail |
| --- | --- |
| `transactionType` | Required again — the discriminator picks the schema on every write |
| `category` | Optional; taken from the stored listing |
| `purchaseId` | Not needed; no new slot is consumed |
| `images` | Optional. Sending the part **replaces the whole set** and deletes the old files. Omit to keep them. |
| `documents` | Same — sending the part replaces the set |
| Ownership | `403 You can only update your own product` |
| Category change | `400 Cannot change category on a listing with a listing purchase` |

There is no endpoint to remove a single image or PDF; re-upload the set you want to keep.

---

## Deleting a listing

```http
DELETE /api/v1/products/:id
```

Soft delete — `status` becomes `removed`, the listing leaves every feed, `data` is `null`.
`403` for a listing the user does not own.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=68b3f1c2a4d5e6f708091a30&page=1&limit=20
```

Shared parameters — `page`, `limit`, `sort`, `search`, `category`, `city`, `near`, `radius`,
`userId`, `filter`, `minPrice`, `maxPrice` — behave exactly as in
[`sellx.md`](./sellx.md#browsing-and-searching). Property adds:

| Param | Type | Matches |
| --- | --- | --- |
| `transactionType` | string | Exact — `for_sell`, `for_rent`, `wants_to_rent`. **The only way to separate sales from rentals.** |
| `type` | string | Exact property type |
| `ownershipType` | string | Exact |
| `energyRating` | string | Exact, `A`–`G` |
| `floorLevel` | string | Exact |
| `facilities` | comma-separated | **AND** semantics — `facilities=heis,balkong_terrasse` returns listings with *both* |
| `showingDate` | ISO date | Listings whose first viewing is on or after this date |
| `minUsableArea` / `maxUsableArea` | number | m² range |
| `minBedrooms` / `maxBedrooms` | integer | range |
| `minYearBuilt` / `maxYearBuilt` | integer | range |
| `minPlotSize` / `maxPlotSize` | number | m² range |
| `minCommonExpenses` / `maxCommonExpenses` | number | NOK range |

Sort keys for Property: the shared `relevance` (default in the sheet), `-createdAt`, `createdAt`,
`price`, `-price`, `nearest`, plus `usableArea` (area low→high) and `-usableArea` (high→low).

---

## Filter sheet

Render the filter UI from the server rather than hard-coding it.

```http
GET /api/v1/filters/options?category=property
```

`data.filters` is fourteen fields, in order:

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `city` | `location` | Area / Område | `city=<name>` |
| `near` | `map` | Area on map / Område i kart | `near=lat,lng` **and** `radius=<km>` |
| `price` | `range` | Total price / Totalpris | `minPrice` / `maxPrice` |
| `commonExpenses` | `range` | Common expenses per month / Fellesutgifter per måned | `minCommonExpenses` / `maxCommonExpenses` |
| `usableArea` | `range` | Size / Størrelse | `minUsableArea` / `maxUsableArea` |
| `bedrooms` | `range` | Bedrooms / Antall soverom | `minBedrooms` / `maxBedrooms` |
| `yearBuilt` | `range` | Year built / Byggeår | `minYearBuilt` / `maxYearBuilt` |
| `type` | `single_select` | Property type / Boligtype | `type=<value>` |
| `ownershipType` | `single_select` | Ownership type / Eieform | `ownershipType=<value>` |
| `facilities` | `multi_select` | Facilities / Fasiliteter | `facilities=a,b` (AND) |
| `showingDate` | `date` | Showing date / Visningsdato | `showingDate=<ISO date>` |
| `floorLevel` | `single_select` | Floor / Etasje | `floorLevel=<value>` |
| `energyRating` | `single_select` | Energy rating / Energikarakter | `energyRating=A…G` |
| `plotSize` | `range` | Plot size / Tomtestørrelse | `minPlotSize` / `maxPlotSize` |

Every `range` key maps to a `min…`/`max…` pair, not to the key itself. Two mismatches to know
about:

- The `price` filter is **labelled** "Total price" but filters the stored `price` (the listing
  price), not the computed `totalPrice`.
- The sheet's `type` list has **10** values and its `facilities` list has **10**; the listing form
  accepts 9 types and 24 facilities. See [Value reference](#value-reference) for which is which.

The sheet carries **no `transactionType` filter**, so sales, rentals and wanted ads are mixed in
one feed by default. Send `transactionType` yourself to split them — that is almost always what a
property screen wants.

---

## Value reference

### Property type

`type` — the **9 values the listing form accepts**:

| Value | English | Norsk |
| --- | --- | --- |
| `leilighet` | Apartment | Leilighet |
| `enebolig` | Detached house | Enebolig |
| `rekkehus` | Townhouse | Rekkehus |
| `tomannsbolig` | Semi-detached / Duplex | Tomannsbolig |
| `gaardsbruk_smaabruk` | Farm / Smallholding | Gårdsbruk/Småbruk |
| `garasje_parkering` | Garage / Parking | Garasje/Parkering |
| `hytte` | Cabin — the **Cabins** choice | Hytte |
| `tomter` | Land plot — the **Land Plot** choice | Tomter |
| `andre` | Other | Andre |

The filter sheet additionally offers `bygaard_flermannsbolig` (Multi-dwelling) and
`produksjon_industri` (Production/Industry). **No form accepts them** — they return a `400` on
create — so filtering by either returns an empty list. Drop them from the listing picker; keeping
them in the filter is harmless.

### Ownership type

`ownershipType` — 5 values, For Sale only.

| Value | English | Norsk |
| --- | --- | --- |
| `aksje` | Stock / Share | Aksje |
| `andel` | Co-op share | Andel |
| `eier_selveier` | Owner / Freehold | Eier (Selveier) |
| `obligasjon` | Bond | Obligasjon |
| `andre` | Other | Andre |

### Energy rating

`energyRating` — `A`, `B`, `C`, `D`, `E`, `F`, `G`. `A` is the most efficient.

### Heating rating

`heatingRating` — the share of fossil fuel and electricity used for heating.

| Value | English | Norsk |
| --- | --- | --- |
| `morkegronn` | Dark green — under 30 % | Mørkegrønn |
| `lysegronn` | Light green | Lysegrønn |
| `gul` | Yellow | Gul |
| `oransje` | Orange | Oransje |
| `rod` | Red — over 82.5 % | Rød |

### Floor level

`floorLevel` — a **string**, not a number. `5` returns a `400`; `"5"` is correct.

`kjeller` (basement), `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6"`, `"7"`, `"8"`, `over_8`.

### Furnishing

`furnishing` — For Rent and Wanted to Rent.

| Value | English | Norsk |
| --- | --- | --- |
| `mobelert` | Furnished | Møblert |
| `delvis_mobelert` | Partially furnished | Delvis møblert |
| `umobelert` | Unfurnished | Umøblert |

### Preferred property type

`preferredPropertyType` — Wanted to Rent only. 8 values, and **not** the same list as `type`.

| Value | English | Norsk |
| --- | --- | --- |
| `hybel` | Studio / bedsit | Hybel |
| `garasje_parkering` | Garage / Parking | Garasje/Parkering |
| `tomannsbolig` | Semi-detached | Tomannsbolig |
| `enebolig` | Detached house | Enebolig |
| `rom_i_bofellesskap` | Room in shared housing | Rom i bofellesskap |
| `rekkehus` | Townhouse | Rekkehus |
| `leilighet` | Apartment | Leilighet |
| `andre` | Other | Andre |

### Rental areas

`preferredArea` — Wanted to Rent only. 20 values, mixed regions and cities, sent lower-case with
Norwegian characters transliterated.

| Value | Label | | Value | Label |
| --- | --- | --- | --- | --- |
| `agder` | Agder | | `oslo` | Oslo |
| `akershus` | Akershus | | `rogaland` | Rogaland |
| `bergen` | Bergen | | `stavanger` | Stavanger |
| `buskerud` | Buskerud | | `svalbard` | Svalbard |
| `finnmark` | Finnmark | | `telemark` | Telemark |
| `innlandet` | Innlandet | | `troms` | Troms |
| `kristiansand` | Kristiansand | | `trondelag` | Trøndelag |
| `more_og_romsdal` | Møre og Romsdal | | `trondheim` | Trondheim |
| `nordland` | Nordland | | `vestfold` | Vestfold |
| | | | `vestland` | Vestland |
| | | | `ostfold` | Østfold |

`"Oslo"` with a capital O is a `400` — send the value, render the label.

### Facilities

`facilities` — For Sale only. The **24 checkbox values the form accepts**:

| Value | English | Norsk |
| --- | --- | --- |
| `klimaanlegg` | Air conditioning | Klimaanlegg |
| `takterrasse` | Rooftop terrace | Takterrasse |
| `felles_vaskeri` | Shared laundry | Felles vaskeri |
| `ingen_gjenboere` | No overlooking neighbours | Ingen gjenboere |
| `moderne` | Modern | Moderne |
| `peis_ildsted` | Fireplace | Peis/Ildsted |
| `utsikt` | Scenic view | Utsikt |
| `fiskemuligheter` | Fishing spot | Fiskemuligheter |
| `alarm` | Alarm system | Alarm |
| `balkong_terrasse` | Balcony / Terrace | Balkong/terrasse |
| `barnevennlig` | Child-friendly | Barnevennlig |
| `bredband` | High-speed internet | Bredbånd |
| `garasje_parkeringsplass` | Parking / Garage | Garasje/Parkeringsplass |
| `heis` | Elevator | Heis |
| `kabel_tv` | Cable TV | Kabel-TV |
| `lademulighet` | EV charging | Lademulighet |
| `offentlig_vann_kloakk` | Public water / sewage | Offentlig vann/kloakk |
| `parkett` | Hardwood floors | Parkett |
| `rolig` | Quiet area | Rolig område |
| `sentralt` | Central location | Sentralt |
| `vaktmester` | Security service / caretaker | Vaktmester |
| `badeplass` | Swimming spot | Badeplass |
| `strandlinje` | Beachfront | Strandlinje |
| `turterreng` | Hiking trails | Turterreng |

Note `garasje_parkeringsplass` (facility) is **not** `garasje_parkering` (property type) — the
values differ by a suffix.

The **filter sheet offers only the first 10 of these by storage value** —
`balkong_terrasse`, `garasje_parkeringsplass`, `heis`, `lademulighet`, `peis_ildsted`,
`strandlinje`, `turterreng`, `utsikt`, `vaktmester`, `ingen_gjenboere`. The other 14 are stored
and returned but have no filter chip. The `facilities` query parameter itself accepts any stored
value, so you can filter by one of the 14 if you build the control yourself.

---

## Response object reference

Property listings return the shared listing object (see
[`sellx.md`](./sellx.md#response-object-reference)) plus whichever form fields were stored. The
property-specific additions:

| Field | Type | Notes |
| --- | --- | --- |
| `type`, `ownershipType`, `energyRating`, `heatingRating`, `floorLevel` | `string` | Omitted when unset |
| `municipalityNumber`, `farmNumber`, `usageNumber`, `sectionNumber`, `leaseholdNumber`, `apartmentNumber` | `string` | |
| `usableArea`, `internalArea`, `externalArea`, `balconyArea`, `primaryRoomArea`, `groundArea`, `plotSize` | `number` | m² |
| `yearBuilt`, `renovatedYear`, `bedrooms`, `totalRooms` | `number` | |
| `facilities` | `string[]` | `[]` when none |
| `commonExpenses`, `propertyTaxValue`, `additionalCosts`, `sharedDebt`, `appraisalValue`, `loanValue`, `sharedEquity`, `annualMunicipalFees`, `annualPropertyTax`, `leaseFee`, `deposit` | `number` | NOK |
| `totalPrice` | `number` | **Server-computed**: `price + sharedDebt + additionalCosts` |
| `viewings` | `{ date, fromTime?, toTime? }[]` | `[]` when none |
| `showingDate` | `string` | **Server-derived** from the first viewing slot |
| `documents` | `{ url, publicId, name, mimeType, size }[]` | The uploaded PDFs. `url` is relative. |
| `virtualTourLink`, `videoLink` | `string` | |
| `furnishing`, `rentIncludes`, `rentalPeriodStart`, `rentalPeriodEnd`, `additionalRemarks` | mixed | Rentals only |
| `preferredArea`, `preferredPropertyType`, `numberOfTenants`, `moveInDate` | mixed | Wanted ads only |

Unset optional fields are **omitted entirely** — `undefined`, not `null`. Code defensively.

---

## Errors

| Status | `errorCode` | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body or query failed the schema. Carries `errors[]`. |
| `400` | `INVALID_ID` | Malformed ObjectId |
| `400` | `CATEGORY_REQUIRED` / `INVALID_CATEGORY_ID` / `CATEGORY_UNRESOLVED` | Category problems on create or update |
| `400` | `FILE_TOO_LARGE` / `INVALID_FILE` | Upload problems |
| `401` | `UNAUTHORIZED` | Missing, malformed or expired token |
| `403` | `FORBIDDEN` | Someone else's listing, or a blocked store |
| `404` | `NOT_FOUND` / `CATEGORY_NOT_FOUND` / `STORE_NOT_FOUND` | Unknown id |
| `408` | `REQUEST_TIMEOUT` | The client aborted the request |
| `409` | `CONFLICT` | Already reported, or not enough quantity |
| `429` | `RATE_LIMITED` | 120 req/min in production |
| `500` | `INTERNAL_ERROR` | Server fault — quote the `requestId` |

Because the For Sale form has 18 required fields, a first submit commonly returns several
`errors[]` at once. Render them all, not just `message`.

---

## TypeScript types

```ts
export const PROPERTY_TRANSACTION_TYPES = ['for_sell', 'for_rent', 'wants_to_rent'] as const;
export type PropertyTransactionType = (typeof PROPERTY_TRANSACTION_TYPES)[number];

export const PROPERTY_TYPES = [
  'leilighet', 'enebolig', 'rekkehus', 'tomannsbolig', 'gaardsbruk_smaabruk',
  'garasje_parkering', 'hytte', 'tomter', 'andre',
] as const;

export const OWNERSHIP_TYPES = ['aksje', 'andel', 'eier_selveier', 'obligasjon', 'andre'] as const;
export const ENERGY_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const HEATING_RATINGS = ['gul', 'lysegronn', 'morkegronn', 'oransje', 'rod'] as const;
export const FLOOR_LEVELS = ['kjeller', '1', '2', '3', '4', '5', '6', '7', '8', 'over_8'] as const;
export const FURNISHINGS = ['mobelert', 'delvis_mobelert', 'umobelert'] as const;

/** The choice the user makes first, and how it maps onto the wire. */
export type PropertyChoice = 'for_sale' | 'for_rent' | 'wanted_to_rent' | 'cabin' | 'land_plot';

export const CHOICE_TO_BODY: Record<PropertyChoice, { transactionType: PropertyTransactionType; type?: string }> = {
  for_sale: { transactionType: 'for_sell' },
  for_rent: { transactionType: 'for_rent' },
  wanted_to_rent: { transactionType: 'wants_to_rent' },
  cabin: { transactionType: 'for_sell', type: 'hytte' },
  land_plot: { transactionType: 'for_sell', type: 'tomter' },
};

interface PropertyBase {
  category: string;
  purchaseId?: string;
  storeId?: string;
  title: string;
  description?: string;
  price: number;
  currency?: 'NOK';
  location: { address: string; city?: string; country?: string; latitude: number; longitude: number };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
  videoLink?: string;
}

export interface PropertyForSaleInput extends PropertyBase {
  transactionType: 'for_sell';
  type: (typeof PROPERTY_TYPES)[number];
  ownershipType: (typeof OWNERSHIP_TYPES)[number];
  municipalityNumber: string;
  farmNumber: string;
  usageNumber: string;
  sectionNumber?: string;
  leaseholdNumber?: string;
  apartmentNumber?: string;
  accessDescription?: string;
  locationDescription?: string;
  neighborhood?: string;
  /** Required unless `type` is `tomter`. */
  usableArea?: number;
  /** Required unless `type` is `tomter`. */
  yearBuilt?: number;
  /** Required unless `type` is `tomter`. */
  bedrooms?: number;
  internalArea?: number;
  externalArea?: number;
  balconyArea?: number;
  primaryRoomArea?: number;
  groundArea?: number;
  areaDescription?: string;
  renovatedYear?: number;
  energyRating?: (typeof ENERGY_RATINGS)[number];
  heatingRating?: (typeof HEATING_RATINGS)[number];
  totalRooms?: number;
  floorLevel?: (typeof FLOOR_LEVELS)[number];
  facilities?: string[];
  plotSize?: number;
  leaseTerm?: string;
  leaseFee?: number;
  plotCharacteristics?: string;
  commonExpenses: number;
  sharedCostsInclude: string;
  sharedCostsAfterInterestFree?: number;
  propertyTaxValue: number;
  additionalCosts: number;
  additionalCostsInclude: string;
  sharedDebt: number;
  appraisalValue?: number;
  loanValue?: number;
  sharedEquity?: number;
  annualMunicipalFees?: number;
  annualPropertyTax?: number;
  debtAndCostsInfo?: string;
  rightOfFirstRefusal?: string;
  virtualTourLink?: string;
  viewings?: { date: string; fromTime?: string; toTime?: string }[];
}

export interface PropertyForRentInput extends PropertyBase {
  transactionType: 'for_rent';
  type?: (typeof PROPERTY_TYPES)[number];
  primaryRoomArea: number;
  bedrooms: number;
  internalArea?: number;
  externalArea?: number;
  balconyArea?: number;
  furnishing?: (typeof FURNISHINGS)[number];
  deposit?: number;
  rentIncludes?: string;
  rentalPeriodStart?: string;
  rentalPeriodEnd?: string;
  additionalRemarks?: string;
  viewings?: { date: string; fromTime?: string; toTime?: string }[];
}

export interface PropertyWantedToRentInput extends PropertyBase {
  transactionType: 'wants_to_rent';
  preferredArea?: string;
  preferredPropertyType?: string;
  numberOfTenants?: number;
  furnishing?: (typeof FURNISHINGS)[number];
  moveInDate?: string;
}

export type PropertyListingInput =
  | PropertyForSaleInput
  | PropertyForRentInput
  | PropertyWantedToRentInput;
```

A Zod schema mirroring the Land Plot rule:

```ts
const forSaleSchema = z
  .object({
    transactionType: z.literal('for_sell'),
    type: z.enum(PROPERTY_TYPES),
    usableArea: z.number().min(0).optional(),
    yearBuilt: z.number().int().min(1900).optional(),
    bedrooms: z.number().int().min(0).optional(),
    // …the rest of the required block
  })
  .superRefine((data, ctx) => {
    if (data.type === 'tomter') return;
    for (const field of ['usableArea', 'yearBuilt', 'bedrooms'] as const) {
      if (data[field] === undefined) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'Required unless the type is a land plot' });
      }
    }
  });
```

---

## Gotchas

1. **`transactionType` has no default and is required on `PATCH` too.** The discriminator picks
   the schema on every write, so an edit form that forgets it gets `transactionType: Invalid input`.
2. **Three forms, not one form with sections.** Fields from another form are stripped without an
   error, so a mis-tagged submit succeeds and silently loses half the data. Verify against the
   response, not the status code.
3. **Land Plot drops `usableArea`, `yearBuilt` and `bedrooms`; nothing else.** Cabins drop nothing.
4. **`floorLevel` is a string.** `5` is a `400`, `"5"` is correct, and the basement is `"kjeller"`.
5. **`totalPrice` and `showingDate` are server-derived.** Do not send them; read them back.
6. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the
   flattened `latitude` / `longitude`. The flattened pair used to be dropped; either works now.
7. **The "Total price" filter filters `price`.** The sheet's label says Totalpris; the query
   filters the stored listing price. Do not promise buyers it includes shared debt.
8. **No `transactionType` filter in the sheet.** Sales, rentals and wanted ads share one feed
   unless you send the parameter yourself.
9. **`facilities` filtering is AND, not OR.** `facilities=heis,utsikt` returns only listings with
   both.
10. **A new listing is `draft`.** It is not public until an admin approves it.
11. **Re-sending `images` or `documents` on `PATCH` deletes the old files.**
12. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero — send `0` when
    the user means zero, especially for `sharedDebt` and `additionalCosts`.
13. **`GET /products/public/:id` increments `viewCount`.** Do not use it to prefetch.

---

## Integration checklist

- [ ] Make the user pick one of the five choices **first**, and map it to `transactionType` (+ `type` for Cabins and Land Plot)
- [ ] Build three separate forms; do not share one body across them
- [ ] Resolve the Property `category` id from `GET /categories/public` by `slug`
- [ ] Gate the form behind an active listing purchase or a store subscription
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Wire `documents` for the valuation report — up to 5 PDFs, 5 MB each
- [ ] Make images optional on Wanted to Rent, required everywhere else
- [ ] For Sale: enforce all 18 required fields client-side so the first submit is not a wall of errors
- [ ] Hide `usableArea`, `yearBuilt` and `bedrooms` on the Land Plot choice
- [ ] Drop `bygaard_flermannsbolig` and `produksjon_industri` from the type picker
- [ ] Remove the property measurements from the Wanted to Rent form
- [ ] Send `floorLevel` as a string
- [ ] Send `0` — never `""` — for `sharedDebt` and `additionalCosts`
- [ ] Validate `apartmentNumber` as `H|L|U|K` + four digits before submitting
- [ ] Validate that `rentalPeriodEnd` is after `rentalPeriodStart`
- [ ] Support several `viewings` slots, each with `HH:MM` times
- [ ] Display `totalPrice` from the response; never compute or send it
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Read coordinates from `location.latitude` / `longitude`, or the GeoJSON `coordinates`
- [ ] Send `transactionType` on the browse screen to separate sales, rentals and wanted ads
- [ ] Map every entry of `errors[]` onto its field by the dot path

---

## Source

| Concern | File |
| --- | --- |
| Routes | `src/modules/products/product.routes.ts` |
| Category resolution + validation dispatch | `src/modules/products/product.middleware.ts` |
| Property body schemas | `src/modules/products/schemas/property.schema.ts` |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Facilities and rental areas | `src/modules/products/data/property-facilities.constants.ts`, `data/norwegian-areas.constants.ts` |
| Value lists | `src/modules/products/product.enum.ts` |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| Controller (image rule) | `src/modules/products/product.controller.ts` |
| `totalPrice` and `showingDate` | `src/modules/products/product.service.ts` (`applyDerivedFields`) |
| Response shaping | `src/modules/products/product.serializer.ts` |
| Uploads | `src/infrastructure/storage/multer.config.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` |
| Error envelope | `src/shared/middlewares/globalErrorHandler.ts` |
