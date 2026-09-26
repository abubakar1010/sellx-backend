# Motorcycle Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **motorcycle, moped, ATV or
snowmobile**.

All four share one form. What changes between them is a single follow-up question: a motorcycle
asks for its type, a moped asks for its type, and an ATV or snowmobile asks for neither.
`mcType` is the discriminator and has no default, so read
[Pick the vehicle first](#pick-the-vehicle-first) before anything else.

The shared conventions — envelope, auth, pagination, media URLs, the listing-slot purchase — are
identical to [`sellx.md`](./sellx.md); they are summarised below so this page stands alone.

---

## Contents

- [Pick the vehicle first](#pick-the-vehicle-first)
- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Endpoint index](#endpoint-index)
- [Step 1 — Resolve the Motorcycle category id](#step-1--resolve-the-motorcycle-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
  - [Uploads](#uploads)
  - [The form](#the-form)
  - [Numbers and units](#numbers-and-units)
  - [Price and the re-registration fee](#price-and-the-re-registration-fee)
  - [The sub-type question](#the-sub-type-question)
  - [Create errors](#create-errors)
- [Brands](#brands)
- [Equipment](#equipment)
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

## Pick the vehicle first

`mcType` is the discriminator and has **no default**:

| User picks | Send | Then ask for |
| --- | --- | --- |
| **Motorsykkel** | `mcType: "motorsykkel"` | `motorcycleType` — **required**, [14 values](#motorcycle-type) |
| **Moped** | `mcType: "moped"` | `mopedType` — **required**, `moped` or `scooter` |
| **ATV** | `mcType: "atv"` | nothing |
| **Snøscooter** | `mcType: "snoscooter"` | nothing |

A missing or unknown `mcType` is a `400` on `mcType`.

Everything else on the form is the same for all four. The sub-types are scoped to their own
vehicle: send `motorcycleType` on an ATV or a moped and it is **stripped** — accepted, never
stored, never returned. Show the right question and send only that one.

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
`{ field, message }`, where `field` is a dot path — `equipment.2`, `location.address`.

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
1. GET  /categories/public                    -> find slug "motorcycle", keep its id
2. GET  /listing-packages?category=<id>       -> the packages for Motorcycle
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
| `GET` | `/categories/public` | – | Resolve the Motorcycle category id |
| `GET` | `/listing-packages?category=<id>` | – | Packages available |
| `POST` | `/listing-purchases` | ✔ | Buy a package |
| `GET` | `/listing-purchases/active` | ✔ | Purchases with slots left |
| `POST` | `/products` | ✔ | **Create a listing** |
| `PATCH` | `/products/:id` | ✔ | **Edit a listing** (full body) |
| `DELETE` | `/products/:id` | ✔ | Soft-delete a listing |
| `GET` | `/products/public` | – | Browse / search / filter |
| `GET` | `/products/public/:id` | – | Listing detail |
| `GET` | `/filters/options?category=motorcycle` | – | Filter sheet definition |
| `GET` | `/products/my` | ✔ | The user's own listings |
| `POST` | `/products/:id/favorite` | ✔ | Toggle favourite |
| `POST` | `/products/:id/mark-sold` | ✔ | Mark sold |
| `POST` | `/products/:id/promote` | ✔ | Boost a listing |
| `POST` | `/products/:id/report` | ✔ | Report a listing |

---

## Step 1 — Resolve the Motorcycle category id

```http
GET /api/v1/categories/public
```

Match on `slug === "motorcycle"` and cache the `id`. Never hard-code it.

---

## Step 2 — Buy a listing slot

Identical to every category — see [`sellx.md`](./sellx.md#step-2--buy-a-listing-slot). In brief:

```http
GET  /api/v1/listing-packages?category=<motorcycle id>
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
| `documents` | – | 0–5 PDFs, 5 MB each. Not part of the MC spec, but accepted. |

The body goes in `data` as JSON, not as flat form fields — `location`, `equipment`, `privacy` and
`contacts` are nested and would not survive otherwise.

### The form

**General**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Motorcycle category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `mcType` | enum | ✔ | `motorsykkel` \| `moped` \| `atv` \| `snoscooter`. No default. |
| `motorcycleType` | enum | ✔ * | \* Motorcycles only — [14 values](#motorcycle-type) |
| `mopedType` | enum | ✔ * | \* Mopeds only — `moped` \| `scooter` |
| `registrationNumber` | string | – | Max 20 |
| `chassisNumber` | string | – | Max 40. On page one of the vehicle registration, or vegvesen.no. |
| `brand` | string | – | The make — one of **263** values, see [Brands](#brands) |
| `carModel` | string | – | **Free text** — the owner types the model |
| `manufacturedYear` | integer | ✔ | Model year, 1900 – next year |
| `title` | string | ✔ | Trimmed, 2–120 |
| `transactionType` | enum | – | `for_sell` (default) or `for_rent` |

**Engine and body**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `fuel` | enum | – | `bensin` \| `diesel` \| `elektrisitet` — **three values only** |
| `horsepower` | integer | – | From the vehicle registration document |
| `displacement` | number | – | **ccm** — the engine size, from the registration document |
| `weight` | number | – | Kilograms |
| `equipment` | string[] | – | The **34** values — see [Equipment](#equipment). Defaults to `[]`. |

**Condition and history**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `condition` | enum | – | `new` \| `used` |
| `mileage` | integer | – | Kilometres |
| `numberOfOwners` | integer | – | |
| `hasConditionReport` | boolean | – | |
| `maintenanceProgramFollowed` | boolean | – | |
| `warrantyType` | enum | – | `resterende_ny_garanti` \| `resterende_brukt_garanti` — **not the car form's values** |

**Description, price and contact**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `videoLink` | URL string | – | Absolute URL |
| `description` | string | – | Trimmed, 5–5000 |
| `price` | number | ✔ | Sales price **excluding** re-registration |
| `reRegistrationFee` | number | ✔ * | \* Required unless `reRegistrationExempt` is `true` |
| `reRegistrationExempt` | boolean | – | Defaults to `false` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` — **the phone number goes here** |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` |

`location` is the whole address in one `address` string plus `city`, `country` and the
coordinates — there is no separate postal-code or street field. Geocode before submitting.

Fields from the car forms — `seats`, `bodyColor`, `trailerWeight`, `totalWeight`, `taxClass`,
`bodyType` — are **not** on this form and are stripped if sent.

### Numbers and units

Every number takes a JSON number, or a string that is nothing but digits (measurements allow at
most two decimals; counts must be whole). `""`, `"  "`, `null`, `[]` and `true` are a `400` —
**not** read as 0.

| Field | Unit |
| --- | --- |
| `displacement` | **ccm** |
| `weight` | **kilograms** |
| `mileage` | kilometres, whole |
| `horsepower`, `numberOfOwners` | whole counts |
| `price`, `reRegistrationFee` | NOK |

Errors name the unit — `"Displacement must be a number in ccm, for example 1500 or 1500.50"`,
`"Mileage must be a whole number, for example 3"`.

### Price and the re-registration fee

| Field | Meaning |
| --- | --- |
| `price` | The sales price **excluding** the re-registration fee |
| `reRegistrationFee` | The fee in NOK |
| `reRegistrationExempt` | `true` when the listing is exempt |

`reRegistrationFee` is **required unless `reRegistrationExempt` is `true`**. Omitting it without
the flag returns
`{ "field": "reRegistrationFee", "message": "Re-registration fee is required unless the listing is exempt" }`.
Sending `""` is a `400` too — it used to pass as a zero fee.

`totalPrice` is **computed by the server** as `price + (exempt ? 0 : reRegistrationFee)`. Never
send it; display the value the response returns. This is the "total searchable price" the spec
refers to.

### The sub-type question

```ts
// Render exactly one of these, and send exactly one.
if (mcType === 'motorsykkel') ask('motorcycleType');   // required, 14 options
else if (mcType === 'moped')  ask('mopedType');        // required, 2 options
// atv and snoscooter: ask nothing
```

Getting it wrong fails loudly in one direction and silently in the other:

- A motorcycle without `motorcycleType`, or a moped without `mopedType`, is a `400`.
- An ATV **with** `motorcycleType` is a `201` — the value is dropped.

#### Example

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a60",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "mcType": "motorsykkel",
    "motorcycleType": "classic_nakne",
    "title": "Yamaha MT-07 ABS",
    "registrationNumber": "MC12345",
    "chassisNumber": "JYARM33E0GA012345",
    "brand": "Yamaha",
    "carModel": "MT-07",
    "manufacturedYear": 2020,
    "fuel": "bensin",
    "horsepower": 75,
    "displacement": 689,
    "weight": 184,
    "equipment": ["abs", "varmehandtak", "tankpad", "led_lys"],
    "condition": "used",
    "mileage": 12000,
    "numberOfOwners": 1,
    "hasConditionReport": true,
    "maintenanceProgramFollowed": true,
    "warrantyType": "resterende_brukt_garanti",
    "price": 89000,
    "reRegistrationFee": 2500,
    "reRegistrationExempt": false,
    "videoLink": "https://youtu.be/abcdefgh",
    "description": "Servicet hos forhandler, ny kjede og dekk i 2025.",
    "location": { "address": "Storgata 1", "city": "Oslo", "country": "Norge", "latitude": 59.9139, "longitude": 10.7522 },
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }]
  }' \
  -F "images=@mc-1.jpg" -F "images=@mc-2.jpg"
```

An ATV, for contrast — no sub-type, and exempt from the fee:

```json
{
  "category": "68b3f1c2a4d5e6f708091a60",
  "purchaseId": "68b3f1c2a4d5e6f708091c4d",
  "mcType": "atv",
  "title": "Polaris Sportsman 570",
  "brand": "Polaris",
  "carModel": "Sportsman 570",
  "manufacturedYear": 2022,
  "fuel": "bensin",
  "displacement": 567,
  "condition": "used",
  "mileage": 3200,
  "price": 120000,
  "reRegistrationExempt": true,
  "location": { "address": "Storgata 1", "city": "Oslo", "country": "Norge", "latitude": 59.9139, "longitude": 10.7522 }
}
```

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `mcType: Invalid input` | Missing or unknown discriminator |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema |
| `400` | `Re-registration fee is required unless the listing is exempt` | No fee and no exemption flag |
| `400` | `Unknown motorcycle brand. Choose one from GET /api/v1/filters/options` | Make not on the list |
| `400` | `At least one image is required` | No `images` part |
| `400` | `A listing purchase or active subscription is required to create a product` | No slot |
| `400` | `FILE_TOO_LARGE` / `INVALID_FILE` | Upload problems |
| `401` | `UNAUTHORIZED` | Missing or expired token |

---

## Brands

`brand` (the "make") is optional, but when sent it must be one of **263** values — the same list
for all four vehicles, from `4Speed` through `Yamaha` to `Zundapp`.

The spec's own list carries **both** `Andre` and a trailing `Others`; both are accepted, so
either spelling validates.

The model is **free text** (`carModel`): there is no per-make model list and no `/filters/models`
lookup, unlike cars.

Populate the picker from `GET /filters/options?category=motorcycle`, the `brand` field's
`options`. Do not hard-code it.

---

## Equipment

`equipment` takes an array of the **34** values below — the spec's checkbox list. A value from
another category's list is a `400` on `equipment.<index>`.

| Value | English | Norsk |
| --- | --- | --- |
| `abs` | ABS | ABS |
| `traction_control` | Traction control | Traction control |
| `varmehandtak` | Heated grips | Varmehåndtak |
| `varmesete` | Heated seat | Varmesete |
| `uttak_12v` | 12V outlet | 12V uttak |
| `hoyttalere` | Speakers | Høyttalere |
| `sidevesker` | Side bags | Sidevesker |
| `radio_cd_mp3` | Radio/CD/MP3 | Radio/CD/MP3 |
| `handbeskyttere` | Hand guards | Håndbeskyttere |
| `tankpad` | Tank pad | Tankpad |
| `tanktrekk` | Tank cover | Tanktrekk |
| `tankveske` | Tank bag | Tankveske |
| `toppveske` | Top case | Toppveske |
| `gaffelveske` | Fork bag | Gaffelveske |
| `vindskjerm` | Windshield | Vindskjerm |
| `alarm` | Alarm | Alarm |
| `bagasjebrett` | Luggage rack | Bagasjebrett |
| `solodeksel` | Solo seat cover | Solodeksel |
| `velteklosser` | Crash bars | Velteklosser |
| `koppholder` | Cup holder | Koppholder |
| `ekstra_kaper` | Extra fairings | Ekstra kåper |
| `intercom` | Intercom | Intercom |
| `overtrekk` | Cover | Overtrekk |
| `navigasjonssystem` | Navigation system | Navigasjonssystem |
| `effektanlegg` | Performance exhaust | Effektanlegg |
| `xenon_lys` | Xenon light | Xenon lys |
| `cruise_control` | Cruise control | Cruise control |
| `kjorecomputer` | Trip computer | Kjørecomputer |
| `slepekrok` | Tow hook | Slepekrok |
| `revers` | Reverse gear | Revers |
| `aut_demperjustering` | Automatic damper adjustment | Aut. demperjustering |
| `midtstotte` | Center stand | Midtstøtte |
| `led_lys` | LED light | LED lys |
| `andre` | Other | Andre |

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

A **full replace**: the body is validated with the same schema as `POST`, so `mcType`, its
sub-type where one applies, `manufacturedYear`, `title`, `price` and `location` must all be
present. Re-sending `images` replaces the whole set and deletes the old files; omit the part to
keep them.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<motorcycle id>&mcType=motorsykkel&page=1&limit=20
```

Shared parameters — `page`, `limit`, `sort`, `search`, `category`, `city`, `near`, `radius`,
`minPrice`, `maxPrice`, `userId`, `filter` — behave as in
[`sellx.md`](./sellx.md#browsing-and-searching). MC-specific:

| Param | Type | Matches |
| --- | --- | --- |
| `mcType` | string | Exact — `motorsykkel`, `moped`, `atv`, `snoscooter`. **Send it, or all four appear together.** |
| `mopedType` | string | Exact |
| `motorcycleType` | string | Exact |
| `brand` | string | Case-insensitive **substring** |
| `fuel` | string | Exact |
| `condition` | `new` \| `used` | Exact |
| `transactionType` | string | Exact |
| `equipment` | comma-separated | **AND** — every value must be present |
| `minDisplacement` / `maxDisplacement` | number | ccm range |
| `minHorsepower` / `maxHorsepower` | number | Range |
| `minMileage` / `maxMileage` | number | Range |
| `minYear` / `maxYear` | integer | Range on `manufacturedYear` |

Sort keys: the shared `relevance` (the sheet's default), `-createdAt`, `createdAt`, `price`,
`-price`, `nearest`, plus `manufacturedYear` / `-manufacturedYear` and `mileage` / `-mileage`.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=motorcycle
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `brand` | `single_select` | Brand / Merke | `brand` — 263 options |
| `price` | `range` | Price / Pris | `minPrice` / `maxPrice` |
| `manufacturedYear` | `range` | Year model / Årsmodell | `minYear` / `maxYear` |
| `mileage` | `range` | Mileage / Kilometerstand | `minMileage` / `maxMileage` |
| `mcType` | `single_select` | MC type / MC-type | `mcType` — the four vehicles |
| `mopedType` | `single_select` | Moped type / Type Moped | `mopedType` — **`dependsOn: { field: "mcType", value: "moped" }`** |
| `motorcycleType` | `single_select` | Motorcycle type / Type Motorsykkel | `motorcycleType` — **`dependsOn: { field: "mcType", value: "motorsykkel" }`** |
| `fuel` | `single_select` | Fuel / Drivstoff | `fuel` |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `displacement` | `range` | Displacement (ccm) / Slagvolum i ccm | `minDisplacement` / `maxDisplacement` |
| `horsepower` | `range` | Horsepower / Antall hestekrefter | `minHorsepower` / `maxHorsepower` |
| `condition` | `single_select` | Condition / Tilstand | `condition` |

Every `range` key maps to a `min…`/`max…` pair, not to the key itself.

The two sub-type chips carry a `dependsOn`: keep them hidden or disabled until `mcType` holds the
matching value, exactly as the form does. The `condition` chip works on every MC listing — the
form collects it, unlike the car form.

The sheet carries **no sale-type chip**, so send `transactionType` yourself if you want to
separate rentals.

---

## Value reference

### MC type

`mcType` — the discriminator.

| Value | English | Norsk |
| --- | --- | --- |
| `motorsykkel` | Motorcycle | Motorsykkel |
| `moped` | Moped | Moped |
| `atv` | ATV | ATV |
| `snoscooter` | Snowmobile | Snøscooter |

### Motorcycle type

`motorcycleType` — motorcycles only, required. 14 values.

| Value | English | Norsk |
| --- | --- | --- |
| `chopper` | Chopper | Chopper |
| `cruiser` | Cruiser | Cruiser |
| `classic_nakne` | Classic / Naked | Classic/Nakne |
| `cross_enduro_trial` | Cross / Enduro / Trial | Cross/Enduro/Trial |
| `custom` | Custom | Custom |
| `lett_mc` | Light MC | Lett MC |
| `offroad_motard` | Offroad / Motard | Offroad/Motard |
| `scooter` | Scooter | Scooter |
| `sidevogn` | Sidecar | Sidevogn |
| `sport` | Sport | Sport |
| `touring` | Touring | Touring |
| `trike` | Trike | Trike |
| `veteran` | Veteran | Veteran |
| `andre` | Other | Andre |

### Moped type

`mopedType` — mopeds only, required. `moped`, `scooter`.

### Fuel

`fuel` — **three values only**: `bensin` (petrol), `diesel`, `elektrisitet` (electric). The car
form's hybrids, gas and hydrogen are rejected here.

### Warranty type

`warrantyType` — `resterende_ny_garanti` (remaining new-vehicle warranty),
`resterende_brukt_garanti` (remaining used-vehicle warranty). The car form's `nybilgaranti` and
`gammelbilgaranti_fra_forhandler` are **not** valid here.

### Condition

`condition` — `new`, `used`.

---

## Response object reference

MC listings return the shared listing object (see
[`sellx.md`](./sellx.md#response-object-reference)) plus whichever form fields were stored:

| Field | Type | Notes |
| --- | --- | --- |
| `mcType` | `string` | Always present |
| `motorcycleType`, `mopedType` | `string` | Only on the vehicle that has one |
| `brand`, `carModel`, `registrationNumber`, `chassisNumber` | `string` | Omitted when unset |
| `fuel`, `condition`, `warrantyType`, `transactionType` | `string` | |
| `manufacturedYear`, `horsepower`, `mileage`, `numberOfOwners` | `number` | |
| `displacement` | `number` | **ccm** |
| `weight` | `number` | Kilograms |
| `equipment` | `string[]` | `[]` when none |
| `hasConditionReport`, `maintenanceProgramFollowed`, `reRegistrationExempt` | `boolean` | |
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
export const MC_TYPES = ['motorsykkel', 'moped', 'atv', 'snoscooter'] as const;
export type McType = (typeof MC_TYPES)[number];

export const MOTORCYCLE_TYPES = [
  'chopper', 'cruiser', 'classic_nakne', 'cross_enduro_trial', 'custom', 'lett_mc',
  'offroad_motard', 'scooter', 'sidevogn', 'sport', 'touring', 'trike', 'veteran', 'andre',
] as const;

export const MOPED_TYPES = ['moped', 'scooter'] as const;
export const MC_FUELS = ['bensin', 'diesel', 'elektrisitet'] as const;
export const MC_WARRANTIES = ['resterende_ny_garanti', 'resterende_brukt_garanti'] as const;

interface McBase {
  category: string;
  purchaseId?: string;
  storeId?: string;
  transactionType?: 'for_sell' | 'for_rent';
  title: string;
  description?: string;
  price: number;
  reRegistrationFee?: number;
  reRegistrationExempt?: boolean;
  registrationNumber?: string;
  chassisNumber?: string;
  brand?: string;
  carModel?: string;
  manufacturedYear: number;
  fuel?: (typeof MC_FUELS)[number];
  horsepower?: number;
  /** ccm. */
  displacement?: number;
  /** Kilograms. */
  weight?: number;
  equipment?: string[];
  condition?: 'new' | 'used';
  mileage?: number;
  numberOfOwners?: number;
  hasConditionReport?: boolean;
  maintenanceProgramFollowed?: boolean;
  warrantyType?: (typeof MC_WARRANTIES)[number];
  videoLink?: string;
  currency?: 'NOK';
  location: { address: string; city?: string; country?: string; latitude: number; longitude: number };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
}

export interface MotorcycleInput extends McBase {
  mcType: 'motorsykkel';
  motorcycleType: (typeof MOTORCYCLE_TYPES)[number];
}

export interface MopedInput extends McBase {
  mcType: 'moped';
  mopedType: (typeof MOPED_TYPES)[number];
}

export interface AtvInput extends McBase {
  mcType: 'atv';
}

export interface SnowmobileInput extends McBase {
  mcType: 'snoscooter';
}

export type McListingInput = MotorcycleInput | MopedInput | AtvInput | SnowmobileInput;
```

---

## Gotchas

1. **`mcType` has no default and is required on `PATCH` too.** The discriminator picks the schema
   on every write.
2. **The sub-type is required in one direction and stripped in the other.** A motorcycle without
   `motorcycleType` is a `400`; an ATV *with* one is a `201` that silently drops it.
3. **`displacement` is in ccm, `weight` in kilograms, `mileage` in kilometres.**
4. **The fuel list is three values.** The car form's hybrids, gas and hydrogen are rejected.
5. **The warranty values differ from the car form's.** `nybilgaranti` is a `400` here.
6. **`reRegistrationFee` is required unless `reRegistrationExempt` is `true`.** Send `0`, never
   `""`, when the fee is zero but the listing is not exempt.
7. **`totalPrice` is server-computed** — the "total searchable price". Never send it; `price`
   excludes the fee.
8. **Models are free text.** There is no `/filters/models` lookup as there is for cars.
9. **Both `Andre` and `Others` are valid makes** — the spec's list carries both.
10. **Send `mcType` when browsing**, or motorcycles, mopeds, ATVs and snowmobiles arrive in one
    feed.
11. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero.
12. **A new listing is `draft`** and is not public until an admin approves it.
13. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the
    flattened `latitude` / `longitude`.
14. **Seller privacy is enforced.** A seller can hide their name, avatar and phone; hidden fields
    are omitted from `seller`, and `hidePhone` also drops phone and WhatsApp `contacts`.

---

## Integration checklist

- [ ] Make the user pick one of the four vehicles first, and map it to `mcType`
- [ ] Ask for `motorcycleType` on a motorcycle, `mopedType` on a moped, neither on an ATV or snowmobile
- [ ] Send only the sub-type that applies — the others are silently dropped
- [ ] Resolve the Motorcycle `category` id from `GET /categories/public` by `slug`
- [ ] Gate the form behind an active listing purchase or a store subscription
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Drive `brand` from `GET /filters/options?category=motorcycle` — 263 values, never hard-coded
- [ ] Use a free-text input for the model
- [ ] Label `displacement` in **ccm**, `weight` in **kg**, `mileage` in **km**
- [ ] Use the 3-value MC fuel list and the 2-value MC warranty list, not the car form's
- [ ] Send `0` or `reRegistrationExempt: true` — never an empty re-registration fee
- [ ] Display `totalPrice` from the response; never compute or send it
- [ ] Render the 34-value equipment list; reject anything outside it client-side too
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Honour `dependsOn` on the two sub-type filter chips
- [ ] Send `mcType` on the browse screen to separate the four vehicles
- [ ] Map every entry of `errors[]` onto its field by the dot path

---

## Source

| Concern | File |
| --- | --- |
| Routes | `src/modules/products/product.routes.ts` |
| Category resolution + validation dispatch | `src/modules/products/product.middleware.ts` |
| MC body schemas | `src/modules/products/schemas/motorcycle.schema.ts` |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Brands | `src/modules/products/data/mc-brands.constants.ts` |
| Equipment | `src/modules/products/data/mc-equipment.constants.ts` |
| Value lists | `src/modules/products/product.enum.ts` |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| `totalPrice` | `src/modules/products/product.service.ts` (`applyDerivedFields`) |
| Response shaping | `src/modules/products/product.serializer.ts` |
| Uploads | `src/infrastructure/storage/multer.config.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` |
| Error envelope | `src/shared/middlewares/globalErrorHandler.ts` |
