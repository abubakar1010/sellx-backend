# Bicycle Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **bicycle**.

Bike is the SellX form plus one field: `bikeType`. It shares its schema with SellX, Electronics,
Furniture, Clothing and Book, so **[`sellx.md`](./sellx.md) is the reference for everything not
listed here** — the listing-slot purchase, the multipart upload, the envelope, editing, deleting,
favourites, mark-sold, boost and report all behave identically.

This page covers what is specific to bikes, and repeats the form itself so you can build it
without switching documents.

---

## Contents

- [The form](#the-form)
- [Bike type](#bike-type)
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
`documents` part the bike form does not use. Resolve the category id from
`GET /categories/public` by `slug === "bike"`.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Bike category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `transactionType` | enum | – | `for_sell` (default), `wants_to_buy`, `give_away` |
| `title` | string | ✔ | Trimmed, 2–120 |
| `description` | string | **✔** | Trimmed, 5–5000 |
| `condition` | enum | – | `new` \| `used` |
| `brand` | string | – | Free text, max 100 |
| `bikeType` | enum | – | [Bike type](#bike-type) — 12 values |
| `price` | number | ✔ | 0 – 1 000 000 000 NOK, at most two decimals |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` — see [Privacy](#privacy) |
| `videoLink` | URL string | – | Absolute URL |
| `quantity` | integer | – | 0–10 000, whole numbers |

Anything else is stripped silently.

**Transaction type.** Exactly three: Sell (the default), Buy and Give Away. `for_rent` and
`wants_to_rent` are **not** valid and return a `400`. There is no separate max-price field —
relabel the same `price` input to "Max price" when the user picks Buy.

**Give Away** forces `price` to `0`; anything else is rejected on the `price` field with
`Price must be 0 when giving an item away`.

**Address.** The whole address goes in the one `address` string, plus `city`, `country` and the
coordinates. There is no separate postal-code or street field on any category. `latitude` and
`longitude` are required — geocode before submitting.

**Numbers.** `price` and `quantity` take a JSON number or a string of digits. `""`, `"  "`,
`null`, `[]` and `true` are a `400` — not read as 0.

---

## Bike type

`bikeType` is optional. The API accepts **12** values:

| Value | English | Norsk |
| --- | --- | --- |
| `barnesykkel_2_12` | Children's bike 2–12 yr | Barnesykkel 2-12 år |
| `bmx` | BMX | BMX |
| `bysykkel_sammenleggbare` | City / Folding | Bysykkel/sammenleggbare |
| `cyclocross_gravel` | Cyclocross / Gravel | Cyclocross/gravel |
| `elektriske` | Electric | Elektriske |
| `fulldamper` | Full suspension | Fulldemper |
| `hybrid` | Hybrid | Hybrid |
| `landevei` | Road | Landevei |
| `sparkesykkel` | Kick scooter | Sparkesykkel |
| `trehjulssykkel_lopesykkel` | Tricycle / Balance bike | Trehjulssykkel/løpesykkel |
| `terreng` | Mountain | Terreng |
| `andre` | Other | Andre |

Two things worth knowing about the list:

- **The listing form's spec prints eleven options**, merging kick scooters, tricycles and balance
  bikes into one line. The filter page splits them into `sparkesykkel` and
  `trehjulssykkel_lopesykkel`, and the API keeps both so either page works. If your form renders
  the spec's single combined option, pick one value for it and stay consistent.
- **The stored value is `fulldamper` while the Norwegian label is `Fulldemper`.** The value is a
  transcription slip that predates the listings now in the database, so it stays as-is; render the
  label, send the value.

---

## Privacy

The spec's privacy block applies to **every** category, and the API now enforces it:

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
> works — the buyer opens a conversation from the listing. Flag it if you need the reveal.

---

## Creating a listing

```bash
curl -X POST "$API/api/v1/products" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'data={
    "category": "68b3f1c2a4d5e6f708091a70",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "transactionType": "for_sell",
    "title": "Trek Marlin 7 terrengsykkel, str. L",
    "description": "Kjøpt i 2023, lite brukt. Nye dekk og nyservicet gir og bremser.",
    "condition": "used",
    "brand": "Trek",
    "bikeType": "terreng",
    "price": 6500,
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
  -F "images=@bike-1.jpg" -F "images=@bike-2.jpg"
```

`201` returns the listing with `status: "draft"` — it is **not** in the public feed until an admin
approves it. See [`sellx.md`](./sellx.md#step-4--approval-and-visibility).

With `hidePhone: true` above, other viewers get:

```json
{
  "seller": { "id": "68b3f1c2a4d5e6f708091999", "firstName": "Ola", "lastName": "Nordmann", "avgRating": 0, "totalReviewCount": 0 },
  "contacts": [],
  "privacy": { "hideName": false, "hideProfile": false, "hidePhone": true }
}
```

— no `seller.phone`, and the phone contact dropped from `contacts`.

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<bike id>&bikeType=terreng&condition=used
```

Everything in [`sellx.md`](./sellx.md#browsing-and-searching) applies, plus:

| Param | Type | Matches |
| --- | --- | --- |
| `bikeType` | string | Exact |

`transactionType` accepts `for_sell`, `wants_to_buy` and `give_away`; `brand` is a
case-insensitive substring match.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=bike
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `bikeType` | `single_select` | Bike type / Sykkeltype | `bikeType` — the 12 values |
| `condition` | `single_select` | Condition / Tilstand | `condition` |
| `transactionType` | `single_select` | Sale type / Salgsform | `transactionType` |

> The `transactionType` chip still lists **"Til leie" (`for_rent`)**, which no bike listing can
> carry — the form accepts only Sell, Buy and Give Away. Selecting it returns an empty list. Hide
> the option on the bike filter if you would rather not show a dead chip.

Sorts are the shared six: `relevance` (default), `-createdAt`, `createdAt`, `price`, `-price`,
`nearest`.

---

## Gotchas

1. **Three transaction types, not four.** `for_rent` is a `400` on the form even though the filter
   sheet still offers it.
2. **`description` is required** (5–5000) — the one field the spec marks required.
3. **Give Away means `price: 0`.** Force it client-side.
4. **`bikeType` is optional**, and the form spec's eleven options map onto twelve stored values.
5. **`fulldamper` is the value, "Fulldemper" the label.**
6. **Privacy is enforced now.** A hidden field is absent from the response, and `hidePhone` also
   empties phone and WhatsApp contacts. Do not assume `seller.phone` exists.
7. **Send the access token when fetching a seller's own listings**, or their own privacy settings
   will mask their own details back at them.
8. **A new listing is `draft`** until an admin approves it.
9. **`location` now returns `latitude` and `longitude`** alongside the GeoJSON `coordinates` — the
   flattened pair used to be dropped. Either shape works.
10. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero.

---

## Integration checklist

- [ ] Resolve the Bike `category` id from `GET /categories/public` by `slug`
- [ ] Offer exactly three transaction types: Sell (default), Buy, Give Away
- [ ] Relabel `price` to "Max price" when the user picks Buy, and force `0` for Give Away
- [ ] Make `description` required (5–5000) and `title` 2–120
- [ ] Render the 12-value `bikeType` picker from the filter sheet, not a hard-coded list
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Wire the three privacy toggles, and handle a `seller` object with fields missing
- [ ] Send the token on "my listings" so the owner sees their own details
- [ ] Hide the `for_rent` chip on the bike filter, or accept that it returns nothing
- [ ] Everything else: follow [`sellx.md`](./sellx.md)

---

## Source

| Concern | File |
| --- | --- |
| Bike body schema | `src/modules/products/schemas/simple.schema.ts` (`bikeSchema`) |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Bike types | `src/modules/products/product.enum.ts` (`BikeType`) |
| Privacy enforcement | `src/modules/products/product.serializer.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` (`BIKE_FILTERS`) |
| Everything else | [`sellx.md`](./sellx.md) |
