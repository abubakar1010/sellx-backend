# API Documentation

The frontend-facing reference for the SellX API. One document per category or feature area,
written to be read while building a screen — endpoints, exact field rules, real request and
response bodies, error tables and a copy-pasteable TypeScript block.

Everything here is verified against the code in `src/`, not against an older spec. Each document
ends with a **Source** table naming the files it was derived from, so it can be re-checked when
the code moves.

## Contents

| Document | Covers |
| --- | --- |
| [`sellx.md`](./sellx.md) | The SellX listing category — create, edit, browse, filter, favourite, sell, boost, report. Also applies to Electronics, Furniture, Clothing, Book and Bike, which share the same schema. |
| [`property.md`](./property.md) | The Property listing category — the three forms behind the spec's five choices (For Sale, For Rent, Wanted to Rent, Cabins, Land Plot), every field and value list, the filter sheet, and the PDF attachment flow. |
| [`car.md`](./car.md) | The Car listing category — the three vehicle forms behind the spec's four choices (car for sale, car for rent, bobil, caravan), brand and model validation, the three equipment lists, and the re-registration fee rule. |
| [`boat.md`](./boat.md) | The Boat listing category — the full for-sale/for-rent form and the short wanted-to-buy one, the 799-brand list, the units every measurement is in, and the filter sheet. |
| [`motorcycle.md`](./motorcycle.md) | The Motorcycle listing category — one form for motorcycles, mopeds, ATVs and snowmobiles, the sub-type question each one asks, the 263-make list, the 34-value equipment list and the re-registration fee rule. |
| [`bike.md`](./bike.md) | The Bicycle listing category — the SellX form plus `bikeType`, the 12 bike types, and the privacy rules that apply to every category. |
| [`electronics.md`](./electronics.md) | **Electronics, Furniture and Clothing** — one page for all three: the SellX form unchanged, the free-text brand filter, and the privacy rules that apply to every category. |
| [`book.md`](./book.md) | The Books listing category — the SellX form with Brand Name swapped for a four-value Book category picker. |
| [`job.md`](./job.md) | The Job listing category — stillingsannonser: the three Annonsetype choices, the Norwegian field labels beside the JSON keys, the employer and kontaktperson blocks, and the price-less form. |

## Planned

All eleven listing categories are covered. Documents still to move into this folder:

- Auth — login, register, OTP, refresh (currently `docs/api/login.md` and `resend-otp.md` in the
  monorepo root)
- Search and filtering
- Stores, subscriptions and listing monetisation
- Chat and notifications

The older, still-accurate references live one level up in [`../`](../) —
`listing-forms-api.md` (all eleven category forms), `search-filtering-api.md`,
`listing-monetization-api.md`, `store-management-api.md`, `admin-api.md`.

## Conventions used in these documents

| Convention | Meaning |
| --- | --- |
| Base URL | Every path is relative to `/api/v1` |
| ✔ in a Required column | The request is rejected with `400` without it |
| – in a Required column | Optional |
| "stripped" | The field is accepted but silently discarded — never stored, never returned |
| Field paths in errors | Dot paths matching the request body: `location.address`, `contacts.0.type` |

## Writing a new document

Follow the shape of `sellx.md`:

1. One-paragraph summary of what the area is for.
2. Conventions only where they differ from this README.
3. The **flow** first — the order of calls a client actually makes — before the endpoint details.
4. Per endpoint: request, field table with exact validation rules, a real example, the success
   body, and an error table.
5. A **Gotchas** section for behaviour that will otherwise cost someone an afternoon.
6. An **Integration checklist** the reader can tick off.
7. A **Source** table of the files the document was derived from.

Verify every claim against the code before writing it down — including response shapes, which are
easy to get wrong by reading the serializer alone.
