# Books Category — Frontend Integration Guide

Everything the client needs to list, edit, browse, filter and manage a **book**.

Books is the SellX form with one swap: there is **no Brand Name field**, and a **Book category**
picker in its place. **[`sellx.md`](./sellx.md) is the reference for everything not listed
here** — the listing-slot purchase, the multipart upload, the envelope, editing, deleting,
favourites, mark-sold, boost and report all behave identically.

---

## Contents

- [The form](#the-form)
- [Book category](#book-category)
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
`documents` part the books form does not use. Resolve the category id from
`GET /categories/public` by `slug === "book"`.

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `category` | ObjectId string | ✔ | The Books category id |
| `purchaseId` | ObjectId string | ✔ | Unless a store subscription covers it |
| `storeId` | ObjectId string | – | Must match the store's own category |
| `transactionType` | enum | – | `for_sell` (default), `wants_to_buy`, `give_away` |
| `title` | string | ✔ | Trimmed, 2–120 |
| `description` | string | **✔** | Trimmed, 5–5000 |
| `condition` | enum | – | `new` \| `used` |
| `bookCategory` | enum | – | [Book category](#book-category) — 4 values |
| `price` | number | ✔ | 0 – 1 000 000 000 NOK, at most two decimals |
| `currency` | `"NOK"` | – | Defaults to `NOK` |
| `location` | object | ✔ | `{ address, city?, country?, latitude, longitude }` |
| `contacts` | array | – | `[{ "type": "phone" \| "email" \| "whatsapp", "value": "…" }]` |
| `privacy` | object | – | `{ hideName, hideProfile, hidePhone }` — see [Privacy](#privacy) |
| `videoLink` | URL string | – | Absolute URL |
| `quantity` | integer | – | 0–10 000, whole numbers |

**There is no `brand` field on this form.** The books spec replaces Brand Name with Book category,
so a `brand` sent here is stripped — accepted, never stored, never returned. Do not render the
input. (Sibling categories' extras like `bikeType` are stripped the same way.)

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

## Book category

`bookCategory` is **optional** — the spec does not mark it required — and takes one of four
values:

| Value | Norsk | English |
| --- | --- | --- |
| `videregaende` | Videregående bøker | High school books |
| `universitet` | Universitetsbøker | University books |
| `barneboker` | Barnebøker | Children's books |
| `romaner` | Romaner | Novels |

Anything else is a `400` on `bookCategory`. There is no "Andre" escape hatch on this list, so if a
seller's book fits none of the four, leave the field out rather than guessing.

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
    "category": "68b3f1c2a4d5e6f708091a90",
    "purchaseId": "68b3f1c2a4d5e6f708091c4d",
    "transactionType": "for_sell",
    "title": "Clean Code — Robert C. Martin",
    "description": "Pensumbok fra IT-studiet. Lite brukt, ingen notater eller understrekninger.",
    "condition": "used",
    "bookCategory": "universitet",
    "price": 350,
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
  -F "images=@book-front.jpg" -F "images=@book-back.jpg"
```

`201` returns the listing with `status: "draft"` — it is **not** in the public feed until an admin
approves it. See [`sellx.md`](./sellx.md#step-4--approval-and-visibility).

---

## Browsing and searching

```http
GET /api/v1/products/public?category=<book id>&bookCategory=universitet&condition=used
```

Everything in [`sellx.md`](./sellx.md#browsing-and-searching) applies, plus:

| Param | Type | Matches |
| --- | --- | --- |
| `bookCategory` | string | Exact |

`search` matches the `title` and `description`, which is how a buyer finds a specific title or
author — there is no dedicated author or ISBN field.

---

## Filter sheet

```http
GET /api/v1/filters/options?category=book
```

| `key` | `inputType` | Label (en / no) | Send as |
| --- | --- | --- | --- |
| `city` | `location` | Area / Område | `city` |
| `near` | `map` | Area on map / Område i kart | `near` **and** `radius` |
| `bookCategory` | `single_select` | Category / Kategori | `bookCategory` — the 4 values |
| `condition` | `single_select` | Condition / Tilstand | `condition` |
| `transactionType` | `single_select` | Sale type / Salgsform | `transactionType` |

There is **no brand chip**, matching the form.

> The `transactionType` chip still lists **"Til leie" (`for_rent`)**, which no book listing can
> carry — the form accepts only Sell, Buy and Give Away. Selecting it returns an empty list. Hide
> the option, or accept the dead chip.

Sorts are the shared six: `relevance` (default), `-createdAt`, `createdAt`, `price`, `-price`,
`nearest`.

---

## Gotchas

1. **No Brand Name field.** Books swap it for Book category; a `brand` sent here is silently
   dropped.
2. **Three transaction types, not four.** `for_rent` is a `400` on the form even though the filter
   sheet still offers it.
3. **`description` is required** (5–5000) — the one field the spec marks required.
4. **Give Away means `price: 0`.** Force it client-side.
5. **`bookCategory` is optional and has no "Other".** Leave it out rather than guessing.
6. **Privacy is enforced.** A hidden field is absent from the response, and `hidePhone` also
   empties phone and WhatsApp contacts.
7. **Send the access token when fetching a seller's own listings**, or their own privacy settings
   will mask their own details back at them.
8. **A new listing is `draft`** until an admin approves it.
9. **`location` returns both shapes** — the GeoJSON `coordinates` (`[lng, lat]`) and the flattened
   `latitude` / `longitude`.
10. **Numeric inputs must never be submitted empty.** `""` is a `400`, not a zero.

---

## Integration checklist

- [ ] Resolve the Books `category` id from `GET /categories/public` by `slug`
- [ ] Render a Book category picker, and **no** Brand Name input
- [ ] Offer exactly three transaction types: Sell (default), Buy, Give Away
- [ ] Relabel `price` to "Max price" when the user picks Buy, and force `0` for Give Away
- [ ] Make `description` required (5–5000) and `title` 2–120
- [ ] Geocode the address; `latitude` and `longitude` are required
- [ ] Wire the three privacy toggles, and handle a `seller` object with fields missing
- [ ] Send the token on "my listings" so the owner sees their own details
- [ ] Hide the `for_rent` chip on the filter, or accept that it returns nothing
- [ ] Everything else: follow [`sellx.md`](./sellx.md)

---

## Source

| Concern | File |
| --- | --- |
| Books body schema | `src/modules/products/schemas/simple.schema.ts` (`bookSchema`) |
| Shared fields, numbers, `location` | `src/modules/products/schemas/common.schema.ts` |
| Book categories | `src/modules/products/product.enum.ts` (`BookCategory`) |
| Privacy enforcement | `src/modules/products/product.serializer.ts` |
| Filter sheet | `src/modules/filter-options/filter-options.constants.ts` (`BOOK_FILTERS`) |
| Everything else | [`sellx.md`](./sellx.md) |
