# SellX Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **SellX** item.

SellX is the marketplace's general "sell anything" category. Its form is the smallest of the
eleven: images, a transaction type, a title, a description, a condition, a brand and a price.
Five other categories (Electronics, Furniture, Clothing, Book, Bike) share the same schema, so
everything below applies to them too — only the brand/extra field differs. Three have their own
short pages: [`bike.md`](./bike.md), which adds a `bikeType` picker,
[`book.md`](./book.md), which swaps brand for a book category, and
[`electronics.md`](./electronics.md), which Furniture and Clothing follow exactly.

---

## Contents

- [Conventions](#conventions)
- [The integration flow](#the-integration-flow)
- [Endpoint index](#endpoint-index)
- [Step 1 — Resolve the SellX category id](#step-1--resolve-the-sellx-category-id)
- [Step 2 — Buy a listing slot](#step-2--buy-a-listing-slot)
- [Step 3 — Create the listing](#step-3--create-the-listing)
- [Step 4 — Approval and visibility](#step-4--approval-and-visibility)
- [Editing a listing](#editing-a-listing)
- [Deleting a listing](#deleting-a-listing)
- [Browsing and searching](#browsing-and-searching)
- [Listing detail](#listing-detail)
- [Filter sheet](#filter-sheet)
- [My listings, favourites, sold, boost, report](#my-listings-favourites-sold-boost-report)
- [Response object reference](#response-object-reference)
- [Errors](#errors)
- [TypeScript types](#typescript-types)
- [Gotchas](#gotchas)
- [Integration checklist](#integration-checklist)
- [Source](#source)

---

## Conventions

### Base URL

```
/api/v1
```

### Authentication

```
Authorization: Bearer <accessToken>
```

Public (no token needed):

| Endpoint | Purpose |
| --- | --- |
| `GET /categories/public` | Category list, including the SellX id |
| `GET /products/public` | Browse / search listings |
| `GET /products/public/:id` | Listing detail |
| `GET /products/store/:storeId` | A store's listings |
| `GET /filters/options` | Filter sheet definition |
| `GET /listing-packages` | Purchasable listing packages |
| `GET /products/boost-plans` | Boost plans |

Everything else needs a token. Sending a token to the public product endpoints is still useful —
it populates `isFavorite` and `isReported`, and hides listings the viewer has reported.

### Success envelope

Every 2xx response is wrapped:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products fetched successfully",
  "data": {},
  "requestId": "b3f1c2a4-d5e6-4f70-8091-a2b3c4d5e6f7"
}
```

| Field | Type | Always | Notes |
| --- | --- | --- | --- |
| `success` | `boolean` | Yes | `true` on 2xx |
| `statusCode` | `number` | Yes | Mirrors the HTTP status |
| `message` | `string` | Yes | Human-readable, safe to show |
| `data` | `object \| array \| null` | Yes | The payload |
| `requestId` | `string` | Yes | Echoes the `x-request-id` header, or a generated UUID. Quote it in bug reports. |

Paginated endpoints put the rows and the page info **inside** `data`:

```json
{
  "data": {
    "rows": [],
    "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
  }
}
```

### Error envelope

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Price cannot be negative",
  "errorCode": "VALIDATION_ERROR",
  "errors": [{ "field": "price", "message": "Price cannot be negative" }],
  "requestId": "b3f1c2a4-d5e6-4f70-8091-a2b3c4d5e6f7"
}
```

`message` is the **first** issue. `errors[]` is present on validation failures only — map it onto
your form by `field` (a dot path, e.g. `location.address`, `contacts.0.type`). `stack` is added
outside production.

### Media URLs

Uploaded files are served from the API origin, and the API returns **relative** paths:

```
/uploads/products/9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f.jpg
```

Prefix them with the API origin before rendering: `` `${API_ORIGIN}${media.url}` ``.

### Currency

The marketplace is NOK-only. `currency` may be omitted (it defaults to `"NOK"`); any other value
is rejected with `Only NOK is supported.`

---

## The integration flow

Creating a listing is not a single call. A listing consumes a **paid slot**, and a new listing is
not public until an admin approves it.

```
1. GET  /categories/public                    -> find slug "sellx", keep its id
2. GET  /listing-packages?category=<id>       -> show the packages for SellX
3. POST /listing-purchases { packageId }      -> 201 purchase, or 200 { checkoutUrl } to pay first
4. GET  /listing-purchases/active             -> the purchase id to spend
5. POST /products  (multipart: data + images) -> 201, status "draft"
6. (admin approves)                           -> status "active", listingExpiresAt set
7. GET  /products/public?category=<id>        -> the listing is now in the feed
```

Two ways to pay for the slot:

| Path | What to send | When |
| --- | --- | --- |
| **Per-use purchase** | `purchaseId` in the listing body | Normal users. Required. |
| **Store subscription** | `storeId` in the listing body, no `purchaseId` | The user's store has an active subscription covering the category |

Validation runs **before** a slot is consumed, so a rejected listing never costs the user a slot.

---

## Endpoint index

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/categories/public` | – | Resolve the SellX category id |
| `GET` | `/listing-packages?category=<id>` | – | Packages available for SellX |
| `POST` | `/listing-purchases` | ✔ | Buy a package (returns a Stripe URL when paid) |
| `GET` | `/listing-purchases/active` | ✔ | Purchases with slots left |
| `POST` | `/products` | ✔ | **Create a SellX listing** |
| `PATCH` | `/products/:id` | ✔ | **Edit a listing** (full body) |
| `DELETE` | `/products/:id` | ✔ | Soft-delete a listing |
| `GET` | `/products/public` | – | Browse / search / filter |
| `GET` | `/products/public/:id` | – | Listing detail |
| `GET` | `/filters/options?category=sellx` | – | Filter sheet definition |
| `GET` | `/products/my` | ✔ | The user's own listings |
| `GET` | `/products/favorites` | ✔ | Favourited listings |
| `POST` | `/products/:id/favorite` | ✔ | Toggle favourite |
| `POST` | `/products/:id/mark-sold` | ✔ | Mark sold |
| `GET` | `/products/boost-plans` | – | Boost plans |
| `POST` | `/products/:id/promote` | ✔ | Boost a listing |
| `POST` | `/products/:id/report` | ✔ | Report a listing |

---

## Step 1 — Resolve the SellX category id

Category ids are database ids, so never hard-code them. Fetch once at app start, cache, and match
on `slug === "sellx"`.

```http
GET /api/v1/categories/public
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Categories fetched successfully.",
  "data": {
    "rows": [
      {
        "id": "68b3f1c2a4d5e6f708091a2b",
        "title": "SellX",
        "slug": "sellx",
        "thumbnail": "/uploads/categories/sellx.png",
        "description": "Sell anything",
        "basicPricing": 49,
        "plusPricing": 99,
        "sortOrder": 0,
        "createdAt": "2026-07-01T09:00:00.000Z",
        "updatedAt": "2026-07-01T09:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 11, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
  }
}
```

The `slug` also tells you **which form to render** — `sellx` means the form documented here.

---

## Step 2 — Buy a listing slot

### List the packages

```http
GET /api/v1/listing-packages?category=68b3f1c2a4d5e6f708091a2b
```

`data` is a plain array:

```json
{
  "data": [
    {
      "id": "68b3f1c2a4d5e6f708091c40",
      "name": "Basic",
      "category": { "id": "68b3f1c2a4d5e6f708091a2b", "title": "SellX", "slug": "sellx" },
      "durationHours": 720,
      "price": 49,
      "currency": "NOK",
      "maxListings": 1,
      "validityDays": 30,
      "isActive": true
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `maxListings` | How many listings this one purchase can create |
| `durationHours` | How long each **approved** listing stays live |
| `validityDays` | How long the purchase itself can still be spent |

### Buy one

```http
POST /api/v1/listing-purchases
Authorization: Bearer <token>
Content-Type: application/json

{ "packageId": "68b3f1c2a4d5e6f708091c40" }
```

Two possible successes — **branch on the status code**:

| Status | `data` | What to do |
| --- | --- | --- |
| `201` | The purchase object | Free package, already active. Go straight to the listing form. |
| `200` | `{ "checkoutUrl": "https://checkout.stripe.com/..." }` | Open the URL, let the user pay, then re-fetch `/listing-purchases/active`. |

### Find a spendable purchase

```http
GET /api/v1/listing-purchases/active
Authorization: Bearer <token>
```

```json
{
  "data": [
    {
      "id": "68b3f1c2a4d5e6f708091c4d",
      "packageSnapshot": {
        "name": "Basic",
        "category": "68b3f1c2a4d5e6f708091a2b",
        "categoryName": "SellX",
        "durationHours": 720,
        "price": 49,
        "maxListings": 1,
        "currency": "NOK",
        "validityDays": 30
      },
      "listingsUsed": 0,
      "listingsRemaining": 1,
      "status": "active",
      "purchasedAt": "2026-08-29T10:00:00.000Z",
      "expiresAt": "2026-09-28T10:00:00.000Z"
    }
  ]
}
```

Use `id` as the `purchaseId` on the listing. Only offer purchases where
`packageSnapshot.category` equals the SellX category id and `listingsRemaining > 0`.

---

## Step 3 — Create the listing

```http
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### The three multipart parts

| Part | Required | Rules |
| --- | --- | --- |
| `data` | ✔ | The **entire** listing body as a JSON string |
| `images` | ✔ | 1–10 files. `image/jpeg`, `image/png`, `image/webp`, `image/gif`. 5 MB each. SVG is rejected. |
| `documents` | – | 0–5 PDFs, 5 MB each. Not used by the SellX form — Property uses it. |

The body goes in `data` as **JSON**, not as flat form fields — nested objects (`location`,
`privacy`, `contacts`) would not survive otherwise. 15 files total across both file fields.

### Body fields

Everything below lives inside the `data` JSON.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The SellX category id from step 1 |
| `purchaseId` | ObjectId string | ✔ | From step 2. Omit only when a store subscription covers the listing. |
| `storeId` | ObjectId string | – | Post as a store. Must match the store's own category. |
| `title` | string | ✔ | Trimmed, **2–120** characters |
| `description` | string | ✔ | Trimmed, **5–5000** characters |
| `transactionType` | enum | – | `for_sell` (default), `wants_to_buy`, `give_away` |
| `condition` | enum | – | `new`, `used` |
| `brand` | string | – | Free text, max 100. No whitelist — "Rolex", "Apple", anything. |
| `price` | number | ✔ | 0 – 1 000 000 000 NOK, at most two decimals |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | See below |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]`, `value` min 2 chars |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }`, each a boolean defaulting to `false` |
| `videoLink` | URL string | – | Absolute URL |
| `quantity` | integer | – | 0–10 000, whole numbers only. An empty string is rejected, not read as 0. Set it for multi-item listings so "mark sold" can count down. |

**Any other key is silently dropped.** Fields from other categories (`horsepower`, `plotSize`,
`bookCategory`, …) and server-owned fields (`status`, `user`, `promotion`, `viewCount`,
`totalPrice`, `media`) are stripped by validation — they do not error, they just never arrive.

### `location`

```json
{
  "address": "Karl Johans gate 1",
  "city": "Oslo",
  "country": "Norge",
  "latitude": 59.9139,
  "longitude": 10.7522
}
```

| Field | Type | Required |
| --- | --- | --- |
| `address` | string, min 2 | ✔ |
| `city` | string | – |
| `country` | string | – |
| `latitude` | number, −90…90 | ✔ |
| `longitude` | number, −180…180 | ✔ |

`location` is **mandatory on every listing**, coordinates included — resolve them (geocode or
device GPS) before submitting. They power the map and "near me" filters. Set `city` too: the
`city` filter matches that string, not the coordinates.

### `transactionType`

| Value | UI label | Price meaning |
| --- | --- | --- |
| `for_sell` | Sell (default selection) | The asking price |
| `wants_to_buy` | Buy | The **maximum** price the buyer will pay |
| `give_away` | Give Away | Must be **0** |

There is no separate `maxPrice` field — relabel the same `price` input to "Max price" when the
user picks Buy. `for_rent` and `wants_to_rent` are **not valid** on SellX and return a `400`.

### `price` rules

Send a JSON number, or a string that is nothing but digits with at most two decimals.

| Sent | Result |
| --- | --- |
| `145000`, `"145000"`, `1500.50`, `"1500.50"` | Accepted |
| `""`, `"  "`, `null`, `[]`, `true` | `400` — **not** silently 0 |
| `"1.500"`, `"1 500"`, `"1,500"` | `400` — strip thousands separators client-side |
| `99.999` | `400` — at most two decimals |
| `-5` | `400` — cannot be negative |
| above `1000000000` | `400` — cap is 1 000 000 000 NOK |

Cross-field rule: when `transactionType` is `give_away`, `price` **must be 0**, otherwise the
request is rejected on the `price` field with `Price must be 0 when giving an item away`.

### Example — curl

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a2b",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "title": "Rolex Submariner Date 126610LN",
    "description": "Bought in 2022, full set with box and papers. Barely worn, no scratches.",
    "transactionType": "for_sell",
    "condition": "used",
    "brand": "Rolex",
    "price": 145000,
    "currency": "NOK",
    "location": {
      "address": "Karl Johans gate 1",
      "city": "Oslo",
      "country": "Norge",
      "latitude": 59.9139,
      "longitude": 10.7522
    },
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }],
    "privacy": { "hideName": false, "hideProfile": false, "hidePhone": true }
  }' \
  -F "images=@front.jpg" \
  -F "images=@back.jpg"
```

### Example — web (`FormData`)

```ts
const form = new FormData();

form.append('data', JSON.stringify(listing));
files.forEach((file) => form.append('images', file));

const res = await fetch(`${API_URL}/api/v1/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` }, // do NOT set Content-Type
  body: form,
});
```

Let the browser set `Content-Type` — setting it yourself drops the multipart boundary.

### Example — React Native

```ts
const form = new FormData();

form.append('data', JSON.stringify(listing));

images.forEach((image, i) => {
  form.append('images', {
    uri: image.uri,
    name: image.fileName ?? `photo-${i}.jpg`,
    type: image.mimeType ?? 'image/jpeg',
  } as unknown as Blob);
});
```

### `201 Created`

`data` is the created listing (see [Response object reference](#response-object-reference)).
Note `status` is `"draft"`.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "id": "68b3f1c2a4d5e6f708091d10",
    "category": "68b3f1c2a4d5e6f708091a2b",
    "media": [{ "url": "/uploads/products/9f1c2d3e-….jpg", "publicId": "9f1c2d3e-….jpg", "type": "image" }],
    "title": "Rolex Submariner Date 126610LN",
    "description": "Bought in 2022, full set with box and papers. Barely worn, no scratches.",
    "price": 145000,
    "currency": "NOK",
    "transactionType": "for_sell",
    "condition": "used",
    "brand": "Rolex",
    "totalPrice": 145000,
    "location": {
      "address": "Karl Johans gate 1",
      "city": "Oslo",
      "country": "Norge",
      "coordinates": { "type": "Point", "coordinates": [10.7522, 59.9139] }
    },
    "contacts": [{ "type": "phone", "value": "+47 900 12 345" }],
    "privacy": { "hideName": false, "hideProfile": false, "hidePhone": true },
    "promotion": { "isActive": false, "plan": "free", "metadata": { "boostScore": 0 } },
    "listingExpiresAt": null,
    "status": "draft",
    "quantity": 0,
    "favoriteCount": 0,
    "soldCount": 0,
    "viewCount": 0,
    "seller": { "id": "68b3f1c2a4d5e6f708091999", "firstName": "Ola", "lastName": "Nordmann", "avgRating": 0, "totalReviewCount": 0 },
    "isFavorite": false,
    "isReported": false,
    "createdAt": "2026-08-29T10:05:00.000Z",
    "updatedAt": "2026-08-29T10:05:00.000Z"
  }
}
```

### Create errors

| Status | `message` / `errorCode` | Cause |
| --- | --- | --- |
| `400` | `At least one image is required` | No `images` part |
| `400` | `VALIDATION_ERROR` + `errors[]` | A field failed the schema |
| `400` | `Category is required` / `CATEGORY_REQUIRED` | `category` missing from `data` |
| `400` | `Invalid category ID` / `INVALID_CATEGORY_ID` | Not a 24-char ObjectId |
| `404` | `Category not found` / `CATEGORY_NOT_FOUND` | Unknown category id |
| `400` | `A listing purchase or active subscription is required to create a product` | No `purchaseId` and no covering subscription |
| `404` | `Listing purchase not found` | Unknown `purchaseId` |
| `403` | `This listing purchase does not belong to you` | Someone else's purchase |
| `400` | `All listing slots in this purchase have been used` | `status` is not `active` |
| `400` | `This listing purchase has expired` | Past `expiresAt` |
| `400` | `This purchase is for category "…" but you are listing in a different category` | Package/category mismatch |
| `400` | `Product category must match store category` | `storeId` from another category |
| `403` | `Store is blocked and cannot create listings` | Blocked store |
| `400` | `FILE_TOO_LARGE` | A file over 5 MB |
| `400` | `INVALID_FILE` | Wrong MIME type, or more than 10 images |
| `401` | `UNAUTHORIZED` | Missing/expired token |

---

## Step 4 — Approval and visibility

A new listing is created with `status: "draft"`. `GET /products/public` only returns
`status: "active"`, so **a fresh listing is not in the feed yet**. An admin approves it
(`PATCH /products/:id/approve`, superAdmin only), which sets `status` to `active` and stamps
`listingExpiresAt` from the purchased package's `durationHours`.

| `status` | Meaning | In the public feed |
| --- | --- | --- |
| `draft` | Created, awaiting admin approval | No |
| `active` | Live | Yes |
| `sold` | Marked sold by the owner | No |
| `expired` | Past `listingExpiresAt` | No |
| `removed` | Soft-deleted by the owner | No |
| `rejected` | Rejected by an admin (`rejectionReason` is set) | No |

Show the owner their own `draft` listings through `GET /products/my` with a "pending review"
badge — otherwise they will think the submission failed.

---

## Editing a listing

```http
PATCH /api/v1/products/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

It is `PATCH` by name but **not** a partial update: the body is validated with the same schema as
`POST`, so `title`, `description`, `price` and `location` must all be present. Submit the
**complete** listing from your edit form.

| Behaviour | Detail |
| --- | --- |
| `category` | Optional — taken from the stored listing when omitted |
| `purchaseId` | Not needed; no new slot is consumed |
| `images` | Optional. Sending the part **replaces the whole set** and deletes the old files. Omit it to keep the existing images. |
| Ownership | `403 You can only update your own product` for someone else's listing |
| Category change | `400 Cannot change category on a listing with a listing purchase` |

There is no endpoint to delete a single image — re-upload the set you want to keep.

---

## Deleting a listing

```http
DELETE /api/v1/products/:id
Authorization: Bearer <token>
```

Soft delete: `status` becomes `removed` and the listing leaves every feed. Returns
`data: null`. `403` for a listing the user does not own.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=68b3f1c2a4d5e6f708091a2b&page=1&limit=20
```

Pass `category` to scope the feed to SellX. Query parameters that apply to SellX:

| Param | Type | Default | Behaviour |
| --- | --- | --- | --- |
| `page` | integer ≥ 1 | `1` | |
| `limit` | integer 1–50 | `20` | |
| `sort` | string | `-createdAt` | See the sort keys below |
| `search` | string | – | Case-insensitive substring of `title` **or** `description` |
| `category` | ObjectId | – | The SellX id |
| `condition` | `new` \| `used` | – | Exact match |
| `brand` | string | – | Case-insensitive **substring** match |
| `transactionType` | string | – | Exact match — `for_sell`, `wants_to_buy`, `give_away` |
| `minPrice` | number | – | `price >= minPrice` |
| `maxPrice` | number | – | `price <= maxPrice` |
| `city` | string | – | Case-insensitive substring of `location.city` |
| `near` | `"lat,lng"` | – | Geo search — **only applied together with `radius`** |
| `radius` | number (km) | – | Radius for `near` |
| `userId` | ObjectId | – | Only that seller's listings |
| `filter` | `today_best` \| `recently_viewed` | – | See below |

Sort keys (from the filter sheet):

| `sort` | Order |
| --- | --- |
| `relevance` | Boosted listings first, then newest (the sheet's default) |
| `-createdAt` | Newest first (the API default when `sort` is omitted) |
| `createdAt` | Oldest first |
| `price` | Price low → high |
| `-price` | Price high → low |
| `nearest` | Distance — only meaningful together with `near`; falls back to newest without it |

`filter=today_best` overrides `sort` with most-sold-then-newest. `filter=recently_viewed`
returns the signed-in user's recently viewed listings (an empty page when anonymous).

Only `status: "active"` listings are returned. With a token, listings the viewer has reported are
excluded and `isFavorite` / `isReported` are filled in.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products fetched successfully",
  "data": {
    "rows": [{ "id": "68b3f1c2a4d5e6f708091d10", "title": "Rolex Submariner Date 126610LN" }],
    "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7, "hasNextPage": true, "hasPrevPage": false }
  }
}
```

---

## Listing detail

```http
GET /api/v1/products/public/:id
```

`data` is one listing object. Each call **increments `viewCount`**, so do not call it to prefetch.
With a token it also records the listing in the viewer's "recently viewed" and fills
`isFavorite` / `isReported`.

`404 Product not found` for an unknown or deleted id.

> `GET /products/:id` (without `/public`) does not exist. Use this endpoint for detail pages.

---

## Filter sheet

The filter UI is server-driven — render what this returns instead of hard-coding it.

```http
GET /api/v1/filters/options?category=sellx
```

```json
{
  "data": {
    "category": "sellx",
    "filters": [
      { "key": "city",  "label": { "en": "Area", "no": "Område" }, "inputType": "location" },
      { "key": "near",  "label": { "en": "Area on map", "no": "Område i kart" }, "inputType": "map" },
      { "key": "price", "label": { "en": "Price", "no": "Pris" }, "inputType": "range" },
      {
        "key": "condition",
        "label": { "en": "Condition", "no": "Tilstand" },
        "inputType": "single_select",
        "options": [
          { "value": "new",  "label": { "en": "New",  "no": "Ny" } },
          { "value": "used", "label": { "en": "Used", "no": "Brukt" } }
        ]
      },
      {
        "key": "transactionType",
        "label": { "en": "Sale type", "no": "Salgsform" },
        "inputType": "single_select",
        "options": [
          { "value": "for_sell",     "label": { "en": "For sale",     "no": "Til salgs" } },
          { "value": "for_rent",     "label": { "en": "For rent",     "no": "Til leie" } },
          { "value": "give_away",    "label": { "en": "Give away",    "no": "Gis bort" } },
          { "value": "wants_to_buy", "label": { "en": "Wants to buy", "no": "Ønskes kjøpt" } }
        ]
      }
    ],
    "sorts": [
      { "key": "createdAt",  "label": { "en": "Oldest first",   "no": "Eldste først" } },
      { "key": "relevance",  "label": { "en": "Most relevant",  "no": "Mest relevant" }, "isDefault": true },
      { "key": "-createdAt", "label": { "en": "Newest first",   "no": "Nyeste først" } },
      { "key": "-price",     "label": { "en": "Price high-low", "no": "Pris høy-lav" } },
      { "key": "price",      "label": { "en": "Price low-high", "no": "Pris lav-høy" } },
      { "key": "nearest",    "label": { "en": "Nearest",        "no": "Nærmest" } }
    ]
  }
}
```

Each `filters[].key` maps 1:1 onto a `GET /products/public` query parameter, except:

| `key` | `inputType` | Send as |
| --- | --- | --- |
| `price` | `range` | `minPrice` and/or `maxPrice` |
| `near` | `map` | `near=lat,lng` **and** `radius=<km>` — the geo filter is ignored without both |
| `city` | `location` | `city=<name>` |

> **`transactionType` includes `for_rent` here, but no SellX listing can carry it** — the listing
> form only accepts `for_sell`, `wants_to_buy` and `give_away`. Selecting "Til leie" returns an
> empty result set. Hide the option on SellX if you would rather not show a dead filter.

---

## My listings, favourites, sold, boost, report

### The user's own listings

```http
GET /api/v1/products/my?filter=active&page=1&limit=20&search=rolex
```

`filter` is one of `active`, `draft`, `promoted`, `sold`, `expired` (omit for all). `search`
matches title or description. Returns `{ rows, meta }`.

### Favourites

```http
POST /api/v1/products/:id/favorite     -> data: { "isFavorite": true }
GET  /api/v1/products/favorites        -> { rows, meta }, every row isFavorite: true
```

`POST` toggles: call it again to un-favourite.

### Mark as sold

```http
POST /api/v1/products/:id/mark-sold
{ "quantity": 1 }
```

| Listing | Behaviour |
| --- | --- |
| No `quantity` set on the listing | `status` becomes `sold` immediately; `soldCount` increments |
| `quantity` set | `soldCount` grows by the body's `quantity` (default 1); `status` becomes `sold` only when the stock runs out |

`409 Not enough available quantity` when the body asks for more than is left.
`403` for a listing the user does not own.

### Boost

```http
GET  /api/v1/products/boost-plans        -> the active plans, cheapest first
POST /api/v1/products/:id/promote
{ "planId": "68b3f1c2a4d5e6f708091e01" }
```

The response is the updated listing with `promotion.isActive: true` and an `expiresAt`. Boosted
listings sort first under `sort=relevance`.

### Report

```http
POST /api/v1/products/:id/report
{ "reason": "scam_or_fraud", "details": "Asks for payment outside the app" }
```

`reason` must be one of `spam_or_misleading`, `scam_or_fraud`, `inappropriate_content`,
`wrong_category`, `duplicate_listing`, `fake_seller`, `other`. `details` is optional, max 500
characters. Returns `201` with `data: null`. Reporting twice returns
`409 You already reported this product`. Once reported, the listing disappears from that
viewer's feed.

---

## Response object reference

The same object shape is returned by create, update, detail and every list row.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Listing id |
| `category` | `string` | Category ObjectId |
| `media` | `{ url, publicId, type }[]` | `url` is relative — prefix with the API origin. `type` is `"image"`. |
| `title` | `string` | |
| `description` | `string` | |
| `price` | `number` | NOK. The max price on a `wants_to_buy` ad; `0` on a giveaway. |
| `totalPrice` | `number` | Server-computed. Equals `price` for SellX. |
| `currency` | `"NOK"` | |
| `transactionType` | `string` | `for_sell` \| `wants_to_buy` \| `give_away` |
| `condition` | `string` | `new` \| `used`. **Omitted** when unset. |
| `brand` | `string` | Omitted when unset. |
| `quantity` | `number` | `0` when the listing has no stock count |
| `location` | `object` | `{ address, city, country, coordinates: { type: "Point", coordinates: [lng, lat] } }` |
| `contacts` | `{ type, value }[]` | Omitted when none were sent |
| `privacy` | `{ hideName, hideProfile, hidePhone }` | Always returned. The flags mask `seller` and `contacts` — see the gotcha below. |
| `videoLink` | `string` | Omitted when unset |
| `promotion` | `object` | `{ isActive, plan, startedAt, expiresAt, durationDays, metadata: { boostScore, backgroundColor, label } }` |
| `status` | `string` | `draft` \| `active` \| `sold` \| `expired` \| `removed` \| `rejected` |
| `listingExpiresAt` | `string \| null` | ISO date. `null` until an admin approves. |
| `viewCount` | `number` | |
| `favoriteCount` | `number` | |
| `soldCount` | `number` | |
| `isFavorite` | `boolean` | `false` without a token |
| `isReported` | `boolean` | `false` without a token |
| `seller` | `object` | `{ id, firstName, lastName, avatarUrl, avgRating, totalReviewCount, phone }`. Name, avatar and phone are **omitted** when the seller's privacy flags hide them. |
| `createdAt` / `updatedAt` | `string` | ISO dates |

Unset optional fields are **omitted from the JSON entirely** — they are `undefined`, not `null`.
Code defensively (`listing.brand ?? ''`).

---

## Errors

| Status | `errorCode` | When |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body/query failed the schema. Carries `errors[]`. |
| `400` | `INVALID_ID` | A malformed ObjectId reached the database layer |
| `400` | `CATEGORY_REQUIRED` / `INVALID_CATEGORY_ID` / `CATEGORY_UNRESOLVED` | Category problems on create/update |
| `400` | `FILE_TOO_LARGE` | A file over 5 MB |
| `400` | `INVALID_FILE` | Wrong MIME type, or too many files |
| `401` | `UNAUTHORIZED` | Missing, malformed or expired token — refresh via `POST /auth/refresh-token` |
| `403` | `FORBIDDEN` | Someone else's listing, or a blocked store |
| `404` | `NOT_FOUND` / `CATEGORY_NOT_FOUND` / `STORE_NOT_FOUND` | Unknown id |
| `408` | `REQUEST_TIMEOUT` | The client aborted the request |
| `409` | `CONFLICT` | Already reported, or not enough quantity |
| `429` | `RATE_LIMITED` | Global limiter: 120 req/min in production |
| `500` | `INTERNAL_ERROR` | Server fault — quote the `requestId` |

Mapping validation errors onto a form:

```ts
const setServerErrors = (body: ApiError, setError: UseFormSetError<ListingForm>) => {
  for (const issue of body.errors ?? []) {
    setError(issue.field as keyof ListingForm, { message: issue.message });
  }
};
```

`field` uses dot paths: `title`, `price`, `location.address`, `contacts.0.type`.

---

## TypeScript types

```ts
export const TRANSACTION_TYPES = ['for_sell', 'wants_to_buy', 'give_away'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CONDITIONS = ['new', 'used'] as const;
export type Condition = (typeof CONDITIONS)[number];

export type ProductStatus = 'draft' | 'active' | 'sold' | 'expired' | 'removed' | 'rejected';

/** The body you put in the multipart `data` field. */
export interface SellxListingInput {
  category: string;
  purchaseId?: string;
  storeId?: string;
  title: string;
  description: string;
  transactionType?: TransactionType;
  condition?: Condition;
  brand?: string;
  price: number;
  currency?: 'NOK';
  location: {
    address: string;
    city?: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName?: boolean; hideProfile?: boolean; hidePhone?: boolean };
  videoLink?: string;
  quantity?: number;
}

export interface SellxListing {
  id: string;
  category: string;
  media: { url: string; publicId?: string; type: 'image' }[];
  title: string;
  description: string;
  price: number;
  totalPrice: number;
  currency: 'NOK';
  transactionType: TransactionType;
  condition?: Condition;
  brand?: string;
  quantity: number;
  location: {
    address: string;
    city?: string;
    country?: string;
    coordinates: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  };
  contacts?: { type: 'phone' | 'email' | 'whatsapp'; value: string }[];
  privacy?: { hideName: boolean; hideProfile: boolean; hidePhone: boolean };
  videoLink?: string;
  promotion: {
    isActive: boolean;
    plan: string;
    expiresAt: string | null;
    metadata: { boostScore: number };
  };
  status: ProductStatus;
  listingExpiresAt: string | null;
  viewCount: number;
  favoriteCount: number;
  soldCount: number;
  isFavorite: boolean;
  isReported: boolean;
  seller: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    avgRating: number;
    totalReviewCount: number;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  requestId?: string;
}

export interface Paginated<T> {
  rows: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

A matching Zod schema for the form:

```ts
const listingSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(5).max(5000),
    transactionType: z.enum(TRANSACTION_TYPES).default('for_sell'),
    condition: z.enum(CONDITIONS).optional(),
    brand: z.string().trim().max(100).optional(),
    price: z.number().min(0).max(1_000_000_000),
    location: z.object({
      address: z.string().trim().min(2),
      city: z.string().trim().optional(),
      country: z.string().trim().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
  })
  .refine((v) => v.transactionType !== 'give_away' || v.price === 0, {
    path: ['price'],
    message: 'Price must be 0 when giving an item away',
  });
```

---

## Gotchas

1. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the
   flattened `latitude` / `longitude`. The flattened pair used to be dropped; either works now.
2. **A new listing is `draft`, not `active`.** It will not appear in the public feed until an
   admin approves it. Show it in "My listings" with a pending badge.
3. **`PATCH` is a full replace.** Resend `title`, `description`, `price` and `location` even when
   only one of them changed.
4. **Re-sending `images` on `PATCH` deletes the old files.** Omit the part to keep them.
5. **Unknown fields are dropped silently, not rejected.** A typo'd field name returns `201` and
   the value is simply never stored — verify against the response, not the status code.
6. **`privacy` flags are enforced on read.** `hideName` omits the seller's name, `hideProfile`
   their avatar, and `hidePhone` both `seller.phone` and every `contacts` entry of type `phone` or
   `whatsapp`. Hidden fields are **absent**, not blank — never assume `seller.phone` exists. The
   seller sees their own details when the request carries their token.
7. **`GET /products/public/:id` increments `viewCount`.** Do not call it for prefetching or
   polling.
8. **`near` without `radius` does nothing.** Both must be present for the geo filter to apply.
9. **Media URLs are relative.** Always prefix with the API origin.

---

## Integration checklist

- [ ] Resolve the SellX `category` id from `GET /categories/public` by `slug`, never hard-code it
- [ ] Gate the listing form behind an active listing purchase (or a store subscription)
- [ ] Put the whole body in the multipart `data` field as a JSON string
- [ ] Require at least one image; cap the picker at 10 files and 5 MB each; block SVG
- [ ] Offer exactly three transaction types: Sell (default), Buy, Give Away
- [ ] Relabel `price` to "Max price" when the user picks Buy
- [ ] Force `price` to `0` when the user picks Give Away
- [ ] Send `price` as a raw number — never empty, never with thousands separators
- [ ] Make `description` required (5–5000) and `title` 2–120
- [ ] Geocode before submitting: `location.address`, `latitude` and `longitude` are all required
- [ ] Read coordinates from `location.latitude` / `longitude`, or the GeoJSON `coordinates`
- [ ] Show `draft` listings as "pending review" in My Listings
- [ ] On edit, submit the complete body; omit `images` unless replacing all of them
- [ ] Render the filter sheet from `GET /filters/options?category=sellx`
- [ ] Map `errors[]` onto form fields by the `field` dot path
- [ ] Prefix every `media.url` with the API origin

---

## Source

| Concern | File |
| --- | --- |
| Routes | `src/modules/products/product.routes.ts` |
| Category resolution + validation dispatch | `src/modules/products/product.middleware.ts` |
| SellX body schema | `src/modules/products/schemas/simple.schema.ts` |
| Shared fields, `price`, `location` | `src/modules/products/schemas/common.schema.ts` |
| Query/filter schema | `src/modules/products/product.validation.ts` |
| Controller | `src/modules/products/product.controller.ts` |
| Business logic | `src/modules/products/product.service.ts` |
| Response shaping | `src/modules/products/product.serializer.ts` |
| Stored model | `src/modules/products/products.model.ts` |
| Uploads | `src/infrastructure/storage/multer.config.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` |
| Listing slots | `src/modules/listing-package/`, `src/modules/listing-purchase/` |
| Error envelope | `src/shared/middlewares/globalErrorHandler.ts` |
