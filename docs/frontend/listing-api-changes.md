# Listing API — What Changed and What to Do

Everything the client has to change for the new per-category listing validation.
Only the changes are here. Full field-by-field detail is in
[`docs/listing-forms-api.md`](../listing-forms-api.md); every accepted value is in
[`listing-constants.ts`](./listing-constants.ts).

Affects two endpoints: **`POST /api/v1/products`** and **`PATCH /api/v1/products/:id`**.
Everything else (browse, detail, favourites, filters, purchases) is unchanged apart from
extra fields appearing in responses, which you can ignore.

---

## 1. The one structural change

The server now picks a validation schema based on the listing's category, instead of using
one schema for all of them. Three consequences:

- **Fields from another category are dropped**, not stored. Sending `horsepower` on a book
  listing no longer errors — it silently disappears.
- **Required fields are enforced.** ~25 fields that used to be ignorable now return `400`.
- **`PATCH` is no longer a partial update.** It validates exactly like `POST`, so the edit
  screen must submit the complete listing, not a diff.

---

## 2. Request shape

Both endpoints are `multipart/form-data` with three parts:

| Part | Required | Rules |
|---|---|---|
| `data` | yes | The whole listing as a **JSON string** |
| `images` | yes on create | 1–10 files, JPEG/PNG/WebP/GIF, 5 MB each. **SVG is no longer accepted** — removed as a stored-XSS vector. |
| `documents` | no | 0–5 files, **`application/pdf` only**, 5 MB each — new |

`documents` is new. Previously `images` was the only file field.

```ts
const form = new FormData();
form.append('data', JSON.stringify(listing));          // everything goes in here

images.forEach((image, i) => form.append('images', {
  uri: image.uri,
  name: image.fileName ?? `photo-${i}.jpg`,
  type: image.mimeType ?? 'image/jpeg',
} as unknown as Blob));

if (valuationReport) form.append('documents', {        // property listings only
  uri: valuationReport.uri,
  name: valuationReport.name,
  type: 'application/pdf',
} as unknown as Blob);

await fetch(`${API_URL}/api/v1/products`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },       // do NOT set Content-Type
  body: form,
});
```

Two things that will bite:

- Nested objects (`location`, `privacy`, `viewings`, `contactPersons`) must be inside the
  `data` JSON. They do not survive as flat form fields.
- Sending new `images` on `PATCH` **replaces the whole set** and deletes the old files. Omit
  the part to keep them.

---

## 3. Send the discriminator

Five categories now branch, and the field that selects the branch is **required**. This is the
single most likely cause of a `400` after the upgrade.

| Category | Send | Values |
|---|---|---|
| `property` | `transactionType` | `for_sell`, `for_rent`, `wants_to_rent` |
| `car` | `vehicleType` | `personbil`, `bobil`, `campingvogn` |
| `boat` | `transactionType` | `for_sell`, `for_rent`, `wants_to_buy` |
| `motorcycle` | `mcType` | `motorsykkel`, `moped`, `atv`, `snoscooter` |
| `job` | `employmentType` | `heltid`, `deltid`, `lederstilling` |

Property's five user-facing choices map onto three values:

| User picks | Send |
|---|---|
| For Sale | `transactionType: "for_sell"` |
| For Rent | `transactionType: "for_rent"` |
| Wanted to Rent | `transactionType: "wants_to_rent"` |
| Cabins | `transactionType: "for_sell"` + `type: "hytte"` |
| Land Plot | `transactionType: "for_sell"` + `type: "tomter"` |

The six simple categories (`sellx`, `electronics`, `furniture`, `clothing`, `book`, `bike`)
don't branch. `transactionType` there is `for_sell` (default), `wants_to_buy` or `give_away` —
note `for_rent` is **not** valid on them.

---

## 4. Required fields per form

Beyond `title`, `price`, `location` and `category`, which were already required:

| Form | Now required |
|---|---|
| `sellx`, `electronics`, `furniture`, `clothing`, `book`, `bike` | `description` |
| `property` for sale *(and Cabins, Land Plot)* | `transactionType`, `type`, `ownershipType`, `municipalityNumber`, `farmNumber`, `usageNumber`, `usableArea`, `yearBuilt`, `bedrooms`, `commonExpenses`, `sharedCostsInclude`, `propertyTaxValue`, `additionalCosts`, `additionalCostsInclude`, `sharedDebt` |
| `property` for rent | `transactionType`, `primaryRoomArea`, `bedrooms` |
| `property` wanted to rent | `transactionType` |
| `car` — `personbil` | `vehicleType`, `taxClass`, `manufacturedYear`, `brand`, `carModel`, `fuel`, `transmission`, `driveType`, `bodyType`, `seats`, `bodyColor` |
| `car` — `bobil` | `vehicleType`, `motorhomeType`, `manufacturedYear`, `fuel`, `cylinderCapacity`, `horsepower`, `driveType`, `weight`, `totalWeight`, `length`, `registeredSeats`, `sleepingPlaces` |
| `car` — `campingvogn` | `vehicleType`, `manufacturedYear`, `sleepingPlaces`, `weight`, `totalWeight`, `condition` |
| `boat` for sale / for rent | `transactionType`, `type`, `manufacturedYear`, `length` |
| `boat` wanted to buy | `transactionType` |
| `motorcycle` | `mcType`, `manufacturedYear`, plus `motorcycleType` (if `motorsykkel`) or `mopedType` (if `moped`) |
| `job` | `employmentType`, `jobTitle`, `numberOfPositions`, `contractType`, `sector`, `industry`, `employerName` |

`location` requires `latitude` and `longitude` on every category — resolve coordinates before
submitting.

---

## 5. Four cross-field rules

These pass field-level validation and then fail, so they need handling in the form:

| Rule | Applies to |
|---|---|
| `price` must be `0` when `transactionType` is `give_away` | The six simple categories |
| `reRegistrationFee` required unless `reRegistrationExempt` is `true` | `car` (all three), `motorcycle` |
| `rentalPeriodEnd` must be after `rentalPeriodStart` | `property` for rent |
| `keywords` max 5 entries | `job` |

---

## 6. Two stored values changed shape

Existing screens will send the old values and be rejected.

### `floorLevel` — number → string

Now `"kjeller"`, `"1"`…`"8"`, `"over_8"`. Change the picker to emit strings; basement and
above-8th were previously unsettable.

### `fuel` — English → Norwegian, and the set differs per category

| Old | `car` / `bobil` | `boat` | `motorcycle` |
|---|---|---|---|
| `petrol` | `bensin` | `bensin` | `bensin` |
| `diesel` | `diesel` | `diesel` | `diesel` |
| `electric` | `elektrisitet` | `elektrisitet` | `elektrisitet` |
| `hybrid` | `elektrisitet_bensin` | `hybrid` | `elektrisitet` |
| `cng` | `gass` | `andre` | — omit |
| `other` | — omit | `andre` | — omit |

Car also gains `elektrisitet_diesel`, `gass_bensin`, `gass_diesel` and `hydrogen`. Full lists
are in `listing-constants.ts` as `CAR_FUEL_TYPE_OPTIONS`, `BOAT_FUEL_TYPE_OPTIONS` and
`MC_FUEL_TYPE_OPTIONS`.

Listings already in the database are converted by `npm run migrate:product-fields`.

---

## 7. Stop sending these — the server computes them

| Field | Rule |
|---|---|
| `totalPrice` | property: `price + sharedDebt + additionalCosts`; car and motorcycle: `price + reRegistrationFee` (0 when exempt); otherwise `price` |
| `price` | forced to `0` for `job` listings and `give_away` |
| `showingDate` | taken from `viewings[0].date` |

Read `totalPrice` from the response instead of recomputing it, or the two will disagree.

---

## 8. Small additions

- **`privacy`** gains `hidePhone`: `{ hideName, hideProfile, hidePhone }`.
  *These are now enforced on read — see §11.12.*
- **`viewings`** replaces the single showing date on property forms — an array of
  `{ date, fromTime, toTime }`, several slots allowed. `fromTime`/`toTime` must be `HH:MM`.
- **`contactPersons`** on job ads — up to 10 of `{ name, title?, phone?, email? }`.
- **`videoLink`** on every category, **`virtualTourLink`** on property for sale.
- **Colours are free text.** `bodyColor`, `colorDescription`, `interiorColor` (car) and
  `color` (boat) take any string — use a text input, not a picker.
- **Boat equipment is free text** too, in `equipmentDescription` — not checkboxes, unlike
  car, motorhome, caravan and motorcycle.

---

## 9. Error handling

A failed validation returns `400` with a flat `errors` array you can map straight onto fields:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid input",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "field": "municipalityNumber", "message": "Invalid input" },
    { "field": "viewings.0.fromTime", "message": "Time must be in HH:MM format" }
  ]
}
```

```ts
if (!response.ok) {
  const error = await response.json();
  if (error.errorCode === 'VALIDATION_ERROR' && error.errors) {
    error.errors.forEach(({ field, message }) => setFieldError(field, message));
    return;
  }
  showToast(error.message);
}
```

`field` uses dot/index paths for nested values (`viewings.0.fromTime`,
`contactPersons.1.email`, `equipment.3`).

Other codes you may hit: `CATEGORY_REQUIRED`, `INVALID_CATEGORY_ID`, `CATEGORY_NOT_FOUND`,
and `INVALID_FILE` for a wrong MIME type on `images` or `documents`.

---

## 10. Where the values come from

Copy [`listing-constants.ts`](./listing-constants.ts) into the app. It has all 45 option sets
with English and Norwegian labels, plus a union type per set:

```ts
import { PROPERTY_TYPE_OPTIONS, type PropertyType } from './listing-constants';

<Picker>
  {PROPERTY_TYPE_OPTIONS.map((o) => (
    <Picker.Item key={o.value} value={o.value} label={locale === 'no' ? o.no : o.en} />
  ))}
</Picker>
```

Filter sheets should keep using `GET /api/v1/filters/options?category=<slug>` — that endpoint
is unchanged and still returns the fields, input types and options to render.

---

## 11. Second round — brands, mileage, gearbox, rentals

Landed after the first batch above. Four of the five need client work.

### 11.1 Vehicle brands are now validated (breaking)

`brand` used to be any string up to 100 characters. It is now checked against a fixed list, and
a **car**'s `carModel` must belong to the brand it is filed under — an Audi "Model S" is a `400`.

| Category | `brand` | `carModel` |
|---|---|---|
| Car — `personbil` | Required, from the list (117) | Required, must match the brand (1457 models) |
| Car — `bobil` / `campingvogn` | Optional, from the list (135) | Optional, free text |
| Boat | Optional, from the list (799) | Optional, free text |
| Motorcycle | Optional, from the list (263) | Optional, free text |
| SellX, Electronics, Furniture, Clothing, Bike | Optional, still free text | – |

**Do not hardcode the lists** — they are 2,750 entries and they change. Two endpoints drive the
dropdowns:

```
GET /api/v1/filters/options?category=car     → the brand field's options[]
GET /api/v1/filters/models?category=car&brand=Audi
                                             → ["A1","A2",…,"Andre"]
```

The `carModel` field comes back with `options: []` and `dependsOn: { field: "brand" }`. Keep it
disabled until a brand is picked, then fetch its models. Only `category=car` returns models —
everything else is free text, so render a text input. An unknown brand returns `[]`, not an error.

`Andre` ("Other") is accepted as `carModel` for **every** car brand, including the 16 the spec
never gave one (Nissan, Chevrolet, Citroën, Tesla among them). Users whose exact model is missing
should pick `Andre` and put the detail in `variant`.

One gap worth knowing: the source spec's boat list skips G–L entirely, so there is no Jeanneau,
Hanse, Hallberg-Rassy, Lagoon or Linder. Those go under `Andre` until the spec is amended.

Full detail: [Brands and models](../listing-forms-api.md#brands-and-models).

### 11.2 Car `mileage` is now required (breaking)

Spec field 27 always said `(required)`; the schema had it optional. It is now required on the
**car** form only — caravans and motorhomes still leave it optional.

This bites on `PATCH` too, since edits validate exactly like creates. **An edit screen that does
not carry `mileage` through will start failing.**

### 11.3 Car gearbox is `manual` or `automatic` only (breaking)

`transmission` on a car no longer accepts `semi_automatic`. The other vehicle forms are unchanged.
Same `PATCH` caveat as above if your edit screen round-trips a stored `semi_automatic`.

### 11.4 Motorhome equipment gained 17 options (additive)

`equipment` on a `bobil` offered 31 of the spec's 48. The missing 17 are now accepted:
`dieselpartikkelfilter`, `sentrallas`, `luftfjaering`, `elvarme`, `gulvvarme`, `varmtvann`,
`myggdor`, `gassuttak`, `kjoleskap`, `mikrobolgeovn`, `stekeovn`, `skinninterior`, `roykfri`,
`cruisekontroll`, `ryggekamera`, `kjorecomputer`, `navigasjonssystem`.

Nothing to change beyond re-pulling `listing-constants.ts` — the checkbox list grows on its own.

### 11.5 `price` is validated strictly (breaking)

`price` was coerced, which meant `''`, `'  '`, `null` and `[]` all arrived as **0** and `true`
as **1**. An empty price input therefore posted a free listing instead of failing, and the
Norwegian thousands form `'1.500'` was stored as 1.5 kroner.

`price` now accepts a JSON number, or a string that is nothing but digits with at most two
decimals. Everything else is a `400` on the `price` field.

| Sent | Before | Now |
|---|---|---|
| `4500`, `"4500"`, `1500.50` | 4500 / 4500 / 1500.50 | unchanged |
| `""`, `"  "`, `null`, `[]` | **0** | `400` |
| `true` | **1** | `400` |
| `"1.500"`, `"1 500"`, `"1,500"` | **1.5** / `400` / `400` | `400` |
| `99.999` | 99.999 | `400` — max two decimals |
| `1e12` | 1000000000000 | `400` — max 1 000 000 000 NOK |

Send the raw number: strip thousands separators, and do not submit the field empty. Keep the
price input required client-side, since an empty one is no longer silently free.

### 11.6 Every money, area and count field is validated the same way (breaking)

§11.5 applied to `price` only. The same rule now covers every numeric field on every form —
`commonExpenses`, `sharedDebt`, `additionalCosts`, `propertyTaxValue`, `deposit`, `leaseFee`,
`usableArea`, `primaryRoomArea`, `plotSize`, `bedrooms`, `totalRooms`, `numberOfTenants`,
`quantity` and the rest.

`''`, `'  '`, `null`, `[]` and `true` used to arrive as **0** (or 1). On property this was worse
than a wrong number: `sharedDebt` and `additionalCosts` feed the auto-calculated `totalPrice`, so
a blank input silently understated the advertised total. All of them are now a `400` on the field.

Money and areas allow at most two decimals; counts must be whole numbers. Error messages name the
field — `"Shared debt cannot be negative"`, `"Number of bedrooms must be a whole number"`.

### 11.7 Property: Land Plot, the wanted-to-rent form, and the type list (breaking)

Three property changes:

| Change | What to do |
|---|---|
| **Land Plot no longer demands building fields** | When `type` is `tomter`, `usableArea`, `yearBuilt` and `bedrooms` are optional. Hide them on that choice. Every other For Sale requirement is unchanged, and Cabins still uses the For Sale form as-is. |
| **`wants_to_rent` rejects property measurements** | `type`, `internalArea`, `externalArea`, `balconyArea`, `primaryRoomArea`, `bedrooms` and `viewings` are stripped from a wanted ad — it describes the tenant, not a property. Remove them from that form. |
| **The `type` picker is 9 values, not 11** | `bygaard_flermannsbolig` and `produksjon_industri` are filter-only and now `400` on the form. Drop them from the listing picker; the filter sheet may keep them, it just returns nothing. |

Also: **images are now optional on the property `wants_to_rent` form**, matching the spec's
"option to upload images". Every other form still rejects a create without at least one.

### 11.8 Car: the registration block, colours and the motorhome type (breaking)

| Change | What to do |
|---|---|
| **The caravan form drops the registration block** | `registrationNumber`, `chassisNumber`, `numberOfOwners`, `firstRegistered` and `maintenanceProgramFollowed` are stripped from a `campingvogn` listing — the spec's caravan form asks for none of them. Remove those inputs. |
| **Colours are car-only** | `bodyColor`, `colorDescription` and `interiorColor` are stripped from motorhome and caravan listings. |
| **`hasConditionReport` is motorhome/caravan-only** | The car form asks for `conditionReportProvider` (`naf` / `viking`) instead. |
| **`motorhomeType` is optional** | The spec lists the five types without marking the field required. Sending it is still fine. |

Numbers on all three vehicle forms now follow §11.6: `mileage`, `reRegistrationFee`,
`horsepower`, `doors`, `trunkVolume`, `trailerWeight`, `numberOfOwners`, and the caravan and
motorhome weights, lengths and seat counts reject `''`, `null` and booleans instead of reading
them as 0. **`reRegistrationFee: ""` used to satisfy the "required unless exempt" rule as a zero
fee** and then understate the computed total price — send `0`, or set
`reRegistrationExempt: true`.

Weights are kilograms, lengths centimetres, `cylinderCapacity` litres. `weight`, `totalWeight`,
`length`, `seats`, `registeredSeats` and `sleepingPlaces` must be at least 1.

### 11.9 Car filter sheet: condition scoping and colour inputs (breaking for the filter UI)

Two chips on `GET /filters/options?category=car` could not work against what listings store.

| Chip | Was | Now |
|---|---|---|
| `condition` | Unscoped, and the car form has no condition field — tapping "Used" hid **every passenger car** | Carries `dependsOn: { field: "vehicleType", values: ["bobil", "campingvogn"] }`. Show it only for those two. |
| `bodyColor`, `interiorColor` | `single_select` with **no `options`** — an empty dropdown, and the query matched exactly, so `"Sort"` missed `"sort"` | `inputType: "text"`. Render an input; the query matches case-insensitively as a substring, and a comma-separated list matches any term. |

Two additive changes to the filter contract come with this:

- `inputType` gains `"text"` — a field with no `options`; render an input, not a picker.
- `dependsOn` gains `values?: string[]` alongside the existing `value?: string` — "only applies
  while the parent field holds one of these". Handle it the same way you handle `value`.

Nothing else in the sheet changed, and a client that ignores both keeps working exactly as before.

### 11.10 Boat: measurements, and two filter-sheet corrections

Numbers on the boat form follow §11.6: `horsepower`, `maxSpeedKnots`, `width`, `depth`, `weight`,
`seats` and `sleepingPlaces` reject `''`, `null` and booleans instead of reading them as 0.
`length` was already safe through its minimum. Units are named in the error — **length in feet**,
width and depth in centimetres, weight in kilograms, top speed in knots.

Two filter-sheet corrections:

| Change | What to do |
|---|---|
| **The `condition` chip is gone** | Neither boat form collects a condition, so the chip returned an empty list whatever was picked. Remove it from the boat filter UI. |
| **The year range is keyed `manufacturedYear`, not `year`** | Every other sheet keys a range by the field it filters, and there is no `year` query parameter — the pair has always been `minYear`/`maxYear`. Update any key-based lookup. |

### 11.11 Motorcycle: numbers

Numbers on the MC form follow §11.6: `horsepower`, `displacement`, `weight`, `mileage`,
`numberOfOwners` and `reRegistrationFee` reject `''`, `null` and booleans instead of reading them
as 0. As on the car and caravan forms, `reRegistrationFee: ""` used to satisfy the "required
unless exempt" rule as a zero fee and understate the computed total — send `0`, or set
`reRegistrationExempt: true`.

Units are named in the error: **displacement in ccm**, weight in kilograms, mileage in kilometres.

Nothing else on the MC form changed — the sub-type rules, the 263 makes, the 34 equipment values
and the four vehicle types were already correct.

### 11.12 Privacy is enforced, and `location` returns its flattened coordinates (breaking)

Two response-shape changes, on **every category**.

**Privacy.** The `privacy` flags were stored and then ignored, so the setting did nothing and this
document told you to hide the fields yourself. The API now applies them:

| Flag | Omits |
|---|---|
| `hideName` | `seller.firstName`, `seller.lastName` |
| `hideProfile` | `seller.avatarUrl` |
| `hidePhone` | `seller.phone`, **and every `contacts` entry of type `phone` or `whatsapp`** |

Hidden fields are **absent from the JSON**, not blank — stop assuming `seller.phone` exists, and
drop the client-side masking. `seller.id`, `avgRating` and `totalReviewCount` are never hidden,
and `privacy` itself is still returned so an owner's UI can show the setting.

Send the access token on a seller's own screens ("My listings", the edit form): the API compares
the viewer to the listing's owner and shows a seller their own details unmasked. Without a token
they see their own listing masked.

The spec's "until a buyer initiates a conversation" reveal is **not** implemented — a hidden
number stays hidden. Contact still works through the in-app chat.

**Location.** `location.latitude` and `location.longitude` were documented but never arrived: the
raw document's `location` overwrote the shaped one on the way out. They are now returned alongside
the GeoJSON `coordinates`, so either shape works. Purely additive.

### 11.13 Job: two dead filter chips and one contract type (breaking)

| Change | What to do |
|---|---|
| **Remote work is `remoteWorkType`, not `remoteWork`** | The old chip filtered a boolean the job form never writes, so *both* answers returned an empty list. It now offers `delvis_hjemmearbeid` and `kun_hjemmearbeid`, and the query parameter is `remoteWorkType`. |
| **The ad-type chip gained Lederstilling** | It listed only Heltid and Deltid, so a third of the ad types could not be filtered for. |
| **`bemanningsbyra` is filter-only** | The form's Ansettelsesform list is the spec's eight; sending the ninth is now a `400`. Drop it from the listing picker — the filter may keep it. |

`numberOfPositions` also follows §11.6 and rejects `''`, `null` and booleans.

### 11.14 Electronics, Furniture, Clothing: the brand filter is a text input

`brand` is free text on these three forms — the spec gives examples, not a list — but the filter
chip was a `single_select` over ten, six and twelve hardcoded brands. A listing branded anything
else could not be found through the chip at all.

The chip is now `inputType: "text"`. The curated lists ride along in `options` as **suggestions**
for an autocomplete; the input accepts anything, and the query already matched case-insensitively
as a substring, so `?brand=bang` finds "Bang & Olufsen".

Swap the dropdown for a text input with the options as hints. The car, boat and motorcycle brand
chips are unchanged and stay selects — those lists *are* validated on the form.

---

## Checklist

### Second round

- [ ] Drive `brand` from `GET /api/v1/filters/options`, not a hardcoded list
- [ ] Keep `carModel` disabled until `brand` is chosen, then load `/filters/models`
- [ ] Use a text input for boat / motorcycle / caravan / motorhome models
- [ ] Offer `Andre` as a model, and `variant` for the detail
- [ ] Make `mileage` required on the car form — **including the edit screen**
- [ ] Drop `semi_automatic` from the car gearbox picker
- [ ] Re-pull `listing-constants.ts` for the 17 new motorhome equipment options
- [ ] Never submit `price` empty or formatted — send a raw number
- [ ] Same for every other numeric input: money, areas, bedrooms, quantity
- [ ] Property: hide the building fields on Land Plot, and the measurements on Wanted to Rent
- [ ] Property: drop `bygaard_flermannsbolig` and `produksjon_industri` from the type picker
- [ ] Property: make the image picker optional on Wanted to Rent
- [ ] Car: remove the registration block from the caravan form, and colours from caravan and motorhome
- [ ] Car: send `0` or `reRegistrationExempt: true` — never an empty re-registration fee
- [ ] Car filters: honour `dependsOn.values` on the condition chip, and render the colours as text inputs
- [ ] Boat: drop the condition chip, and re-key the year range to `manufacturedYear`
- [ ] Motorcycle: never submit an empty number — especially the re-registration fee
- [ ] Handle a `seller` object with name, avatar or phone missing, and drop the client-side privacy masking
- [ ] Send the token on the seller's own screens so they see their own details
- [ ] Job: send `remoteWorkType`, add Lederstilling to the ad-type filter, drop `bemanningsbyra` from the form
- [ ] Electronics/Furniture/Clothing: swap the brand dropdown for a text input with suggestions

### First round

- [ ] Put the whole body in the `data` field as JSON
- [ ] Send the discriminator on property, car, boat, motorcycle and job
- [ ] Add the newly required fields per form (section 4)
- [ ] Handle the four cross-field rules (section 5)
- [ ] Switch `floorLevel` to strings and `fuel` to the Norwegian values (section 6)
- [ ] Stop sending `totalPrice`; display the returned value
- [ ] Add the `documents` file part on the property for-sale form
- [ ] Make the edit screen submit the complete listing, not a diff
- [ ] Add `hidePhone` to the privacy toggles
- [ ] Replace the single showing date with the `viewings` array
- [ ] Remove the price input from the job form
- [ ] Map `errors[]` onto form fields by `field` path
