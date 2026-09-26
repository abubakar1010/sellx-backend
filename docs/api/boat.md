# Boat Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **boat**.

Boat is **two forms behind three choices**: a full form for a boat offered for sale or for rent,
and a deliberately short one for a wanted-to-buy ad. `transactionType` picks between them and has
no default, so read [Pick the form first](#pick-the-form-first) before anything else.

The shared conventions — envelope, auth, pagination, media URLs, the listing-slot purchase — are
identical to [`sellx.md`](./sellx.md); they are summarised below so this page stands alone.

---

## Contents

- [Pick the form first](#pick-the-form-first)
- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Endpoint index](#endpoint-index)
- [Step 1 — Resolve the Boat category id](#step-1--resolve-the-boat-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
  - [Uploads](#uploads)
  - [Fields on both boat forms](#fields-on-both-boat-forms)
  - [Numbers and units](#numbers-and-units)
  - [For sale / For rent — `for_sell` and `for_rent`](#for-sale--for-rent--for_sell-and-for_rent)
  - [Wanted to buy — `wants_to_buy`](#wanted-to-buy--wants_to_buy)
  - [Create errors](#create-errors)
- [Brands](#brands)
- [Step 4 — Approval and visibility](#step-4--approval-and-visibility)
- [Editing a listing](#editing-a-listing)
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

`transactionType` is the discriminator and has **no default**:

| User picks | Send | Form |
| --- | --- | --- |
| **Boat for sale** | `transactionType: "for_sell"` | [Full form](#for-sale--for-rent--for_sell-and-for_rent) |
| **Boat for rent** | `transactionType: "for_rent"` | [Full form](#for-sale--for-rent--for_sell-and-for_rent), identical fields — `price` is the *makspris* |
| **Boat wanted to buy** | `transactionType: "wants_to_buy"` | [Short form](#wanted-to-buy--wants_to_buy) |

Missing, `give_away`, `wants_to_rent` or anything else is a `400` on `transactionType`.

The wanted ad is not the full form with optional fields — it is a **different schema with six
fields**. Everything else is stripped without an error: send `length`, `brand` or `horsepower` on
a wanted ad and they are silently dropped, never stored, never returned. Build two forms.

---

## Conventions

### Base URL and auth

```
/api/v1
Authorization: Bearer <accessToken>
```

Public (no token): `GET /categories/public`, `GET /products/public`, `GET /products/public/:id`,
`GET /filters/options`, `GET /listing-packages`, `GET /products/boost-plans`.

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
`{ field, message }`, where `field` is a dot path — `location.address`, `contacts.0.type`.

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
1. GET  /categories/public                    -> find slug "boat", keep its id
2. GET  /listing-packages?category=<id>       -> the packages for Boat
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
| `GET` | `/categories/public` | – | Resolve the Boat category id |
| `GET` | `/listing-packages?category=<id>` | – | Packages available for Boat |
| `POST` | `/listing-purchases` | ✔ | Buy a package |
| `GET` | `/listing-purchases/active` | ✔ | Purchases with slots left |
| `POST` | `/products` | ✔ | **Create a boat listing** |
| `PATCH` | `/products/:id` | ✔ | **Edit a listing** (full body) |
| `DELETE` | `/products/:id` | ✔ | Soft-delete a listing |
| `GET` | `/products/public` | – | Browse / search / filter |
| `GET` | `/products/public/:id` | – | Listing detail |
| `GET` | `/filters/options?category=boat` | – | Filter sheet definition |
| `GET` | `/products/my` | ✔ | The user's own listings |
| `POST` | `/products/:id/favorite` | ✔ | Toggle favourite |
| `POST` | `/products/:id/mark-sold` | ✔ | Mark sold |
| `POST` | `/products/:id/promote` | ✔ | Boost a listing |
| `POST` | `/products/:id/report` | ✔ | Report a listing |

---

## Step 1 — Resolve the Boat category id

```http
GET /api/v1/categories/public
```

Match on `slug === "boat"` and cache the `id`. Never hard-code it.

---

## Step 2 — Buy a listing slot

Identical to every category — see [`sellx.md`](./sellx.md#step-2--buy-a-listing-slot). In brief:

```http
GET  /api/v1/listing-packages?category=<boat id>
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
| `documents` | – | 0–5 PDFs, 5 MB each. Not part of the boat spec, but accepted. |

The body goes in `data` as JSON, not as flat form fields — `location`, `privacy` and `contacts`
are nested and would not survive otherwise.

### Fields on both boat forms

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Boat category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `transactionType` | enum | ✔ | `for_sell` \| `for_rent` \| `wants_to_buy`. No default. |
| `title` | string | ✔ | The ad headline, trimmed, 2–120 |
| `description` | string | – | Trimmed, 5–5000 |
| `price` | number | ✔ | Selling price, or the *makspris* on a rental and a wanted ad |
| `type` | enum | varies | [Boat type](#boat-type) — 14 values. **Required** on the full form, optional on a wanted ad. |
| `videoLink` | URL string | – | Absolute URL |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` — **the phone number goes here** |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` |

`location` is the whole address in one `address` string plus `city`, `country` and the
coordinates — there is no separate postal-code or street field. Geocode before submitting;
`latitude` and `longitude` are required.

### Numbers and units

Every measurement takes a JSON number, or a string that is nothing but digits (at most two
decimals; counts must be whole). `""`, `"  "`, `null`, `[]` and `true` are a `400` — **not** read
as 0.

| Field | Unit | Notes |
| --- | --- | --- |
| `length` | **feet** | Required on the full form, at least 1 |
| `width`, `depth` | **centimetres** | |
| `weight` | **kilograms** | |
| `maxSpeedKnots` | **knots** | |
| `horsepower`, `seats`, `sleepingPlaces` | count | Whole numbers |
| `price` | NOK | |

Errors name the unit, e.g. `"Length must be at least 1 ft"`,
`"Top speed must be a number in knots, for example 1500 or 1500.50"`.

---

### For sale / For rent — `for_sell` and `for_rent`

One form; only `transactionType` differs. On a rental, `price` is the *makspris*.

**General**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `transactionType` | literal | ✔ | `"for_sell"` or `"for_rent"` |
| `type` | enum | ✔ | [Boat type](#boat-type) — 14 values |
| `registrationNumber` | string | – | Max 40. The boat's id in the Small Boat Register or the Ship Register. |
| `manufacturedYear` | integer | ✔ | Model year, 1900 – next year |
| `brand` | string | – | One of the **799** boat brands — see [Brands](#brands) |
| `carModel` | string | – | **Free text** — the owner types the model |
| `vehicleLocation` | enum | – | `norge` \| `utlandet` — where the boat is |

**Motor**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `motorIncluded` | boolean | – | Is the motor included in the sale |
| `engineBrand` | string | – | Max 100 |
| `motorType` | enum | – | [Motor type](#motor-type) — `innenbords`, `utenbords`, `andre` |
| `horsepower` | integer | – | |
| `fuel` | enum | – | [Fuel](#fuel) — 5 values, **not the same list as the car form** |
| `maxSpeedKnots` | number | – | Knots |

**Hull and capacity**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `length` | number | ✔ | **Feet**, at least 1 |
| `width` | number | – | Centimetres |
| `depth` | number | – | Centimetres |
| `weight` | number | – | Kilograms |
| `buildMaterial` | enum | – | [Build material](#build-material) — 5 values |
| `color` | string | – | Free text, max 60 |
| `seats` | integer | – | |
| `sleepingPlaces` | integer | – | Berths |
| `lysNumber` | string | – | Max 20. Sailboats only — the Norlys measurement, e.g. `"1.15"`. Show the input only for `seilbat_motorseiler`; the API does not enforce it. |
| `equipmentDescription` | string | – | Max 2000. **Free text, not checkboxes** — boats have no equipment list. |

**Description, price and contact** — `title`, `description`, `videoLink`, `price`, `contacts`,
`location` as in [the shared fields](#fields-on-both-boat-forms).

There is **no condition field** on either boat form.

#### Example

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a50",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "transactionType": "for_sell",
    "type": "daycruiser",
    "title": "Askeladden C65 Cruiser med Yamaha 150",
    "registrationNumber": "NOR-12345",
    "manufacturedYear": 2016,
    "brand": "Askeladden",
    "carModel": "C65 Cruiser",
    "vehicleLocation": "norge",
    "motorIncluded": true,
    "engineBrand": "Yamaha",
    "motorType": "utenbords",
    "horsepower": 150,
    "fuel": "bensin",
    "maxSpeedKnots": 38,
    "length": 21,
    "width": 250,
    "depth": 90,
    "weight": 1250,
    "buildMaterial": "glassfiber",
    "color": "Hvit",
    "seats": 8,
    "sleepingPlaces": 2,
    "equipmentDescription": "Kartplotter, ekkolodd, kalesje, baugpropell og VHF.",
    "price": 450000,
    "videoLink": "https://youtu.be/abcdefgh",
    "description": "Godt vedlikeholdt daycruiser, ny kalesje i 2024.",
    "location": { "address": "Aker brygge 1", "city": "Oslo", "country": "Norge", "latitude": 59.9106, "longitude": 10.7285 },
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
  }' \
  -F "images=@boat-1.jpg" -F "images=@boat-2.jpg"
```

---

### Wanted to buy — `wants_to_buy`

A buyer's ad. Six fields, and `price` is the maximum they will pay.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `transactionType` | literal | ✔ | `"wants_to_buy"` |
| `type` | enum | – | [Boat type](#boat-type) |
| `title` | string | ✔ | 2–120 |
| `videoLink` | URL string | – | |
| `description` | string | – | 5–5000 |
| `price` | number | ✔ | The maximum price |
| `contacts` | array | – | The phone number |
| `location` | object | ✔ | Address + coordinates |

Everything from the full form — `manufacturedYear`, `length`, `brand`, `registrationNumber`,
`motorType`, `horsepower`, `buildMaterial`, `lysNumber`, `equipmentDescription`, `seats` and the
rest — is **stripped**. Do not render those inputs.

```json
{
  "category": "68b3f1c2a4d5e6f708091a50",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "transactionType": "wants_to_buy",
  "type": "rib",
  "title": "Ønskes kjøpt: RIB rundt 20 fot",
  "description": "Ser etter en velholdt RIB, gjerne med kalesje og henger. Kontant oppgjør.",
  "price": 250000,
  "videoLink": "https://youtu.be/abcdefgh",
  "location": { "address": "Aker brygge 1", "city": "Oslo", "country": "Norge", "latitude": 59.9106, "longitude": 10.7285 },
  "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
}
```

---

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `transactionType: Invalid input` | Missing or unknown discriminator |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema |
| `400` | `Unknown boat brand. Choose one from GET /api/v1/filters/options` | Brand not on the list |
| `400` | `At least one image is required` | No `images` part |
| `400` | `A listing purchase or active subscription is required to create a product` | No slot |
| `400` | `FILE_TOO_LARGE` / `INVALID_FILE` | Upload problems |
| `401` | `UNAUTHORIZED` | Missing or expired token |

---

## Brands

`brand` is optional, but when sent it must be one of **799** values, exactly as spelled in the
list — `"Askeladden"`, `"Nordkapp"`, `"Yamarin"`, down to `"Andre"` for anything missing.

The model is **free text** (`carModel`) on every boat form: there is no per-brand model list and
no `/filters/models` lookup for boats, unlike cars.

Populate the brand picker from `GET /filters/options?category=boat`, the `brand` field's
`options`. Do not hard-code it.

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

A **full replace**: the body is validated with the same schema as `POST`, so `transactionType` and
every required field for that form must be present. Re-sending `images` replaces the whole set and
deletes the old files; omit the part to keep them.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<boat id>&transactionType=for_sell&page=1&limit=20
```

Shared parameters — `page`, `limit`, `sort`, `search`, `category`, `city`, `near`, `radius`,
`minPrice`, `maxPrice`, `userId`, `filter` — behave as in
[`sellx.md`](./sellx.md#browsing-and-searching). Boat-specific:

| Param | Type | Matches |
| --- | --- | --- |
| `transactionType` | string | Exact — `for_sell`, `for_rent`, `wants_to_buy`. **Send it, or wanted ads mix into the for-sale feed.** |
| `type` | string | Exact boat type |
| `brand` | string | Case-insensitive **substring** |
| `vehicleLocation` | string | Exact — `norge`, `utlandet` |
| `motorIncluded` | `"true"` \| `"false"` | Exact |
| `motorType` | string | Exact |
| `buildMaterial` | string | Exact |
| `fuel` | string | Exact |
| `minLength` / `maxLength` | number | Feet range |
| `minWidth` / `maxWidth` | number | Centimetre range |
| `minMaxSpeedKnots` / `maxMaxSpeedKnots` | number | Knot range |
| `minSleepingPlaces` / `maxSleepingPlaces` | integer | Berth range |
| `minYear` / `maxYear` | integer | Range on `manufacturedYear` |

Sort keys: the shared `relevance` (the sheet's default), `-createdAt`, `createdAt`, `price`,
`-price`, `nearest`, plus `length` / `-length` and `maxSpeedKnots` / `-maxSpeedKnots`.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=boat
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `vehicleLocation` | `single_select` | Boat location / Båten står i | `vehicleLocation` |
| `type` | `single_select` | Boat type / Båttype | `type` — the 14 values |
| `brand` | `single_select` | Brand / Merke | `brand` — 799 options |
| `price` | `range` | Price / Pris | `minPrice` / `maxPrice` |
| `length` | `range` | Length in feet / Lengde i fot | `minLength` / `maxLength` |
| `width` | `range` | Width in cm / Bredde i cm | `minWidth` / `maxWidth` |
| `manufacturedYear` | `range` | Year model / Årsmodell | `minYear` / `maxYear` |
| `maxSpeedKnots` | `range` | Max speed in knots / Maks fart i knop | `minMaxSpeedKnots` / `maxMaxSpeedKnots` |
| `motorIncluded` | `single_select` | Motor included / Motor inkludert | `motorIncluded` — `"true"` / `"false"` |
| `motorType` | `single_select` | Motor type / Motortype | `motorType` |
| `buildMaterial` | `single_select` | Build material / Byggemateriale | `buildMaterial` |
| `fuel` | `single_select` | Fuel / Drivstoff | `fuel` |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `seats` | `range` | Sitting places / Antall sitteplasser | `minSeats` / `maxSeats` |
| `sleepingPlaces` | `range` | Sleeping places / Antall soveplasser | `minSleepingPlaces` / `maxSleepingPlaces` |
| `horsepower` | `range` | Horsepower / Antall hestekrefter | `minHorsepower` / `maxHorsepower` |

Every `range` key maps to a `min…`/`max…` pair, not to the key itself.

Two things to know:

- **There is no `condition` chip.** Neither boat form collects a condition, so one would return an
  empty list whatever was picked. It was removed rather than left to mislead.
- **The sheet carries no sale-type chip at all.** Unlike the car and simple-category sheets, boat
  has no `transactionType` field, so for-sale listings, rentals and wanted ads arrive in one feed.
  The query parameter accepts all three values — send it yourself, or build the tabs from it.

---

## Value reference

### Boat type

`type` — 14 values. Required on the full form, optional on a wanted ad.

| Value | English | Norsk |
| --- | --- | --- |
| `bowrider` | Bowrider | Bowrider |
| `cabincruiser` | Cabin cruiser | Cabincruiser |
| `daycruiser` | Daycruiser | Daycruiser |
| `gummibat_jolle` | Dinghy / Tender | Gummibåt/Jolle |
| `pilothouse` | Pilothouse | Pilothouse |
| `rib` | RIB | RIB |
| `seilbat_motorseiler` | Sailboat / Motorsailer | Seilbåt/Motorseiler |
| `skjaergaardsjeep` | Island hopper | Skjærgårdsjeep/Landstedsbåt |
| `speedbat` | Speedboat | Speedbåt |
| `trebat_snekke` | Wooden boat | Trebåt/Snekke |
| `vannscooter` | Jet ski | Vannscooter |
| `yacht` | Yacht | Yacht |
| `yrkesbat_sjark` | Commercial / Fishing | Yrkesbåt/Sjark/Skøyte |
| `andre` | Other | Andre |

### Motor type

`motorType` — `innenbords` (inboard), `utenbords` (outboard), `andre` (other).

### Fuel

`fuel` — **5 values, a different list from the car form's 9**.

| Value | English | Norsk |
| --- | --- | --- |
| `bensin` | Petrol | Bensin |
| `diesel` | Diesel | Diesel |
| `elektrisitet` | Electric | Elektrisitet |
| `hybrid` | Hybrid | Hybrid |
| `andre` | Other | Andre |

`gass`, `hydrogen` and the car form's combination fuels are **not** valid on a boat.

### Build material

`buildMaterial` — `plast` (plastic), `glassfiber` (fibreglass), `tre` (wood), `aluminium`,
`andre` (other).

### Vehicle location

`vehicleLocation` — `norge` (Norway) or `utlandet` (abroad).

---

## Response object reference

Boat listings return the shared listing object (see
[`sellx.md`](./sellx.md#response-object-reference)) plus whichever form fields were stored:

| Field | Type | Notes |
| --- | --- | --- |
| `transactionType` | `string` | `for_sell` \| `for_rent` \| `wants_to_buy` |
| `type`, `motorType`, `buildMaterial`, `fuel`, `vehicleLocation` | `string` | Omitted when unset |
| `brand`, `carModel`, `engineBrand`, `registrationNumber`, `color`, `lysNumber` | `string` | |
| `equipmentDescription` | `string` | Free text |
| `manufacturedYear`, `horsepower`, `seats`, `sleepingPlaces` | `number` | |
| `length` | `number` | **Feet** |
| `width`, `depth` | `number` | Centimetres |
| `weight` | `number` | Kilograms |
| `maxSpeedKnots` | `number` | Knots |
| `motorIncluded` | `boolean` | |
| `totalPrice` | `number` | **Server-computed**; equals `price` on a boat |

Unset optional fields are **omitted entirely** — `undefined`, not `null`. A wanted ad carries only
the six form fields plus the shared ones.

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
export const BOAT_TRANSACTION_TYPES = ['for_sell', 'for_rent', 'wants_to_buy'] as const;
export type BoatTransactionType = (typeof BOAT_TRANSACTION_TYPES)[number];

export const BOAT_TYPES = [
  'bowrider', 'cabincruiser', 'daycruiser', 'gummibat_jolle', 'pilothouse', 'rib',
  'seilbat_motorseiler', 'skjaergaardsjeep', 'speedbat', 'trebat_snekke', 'vannscooter',
  'yacht', 'yrkesbat_sjark', 'andre',
] as const;

export const MOTOR_TYPES = ['innenbords', 'utenbords', 'andre'] as const;
export const BOAT_FUELS = ['bensin', 'diesel', 'elektrisitet', 'hybrid', 'andre'] as const;
export const BUILD_MATERIALS = ['plast', 'glassfiber', 'tre', 'aluminium', 'andre'] as const;

interface BoatBase {
  category: string;
  purchaseId?: string;
  storeId?: string;
  title: string;
  description?: string;
  price: number;
  type?: (typeof BOAT_TYPES)[number];
  videoLink?: string;
  currency?: 'NOK';
  location: { address: string; city?: string; country?: string; latitude: number; longitude: number };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
}

/** For sale and for rent share this shape; only `transactionType` differs. */
export interface BoatListingInput extends BoatBase {
  transactionType: 'for_sell' | 'for_rent';
  type: (typeof BOAT_TYPES)[number];
  manufacturedYear: number;
  /** Feet. */
  length: number;
  registrationNumber?: string;
  brand?: string;
  carModel?: string;
  vehicleLocation?: 'norge' | 'utlandet';
  motorIncluded?: boolean;
  engineBrand?: string;
  motorType?: (typeof MOTOR_TYPES)[number];
  horsepower?: number;
  fuel?: (typeof BOAT_FUELS)[number];
  maxSpeedKnots?: number;
  /** Centimetres. */
  width?: number;
  /** Centimetres. */
  depth?: number;
  /** Kilograms. */
  weight?: number;
  buildMaterial?: (typeof BUILD_MATERIALS)[number];
  color?: string;
  seats?: number;
  sleepingPlaces?: number;
  lysNumber?: string;
  equipmentDescription?: string;
}

export interface BoatWantedInput extends BoatBase {
  transactionType: 'wants_to_buy';
}

export type BoatInput = BoatListingInput | BoatWantedInput;
```

---

## Gotchas

1. **`transactionType` has no default and is required on `PATCH` too.** The discriminator picks
   the schema on every write.
2. **The wanted ad is a different form, not a lighter one.** Twenty-odd fields are stripped
   without an error, so a mis-tagged submit succeeds and silently loses the data.
3. **`length` is in feet.** `width` and `depth` are centimetres, `weight` kilograms, `maxSpeedKnots`
   knots. Nothing converts for you.
4. **Boat equipment is free text**, not a checkbox list — `equipmentDescription`, max 2000. Cars,
   motorhomes and caravans are the ones with equipment arrays.
5. **The boat fuel list is 5 values, not the car's 9.** `gass` and `hydrogen` are rejected.
6. **There is no condition field and no condition filter.** Neither boat form collects one.
7. **`lysNumber` only makes sense for sailboats.** The API accepts it on any boat type — hide the
   input unless `type` is `seilbat_motorseiler`.
8. **Boat models are free text.** There is no `/filters/models` lookup as there is for cars.
9. **The filter sheet has no sale-type chip.** For-sale listings, rentals and wanted ads share one
   feed unless you send `transactionType` yourself.
10. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero.
11. **A new listing is `draft`** and is not public until an admin approves it.
12. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the
    flattened `latitude` / `longitude`.
13. **Seller privacy is enforced.** A seller can hide their name, avatar and phone; hidden fields
    are omitted from `seller`, and `hidePhone` also drops phone and WhatsApp `contacts`.

---

## Integration checklist

- [ ] Make the user pick one of the three choices first, and map it to `transactionType`
- [ ] Build two forms — the full one, and the six-field wanted ad
- [ ] Resolve the Boat `category` id from `GET /categories/public` by `slug`
- [ ] Gate the form behind an active listing purchase or a store subscription
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Drive `brand` from `GET /filters/options?category=boat` — 799 values, never hard-coded
- [ ] Use a free-text input for the model; there is no per-brand list
- [ ] Label `length` in **feet**, `width`/`depth` in **cm**, `weight` in **kg**, top speed in **knots**
- [ ] Use a free-text area for equipment, not checkboxes
- [ ] Use the 5-value boat fuel list, not the car's 9
- [ ] Show `lysNumber` only for `seilbat_motorseiler`
- [ ] Never submit a numeric input empty — send `0` when the user means zero
- [ ] Remove every full-form input from the wanted-to-buy form
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Send `transactionType` on the browse screen to separate for-sale, rentals and wanted ads
- [ ] Map every entry of `errors[]` onto its field by the dot path

---

## Source

| Concern | File |
| --- | --- |
| Routes | `src/modules/products/product.routes.ts` |
| Category resolution + validation dispatch | `src/modules/products/product.middleware.ts` |
| Boat body schemas | `src/modules/products/schemas/boat.schema.ts` |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Brands | `src/modules/products/data/boat-brands.constants.ts` |
| Value lists | `src/modules/products/product.enum.ts` |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| Response shaping | `src/modules/products/product.serializer.ts` |
| Uploads | `src/infrastructure/storage/multer.config.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` |
| Error envelope | `src/shared/middlewares/globalErrorHandler.ts` |
