# Search, Filtering & Sorting API Documentation

## Table of Contents

- [Overview](#overview)
- [What Changed](#what-changed)
- [Complete Flow](#complete-flow)
- [Data Models](#data-models)
  - [New Product Fields](#new-product-fields)
  - [Extended Saved Search Model](#extended-saved-search-model)
  - [Filter Options Response Types](#filter-options-response-types)
- [API Endpoints](#api-endpoints)
  - [1. Filter Options API (NEW)](#1-filter-options-api-new)
  - [2. Product Search / Listing (EXTENDED)](#2-product-search--listing-extended)
  - [3. Saved Search (EXTENDED)](#3-saved-search-extended)
- [Category Filter Reference](#category-filter-reference)
- [Sort Reference](#sort-reference)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Files Changed](#files-changed)

---

## Overview

The SellX marketplace now supports **full category-specific filtering and sorting**. Instead of hardcoding filters on the frontend, the client fetches available filters dynamically via the Filter Options API, applies them as query parameters on the existing product search endpoint, and can persist the full filter set via the extended Saved Search API.

### Base URL

```
/api/v1
```

### Authentication

Protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

Filter Options and Product Search endpoints are **public** (no auth required). Saved Search endpoints require authentication.

### Response Format

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable message",
  "requestId": "uuid-string",
  "data": { }
}
```

---

## What Changed

### New Module: `filter-options`

A completely new module (`src/modules/filter-options/`) that provides two public endpoints:
- `GET /filters/options` — returns the available filter fields and sort options for a given category
- `GET /filters/models` — returns dependent model lists (e.g., car models for a selected brand)

### Extended: Product Model (`products.model.ts`)

26 new optional fields added to the unified Product schema to support category-specific attributes. No existing fields were removed or modified.

### Extended: Product Search (`GET /products/public`)

50+ new query parameters added to the existing search endpoint. All are optional and additive — the existing API contract is fully backward compatible. New sort keys (`relevance`, `nearest`) are handled with special logic.

### Extended: Saved Search (`saved-search` module)

The SavedSearch model now stores `category`, `filters` (full filter object), and `sort` alongside the existing `text` field. The `text` field is now optional — either `text` or `filters` must be provided. List endpoint accepts an optional `category` query param.

### Extended: Product Enums (`product.enum.ts`)

- `TransactionType` enum gained `WANTS_TO_BUY = 'wants_to_buy'`
- 25+ new `as const` value objects for category-specific field values (vehicle types, body types, fuel types, property types, MC types, boat types, etc.)

---

## Complete Flow

```
                              ┌───────────────────────────┐
                              │   Frontend loads category  │
                              └────────────┬──────────────┘
                                           │
                              ┌────────────▼──────────────┐
                              │  GET /filters/options      │
                              │  ?category=car             │
                              │                            │
                              │  Returns: filter fields,   │
                              │  input types, options,     │
                              │  dependencies, sort opts   │
                              └────────────┬──────────────┘
                                           │
                              ┌────────────▼──────────────┐
                              │  Frontend renders filter   │
                              │  panel dynamically from    │
                              │  the response              │
                              └────────────┬──────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
              ┌─────────▼────────┐  ┌──────▼──────┐  ┌───────▼───────┐
              │ User selects     │  │ User selects│  │ User picks    │
              │ brand = "Audi"   │  │ filters     │  │ sort option   │
              └─────────┬────────┘  └──────┬──────┘  └───────┬───────┘
                        │                  │                  │
              ┌─────────▼────────┐         │                  │
              │ GET /filters/    │         │                  │
              │ models?category  │         │                  │
              │ =car&brand=Audi  │         │                  │
              │                  │         │                  │
              │ Returns: [A1,    │         │                  │
              │  A3, A4, Q5...]  │         │                  │
              └─────────┬────────┘         │                  │
                        │                  │                  │
                        └──────────────────┼──────────────────┘
                                           │
                              ┌────────────▼──────────────┐
                              │  GET /products/public      │
                              │  ?category={id}            │
                              │  &brand=Audi               │
                              │  &carModel=A4              │
                              │  &minPrice=100000          │
                              │  &maxPrice=500000          │
                              │  &fuel=diesel              │
                              │  &sort=-manufacturedYear   │
                              │                            │
                              │  Returns: paginated        │
                              │  product list              │
                              └────────────┬──────────────┘
                                           │
                              ┌────────────▼──────────────┐
                              │  User clicks "Save search" │
                              │                            │
                              │  POST /saved-searches      │
                              │  {                         │
                              │    category: "car",        │
                              │    filters: {              │
                              │      brand: "Audi",        │
                              │      carModel: "A4",       │
                              │      minPrice: 100000,     │
                              │      maxPrice: 500000,     │
                              │      fuel: "diesel"        │
                              │    },                      │
                              │    sort: "-manufacturedYear"│
                              │  }                         │
                              └───────────────────────────┘
```

---

## Data Models

### New Product Fields

All new fields are **optional** and only relevant to specific categories.

| Field | Type | Category | Description |
|-------|------|----------|-------------|
| `vehicleLocation` | `string` | Cars, Boats, MC | `"norge"` or `"utlandet"` |
| `vehicleType` | `string` | Cars | `"personbil"`, `"campingvogn"`, `"bobil"` |
| `driveType` | `string` | Cars | `"forhjulsdrift"`, `"bakhjulsdrift"`, `"firehjulsdrift"` |
| `equipment` | `string[]` | Cars | Multi-select: `"abs_bremser"`, `"airbag_foran"`, `"alarm"`, `"klimaanlegg"`, `"radio_dab_plus"`, `"hengerfeste_fast_krok"` |
| `trailerWeight` | `number` | Cars | Trailer weight capacity |
| `warrantyType` | `string` | Cars | `"nybilgaranti"`, `"gammelbilgaranti_fra_forhandler"` |
| `taxClass` | `string` | Cars | `"kombinertbil"`, `"lett_lastebil"`, `"minibuss"`, `"personbil"`, `"varebil"`, `"andre"` |
| `ownershipType` | `string` | Property | `"aksje"`, `"andel"`, `"eier_selveier"`, `"obligasjon"`, `"andre"` |
| `commonExpenses` | `number` | Property | Monthly common expenses (NOK) |
| `energyRating` | `string` | Property | `"A"` through `"G"` |
| `showingDate` | `Date` | Property | Viewing/showing date |
| `maxSpeedKnots` | `number` | Boats | Maximum speed in knots |
| `motorIncluded` | `boolean` | Boats | Whether motor is included |
| `motorType` | `string` | Boats | `"innenbords"`, `"utenbords"`, `"andre"` |
| `buildMaterial` | `string` | Boats | `"plast"`, `"glassfiber"`, `"tre"`, `"aluminium"`, `"andre"` |
| `sleepingPlaces` | `number` | Boats | Number of sleeping places |
| `mcType` | `string` | MC | `"motorsykkel"`, `"moped"`, `"atv"`, `"snoscooter"` |
| `mopedType` | `string` | MC | `"moped"`, `"scooter"` (only when `mcType = "moped"`) |
| `motorcycleType` | `string` | MC | `"chopper"`, `"cruiser"`, `"sport"`, etc. (only when `mcType = "motorsykkel"`) |
| `displacement` | `number` | MC | Engine displacement in ccm |
| `bikeType` | `string` | Bikes | `"bmx"`, `"landevei"`, `"terreng"`, `"elektriske"`, etc. |
| `employmentType` | `string` | Jobs | `"deltid"`, `"heltid"` |
| `remoteWork` | `boolean` | Jobs | Remote work available |
| `workLanguage` | `string` | Jobs | `"norsk"`, `"engelsk"` |
| `contractType` | `string` | Jobs | `"fast"`, `"vikariat"`, `"prosjekt"`, etc. |
| `sector` | `string` | Jobs | `"privat"`, `"offentlig"`, `"organisasjoner"`, etc. |
| `bookCategory` | `string` | Books | `"videregaende"`, `"universitet"`, `"barneboker"`, `"romaner"` |

**Existing fields used across categories:** `brand`, `carModel`, `condition`, `manufacturedYear`, `mileage`, `fuel`, `transmission`, `bodyType`, `bodyColor`, `interiorColor`, `horsepower`, `seats`, `doors`, `type`, `usableArea`, `bedrooms`, `yearBuilt`, `plotSize`, `floorLevel`, `year`, `length`, `width`, `facilities`, `transactionType`.

**New transaction type:** `"wants_to_buy"` added alongside `"for_sell"`, `"for_rent"`, `"give_away"`.

### Extended Saved Search Model

**Before:**
```json
{
  "user": "string (required)",
  "text": "string (required, max 200)"
}
```

**After:**
```json
{
  "user": "string (required)",
  "text": "string (optional, max 200)",
  "category": "string (optional, category slug)",
  "filters": "object (optional, arbitrary key-value filter pairs)",
  "sort": "string (optional, sort key)"
}
```

Constraint: Either `text` or `filters` must be provided.

### Filter Options Response Types

```typescript
interface IFilterOptionValue {
    value: string;
    label: { en: string; no: string };
}

interface IFilterField {
    key: string;                              // Query param name
    label: { en: string; no: string };        // Display labels
    inputType:                                // 'text' has no options - render an input
        | 'range' | 'single_select' | 'multi_select'
        | 'date' | 'location' | 'map' | 'boolean' | 'text';
    options?: IFilterOptionValue[];           // Allowed values on a select;
                                              // suggestions on a 'text' field
    dependsOn?: {                            // Dependency rule
        field: string;                       // Parent field key
        value?: string;                      // Show only when parent equals this value
        values?: string[];                   // Show only when parent is one of these
    } | null;
}

interface ISortOption {
    key: string;                             // Sort key to pass in ?sort=
    label: { en: string; no: string };       // Display label
    isDefault?: boolean;                     // True for "Mest relevant"
}

interface IFilterOptionsResponse {
    category: string;
    filters: IFilterField[];
    sorts: ISortOption[];
}
```

---

## API Endpoints

### 1. Filter Options API (NEW)

#### `GET /api/v1/filters/options`

Returns the available filter fields and sort options for a given category. The frontend uses this to render the filter panel dynamically.

**Auth:** None (public)

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `string` | Yes | Category slug (`car`, `property`, `boat`, `motorcycle`, `bike`, `job`, `book`, `furniture`, `electronics`, `clothing`, `sellx`) |

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Filter options fetched successfully",
  "data": {
    "category": "car",
    "filters": [
      {
        "key": "vehicleLocation",
        "label": { "en": "Vehicle location", "no": "Bilen står i" },
        "inputType": "single_select",
        "options": [
          { "value": "norge", "label": { "en": "Norway", "no": "Norge" } },
          { "value": "utlandet", "label": { "en": "Abroad", "no": "Utlandet" } }
        ]
      },
      {
        "key": "brand",
        "label": { "en": "Brand", "no": "Merke" },
        "inputType": "single_select",
        "options": [
          { "value": "Audi", "label": { "en": "Audi", "no": "Audi" } },
          { "value": "BMW", "label": { "en": "BMW", "no": "BMW" } }
        ]
      },
      {
        "key": "carModel",
        "label": { "en": "Model", "no": "Modell" },
        "inputType": "single_select",
        "options": [],
        "dependsOn": { "field": "brand" }
      },
      {
        "key": "price",
        "label": { "en": "Price", "no": "Pris" },
        "inputType": "range"
      },
      {
        "key": "mileage",
        "label": { "en": "Mileage", "no": "Kilometerstand" },
        "inputType": "range"
      },
      {
        "key": "equipment",
        "label": { "en": "Equipment", "no": "Utstyr" },
        "inputType": "multi_select",
        "options": [
          { "value": "abs_bremser", "label": { "en": "ABS brakes", "no": "ABS-bremser" } },
          { "value": "klimaanlegg", "label": { "en": "Air conditioning", "no": "Klimaanlegg" } }
        ]
      }
    ],
    "sorts": [
      { "key": "createdAt", "label": { "en": "Oldest first", "no": "Eldste først" } },
      { "key": "relevance", "label": { "en": "Most relevant", "no": "Mest relevant" }, "isDefault": true },
      { "key": "-createdAt", "label": { "en": "Newest first", "no": "Nyeste først" } },
      { "key": "-price", "label": { "en": "Price high-low", "no": "Pris høy-lav" } },
      { "key": "price", "label": { "en": "Price low-high", "no": "Pris lav-høy" } },
      { "key": "nearest", "label": { "en": "Nearest", "no": "Nærmest" } },
      { "key": "manufacturedYear", "label": { "en": "Year oldest-newest", "no": "Årsmodell eldst-nyest" } },
      { "key": "-manufacturedYear", "label": { "en": "Year newest-oldest", "no": "Årsmodell nyest-eldst" } },
      { "key": "-mileage", "label": { "en": "Mileage high-low", "no": "km høy-lav" } },
      { "key": "mileage", "label": { "en": "Mileage low-high", "no": "km lav-høy" } }
    ]
  }
}
```

**Dependency Rules:**

| Category | Field | Depends On | Behavior |
|----------|-------|-----------|----------|
| Cars | `carModel` | `brand` | Show model select after brand is chosen; fetch models via `/filters/models` |
| Motorcycles | `mopedType` | `mcType = "moped"` | Show only when MC type is Moped |
| Motorcycles | `motorcycleType` | `mcType = "motorsykkel"` | Show only when MC type is Motorsykkel |

**Unknown category fallback:** If the category slug is not recognized, the SellX (catch-all) filter set is returned.

---

#### `GET /api/v1/filters/models`

Returns the model list for a given brand within a category. Used for dependent dropdowns.

**Auth:** None (public)

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | `string` | Yes | Category slug (currently only `car` has brand-model mappings) |
| `brand` | `string` | Yes | Brand name (exact match, e.g. `"Audi"`, `"BMW"`) |

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Models fetched successfully",
  "data": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT", "R8"]
}
```

Returns an empty array if the brand or category is not recognized.

---

### 2. Product Search / Listing (EXTENDED)

#### `GET /api/v1/products/public`

**Auth:** Optional (`optionalAuth` — enriches response with `isFavorite`/`isReported` when authenticated)

All existing query parameters continue to work unchanged. The following new parameters have been added:

##### Pagination & Base (unchanged)

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 50) |
| `sort` | `string` | `"-createdAt"` | Sort key (see [Sort Reference](#sort-reference)) |
| `search` | `string` | — | Text search across title and description |
| `category` | `ObjectId` | — | Filter by category ID |
| `condition` | `string` | — | `"new"` or `"used"` |
| `brand` | `string` | — | Brand name (case-insensitive partial match) |
| `minPrice` / `maxPrice` | `number` | — | Price range |
| `city` | `string` | — | City name (case-insensitive partial match) |
| `near` | `string` | — | Coordinates as `"lat,lng"` |
| `radius` | `number` | — | Radius in km (used with `near`) |
| `filter` | `string` | — | `"today_best"` or `"recently_viewed"` |
| `userId` | `ObjectId` | — | Filter by seller ID |

##### NEW: Transaction Type

| Param | Type | Description |
|-------|------|-------------|
| `transactionType` | `string` | `"for_sell"`, `"for_rent"`, `"give_away"`, `"wants_to_buy"` |

##### NEW: Vehicle Filters (Cars)

| Param | Type | Description |
|-------|------|-------------|
| `carModel` | `string` | Car model (case-insensitive partial match) |
| `vehicleLocation` | `string` | `"norge"` or `"utlandet"` |
| `vehicleType` | `string` | `"personbil"`, `"campingvogn"`, `"bobil"` |
| `fuel` | `string` | Fuel type value |
| `transmission` | `string` | `"manual"`, `"automatic"`, `"semi_automatic"` |
| `bodyType` | `string` | Body type value |
| `bodyColor` | `string` | Comma-separated for multi-select (e.g. `"red,blue"`) |
| `interiorColor` | `string` | Comma-separated for multi-select |
| `driveType` | `string` | `"forhjulsdrift"`, `"bakhjulsdrift"`, `"firehjulsdrift"` |
| `warrantyType` | `string` | Warranty type value |
| `taxClass` | `string` | Tax class value |
| `equipment` | `string` | Comma-separated, matches ALL (e.g. `"abs_bremser,klimaanlegg"`) |
| `minMileage` / `maxMileage` | `number` | Mileage range |
| `minYear` / `maxYear` | `number` | Year model range (maps to `manufacturedYear`) |
| `minHorsepower` / `maxHorsepower` | `number` | Horsepower range |
| `minSeats` / `maxSeats` | `number` | Seats range |
| `minTrailerWeight` / `maxTrailerWeight` | `number` | Trailer weight range |

##### NEW: Property Filters

| Param | Type | Description |
|-------|------|-------------|
| `type` | `string` | Property type value (e.g. `"leilighet"`, `"enebolig"`) |
| `ownershipType` | `string` | Ownership type value |
| `energyRating` | `string` | `"A"` through `"G"` |
| `floorLevel` | `string` | Floor level value |
| `facilities` | `string` | Comma-separated, matches ALL (e.g. `"heis,balkong_terrasse"`) |
| `showingDate` | `Date` | Filter listings with showing date >= this value |
| `minUsableArea` / `maxUsableArea` | `number` | Size range (m2) |
| `minBedrooms` / `maxBedrooms` | `number` | Bedrooms range |
| `minYearBuilt` / `maxYearBuilt` | `number` | Year built range |
| `minPlotSize` / `maxPlotSize` | `number` | Plot size range |
| `minCommonExpenses` / `maxCommonExpenses` | `number` | Monthly common expenses range |

##### NEW: Boat Filters

| Param | Type | Description |
|-------|------|-------------|
| `motorIncluded` | `string` | `"true"` or `"false"` |
| `motorType` | `string` | Motor type value |
| `buildMaterial` | `string` | Build material value |
| `minLength` / `maxLength` | `number` | Length range (feet) |
| `minWidth` / `maxWidth` | `number` | Width range (cm) |
| `minMaxSpeedKnots` / `maxMaxSpeedKnots` | `number` | Max speed range (knots) |
| `minSleepingPlaces` / `maxSleepingPlaces` | `number` | Sleeping places range |

##### NEW: Motorcycle Filters

| Param | Type | Description |
|-------|------|-------------|
| `mcType` | `string` | `"motorsykkel"`, `"moped"`, `"atv"`, `"snoscooter"` |
| `mopedType` | `string` | `"moped"`, `"scooter"` |
| `motorcycleType` | `string` | Motorcycle sub-type value |
| `minDisplacement` / `maxDisplacement` | `number` | Displacement range (ccm) |

##### NEW: Bike, Job, Book Filters

| Param | Type | Description |
|-------|------|-------------|
| `bikeType` | `string` | Bike type value |
| `employmentType` | `string` | `"deltid"`, `"heltid"` |
| `remoteWork` | `string` | `"true"` or `"false"` |
| `workLanguage` | `string` | `"norsk"`, `"engelsk"` |
| `contractType` | `string` | Contract type value |
| `sector` | `string` | Sector value |
| `bookCategory` | `string` | Book category value |

**Example Request:**

```
GET /api/v1/products/public?category=682a1f...&brand=Toyota&minPrice=50000&maxPrice=300000&fuel=diesel&transmission=automatic&sort=-manufacturedYear&page=1&limit=20
```

**Multi-select fields** (`bodyColor`, `interiorColor`, `equipment`, `facilities`) use comma-separated values. `equipment` and `facilities` match ALL values (AND logic). `bodyColor` and `interiorColor` match ANY value (OR logic).

**Range filters** use `min{Field}` / `max{Field}` pattern. Either or both can be provided.

---

### 3. Saved Search (EXTENDED)

#### `POST /api/v1/saved-searches`

**Auth:** Required

**Request Body (before):**

```json
{
  "text": "iPhone 15 Pro"
}
```

**Request Body (after — backward compatible):**

```json
{
  "text": "iPhone 15 Pro",
  "category": "electronics",
  "filters": {
    "brand": "Apple",
    "condition": "new",
    "minPrice": 5000,
    "maxPrice": 15000
  },
  "sort": "-price"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | Conditional | Search text (max 200 chars). Required if `filters` is not provided |
| `category` | `string` | No | Category slug |
| `filters` | `object` | Conditional | Filter key-value pairs. Required if `text` is not provided |
| `sort` | `string` | No | Sort key |

**Validation:** Either `text` or `filters` (with at least one key) must be provided.

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Search saved successfully",
  "data": {
    "id": "682b3f...",
    "text": "iPhone 15 Pro",
    "category": "electronics",
    "filters": {
      "brand": "Apple",
      "condition": "new",
      "minPrice": 5000,
      "maxPrice": 15000
    },
    "sort": "-price",
    "createdAt": "2026-07-17T10:30:00.000Z"
  }
}
```

#### `PATCH /api/v1/saved-searches/:id`

**Auth:** Required

**Request Body:**

```json
{
  "text": "Updated search",
  "category": "car",
  "filters": { "brand": "BMW" },
  "sort": "-createdAt"
}
```

All fields are optional. At least one field must be provided.

#### `GET /api/v1/saved-searches`

**Auth:** Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 100) |
| `category` | `string` | — | **NEW:** Filter saved searches by category slug |

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved searches fetched successfully",
  "data": [
    {
      "id": "682b3f...",
      "text": "Toyota Corolla",
      "category": "car",
      "filters": { "brand": "Toyota", "carModel": "Corolla", "minYear": 2020 },
      "sort": "-manufacturedYear",
      "createdAt": "2026-07-17T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

#### `DELETE /api/v1/saved-searches/:id`

Unchanged. Deletes a saved search by ID.

---

## Category Filter Reference

### SellX (catch-all)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Område | location | `city` |
| Område i kart | map | `near` + `radius` |
| Pris | range | `minPrice`, `maxPrice` |
| Tilstand | single_select | `condition` |
| Salgsform | single_select | `transactionType` |

### Eiendom (Property)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Område | location | `city` |
| Område i kart | map | `near` + `radius` |
| Totalpris | range | `minPrice`, `maxPrice` |
| Fellesutgifter per mnd | range | `minCommonExpenses`, `maxCommonExpenses` |
| Storrelse | range | `minUsableArea`, `maxUsableArea` |
| Antall soverom | range | `minBedrooms`, `maxBedrooms` |
| Byggeaar | range | `minYearBuilt`, `maxYearBuilt` |
| Boligtype | single_select | `type` |
| Eieform | single_select | `ownershipType` |
| Fasiliteter | multi_select | `facilities` (comma-separated) |
| Visningsdato | date | `showingDate` |
| Etasje | single_select | `floorLevel` |
| Energikarakter | single_select | `energyRating` |
| Tomtestorrelse | range | `minPlotSize`, `maxPlotSize` |

### Biler (Cars)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Bilen star i | single_select | `vehicleLocation` |
| Merke | single_select | `brand` |
| Modell | single_select (depends on brand) | `carModel` |
| Kjoretoytype | single_select | `vehicleType` |
| Arsmodell | range | `minYear`, `maxYear` |
| Kilometerstand | range | `minMileage`, `maxMileage` |
| Pris | range | `minPrice`, `maxPrice` |
| Karosseri | single_select | `bodyType` |
| Salgsform | single_select | `transactionType` |
| Drivstoff | single_select | `fuel` |
| Hovedfarge | single_select | `bodyColor` |
| Interiorfarge | single_select | `interiorColor` |
| Hestekrefter | range | `minHorsepower`, `maxHorsepower` |
| Antall seter | range | `minSeats`, `maxSeats` |
| Hjuldrift | single_select | `driveType` |
| Girkasse | single_select | `transmission` |
| Utstyr | multi_select | `equipment` (comma-separated) |
| Tilhengervekt | range | `minTrailerWeight`, `maxTrailerWeight` |
| Garantitype | single_select | `warrantyType` |
| Tilstand | single_select | `condition` |
| Avgiftsklasse | single_select | `taxClass` |

### Bater (Boats)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Baten star i | single_select | `vehicleLocation` |
| Batens tilstand | single_select | `condition` |
| Battype | single_select | `type` |
| Merke | single_select | `brand` |
| Pris | range | `minPrice`, `maxPrice` |
| Lengde i fot | range | `minLength`, `maxLength` |
| Bredde i cm | range | `minWidth`, `maxWidth` |
| Arsmodell | range | `minYear`, `maxYear` |
| Maks fart i knop | range | `minMaxSpeedKnots`, `maxMaxSpeedKnots` |
| Motor inkludert | single_select | `motorIncluded` |
| Motortype | single_select | `motorType` |
| Byggemateriale | single_select | `buildMaterial` |
| Drivstoff | single_select | `fuel` |
| Antall sitteplasser | range | `minSeats`, `maxSeats` |
| Antall soveplasser | range | `minSleepingPlaces`, `maxSleepingPlaces` |
| Antall hestekrefter | range | `minHorsepower`, `maxHorsepower` |

### Motorsykler (Motorcycles)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Merke | single_select | `brand` |
| Pris | range | `minPrice`, `maxPrice` |
| Arsmodell | range | `minYear`, `maxYear` |
| Kilometerstand | range | `minMileage`, `maxMileage` |
| MC-type | single_select | `mcType` |
| Type Moped | single_select (when mcType=moped) | `mopedType` |
| Type Motorsykkel | single_select (when mcType=motorsykkel) | `motorcycleType` |
| Drivstoff | single_select | `fuel` |
| Slagvolum i ccm | range | `minDisplacement`, `maxDisplacement` |
| Antall hestekrefter | range | `minHorsepower`, `maxHorsepower` |
| Tilstand | single_select | `condition` |

### Sykler (Bikes)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Sykkeltype | single_select | `bikeType` |
| Tilstand | single_select | `condition` |
| Salgsform | single_select | `transactionType` |

### Jobber (Jobs)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Stillingstype | single_select | `employmentType` |
| Hjemmekontor | single_select | `remoteWork` |
| Arbeidssprak | single_select | `workLanguage` |
| Ansettelsesform | single_select | `contractType` |
| Sektor | single_select | `sector` |

### Boker (Books)

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Kategori | single_select | `bookCategory` |
| Tilstand | single_select | `condition` |
| Salgsform | single_select | `transactionType` |

### Mobler (Furniture), Elektronikk (Electronics), Klaer (Clothing)

All three share the same structure:

| Filter | Input Type | Query Param |
|--------|-----------|-------------|
| Merke | single_select | `brand` |
| Tilstand | single_select | `condition` |
| Salgsform | single_select | `transactionType` |

Each has its own brand list (see Filter Options API response).

---

## Sort Reference

### Base Sort Options (all categories except Jobs)

| Key | Norwegian Label | English Label | MongoDB Sort |
|-----|----------------|---------------|-------------|
| `relevance` | Mest relevant | Most relevant | `-promotion.metadata.boostScore -createdAt` |
| `-createdAt` | Nyeste forst | Newest first | `-createdAt` |
| `createdAt` | Eldste forst | Oldest first | `createdAt` |
| `-price` | Pris hoy-lav | Price high-low | `-price` |
| `price` | Pris lav-hoy | Price low-high | `price` |
| `nearest` | Naermest | Nearest | Implicit via `$near` (requires `near` param) |

**`relevance`** is the default for every category. It sorts by promotion boost score first, then by creation date.

**`nearest`** requires the `near` query parameter with coordinates. When `near` is not provided, it falls back to newest first.

### Category-Specific Additions

| Category | Additional Sort Keys |
|----------|---------------------|
| Eiendom | `usableArea`, `-usableArea` (Areal lav-hoy, Areal hoy-lav) |
| Biler | `manufacturedYear`, `-manufacturedYear` (Arsmodell), `mileage`, `-mileage` (km) |
| Motorsykler | Same as Biler |
| Bater | `length`, `-length` (Fot), `maxSpeedKnots`, `-maxSpeedKnots` (Knop), `year`, `-year` (Arsmodell) |

### Jobs Sort Options

Jobs category uses the base set **minus both price sorts**:

| Key | Label |
|-----|-------|
| `relevance` | Mest relevant (default) |
| `-createdAt` | Nyeste forst |
| `createdAt` | Eldste forst |
| `nearest` | Naermest |

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Unknown category slug in `/filters/options` | Returns SellX (catch-all) filter set |
| Unknown brand in `/filters/models` | Returns empty array `[]` |
| Category without brand-model map in `/filters/models` | Returns empty array `[]` |
| `sort=nearest` without `near` param | Falls back to `-createdAt` |
| `sort=relevance` | Sorts by promotion boost score then creation date |
| All new query params omitted | Behaves identically to the original API (backward compatible) |
| `equipment=abs_bremser,klimaanlegg` | Matches products that have ALL listed equipment (AND logic) |
| `bodyColor=red,blue` | Matches products with ANY listed color (OR logic) |
| `motorIncluded=true` on search endpoint | Passed as string, converted to boolean in service |
| `remoteWork=true` on search endpoint | Passed as string, converted to boolean in service |
| Saved search with only `filters`, no `text` | Valid — `text` is now optional |
| Saved search with only `text`, no `filters` | Valid — backward compatible |
| Saved search with neither `text` nor `filters` | 400 validation error |

---

## Files Changed

### New Module: `src/modules/filter-options/`

| File | Purpose |
|------|---------|
| `filter-options.interface.ts` | TypeScript interfaces for filter field, sort option, and response types |
| `filter-options.constants.ts` | Filter definitions per category, sort definitions, brand-model maps |
| `filter-options.validation.ts` | Zod schemas for query params |
| `filter-options.service.ts` | Business logic: lookup filters/sorts by category, lookup models by brand |
| `filter-options.controller.ts` | Request handlers |
| `filter-options.routes.ts` | Route definitions: `GET /options`, `GET /models` |
| `data/car-brands.constants.ts` | Car brand-to-models map (37 brands, placeholder data) |
| `data/boat-brands.constants.ts` | Boat brand list (52 brands, placeholder data) |
| `data/mc-brands.constants.ts` | Motorcycle brand list (18 brands, placeholder data) |

### Modified: Product Module (`src/modules/products/`)

| File | Changes |
|------|---------|
| `product.enum.ts` | Added `WANTS_TO_BUY` to `TransactionType`. Added 25+ `as const` value objects for new field types |
| `product.interface.ts` | Added 26 new optional fields to `IProduct` interface |
| `products.model.ts` | Added 26 new optional fields to Mongoose schema |
| `product.validation.ts` | Added new fields to `createProductBodySchema`. Added 50+ new query params to `listProductsQuerySchema` |
| `product.service.ts` | Extended `listProducts()` filter builder with all new filters. Added `addRange` helper. Added `relevance` and `nearest` sort handling |

### Modified: Saved Search Module (`src/modules/saved-search/`)

| File | Changes |
|------|---------|
| `saved-search.interface.ts` | Added `ISavedSearchFilters`, made `text` optional, added `category`, `filters`, `sort` |
| `saved-search.model.ts` | Added `category`, `filters` (Mixed), `sort` fields. Made `text` optional. Updated unique index |
| `saved-search.validation.ts` | Updated create/update schemas to accept filters object. Added category to list query. Added refinement for text-or-filters requirement |
| `saved-search.service.ts` | Updated `create`/`update` to accept full data objects. Added category filter to `list` |
| `saved-search.controller.ts` | Updated to pass new data objects to service |
| `saved-search.serializer.ts` | Added `category`, `filters`, `sort` to response DTO |
| `saved-search.repository.ts` | Added optional `category` param to `findByUserPaginated` |

### Modified: Route Registration

| File | Changes |
|------|---------|
| `src/routes/v1.ts` | Added `router.use('/filters', filterOptionsRoutes)` |

### New Tests

| File | Coverage |
|------|----------|
| `tests/unit/modules/filter-options/filter-options.service.test.ts` | 14 tests: filter/sort definitions per category, brand-model lookups, dependency rules, default sort flags, category-specific sorts |
