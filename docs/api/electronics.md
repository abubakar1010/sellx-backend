# Electronics, Furniture & Clothing — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage an **electronics**,
**furniture** or **clothing** item.

All three are the SellX form, unchanged — same schema, same fields, same rules, and identical to
each other. Only the category id and the brand suggestions differ; see
[Furniture and Clothing](#furniture-and-clothing). **[`sellx.md`](./sellx.md)
is the reference for everything not listed here**: the listing-slot purchase, the multipart
upload, the envelope, editing, deleting, favourites, mark-sold, boost and report all behave
identically.

This page repeats the form so you can build it without switching documents, and covers the two
things worth knowing: the brand filter, and the privacy rules the spec attaches to every
category.

---

## Contents

- [The form](#the-form)
- [Furniture and Clothing](#furniture-and-clothing)
- [Brand](#brand)
- [Privacy](#privacy)
- [Creating a listing](#creating-a-listing)
- [Browsing and searching](#browsing-and-searching)
- [Filter sheet](#filter-sheet)
- [Gotchas](#gotchas)
- [Integration checklist](#integration-checklist)
- [Source](#source)

---

## The form

```http
POST /api/v1/products
Content-Type: multipart/form-data
```

Three parts: `data` (the body as a JSON string), `images` (1–10 files, required), and an optional
`documents` part these forms do not use. Resolve the category id from `GET /categories/public` by
its `slug` — `electronics`, `furniture` or `clothing`.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The category id for whichever of the three this is |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `transactionType` | enum | – | `for_sell` (default), `wants_to_buy`, `give_away` |
| `title` | string | ✔ | Trimmed, 2–120 |
| `description` | string | **✔** | Trimmed, 5–5000 |
| `condition` | enum | – | `new` \| `used` |
| `brand` | string | – | **Free text**, max 100 — "Sony", "Apple", anything |
| `price` | number | ✔ | 0 – 1 000 000 000 NOK, at most two decimals |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` — see [Privacy](#privacy) |
| `videoLink` | URL string | – | Absolute URL |
| `quantity` | integer | – | 0–10 000, whole numbers |

Anything else is stripped silently — including the sibling simple categories' extras
(`bikeType`, `bookCategory`).

**Transaction type.** Exactly three: Sell (the default), Buy and Give Away. `for_rent` and
`wants_to_rent` return a `400`. There is no separate max-price field — relabel the same `price`
input to "Max price" when the user picks Buy.

**Give Away** forces `price` to `0`; anything else is rejected on the `price` field with
`Price must be 0 when giving an item away`.

**Address.** The whole address goes in the one `address` string, plus `city`, `country` and the
coordinates. There is no separate postal-code or street field on any category. `latitude` and
`longitude` are required — geocode before submitting.

**Numbers.** `price` and `quantity` take a JSON number or a string of digits. `""`, `"  "`,
`null`, `[]` and `true` are a `400` — not read as 0.

---

## Furniture and Clothing

Furniture and Clothing use **exactly** the form above — same schema, same required fields, same
three transaction types, same rules. Two things differ:

| | Slug | Brand examples the spec names |
| --- | --- | --- |
| **Electronics** | `electronics` | Sony, Apple |
| **Furniture** | `furniture` | Ikea, Samsung, LG |
| **Clothing** | `clothing` | Adidas, Nike, Gant |

Resolve each category id from `GET /categories/public` by its own `slug`, and fetch its own filter
sheet (`?category=furniture`, `?category=clothing`) — each ships its own brand suggestions. Nothing
else about the request or the response changes, so one form component can serve all three.

Brand is free text on all three: the spec's examples are examples, not a list.

---

## Brand

`brand` is **free text**, max 100 characters, with no list behind it. "Sony" and "Apple" are the
spec's examples, not a closed set — "Bang & Olufsen", "Bose" and "Sennheiser" are all valid.

The filter sheet's brand chip is therefore a **`text` input**, not a select. It ships a handful of
common brands in `options` — seven for furniture, ten for electronics, thirteen for clothing — but
those are **suggestions for an autocomplete**: the input accepts anything, and the query matches
**case-insensitively as a substring**:

```
?brand=sony      matches "Sony", "sony", "Sony Bravia"
?brand=bang      matches "Bang & Olufsen"
```

> It used to be a `single_select` over those handful of values, which meant a listing branded
> anything else could not be found through the brand chip at all. If you built a dropdown against
> the old sheet, switch it to a text input with the options as autocomplete hints.

---

## Privacy

The spec's privacy block applies to **every** category, and the API enforces it:

> Users can choose to hide their name, profile picture and phone number.

| Flag | Hides |
| --- | --- |
| `hideName` | `seller.firstName`, `seller.lastName` |
| `hideProfile` | `seller.avatarUrl` |
| `hidePhone` | `seller.phone`, **and every `contacts` entry of type `phone` or `whatsapp`** |

Hidden fields are **omitted** from the response, not blanked — check for `undefined`.
`seller.id`, `seller.avgRating` and `seller.totalReviewCount` are never hidden, and the `privacy`
object itself is always returned so an owner's UI can show the current setting.

Two viewers see through the mask: **the seller themselves** (send the access token — the API
compares the viewer to the listing's owner) and **moderation views**.

> The spec adds "until a buyer/contact initiates a conversation". That reveal is **not**
> implemented: a hidden number stays hidden even after a chat starts, because the products module
> cannot read the chat module's conversations under this codebase's layering rules. Contact still
> works — the buyer opens a conversation from the listing.

---

## Creating a listing

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a80",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "transactionType": "for_sell",
    "title": "Sony WH-1000XM5 trådløse hodetelefoner",
    "description": "Kjøpt i fjor, lite brukt. Eske, lader og etui følger med.",
    "condition": "used",
    "brand": "Sony",
    "price": 2800,
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
  -F "images=@headphones-1.jpg" -F "images=@headphones-2.jpg"
```

`201` returns the listing with `status: "draft"` — it is **not** in the public feed until an admin
approves it. See [`sellx.md`](./sellx.md#step-4--approval-and-visibility).

With `hidePhone: true` above, other viewers get no `seller.phone` and an empty `contacts` array.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<electronics id>&brand=sony&condition=used
```

Everything in [`sellx.md`](./sellx.md#browsing-and-searching) applies. There are no
electronics-specific parameters: `brand` (substring), `condition`, `transactionType`, `minPrice` /
`maxPrice`, `city`, `near` + `radius` and `search` are the useful ones.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=electronics
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `brand` | `text` | Brand / Merke | `brand` — substring match; `options` are suggestions |
| `condition` | `single_select` | Condition / Tilstand | `condition` |
| `transactionType` | `single_select` | Sale type / Salgsform | `transactionType` |

> The `transactionType` chip still lists **"Til leie" (`for_rent`)**, which no electronics listing
> can carry — the form accepts only Sell, Buy and Give Away. Selecting it returns an empty list.
> Hide the option, or accept the dead chip.

Sorts are the shared six: `relevance` (default), `-createdAt`, `createdAt`, `price`, `-price`,
`nearest`.

Furniture and Clothing return the identical sheet with their own brand suggestions.

---

## Gotchas

1. **Three transaction types, not four.** `for_rent` is a `400` on the form even though the filter
   sheet still offers it.
2. **`description` is required** (5–5000) — the one field the spec marks required.
3. **Give Away means `price: 0`.** Force it client-side.
4. **`brand` is free text and the filter is a text input.** Do not build a dropdown from the ten
   suggestions — most listings will not be in it.
5. **Privacy is enforced.** A hidden field is absent from the response, and `hidePhone` also
   empties phone and WhatsApp contacts. Do not assume `seller.phone` exists.
6. **Send the access token when fetching a seller's own listings**, or their own privacy settings
   will mask their own details back at them.
7. **A new listing is `draft`** until an admin approves it.
8. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the flattened
   `latitude` / `longitude`.
9. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero.

---

## Integration checklist

- [ ] Resolve the `category` id from `GET /categories/public` by `slug` — `electronics`, `furniture` or `clothing`
- [ ] Offer exactly three transaction types: Sell (default), Buy, Give Away
- [ ] Relabel `price` to "Max price" when the user picks Buy, and force `0` for Give Away
- [ ] Make `description` required (5–5000) and `title` 2–120
- [ ] Use a free-text input for `brand`, on the form **and** in the filter
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Wire the three privacy toggles, and handle a `seller` object with fields missing
- [ ] Send the token on "my listings" so the owner sees their own details
- [ ] Hide the `for_rent` chip on the filter, or accept that it returns nothing
- [ ] Everything else: follow [`sellx.md`](./sellx.md)

---

## Source

| Concern | File |
| --- | --- |
| Body schema | `src/modules/products/schemas/simple.schema.ts` (`electronicsSchema`, `furnitureSchema`, `clothingSchema` — all one alias) |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Privacy enforcement | `src/modules/products/product.serializer.ts` |
| Filter sheets | `src/modules/filter-options/filter-options.constants.ts` (`ELECTRONICS_FILTERS`, `FURNITURE_FILTERS`, `CLOTHING_FILTERS`) |
| Everything else | [`sellx.md`](./sellx.md) |
