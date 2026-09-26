# Car Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **vehicle**.

The Car category covers three very different vehicles behind one slug: a passenger car, a
motorhome (*bobil*) and a caravan (*campingvogn*). They are **three separate schemas**, chosen by
a `vehicleType` discriminator the user picks first, so read
[Pick the form first](#pick-the-form-first) before anything else.

The shared conventions — envelope, auth, pagination, media URLs, the listing-slot purchase — are
identical to [`sellx.md`](./sellx.md); they are summarised below so this page stands alone.

---

## Contents

- [Pick the form first](#pick-the-form-first)
- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Endpoint index](#endpoint-index)
- [Step 1 — Resolve the Car category id](#step-1--resolve-the-car-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
  - [Uploads](#uploads)
  - [Fields on every vehicle form](#fields-on-every-vehicle-form)
  - [Numbers](#numbers)
  - [Price and the re-registration fee](#price-and-the-re-registration-fee)
  - [Car — `personbil`](#car--personbil)
  - [Motorhome — `bobil`](#motorhome--bobil)
  - [Caravan — `campingvogn`](#caravan--campingvogn)
  - [Create errors](#create-errors)
- [Brands and models](#brands-and-models)
- [Step 4 — Approval and visibility](#step-4--approval-and-visibility)
- [Editing a listing](#editing-a-listing)
- [Browsing and searching](#browsing-and-searching)
- [Filter sheet](#filter-sheet)
- [Value reference](#value-reference)
- [Equipment](#equipment)
- [Response object reference](#response-object-reference)
- [Errors](#errors)
- [TypeScript types](#typescript-types)
- [Gotchas](#gotchas)
- [Integration checklist](#integration-checklist)
- [Source](#source)

---

## Pick the form first

`vehicleType` is the discriminator and has **no default**. The spec's four user-facing choices map
onto three schemas — "for sale" and "for rent" are the same car form with a different
`transactionType`:

| User picks | Send | Form |
| --- | --- | --- |
| **Car for sale** | `vehicleType: "personbil"` + `transactionType: "for_sell"` | [Car](#car--personbil) |
| **Car for rent** | `vehicleType: "personbil"` + `transactionType: "for_rent"` | [Car](#car--personbil), identical fields |
| **Bobil** (motorhome) | `vehicleType: "bobil"` | [Motorhome](#motorhome--bobil) |
| **Caravan** | `vehicleType: "campingvogn"` | [Caravan](#caravan--campingvogn) |

`transactionType` defaults to `for_sell` on all three and accepts only `for_sell` or `for_rent`.
A missing or unknown `vehicleType` is a `400` on `vehicleType`.

Each form validates against **its own schema only**. Fields belonging to another are stripped
without an error: send `sleepingPlaces` on a car, or `bodyColor` on a caravan, and they are
silently dropped. Build three forms.

---

## Conventions

### Base URL and auth

```
/api/v1
Authorization: Bearer <accessToken>
```

Public (no token): `GET /categories/public`, `GET /products/public`, `GET /products/public/:id`,
`GET /filters/options`, `GET /filters/models`, `GET /listing-packages`,
`GET /products/boost-plans`.

### Envelope

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {},
  "requestId": "b3f1c2a4-d5e6-4f70-8091-a2b3c4d5e6f7"
}
```

Validation failures carry `errorCode: "VALIDATION_ERROR"` and an `errors[]` array of
`{ field, message }`, where `field` is a dot path — `equipment.3`, `location.address`. Map it
straight onto your form.

Paginated endpoints nest rows and page info inside `data`:

```json
{ "data": { "rows": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false } } }
```

### Media URLs

Relative — `/uploads/products/9f1c2d3e.jpg`. Prefix with the API origin before rendering.

### Currency

NOK only. `currency` defaults to `"NOK"`; anything else is `Only NOK is supported.`

---

## The integration flow

```
1. GET  /categories/public                    -> find slug "car", keep its id
2. GET  /listing-packages?category=<id>       -> the packages for Car
3. POST /listing-purchases { packageId }      -> 201 purchase, or 200 { checkoutUrl } to pay first
4. GET  /listing-purchases/active             -> the purchase id to spend
5. POST /products  (multipart: data + images) -> 201, status "draft"
6. (admin approves)                           -> status "active", listingExpiresAt set
7. GET  /products/public?category=<id>        -> the listing is now in the feed
```

Validation runs **before** a slot is consumed, so a rejected listing never costs the user a slot.

---

## Endpoint index

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/categories/public` | – | Resolve the Car category id |
| `GET` | `/listing-packages?category=<id>` | – | Packages available for Car |
| `POST` | `/listing-purchases` | ✔ | Buy a package |
| `GET` | `/listing-purchases/active` | ✔ | Purchases with slots left |
| `POST` | `/products` | ✔ | **Create a vehicle listing** |
| `PATCH` | `/products/:id` | ✔ | **Edit a listing** (full body) |
| `DELETE` | `/products/:id` | ✔ | Soft-delete a listing |
| `GET` | `/products/public` | – | Browse / search / filter |
| `GET` | `/products/public/:id` | – | Listing detail |
| `GET` | `/filters/options?category=car` | – | Filter sheet definition |
| `GET` | `/filters/models?category=car&brand=<brand>` | – | **The models for a car brand** |
| `GET` | `/products/my` | ✔ | The user's own listings |
| `POST` | `/products/:id/favorite` | ✔ | Toggle favourite |
| `POST` | `/products/:id/mark-sold` | ✔ | Mark sold |
| `POST` | `/products/:id/promote` | ✔ | Boost a listing |
| `POST` | `/products/:id/report` | ✔ | Report a listing |

---

## Step 1 — Resolve the Car category id

```http
GET /api/v1/categories/public
```

Match on `slug === "car"` and cache the `id`. Never hard-code it.

---

## Step 2 — Buy a listing slot

Identical to every category — see [`sellx.md`](./sellx.md#step-2--buy-a-listing-slot). In brief:

```http
GET  /api/v1/listing-packages?category=<car id>
POST /api/v1/listing-purchases        { "packageId": "…" }
GET  /api/v1/listing-purchases/active
```

`POST /listing-purchases` returns `201` with the purchase (free package) or `200` with
`{ "checkoutUrl": "…" }` — branch on the status code. Use the purchase's `id` as `purchaseId`.

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
| `images` | ✔ | 1–10 files. `image/jpeg`, `image/png`, `image/webp`, `image/gif`. 5 MB each. SVG rejected. |
| `documents` | – | 0–5 PDFs, 5 MB each. Not part of the vehicle spec, but accepted. |

The body goes in `data` as JSON, not as flat form fields — `location`, `equipment`, `privacy` and
`contacts` are nested and would not survive otherwise.

### Fields on every vehicle form

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Car category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `vehicleType` | enum | ✔ | `personbil` \| `bobil` \| `campingvogn`. No default. |
| `transactionType` | enum | – | `for_sell` (default) or `for_rent` |
| `title` | string | ✔ | Trimmed, 2–120 |
| `description` | string | – | Trimmed, 5–5000 |
| `price` | number | ✔ | Sales price **excluding** re-registration |
| `reRegistrationFee` | number | ✔ * | NOK. \* Required unless `reRegistrationExempt` is `true`. |
| `reRegistrationExempt` | boolean | – | Defaults to `false` |
| `brand` | string | varies | A value from the brand list — see [Brands and models](#brands-and-models) |
| `carModel` | string | varies | The model |
| `vehicleLocation` | enum | – | `norge` \| `utlandet` — where the vehicle is parked |
| `mileage` | integer | varies | Kilometres, **not** miles. Required on the car form. |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` — **the phone number goes here** |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` |
| `videoLink` | URL string | – | YouTube or Vimeo |

`location` is the whole address in one `address` string plus `city`, `country` and the
coordinates — there is no separate postal-code or street field. Geocode before submitting;
`latitude` and `longitude` are required.

### Numbers

Every money, measurement and count field takes a JSON number, or a string that is nothing but
digits. Measurements allow at most two decimals; counts must be whole.

| Sent | Result |
| --- | --- |
| `84000`, `"84000"`, `2.3`, `"2.3"` | Accepted |
| `""`, `"  "`, `null`, `[]`, `true` | `400` — **not** read as 0 |
| `"1.500"`, `"1 500"` | `400` — strip thousands separators client-side |
| `84000.5` on `mileage` | `400` — counts must be whole |
| `0` on `weight`, `length`, `seats`, `sleepingPlaces` | `400` — those must be at least 1 |

Units are named in the error, e.g. `"Weight must be a number in kg, for example 1500 or 1500.50"`,
`"Mileage must be a whole number, for example 3"`.

### Price and the re-registration fee

Three fields work together:

| Field | Meaning |
| --- | --- |
| `price` | The sales price **excluding** the re-registration fee |
| `reRegistrationFee` | The fee in NOK |
| `reRegistrationExempt` | `true` when the listing is exempt |

Rule: `reRegistrationFee` is **required unless `reRegistrationExempt` is `true`**. Omitting it
without the flag returns
`{ "field": "reRegistrationFee", "message": "Re-registration fee is required unless the listing is exempt" }`.
Sending `""` is now a `400` too — it used to pass as a zero fee.

`totalPrice` is **computed by the server** as `price + (exempt ? 0 : reRegistrationFee)`. Never
send it; display the value the response returns.

---

### Car — `personbil`

Sale and rent share this form; only `transactionType` differs.

**General information**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `vehicleType` | literal | ✔ | `"personbil"` |
| `taxClass` | enum | ✔ | [Tax class](#tax-class) — 6 values |
| `registrationNumber` | string | – | Max 20 |
| `chassisNumber` | string | – | Max 40. On page one of the vehicle registration, or vegvesen.no. |
| `manufacturedYear` | integer | ✔ | Model year, 1900 – next year |
| `brand` | string | ✔ | One of the **117** car brands |
| `carModel` | string | ✔ | Must be a listed model **for that brand**, or `"Andre"` |
| `variant` | string | – | Max **70** — "520d xDrive", "1.6 EcoBoost" |
| `vehicleLocation` | enum | – | `norge` \| `utlandet` |
| `fuel` | enum | ✔ | [Fuel](#fuel) — 9 values |
| `horsepower` | integer | – | |
| `engineTuned` | boolean | – | Mechanically or electronically tuned |
| `transmission` | enum | ✔ | `manual` \| `automatic` — **`semi_automatic` is rejected here** |
| `transmissionDesignation` | string | – | Max 60 — "Steptronic", "4-MATIC" |
| `driveType` | enum | ✔ | [Drive type](#drive-type) — 3 values |
| `driveTypeDesignation` | string | – | Max 60 — "xDrive", "4MOTION" |

**Body and colour**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `bodyType` | enum | ✔ | [Body type](#body-type) — 11 values |
| `seats` | integer | ✔ | At least 1 |
| `doors` | integer | – | |
| `trunkVolume` | number | – | Litres |
| `weight` | number | – | Kilograms |
| `trailerWeight` | number | – | Kilograms, max trailer weight |
| `bodyColor` | string | ✔ | Free text, 1–60 — "Sort", "Hvit" |
| `colorDescription` | string | – | Max 120 — "Obsidian Black" |
| `interiorColor` | string | – | Max 120 — "Carbon Black" |

**Equipment**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `equipment` | string[] | – | The **61** car values — see [Equipment](#equipment). Defaults to `[]`. |

**Condition and warranty**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `mileage` | integer | ✔ | Kilometres. All digits — the body's total if the engine or dashboard was replaced. |
| `hasDamage` | boolean | – | Known defects, deficiencies or visible damage |
| `hasRepairs` | boolean | – | Major repairs made |
| `firstRegistered` | date | – | ISO date |
| `numberOfOwners` | integer | – | |
| `lastEuApprovedAt` | date | – | Last EU approval |
| `nextEuInspectionAt` | date | – | Next EU inspection deadline |
| `warrantyType` | enum | – | `nybilgaranti` \| `gammelbilgaranti_fra_forhandler` |
| `conditionReportProvider` | enum | – | `naf` \| `viking` |
| `maintenanceProgramFollowed` | boolean | – | |
| `hasLiens` | boolean | – | Liens or outstanding debt on the car |

**Price and contact** — `price`, `reRegistrationFee`, `reRegistrationExempt`, `videoLink`,
`description`, `contacts`, `location` as in [the shared fields](#fields-on-every-vehicle-form).

#### Example

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a40",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "vehicleType": "personbil",
    "transactionType": "for_sell",
    "title": "BMW 320d xDrive Touring",
    "taxClass": "personbil",
    "registrationNumber": "EL12345",
    "chassisNumber": "WBA8E91050K123456",
    "manufacturedYear": 2019,
    "brand": "BMW",
    "carModel": "3-serie",
    "variant": "320d xDrive Touring",
    "vehicleLocation": "norge",
    "fuel": "diesel",
    "horsepower": 190,
    "engineTuned": false,
    "transmission": "automatic",
    "transmissionDesignation": "Steptronic",
    "driveType": "firehjulsdrift",
    "driveTypeDesignation": "xDrive",
    "bodyType": "stasjonsvogn",
    "seats": 5,
    "doors": 5,
    "trunkVolume": 500,
    "weight": 1690,
    "trailerWeight": 1800,
    "bodyColor": "Sort",
    "colorDescription": "Obsidian Black metallic",
    "interiorColor": "Carbon Black",
    "equipment": ["abs_bremser", "klimaanlegg", "ryggekamera", "navigasjonssystem", "vinterhjul"],
    "mileage": 84000,
    "hasDamage": false,
    "hasRepairs": false,
    "firstRegistered": "2019-04-12",
    "numberOfOwners": 2,
    "lastEuApprovedAt": "2025-03-01",
    "nextEuInspectionAt": "2027-03-01",
    "warrantyType": "gammelbilgaranti_fra_forhandler",
    "conditionReportProvider": "naf",
    "maintenanceProgramFollowed": true,
    "hasLiens": false,
    "price": 349000,
    "reRegistrationFee": 6800,
    "reRegistrationExempt": false,
    "videoLink": "https://youtu.be/abcdefgh",
    "description": "Well kept estate, full service history at the dealer.",
    "location": { "address": "Storgata 1", "city": "Oslo", "country": "Norge", "latitude": 59.9139, "longitude": 10.7522 },
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
  }' \
  -F "images=@front.jpg" -F "images=@interior.jpg"
```

---

### Motorhome — `bobil`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `vehicleType` | literal | ✔ | `"bobil"` |
| `motorhomeType` | enum | – | [Motorhome type](#motorhome-type) — 5 values |
| `registrationNumber` | string | – | Max 20 |
| `chassisNumber` | string | – | Max 40 |
| `manufacturedYear` | integer | ✔ | Model year |
| `brand` | string | – | One of the **135** caravan/motorhome brands |
| `carModel` | string | – | **Free text** — the owner types it |
| `chassisType` | string | – | Max 100 — "Fiat Ducato", "Mercedes-Benz Sprinter" |
| `vehicleLocation` | enum | – | `norge` \| `utlandet` |
| `fuel` | enum | ✔ | [Fuel](#fuel) — 9 values |
| `cylinderCapacity` | number | ✔ | Litres, at least 0.1 — 2400 cm³ = `2.4` |
| `horsepower` | integer | ✔ | At least 1 |
| `transmission` | enum | – | `manual` \| `automatic` \| `semi_automatic` |
| `driveType` | enum | ✔ | [Drive type](#drive-type) |
| `weight` | number | ✔ | Kilograms, at least 1 |
| `totalWeight` | number | ✔ | Kilograms, at least 1 |
| `length` | number | ✔ | Centimetres, at least 1 |
| `width` | number | – | Centimetres |
| `registeredSeats` | integer | ✔ | At least 1 |
| `sleepingPlaces` | integer | ✔ | At least 1 |
| `bedType` | enum | – | [Bed type](#bed-type) — 4 values |
| `equipment` | string[] | – | The **48** motorhome values |
| `condition` | enum | – | `new` \| `used` |
| `mileage` | integer | – | Kilometres |
| `firstRegistered` | date | – | |
| `numberOfOwners` | integer | – | |
| `warrantyType` | enum | – | `resterende_ny_garanti` \| `resterende_brukt_garanti` |
| `hasConditionReport` | boolean | – | |
| `maintenanceProgramFollowed` | boolean | – | |

`bodyColor`, `colorDescription` and `interiorColor` are **not** on this form and are stripped.

```json
{
  "category": "68b3f1c2a4d5e6f708091a40",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "vehicleType": "bobil",
  "title": "Hobby Optima De Luxe T70 GE",
  "motorhomeType": "delintegrert",
  "manufacturedYear": 2018,
  "brand": "Hobby",
  "carModel": "Optima De Luxe T70 GE",
  "chassisType": "Fiat Ducato",
  "fuel": "diesel",
  "cylinderCapacity": 2.3,
  "horsepower": 150,
  "transmission": "manual",
  "driveType": "forhjulsdrift",
  "weight": 3200,
  "totalWeight": 3500,
  "length": 699,
  "width": 232,
  "registeredSeats": 4,
  "sleepingPlaces": 4,
  "bedType": "tversgaende_seng",
  "equipment": ["markise", "sykkelstativ", "ryggekamera", "kjoleskap", "varmtvann"],
  "condition": "used",
  "mileage": 42000,
  "price": 890000,
  "reRegistrationExempt": true,
  "location": { "address": "Storgata 1", "city": "Oslo", "country": "Norge", "latitude": 59.9139, "longitude": 10.7522 },
  "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
}
```

---

### Caravan — `campingvogn`

A caravan is not a registered motor vehicle on this form: it asks for no registration number, no
chassis number, no owner history and no colours. All of those are stripped if sent.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `vehicleType` | literal | ✔ | `"campingvogn"` |
| `transactionType` | enum | – | `for_sell` (default) or `for_rent` |
| `manufacturedYear` | integer | ✔ | Model year |
| `brand` | string | – | One of the **135** caravan brands |
| `carModel` | string | – | **Free text** |
| `vehicleLocation` | enum | – | `norge` \| `utlandet` |
| `sleepingPlaces` | integer | ✔ | At least 1 |
| `weight` | number | ✔ | Kilograms, at least 1 |
| `totalWeight` | number | ✔ | Kilograms, at least 1 |
| `totalLength` | number | – | Centimetres |
| `interiorLength` | number | – | Centimetres |
| `width` | number | – | Centimetres |
| `equipment` | string[] | – | The **26** caravan values |
| `condition` | enum | ✔ | `new` \| `used` |
| `mileage` | integer | – | Kilometres |
| `hasConditionReport` | boolean | – | |
| `hasWarranty` | boolean | – | Remaining supplier warranty, or a seller warranty |

```json
{
  "category": "68b3f1c2a4d5e6f708091a40",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "vehicleType": "campingvogn",
  "title": "Adria Adora 613 UT",
  "manufacturedYear": 2020,
  "brand": "Adria",
  "carModel": "Adora 613 UT",
  "sleepingPlaces": 5,
  "weight": 1400,
  "totalWeight": 1600,
  "totalLength": 750,
  "interiorLength": 570,
  "width": 250,
  "equipment": ["fortelt_sommer", "vinterhjul", "koleskap", "varmtvann"],
  "condition": "used",
  "mileage": 12000,
  "hasConditionReport": true,
  "hasWarranty": false,
  "price": 285000,
  "reRegistrationFee": 1200,
  "location": { "address": "Storgata 1", "city": "Oslo", "country": "Norge", "latitude": 59.9139, "longitude": 10.7522 },
  "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
}
```

---

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `vehicleType: Invalid input` | Missing or unknown discriminator |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema |
| `400` | `Re-registration fee is required unless the listing is exempt` | No fee and no exemption flag |
| `400` | `Unknown car brand. Choose one from GET /api/v1/filters/options` | Brand not on the list |
| `400` | `"X" is not a listed <brand> model. Choose one from GET /api/v1/filters/models?…` | Brand/model mismatch |
| `400` | `At least one image is required` | No `images` part |
| `400` | `A listing purchase or active subscription is required to create a product` | No slot |
| `400` | `FILE_TOO_LARGE` / `INVALID_FILE` | Upload problems |
| `401` | `UNAUTHORIZED` | Missing or expired token |

---

## Brands and models

The car form validates the brand **and** the brand/model pair. The other two forms validate only
the brand — their models are free text by design.

| Form | `brand` | `carModel` |
| --- | --- | --- |
| `personbil` | Required, one of 117 | Required, must be a listed model **for that brand** |
| `bobil` | Optional, one of 135 | Optional, free text |
| `campingvogn` | Optional, one of 135 | Optional, free text |

Motorhomes and caravans share one brand list. Populate the car model dropdown from:

```http
GET /api/v1/filters/models?category=car&brand=BMW
```

```json
{ "data": ["1-serie", "2-serie", "3-serie", "…"] }
```

Keep the model input **disabled until a brand is chosen**, then load its models. `"Andre"`
("Other") is always accepted as a model, for the handful of brands whose model list the spec
skipped.

The full brand list comes from `GET /filters/options?category=car`, the `brand` field's `options`.
Do not hard-code it.

---

## Step 4 — Approval and visibility

A new listing is created with `status: "draft"` and is **not** in the public feed until an admin
approves it, which also stamps `listingExpiresAt` from the package's `durationHours`.

| `status` | In the public feed |
| --- | --- |
| `draft` | No — awaiting approval |
| `active` | Yes |
| `sold` / `expired` / `removed` / `rejected` | No |

Show `draft` listings in "My listings" with a pending badge.

---

## Editing a listing

```http
PATCH /api/v1/products/:id
```

A **full replace**: the body is validated with the same schema as `POST`, so `vehicleType` and
every required field for that form must be present. Re-sending `images` replaces the whole set and
deletes the old files; omit the part to keep them.

Two fields catch edit screens out: `mileage` is required on the car form, and `brand` + `carModel`
must still agree.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<car id>&vehicleType=personbil&page=1&limit=20
```

Shared parameters — `page`, `limit`, `sort`, `search`, `category`, `city`, `near`, `radius`,
`minPrice`, `maxPrice`, `userId`, `filter` — behave as in
[`sellx.md`](./sellx.md#browsing-and-searching). Vehicle-specific:

| Param | Type | Matches |
| --- | --- | --- |
| `vehicleType` | string | Exact — `personbil`, `bobil`, `campingvogn`. **Send it, or all three appear together.** |
| `transactionType` | string | Exact — `for_sell`, `for_rent` |
| `brand` | string | Case-insensitive **substring** |
| `carModel` | string | Case-insensitive substring |
| `vehicleLocation` | string | Exact |
| `fuel` | string | Exact |
| `transmission` | string | Exact |
| `bodyType` / `bodyColor` / `interiorColor` | string | Exact |
| `driveType` | string | Exact |
| `warrantyType` | string | Exact |
| `taxClass` | string | Exact |
| `equipment` | comma-separated | **AND** — `equipment=abs_bremser,klimaanlegg` needs both |
| `condition` | `new` \| `used` | Exact |
| `minMileage` / `maxMileage` | number | Range |
| `minYear` / `maxYear` | integer | Range on `manufacturedYear` |
| `minHorsepower` / `maxHorsepower` | number | Range |
| `minSeats` / `maxSeats` | integer | Range |
| `minTrailerWeight` / `maxTrailerWeight` | number | Range |

Sort keys: the shared `relevance`, `-createdAt`, `createdAt`, `price`, `-price`, `nearest`, plus
`manufacturedYear` / `-manufacturedYear` (year) and `mileage` / `-mileage`.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=car
```

`data.filters` is twenty fields, in order:

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `vehicleLocation` | `single_select` | Vehicle location / Bilen står i | `vehicleLocation` |
| `brand` | `single_select` | Brand / Merke | `brand` |
| `carModel` | `single_select` | Model / Modell | `carModel` — **`dependsOn: { field: "brand" }`**, options arrive empty; load from `/filters/models` |
| `vehicleType` | `single_select` | Vehicle type / Kjøretøytype | `vehicleType` |
| `manufacturedYear` | `range` | Year model / Årsmodell | `minYear` / `maxYear` |
| `mileage` | `range` | Mileage / Kilometerstand | `minMileage` / `maxMileage` |
| `price` | `range` | Price / Pris | `minPrice` / `maxPrice` |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `bodyType` | `single_select` | Body type / Karosseri | `bodyType` |
| `transactionType` | `single_select` | Sale type / Salgsform | `transactionType` — `for_sell`, `for_rent` |
| `fuel` | `single_select` | Fuel / Drivstoff | `fuel` |
| `bodyColor` | `text` | Main colour / Hovedfarge | `bodyColor` — a text input; matches case-insensitively, comma-separated for several |
| `interiorColor` | `text` | Interior colour / Interiørfarge | `interiorColor` — same |
| `horsepower` | `range` | Horsepower / Hestekrefter | `minHorsepower` / `maxHorsepower` |
| `seats` | `range` | Seats / Antall seter | `minSeats` / `maxSeats` |
| `driveType` | `single_select` | Drivetrain / Hjuldrift | `driveType` |
| `transmission` | `single_select` | Gearbox / Girkasse | `transmission` |
| `equipment` | `multi_select` | Equipment / Utstyr | `equipment=a,b` (AND) — **only 6 of the 61 values** |
| `trailerWeight` | `range` | Trailer weight / Tilhengervekt | `minTrailerWeight` / `maxTrailerWeight` |
| `warrantyType` | `single_select` | Warranty / Garantitype | `warrantyType` |
| `condition` | `single_select` | Condition / Tilstand | `condition` — carries `dependsOn: { field: "vehicleType", values: ["bobil", "campingvogn"] }`, see below |
| `taxClass` | `single_select` | Tax class / Avgiftsklasse | `taxClass` |

Three things to handle:

- **`condition` applies to motorhomes and caravans only.** The car form has no condition field, so
  the chip carries `dependsOn: { field: "vehicleType", values: ["bobil", "campingvogn"] }`. Show it
  only once the user has picked one of those two — otherwise tapping "Used" hides every passenger
  car.
- **`bodyColor` and `interiorColor` are `text`, not selects.** Colours are free text on the listing
  form, so there is no option list. Render an input. The query matches **case-insensitively as a
  substring**, so `bodyColor=sort` finds `"Sort"` and `"Obsidian Black Sort metallic"`, and a
  comma-separated list matches **any** of its terms: `bodyColor=sort,hvit`.
- **The `equipment` filter offers 6 of 61 values.** That subset is deliberate. The query parameter
  accepts any of the 61, so you can build a wider control yourself.

---

## Value reference

### Tax class

`taxClass` — car form, required.

| Value | English | Norsk |
| --- | --- | --- |
| `kombinertbil` | Combi | Kombinertbil |
| `lett_lastebil` | Light truck | Lett lastebil |
| `minibuss` | Minibus | Minibuss |
| `personbil` | Passenger car | Personbil |
| `varebil` | Van | Varebil |
| `andre` | Other | Andre |

### Fuel

`fuel` — car and motorhome, required. 9 values.

| Value | English | Norsk |
| --- | --- | --- |
| `bensin` | Petrol | Bensin |
| `diesel` | Diesel | Diesel |
| `elektrisitet` | Electric | Elektrisitet |
| `gass` | Gas | Gass |
| `gass_bensin` | Gas + petrol | Gass + bensin |
| `gass_diesel` | Gas + diesel | Gass + diesel |
| `elektrisitet_bensin` | Hybrid petrol | Elektrisitet + bensin |
| `elektrisitet_diesel` | Hybrid diesel | Elektrisitet + diesel |
| `hydrogen` | Hydrogen | Hydrogen |

### Body type

`bodyType` — car form, required. 11 values.

| Value | English | Norsk |
| --- | --- | --- |
| `cabriolet` | Convertible | Cabriolet |
| `coupe` | Coupe | Coupe |
| `flerbruksbil` | MPV | Flerbruksbil |
| `kasse` | Box / Van | Kasse |
| `kombi_3_dors` | 3-door hatchback | Kombi 3-dørs |
| `kombi_5_dors` | 5-door hatchback | Kombi 5-dørs |
| `pickup` | Pickup | Pickup |
| `suv_offroad` | SUV / Offroad | SUV/Offroad |
| `sedan` | Sedan | Sedan |
| `stasjonsvogn` | Estate | Stasjonsvogn |
| `andre` | Other | Andre |

### Drive type

`driveType` — car and motorhome, required.

| Value | English | Norsk |
| --- | --- | --- |
| `bakhjulsdrift` | Rear-wheel drive | Bakhjulsdrift |
| `forhjulsdrift` | Front-wheel drive | Forhjulsdrift |
| `firehjulsdrift` | All-wheel drive | Firehjulsdrift |

### Transmission

`transmission` — `manual`, `automatic`. `semi_automatic` is valid on the **motorhome** form only
and returns a `400` on a car.

### Motorhome type

`motorhomeType` — optional. `alkove`, `bybobil`, `camper`, `delintegrert`, `integrert`.

### Bed type

`bedType` — motorhome, optional. `enkelseng` (single), `dobbeltseng` (double),
`fransk_senglosning` (French), `tversgaende_seng` (transverse).

### Warranty type

| Form | Field | Values |
| --- | --- | --- |
| Car | `warrantyType` | `nybilgaranti` (new car), `gammelbilgaranti_fra_forhandler` (used, from dealer) |
| Motorhome | `warrantyType` | `resterende_ny_garanti`, `resterende_brukt_garanti` |
| Caravan | `hasWarranty` | boolean |

### Condition report

| Form | Field |
| --- | --- |
| Car | `conditionReportProvider` — `naf` \| `viking` |
| Motorhome, caravan | `hasConditionReport` — boolean |

### Vehicle location

`vehicleLocation` — `norge` (Norway) or `utlandet` (abroad).

---

## Equipment

Three separate lists, one per form. Sending a value from the wrong list is a `400` on
`equipment.<index>`.

| Form | Values | Source |
| --- | --- | --- |
| `personbil` | **61**, in five groups — Comfort (23), Safety (19), Engine (1), Technology (9), Exterior (9) | `data/car-equipment.constants.ts` |
| `bobil` | **48** | `data/motorhome-equipment.constants.ts` |
| `campingvogn` | **26** | `data/caravan-equipment.constants.ts` |

The car list is grouped exactly as the spec renders it. The spec repeats eight entries across
groups (Anti-skid twice, Diesel particle filter, Level control, Air suspension, both tow bars and
"Seat in full leather"); each value exists once, in the group it first appears under, which is why
68 printed rows become 61 values.

The caravan list ends in `andre` ("Other"); the car and motorhome lists do not.

Pull the exact values and their English/Norwegian labels from the constants files, or read them
from `docs/frontend/listing-constants.ts`, which is generated from them.

---

## Response object reference

Vehicle listings return the shared listing object (see
[`sellx.md`](./sellx.md#response-object-reference)) plus whichever form fields were stored:

| Field | Type | Notes |
| --- | --- | --- |
| `vehicleType`, `transactionType` | `string` | |
| `taxClass`, `fuel`, `transmission`, `driveType`, `bodyType`, `motorhomeType`, `bedType`, `warrantyType`, `conditionReportProvider`, `vehicleLocation`, `condition` | `string` | Omitted when unset |
| `brand`, `carModel`, `variant`, `chassisType`, `registrationNumber`, `chassisNumber` | `string` | |
| `bodyColor`, `colorDescription`, `interiorColor` | `string` | Car only |
| `manufacturedYear`, `mileage`, `horsepower`, `seats`, `doors`, `numberOfOwners`, `registeredSeats`, `sleepingPlaces` | `number` | |
| `trunkVolume`, `weight`, `totalWeight`, `trailerWeight`, `cylinderCapacity`, `length`, `width`, `totalLength`, `interiorLength` | `number` | Litres, kg or cm as documented |
| `equipment` | `string[]` | `[]` when none |
| `engineTuned`, `hasDamage`, `hasRepairs`, `hasLiens`, `hasConditionReport`, `hasWarranty`, `maintenanceProgramFollowed`, `reRegistrationExempt` | `boolean` | |
| `firstRegistered`, `lastEuApprovedAt`, `nextEuInspectionAt` | `string` | ISO dates |
| `reRegistrationFee` | `number` | NOK |
| `totalPrice` | `number` | **Server-computed**: `price + (exempt ? 0 : reRegistrationFee)` |

Unset optional fields are **omitted entirely** — `undefined`, not `null`.

---

## Errors

| Status | `errorCode` | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body or query failed the schema. Carries `errors[]`. |
| `400` | `INVALID_ID` | Malformed ObjectId |
| `400` | `CATEGORY_REQUIRED` / `INVALID_CATEGORY_ID` / `CATEGORY_UNRESOLVED` | Category problems |
| `400` | `FILE_TOO_LARGE` / `INVALID_FILE` | Upload problems |
| `401` | `UNAUTHORIZED` | Missing, malformed or expired token |
| `403` | `FORBIDDEN` | Someone else's listing, or a blocked store |
| `404` | `NOT_FOUND` / `CATEGORY_NOT_FOUND` | Unknown id |
| `409` | `CONFLICT` | Already reported, or not enough quantity |
| `429` | `RATE_LIMITED` | 120 req/min in production |
| `500` | `INTERNAL_ERROR` | Server fault — quote the `requestId` |

---

## TypeScript types

```ts
export const VEHICLE_TYPES = ['personbil', 'bobil', 'campingvogn'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TRANSACTION_TYPES = ['for_sell', 'for_rent'] as const;
export const TAX_CLASSES = ['kombinertbil', 'lett_lastebil', 'minibuss', 'personbil', 'varebil', 'andre'] as const;
export const CAR_FUELS = [
  'bensin', 'diesel', 'elektrisitet', 'gass', 'gass_bensin', 'gass_diesel',
  'elektrisitet_bensin', 'elektrisitet_diesel', 'hydrogen',
] as const;
export const BODY_TYPES = [
  'cabriolet', 'coupe', 'flerbruksbil', 'kasse', 'kombi_3_dors', 'kombi_5_dors',
  'pickup', 'suv_offroad', 'sedan', 'stasjonsvogn', 'andre',
] as const;
export const DRIVE_TYPES = ['bakhjulsdrift', 'forhjulsdrift', 'firehjulsdrift'] as const;
export const MOTORHOME_TYPES = ['alkove', 'bybobil', 'camper', 'delintegrert', 'integrert'] as const;
export const BED_TYPES = ['enkelseng', 'dobbeltseng', 'fransk_senglosning', 'tversgaende_seng'] as const;

/** The choice the user makes first, and how it maps onto the wire. */
export type VehicleChoice = 'car_for_sale' | 'car_for_rent' | 'motorhome' | 'caravan';

export const CHOICE_TO_BODY: Record<VehicleChoice, { vehicleType: VehicleType; transactionType?: string }> = {
  car_for_sale: { vehicleType: 'personbil', transactionType: 'for_sell' },
  car_for_rent: { vehicleType: 'personbil', transactionType: 'for_rent' },
  motorhome: { vehicleType: 'bobil' },
  caravan: { vehicleType: 'campingvogn' },
};

interface VehicleBase {
  category: string;
  purchaseId?: string;
  storeId?: string;
  transactionType?: (typeof VEHICLE_TRANSACTION_TYPES)[number];
  title: string;
  description?: string;
  price: number;
  reRegistrationFee?: number;
  reRegistrationExempt?: boolean;
  brand?: string;
  carModel?: string;
  vehicleLocation?: 'norge' | 'utlandet';
  mileage?: number;
  currency?: 'NOK';
  location: { address: string; city?: string; country?: string; latitude: number; longitude: number };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
  videoLink?: string;
}

/** Registration document fields — car and motorhome only. */
interface RegisteredVehicle {
  registrationNumber?: string;
  chassisNumber?: string;
  numberOfOwners?: number;
  firstRegistered?: string;
  maintenanceProgramFollowed?: boolean;
}

export interface CarInput extends VehicleBase, RegisteredVehicle {
  vehicleType: 'personbil';
  taxClass: (typeof TAX_CLASSES)[number];
  manufacturedYear: number;
  brand: string;
  carModel: string;
  variant?: string;
  fuel: (typeof CAR_FUELS)[number];
  horsepower?: number;
  engineTuned?: boolean;
  transmission: 'manual' | 'automatic';
  transmissionDesignation?: string;
  driveType: (typeof DRIVE_TYPES)[number];
  driveTypeDesignation?: string;
  bodyType: (typeof BODY_TYPES)[number];
  seats: number;
  doors?: number;
  trunkVolume?: number;
  weight?: number;
  trailerWeight?: number;
  bodyColor: string;
  colorDescription?: string;
  interiorColor?: string;
  equipment?: string[];
  mileage: number;
  hasDamage?: boolean;
  hasRepairs?: boolean;
  lastEuApprovedAt?: string;
  nextEuInspectionAt?: string;
  warrantyType?: 'nybilgaranti' | 'gammelbilgaranti_fra_forhandler';
  conditionReportProvider?: 'naf' | 'viking';
  hasLiens?: boolean;
}

export interface MotorhomeInput extends VehicleBase, RegisteredVehicle {
  vehicleType: 'bobil';
  motorhomeType?: (typeof MOTORHOME_TYPES)[number];
  manufacturedYear: number;
  chassisType?: string;
  fuel: (typeof CAR_FUELS)[number];
  cylinderCapacity: number;
  horsepower: number;
  transmission?: 'manual' | 'automatic' | 'semi_automatic';
  driveType: (typeof DRIVE_TYPES)[number];
  weight: number;
  totalWeight: number;
  length: number;
  width?: number;
  registeredSeats: number;
  sleepingPlaces: number;
  bedType?: (typeof BED_TYPES)[number];
  equipment?: string[];
  condition?: 'new' | 'used';
  warrantyType?: 'resterende_ny_garanti' | 'resterende_brukt_garanti';
  hasConditionReport?: boolean;
}

export interface CaravanInput extends VehicleBase {
  vehicleType: 'campingvogn';
  manufacturedYear: number;
  sleepingPlaces: number;
  weight: number;
  totalWeight: number;
  totalLength?: number;
  interiorLength?: number;
  width?: number;
  equipment?: string[];
  condition: 'new' | 'used';
  hasConditionReport?: boolean;
  hasWarranty?: boolean;
}

export type VehicleListingInput = CarInput | MotorhomeInput | CaravanInput;
```

---

## Gotchas

1. **`vehicleType` has no default and is required on `PATCH` too.** The discriminator picks the
   schema on every write.
2. **Three forms, not one.** Fields from another form are stripped without an error, so a
   mis-tagged submit succeeds and silently loses data.
3. **`semi_automatic` is rejected on the car form** but valid on the motorhome form.
4. **`carModel` must match the chosen `brand`.** Load it from
   `/filters/models?category=car&brand=<brand>`, and offer `"Andre"` as the escape hatch.
5. **`mileage` is in kilometres and required on the car form** — including the edit screen.
6. **`reRegistrationFee` is required unless `reRegistrationExempt` is `true`.** Send `0`, never
   `""`, when the fee is zero but the listing is not exempt.
7. **`totalPrice` is server-computed.** Never send it; `price` excludes the fee.
8. **`cylinderCapacity` is in litres**, not cm³ — 2400 cm³ is `2.4`.
9. **Lengths are in centimetres, weights in kilograms.**
10. **A caravan has no registration number, chassis number, owner history or colour.** They are
    stripped. A motorhome has the registration fields but no colours.
11. **The `condition` filter applies to motorhomes and caravans only** — the car form has no
    condition field, so honour the chip's `dependsOn`.
12. **Send `vehicleType` when browsing**, or cars, motorhomes and caravans arrive in one feed.
13. **`bodyColor` / `interiorColor` are `text` filters** — colours are free text on the form, and
    the query matches case-insensitively as a substring.
14. **A new listing is `draft`** and is not public until an admin approves it.
15. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the
    flattened `latitude` / `longitude`.
16. **Seller privacy is enforced.** A seller can hide their name, avatar and phone; hidden fields
    are omitted from `seller`, and `hidePhone` also drops phone and WhatsApp `contacts`.

---

## Integration checklist

- [ ] Make the user pick one of the four choices first, and map it to `vehicleType` (+ `transactionType` for the two car choices)
- [ ] Build three separate forms; do not share one body across them
- [ ] Resolve the Car `category` id from `GET /categories/public` by `slug`
- [ ] Gate the form behind an active listing purchase or a store subscription
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Drive `brand` from `GET /filters/options?category=car`, never a hard-coded list
- [ ] Keep `carModel` disabled until a brand is chosen, then load `/filters/models`
- [ ] Offer `"Andre"` as a model, and `variant` (max 70) for the detail
- [ ] Use a free-text model input on the motorhome and caravan forms
- [ ] Drop `semi_automatic` from the car gearbox picker; keep it on the motorhome
- [ ] Make `mileage` required on the car form — **including the edit screen**
- [ ] Send `0`, never `""`, for `reRegistrationFee`; or set `reRegistrationExempt: true`
- [ ] Display `totalPrice` from the response; never compute or send it
- [ ] Send `cylinderCapacity` in litres, lengths in cm, weights in kg
- [ ] Use the right equipment list per form — 61 / 48 / 26 values
- [ ] Remove registration, owner-history and colour inputs from the caravan form
- [ ] Remove the colour inputs from the motorhome form
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Send `vehicleType` on the browse screen to separate cars, motorhomes and caravans
- [ ] Map every entry of `errors[]` onto its field by the dot path

---

## Source

| Concern | File |
| --- | --- |
| Routes | `src/modules/products/product.routes.ts` |
| Category resolution + validation dispatch | `src/modules/products/product.middleware.ts` |
| Vehicle body schemas | `src/modules/products/schemas/car.schema.ts` |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Brands | `src/modules/products/data/car-brands.constants.ts`, `caravan-brands.constants.ts`, `motorhome-brands.constants.ts` |
| Equipment | `src/modules/products/data/car-equipment.constants.ts`, `motorhome-equipment.constants.ts`, `caravan-equipment.constants.ts` |
| Value lists | `src/modules/products/product.enum.ts` |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| `totalPrice` | `src/modules/products/product.service.ts` (`applyDerivedFields`) |
| Response shaping | `src/modules/products/product.serializer.ts` |
| Uploads | `src/infrastructure/storage/multer.config.ts` |
| Filter sheet and model lookup | `src/modules/filter-options/` |
| Error envelope | `src/shared/middlewares/globalErrorHandler.ts` |
