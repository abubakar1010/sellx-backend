 # Product Listing Monetization API Documentation

## Table of Contents

- [Overview](#overview)
- [Complete User Flow](#complete-user-flow)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [User: Listing Packages (Public)](#1-user-listing-packages-public)
  - [User: Listing Purchases](#2-user-listing-purchases)
  - [User: Products (Modified)](#3-user-products-modified)
  - [Admin: Listing Packages](#4-admin-listing-packages)
  - [Admin: Listing Purchases](#5-admin-listing-purchases)
  - [Admin: Listings](#6-admin-listings)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Auto-Expiration Mechanisms](#auto-expiration-mechanisms)

---

## Overview

The Listing Monetization system allows admins to create **per-category pricing packages** for product listings. Users must purchase a package before listing products. Each package defines:

- **Category** (which category the listing is for)
- **Price** and **currency** (e.g., $50 USD)
- **Duration** in hours (how long the product remains visible after admin approval)
- **Max listings** (how many products the user can list per purchase)
- **Validity window** in days (how long the purchase remains usable)

Products automatically change to `"expired"` status after their listing duration ends, removing them from public listings.

### Base URL

```
/api/v1
```

### Authentication

All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Format

All responses follow this structure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable message",
  "requestId": "uuid-string",
  "data": { }
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "requestId": "uuid-string"
}
```

---

## Complete User Flow

```
Step 1:  User selects a category they want to list in
         GET /api/v1/listing-packages?category=<categoryId>
         → sees available pricing packages with durations

Step 2:  User purchases a listing package
         POST /api/v1/listing-purchases  { packageId: "..." }
         → For paid packages: returns { checkoutUrl } → user pays on Stripe
           → Stripe webhook creates the purchase after payment
         → For free packages: purchase created immediately

Step 3:  User checks remaining listing slots
         GET /api/v1/listing-purchases/active

Step 4:  User creates a product with the purchaseId
         POST /api/v1/products  (multipart: images + JSON body with purchaseId)
         → product created with status "draft"

Step 5:  Admin reviews and approves the product
         PATCH /api/v1/admin/listings/:id/status  { status: "active" }
         → listingExpiresAt is set, product goes live
         → listing duration timer STARTS HERE (not at creation)

Step 6:  Product is visible in public listings
         GET /api/v1/products/public
         → product appears until it expires or is sold

Step 7a: After the duration ends, the product automatically expires
         → scheduler sets status to "expired" every 15 minutes

Step 7b: OR user marks the product as sold
         POST /api/v1/products/:id/mark-sold
         → status changes to "sold", product disappears from listings

Step 8:  When all listing slots are used, purchase becomes "exhausted"
         When the validity window passes, purchase becomes "expired"
```

---

## Data Models

### Listing Package (Admin-configured, per category)

| Field          | Type    | Description                                          |
|----------------|---------|------------------------------------------------------|
| `id`           | string  | Unique identifier                                    |
| `name`         | string  | Human-readable name (e.g., "Electronics 24h Basic")  |
| `category`     | object  | Category this package is for (id, title, slug, thumbnail) |
| `durationHours`| number  | How many hours the product stays visible after approval |
| `price`        | number  | Cost of the package (0 = free)                       |
| `maxListings`  | number  | Number of product listings allowed per purchase      |
| `isActive`     | boolean | Whether the package is available for purchase         |
| `currency`     | string  | Currency code (default: "USD")                       |
| `validityDays` | number  | Days the purchase remains usable after buying         |
| `createdAt`    | date    | Creation timestamp                                   |
| `updatedAt`    | date    | Last update timestamp                                |

### Listing Purchase

| Field               | Type   | Description                                      |
|---------------------|--------|--------------------------------------------------|
| `id`                | string | Unique identifier                                |
| `packageSnapshot`   | object | Frozen copy of the package at time of purchase   |
| `listingsUsed`      | number | How many products have been listed               |
| `listingsRemaining` | number | Computed: maxListings - listingsUsed             |
| `status`            | string | `"active"`, `"exhausted"`, or `"expired"`        |
| `purchasedAt`       | date   | When the purchase was made                       |
| `expiresAt`         | date   | When the purchase validity expires               |
| `createdAt`         | date   | Creation timestamp                               |

### Package Snapshot (frozen at purchase time)

| Field           | Type   | Description                               |
|-----------------|--------|-------------------------------------------|
| `name`          | string | Package name                              |
| `category`      | string | Category ObjectId                         |
| `categoryName`  | string | Category title at time of purchase        |
| `durationHours` | number | Listing visibility duration in hours      |
| `price`         | number | Price paid                                |
| `maxListings`   | number | Listings allowed                          |
| `currency`      | string | Currency code                             |
| `validityDays`  | number | Purchase validity window                  |

### Product (Updated fields)

| Field              | Type        | Description                                        |
|--------------------|-------------|----------------------------------------------------|
| `listingExpiresAt` | date/null   | When the listing visibility expires (set on approval) |
| `status`           | string      | Now includes `"expired"` as active status          |
| *(all existing fields remain unchanged)* | | |

**Product Status Lifecycle:**

```
draft → active (admin approval, timer starts)
                 → expired (automatic, after durationHours)
                 → sold (user marks as sold)
                 → removed (user soft-deletes)
                 → rejected (admin rejects)
```

---

## API Endpoints

---

### 1. User: Listing Packages (Public)

#### 1.1 List Packages for a Category

Returns active listing packages, optionally filtered by category. Sorted by price ascending.

```
GET /api/v1/listing-packages
GET /api/v1/listing-packages?category=6830a1b2c3d4e5f6a7b8c9d0
```

**Auth:** Not required

**Query Parameters:**

| Param      | Type   | Required | Description                        |
|------------|--------|----------|------------------------------------|
| `category` | string | No       | Filter by category ObjectId        |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing packages fetched successfully.",
  "data": [
    {
      "id": "6840a1b2c3d4e5f6a7b8c9d0",
      "name": "Electronics 24h Basic",
      "category": {
        "id": "6830a1b2c3d4e5f6a7b8c9d0",
        "title": "Electronics",
        "slug": "electronics",
        "thumbnail": "/uploads/categories/electronics.jpg"
      },
      "durationHours": 24,
      "price": 9.99,
      "maxListings": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    },
    {
      "id": "6840a1b2c3d4e5f6a7b8c9d1",
      "name": "Electronics 7-Day Premium",
      "category": {
        "id": "6830a1b2c3d4e5f6a7b8c9d0",
        "title": "Electronics",
        "slug": "electronics",
        "thumbnail": "/uploads/categories/electronics.jpg"
      },
      "durationHours": 168,
      "price": 39.99,
      "maxListings": 5,
      "isActive": true,
      "currency": "USD",
      "validityDays": 60,
      "createdAt": "2026-06-20T10:05:00.000Z",
      "updatedAt": "2026-06-20T10:05:00.000Z"
    },
    {
      "id": "6840a1b2c3d4e5f6a7b8c9d2",
      "name": "Vehicles 24h Standard",
      "category": {
        "id": "6830a1b2c3d4e5f6a7b8c9d5",
        "title": "Car",
        "slug": "car",
        "thumbnail": "/uploads/categories/car.jpg"
      },
      "durationHours": 24,
      "price": 49.99,
      "maxListings": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:10:00.000Z",
      "updatedAt": "2026-06-20T10:10:00.000Z"
    }
  ]
}
```

---

#### 1.2 Get Package by ID

```
GET /api/v1/listing-packages/:id
```

**Auth:** Not required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing package fetched successfully.",
  "data": {
    "id": "6840a1b2c3d4e5f6a7b8c9d0",
    "name": "Electronics 24h Basic",
    "category": {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "title": "Electronics",
      "slug": "electronics",
      "thumbnail": "/uploads/categories/electronics.jpg"
    },
    "durationHours": 24,
    "price": 9.99,
    "maxListings": 1,
    "isActive": true,
    "currency": "USD",
    "validityDays": 30,
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-20T10:00:00.000Z"
  }
}
```

**Response: 404 Not Found** (inactive or non-existent)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Listing package not found",
  "errorCode": "NOT_FOUND"
}
```

---

### 2. User: Listing Purchases

#### 2.1 Purchase a Listing Package

Initiates a purchase. **Paid packages** create a Stripe Checkout Session and return a `checkoutUrl` -- the user must complete payment on Stripe's hosted page. The actual `ListingPurchase` record is created by the Stripe webhook after payment confirmation. **Free packages** (price = 0) are activated immediately.

```
POST /api/v1/listing-purchases
```

**Auth:** Required (Bearer token)

**Request Body:**

```json
{
  "packageId": "6840a1b2c3d4e5f6a7b8c9d0"
}
```

| Field       | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `packageId` | string | Yes      | MongoDB ObjectId of the package      |

**Response: 200 OK** (paid package -- Stripe checkout required)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checkout session created. Complete payment to activate your package.",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

> The user should be redirected to `checkoutUrl`. After successful payment, Stripe sends a webhook to the backend which creates the `ListingPurchase` record automatically.

**Response: 201 Created** (free package -- activated immediately)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Listing package purchased successfully.",
  "data": {
    "id": "6841b2c3d4e5f6a7b8c9d0e1",
    "packageSnapshot": {
      "name": "Electronics 24h Basic",
      "category": "6830a1b2c3d4e5f6a7b8c9d0",
      "categoryName": "Electronics",
      "durationHours": 24,
      "price": 0,
      "maxListings": 1,
      "currency": "USD",
      "validityDays": 30
    },
    "listingsUsed": 0,
    "listingsRemaining": 1,
    "status": "active",
    "purchasedAt": "2026-06-27T14:30:00.000Z",
    "expiresAt": "2026-07-27T14:30:00.000Z",
    "createdAt": "2026-06-27T14:30:00.000Z"
  }
}
```

**Response: 404 Not Found** (package does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Listing package not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 400 Bad Request** (package is deactivated)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This listing package is currently unavailable",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (category is inactive)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "The category for this package is currently inactive",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 401 Unauthorized** (missing/invalid token)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Authentication required",
  "errorCode": "UNAUTHORIZED"
}
```

---

#### 2.2 List My Purchases

Returns paginated list of the authenticated user's listing purchases.

```
GET /api/v1/listing-purchases
```

**Auth:** Required

**Query Parameters:**

| Param      | Type   | Default | Description                                    |
|------------|--------|---------|------------------------------------------------|
| `page`     | number | 1       | Page number (min: 1)                           |
| `limit`    | number | 10      | Items per page (min: 1, max: 50)               |
| `status`   | string | -       | Filter: `"active"`, `"exhausted"`, `"expired"` |
| `category` | string | -       | Filter by category ObjectId                    |

**Example:** `GET /api/v1/listing-purchases?status=active&category=6830a1b2c3d4e5f6a7b8c9d0`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing purchases fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6841b2c3d4e5f6a7b8c9d0e1",
        "packageSnapshot": {
          "name": "Electronics 7-Day Premium",
          "category": "6830a1b2c3d4e5f6a7b8c9d0",
          "categoryName": "Electronics",
          "durationHours": 168,
          "price": 39.99,
          "maxListings": 5,
          "currency": "USD",
          "validityDays": 60
        },
        "listingsUsed": 3,
        "listingsRemaining": 2,
        "status": "active",
        "purchasedAt": "2026-06-20T09:00:00.000Z",
        "expiresAt": "2026-08-19T09:00:00.000Z",
        "createdAt": "2026-06-20T09:00:00.000Z"
      },
      {
        "id": "6841b2c3d4e5f6a7b8c9d0e2",
        "packageSnapshot": {
          "name": "Electronics 24h Basic",
          "category": "6830a1b2c3d4e5f6a7b8c9d0",
          "categoryName": "Electronics",
          "durationHours": 24,
          "price": 9.99,
          "maxListings": 1,
          "currency": "USD",
          "validityDays": 30
        },
        "listingsUsed": 1,
        "listingsRemaining": 0,
        "status": "exhausted",
        "purchasedAt": "2026-06-15T12:00:00.000Z",
        "expiresAt": "2026-07-15T12:00:00.000Z",
        "createdAt": "2026-06-15T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

#### 2.3 Get Active Purchases

Returns only purchases that are still usable (status = "active" AND not expired).

```
GET /api/v1/listing-purchases/active
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active listing purchases fetched successfully.",
  "data": [
    {
      "id": "6841b2c3d4e5f6a7b8c9d0e1",
      "packageSnapshot": {
        "name": "Electronics 7-Day Premium",
        "category": "6830a1b2c3d4e5f6a7b8c9d0",
        "categoryName": "Electronics",
        "durationHours": 168,
        "price": 39.99,
        "maxListings": 5,
        "currency": "USD",
        "validityDays": 60
      },
      "listingsUsed": 3,
      "listingsRemaining": 2,
      "status": "active",
      "purchasedAt": "2026-06-20T09:00:00.000Z",
      "expiresAt": "2026-08-19T09:00:00.000Z",
      "createdAt": "2026-06-20T09:00:00.000Z"
    }
  ]
}
```

**Response: 200 OK** (no active purchases)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active listing purchases fetched successfully.",
  "data": []
}
```

---

#### 2.4 Get Purchase by ID

```
GET /api/v1/listing-purchases/:id
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing purchase fetched successfully.",
  "data": {
    "id": "6841b2c3d4e5f6a7b8c9d0e1",
    "packageSnapshot": {
      "name": "Electronics 7-Day Premium",
      "category": "6830a1b2c3d4e5f6a7b8c9d0",
      "categoryName": "Electronics",
      "durationHours": 168,
      "price": 39.99,
      "maxListings": 5,
      "currency": "USD",
      "validityDays": 60
    },
    "listingsUsed": 3,
    "listingsRemaining": 2,
    "status": "active",
    "purchasedAt": "2026-06-20T09:00:00.000Z",
    "expiresAt": "2026-08-19T09:00:00.000Z",
    "createdAt": "2026-06-20T09:00:00.000Z"
  }
}
```

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Listing purchase not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 403 Forbidden** (accessing another user's purchase)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "This purchase does not belong to you",
  "errorCode": "FORBIDDEN"
}
```

---

### 3. User: Products (Modified)

#### 3.1 Create Product (Updated - purchaseId conditionally required)

Upload product images and create a listing. Each product consumes one listing slot from the specified purchase. **Note:** If the user's store has an active [subscription](./subscription-api.md), `purchaseId` is not required -- the subscription is used automatically.

```
POST /api/v1/products
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field     | Type   | Required | Description                                       |
|-----------|--------|----------|---------------------------------------------------|
| `images`  | file[] | Yes      | 1-10 product images                               |
| `data`    | string | Yes      | JSON string containing the body fields below      |

**JSON Body (inside `data` field):**

```json
{
  "purchaseId": "6841b2c3d4e5f6a7b8c9d0e1",
  "category": "6830a1b2c3d4e5f6a7b8c9d0",
  "title": "iPhone 15 Pro Max - Like New",
  "description": "Barely used iPhone 15 Pro Max, 256GB, Natural Titanium. Includes original box and charger.",
  "price": 899,
  "currency": "NOK",
  "condition": "used",
  "location": {
    "address": "Karl Johans gate 1",
    "city": "Oslo",
    "country": "Norway",
    "coordinates": {
      "type": "Point",
      "coordinates": [10.7522, 59.9139]
    }
  },
  "contacts": [
    { "type": "email", "value": "seller@example.com" }
  ]
}
```

| Field        | Type   | Required | Description                                      |
|--------------|--------|----------|--------------------------------------------------|
| `purchaseId` | string | **Conditional**  | Required if no active subscription on store. ID of an active listing purchase |
| `category`   | string | Yes      | Category ObjectId (must match purchase category) |
| `title`      | string | Yes      | Product title (2-120 chars)                      |
| `price`      | number | Yes      | Price (min: 0)                                   |
| `location`   | object | Yes      | Address with optional coordinates                |
| `description`| string | No       | Description (5-5000 chars)                       |
| `storeId`    | string | No       | Associate with a store                           |
| *(+ all vehicle/property fields)* | | | |

**Response: 201 Created**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "id": "6842c3d4e5f6a7b8c9d0e1f2",
    "category": "6830a1b2c3d4e5f6a7b8c9d0",
    "media": [
      { "url": "/uploads/products/1719500000000-iphone.jpg", "type": "image" }
    ],
    "title": "iPhone 15 Pro Max - Like New",
    "description": "Barely used iPhone 15 Pro Max...",
    "price": 899,
    "currency": "NOK",
    "transactionType": "for_sell",
    "location": {
      "address": "Karl Johans gate 1",
      "city": "Oslo",
      "country": "Norway",
      "coordinates": { "type": "Point", "coordinates": [10.7522, 59.9139] }
    },
    "contacts": [{ "type": "email", "value": "seller@example.com" }],
    "promotion": { "isActive": false, "plan": "free", "metadata": { "boostScore": 0 } },
    "listingExpiresAt": null,
    "status": "draft",
    "quantity": 0,
    "favoriteCount": 0,
    "soldCount": 0,
    "viewCount": 0,
    "seller": {
      "id": "6829a0b1c2d3e4f5a6b7c8d9",
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": null,
      "avgRating": 4.5,
      "totalReviewCount": 12
    },
    "isFavorite": false,
    "isReported": false,
    "createdAt": "2026-06-27T14:30:00.000Z",
    "updatedAt": "2026-06-27T14:30:00.000Z"
  }
}
```

> **Note:** `listingExpiresAt` is `null` at creation. It is set when the admin approves the product. `status` starts as `"draft"`.

**Response: 400 Bad Request** (no subscription and no purchaseId)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "A listing purchase or active subscription is required to create a product",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 404 Not Found** (purchase does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Listing purchase not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 403 Forbidden** (purchase belongs to another user)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "This listing purchase does not belong to you",
  "errorCode": "FORBIDDEN"
}
```

**Response: 400 Bad Request** (purchase fully used)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "All listing slots in this purchase have been used",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (purchase validity expired)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This listing purchase has expired",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (category mismatch)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This purchase is for category \"Electronics\" but you are listing in a different category",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (no remaining slots)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "No remaining listing slots in this purchase",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (race condition - concurrent usage)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Insufficient listing slots or purchase expired",
  "errorCode": "BAD_REQUEST"
}
```

---

#### 3.2 Product After Admin Approval

When admin approves the product, `listingExpiresAt` is calculated and set. The product looks like:

```json
{
  "id": "6842c3d4e5f6a7b8c9d0e1f2",
  "title": "iPhone 15 Pro Max - Like New",
  "price": 899,
  "listingExpiresAt": "2026-06-28T16:45:00.000Z",
  "status": "active",
  "..."
}
```

> The timer starts from the **moment of approval**, not from product creation. If the package has `durationHours: 24`, and admin approves at 4:45 PM, the listing expires at 4:45 PM the next day.

---

#### 3.3 Mark Product as Sold (unchanged)

User can mark their product as sold at any time, which removes it from public listings.

```
POST /api/v1/products/:id/mark-sold
```

**Auth:** Required (must be the product owner)

**Request Body:** (optional)

```json
{
  "quantity": 1
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product marked as sold",
  "data": {
    "id": "6842c3d4e5f6a7b8c9d0e1f2",
    "title": "iPhone 15 Pro Max - Like New",
    "status": "sold",
    "listingExpiresAt": "2026-06-28T16:45:00.000Z",
    "soldCount": 1,
    "..."
  }
}
```

---

#### 3.4 List My Products (Updated - expired filter added)

```
GET /api/v1/products/my
```

**Auth:** Required

**Query Parameters:**

| Param    | Type   | Default | Description                                         |
|----------|--------|---------|-----------------------------------------------------|
| `page`   | number | 1       | Page number                                         |
| `limit`  | number | 20      | Items per page (max: 50)                            |
| `filter` | string | -       | `"active"`, `"draft"`, `"promoted"`, `"sold"`, **`"expired"`** |
| `search` | string | -       | Search in title and description                     |

**Example:** `GET /api/v1/products/my?filter=expired`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "My products fetched successfully",
  "data": {
    "rows": [
      {
        "id": "6842c3d4e5f6a7b8c9d0e1f2",
        "title": "iPhone 15 Pro Max - Like New",
        "price": 899,
        "status": "expired",
        "listingExpiresAt": "2026-06-28T16:45:00.000Z",
        "..."
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### 3.5 Update Product (Modified - category change blocked)

Updating the product category is blocked when the product has a listing purchase.

```
PATCH /api/v1/products/:id
```

**Response: 400 Bad Request** (attempting to change category)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Cannot change category on a listing with a listing purchase",
  "errorCode": "BAD_REQUEST"
}
```

---

#### 3.6 Delete Product (unchanged)

Soft-deletes a product. The consumed listing slot is NOT restored.

```
DELETE /api/v1/products/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product deleted successfully",
  "data": null
}
```

---

### 4. Admin: Listing Packages

All admin endpoints require `superAdmin` role.

#### 4.1 List All Packages

```
GET /api/v1/admin/listing-packages
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing packages fetched successfully.",
  "data": [
    {
      "id": "6840a1b2c3d4e5f6a7b8c9d0",
      "name": "Electronics 24h Basic",
      "category": {
        "id": "6830a1b2c3d4e5f6a7b8c9d0",
        "title": "Electronics",
        "slug": "electronics",
        "thumbnail": "/uploads/categories/electronics.jpg"
      },
      "durationHours": 24,
      "price": 9.99,
      "maxListings": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    }
  ]
}
```

---

#### 4.2 Create Package

```
POST /api/v1/admin/listing-packages
```

**Request Body:**

```json
{
  "name": "Car 30-Day Premium",
  "category": "6830a1b2c3d4e5f6a7b8c9d5",
  "durationHours": 720,
  "price": 99.99,
  "maxListings": 3,
  "currency": "USD",
  "validityDays": 60
}
```

| Field          | Type   | Required | Default | Validation               |
|----------------|--------|----------|---------|--------------------------|
| `name`         | string | Yes      | -       | 1-100 chars              |
| `category`     | string | Yes      | -       | Valid Category ObjectId  |
| `durationHours`| number | Yes      | -       | Integer >= 1             |
| `price`        | number | Yes      | -       | >= 0 (0 = free)          |
| `maxListings`  | number | No       | 1       | Integer >= 1             |
| `currency`     | string | No       | "USD"   | Max 10 chars             |
| `validityDays` | number | No       | 30      | Integer >= 1             |

**Response: 201 Created**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Listing package created successfully.",
  "data": {
    "id": "6840a1b2c3d4e5f6a7b8c9d5",
    "name": "Car 30-Day Premium",
    "category": "6830a1b2c3d4e5f6a7b8c9d5",
    "durationHours": 720,
    "price": 99.99,
    "maxListings": 3,
    "isActive": true,
    "currency": "USD",
    "validityDays": 60,
    "createdAt": "2026-06-27T16:00:00.000Z",
    "updatedAt": "2026-06-27T16:00:00.000Z"
  }
}
```

**Response: 400 Bad Request** (invalid category)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Category not found",
  "errorCode": "BAD_REQUEST"
}
```

---

#### 4.3 Update Package

```
PATCH /api/v1/admin/listing-packages/:id
```

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Package Name",
  "price": 79.99,
  "maxListings": 5,
  "isActive": false
}
```

**Response: 200 OK** (same shape as create response)

---

#### 4.4 Delete Package

```
DELETE /api/v1/admin/listing-packages/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing package deleted successfully.",
  "data": null
}
```

> **Note:** Existing purchases are unaffected because they store a `packageSnapshot`.

---

#### 4.5 Toggle Package Status

```
PATCH /api/v1/admin/listing-packages/:id/toggle-status
```

**Response: 200 OK** (deactivated)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing package deactivated successfully.",
  "data": {
    "id": "6840a1b2c3d4e5f6a7b8c9d0",
    "name": "Electronics 24h Basic",
    "isActive": false,
    "..."
  }
}
```

---

### 5. Admin: Listing Purchases

#### 5.1 List All Purchases

```
GET /api/v1/admin/listing-purchases
```

**Query Parameters:**

| Param      | Type   | Default | Description                                    |
|------------|--------|---------|------------------------------------------------|
| `page`     | number | 1       | Page number                                    |
| `limit`    | number | 10      | Items per page (max: 50)                       |
| `status`   | string | -       | Filter: `"active"`, `"exhausted"`, `"expired"` |
| `userId`   | string | -       | Filter by user ObjectId                        |
| `category` | string | -       | Filter by category ObjectId                    |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing purchases fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6841b2c3d4e5f6a7b8c9d0e1",
        "user": {
          "id": "6829a0b1c2d3e4f5a6b7c8d9",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "avatarUrl": "/uploads/avatars/john.jpg"
        },
        "store": null,
        "category": {
          "id": "6830a1b2c3d4e5f6a7b8c9d0",
          "title": "Electronics",
          "slug": "electronics"
        },
        "packageSnapshot": {
          "name": "Electronics 7-Day Premium",
          "category": "6830a1b2c3d4e5f6a7b8c9d0",
          "categoryName": "Electronics",
          "durationHours": 168,
          "price": 39.99,
          "maxListings": 5,
          "currency": "USD",
          "validityDays": 60
        },
        "listingsUsed": 3,
        "listingsRemaining": 2,
        "status": "active",
        "purchasedAt": "2026-06-20T09:00:00.000Z",
        "expiresAt": "2026-08-19T09:00:00.000Z",
        "createdAt": "2026-06-20T09:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

#### 5.2 Purchase Statistics

```
GET /api/v1/admin/listing-purchases/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing purchase stats fetched successfully.",
  "data": {
    "totalPurchases": 245,
    "activePurchases": 67,
    "exhaustedPurchases": 142,
    "expiredPurchases": 36,
    "totalRevenue": 8750.50,
    "totalListingsUsed": 389
  }
}
```

---

### 6. Admin: Listings (Updated)

#### 6.1 Listings Overview (Updated - expired count added)

```
GET /api/v1/admin/listings/overview
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing overview fetched successfully.",
  "data": {
    "pending": 12,
    "active": 156,
    "sold_today": 8,
    "rejected": 3,
    "expired": 47
  }
}
```

---

#### 6.2 List Listings (Updated - expired filter added)

```
GET /api/v1/admin/listings
```

**Query Parameters:**

| Param      | Type   | Default | Description                                                   |
|------------|--------|---------|---------------------------------------------------------------|
| `page`     | number | 1       | Page number                                                   |
| `limit`    | number | 10      | Items per page (max: 50)                                      |
| `status`   | string | "all"   | `"all"`, `"pending"`, `"active"`, `"rejected"`, `"sold"`, **`"expired"`** |
| `search`   | string | -       | Search in title and description                               |
| `category` | string | -       | Filter by category ObjectId                                   |

**Example:** `GET /api/v1/admin/listings?status=expired&page=1`

---

#### 6.3 Approve Listing (Updated - sets listingExpiresAt)

When admin approves a listing, the system:
1. Sets `status` to `"active"`
2. Calculates `listingExpiresAt` from the listing purchase's `packageSnapshot.durationHours`
3. The product is now visible in public listings with a countdown

```
PATCH /api/v1/admin/listings/:id/status
```

**Request Body:**

```json
{
  "status": "active"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing status updated successfully.",
  "data": {
    "id": "6842c3d4e5f6a7b8c9d0e1f2",
    "title": "iPhone 15 Pro Max - Like New",
    "status": "active",
    "listingExpiresAt": "2026-06-28T16:45:00.000Z",
    "..."
  }
}
```

---

## Edge Cases & Error Handling

### Purchase Lifecycle

| Scenario | Behavior |
|----------|----------|
| Package deleted after purchase | Purchase still valid -- `packageSnapshot` preserves all details |
| Package deactivated after purchase | Existing purchases remain usable until exhausted or expired |
| Package price changed after purchase | Purchase keeps original price in snapshot |
| Category deactivated after purchase | Purchase remains valid, existing products unaffected |
| Purchase validity window passes | Status changes to `"expired"` via hourly scheduler |
| All listing slots consumed | Status changes to `"exhausted"` immediately after product creation |

### Product Creation Guards

| Scenario | HTTP Code | Error Message |
|----------|-----------|---------------|
| No subscription and no `purchaseId` | 400 | A listing purchase or active subscription is required to create a product |
| Invalid `purchaseId` format | 400 | Invalid purchase ID |
| Purchase does not exist | 404 | Listing purchase not found |
| Purchase belongs to another user | 403 | This listing purchase does not belong to you |
| Purchase expired (past `expiresAt`) | 400 | This listing purchase has expired |
| Purchase fully used (status: exhausted) | 400 | All listing slots in this purchase have been used |
| Category mismatch (purchase vs product) | 400 | This purchase is for category "X" but you are listing in a different category |
| No remaining slots | 400 | No remaining listing slots in this purchase |
| Concurrent race condition | 400 | Insufficient listing slots or purchase expired |
| Attempting to change category on existing product | 400 | Cannot change category on a listing with a listing purchase |

### Listing Expiration Rules

| Scenario | Behavior |
|----------|----------|
| Product approved with 24h package | `listingExpiresAt` = approval time + 24 hours |
| Admin takes 3 days to approve | User still gets full 24h from approval (not creation) |
| Admin approves after purchase expired | Full duration honored (already paid for) |
| Product marked as sold before expiry | Status='sold', overrides expiry mechanism |
| Product soft-deleted before expiry | Status='removed', listing slot NOT restored |
| Product rejected by admin | Stays as 'rejected', listing slot NOT restored |

### Quota Rules

- Each product creation consumes **1 listing slot** from the purchase
- Slot consumption is **atomic** (race-condition safe via `$expr` guard)
- Soft-deleting or selling a product does **NOT** restore the consumed slot
- Products from the same purchase get independent `listingExpiresAt` values (each starts timing from its own approval)

---

## Auto-Expiration Mechanisms

### Product Listing Expiration

- **Mechanism:** Scheduled job running every 15 minutes
- **Query:** `status='active' AND listingExpiresAt != null AND listingExpiresAt <= now`
- **Action:** Sets `status` to `'expired'`
- **User impact:** Expired products are excluded from public listing queries (which filter `status='active'`), so they disappear from search results and feeds
- **Precision:** Products may remain visible for up to 15 minutes after their actual expiry time

### Purchase Validity Expiration

- **Mechanism:** Scheduled job running every hour
- **Query:** `status='active' AND expiresAt <= now`
- **Action:** Sets purchase `status` to `'expired'`
- **Double guard:** The product creation endpoint independently checks `expiresAt > now` before allowing product creation, so expired purchases can never be used even before the scheduler runs

### Purchase Exhaustion

- **Mechanism:** Inline check after each product creation
- **Behavior:** After atomically incrementing `listingsUsed`, if `listingsUsed >= packageSnapshot.maxListings`, the purchase status is set to `"exhausted"` immediately

---

## Endpoint Summary Table

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/listing-packages` | No | Any | List active packages (filter by category) |
| GET | `/api/v1/listing-packages/:id` | No | Any | Get package details |
| POST | `/api/v1/listing-purchases` | Yes | User | Purchase a package (returns checkoutUrl for paid) |
| GET | `/api/v1/listing-purchases` | Yes | User | List my purchases |
| GET | `/api/v1/listing-purchases/active` | Yes | User | Get active purchases |
| GET | `/api/v1/listing-purchases/:id` | Yes | User | Get purchase by ID |
| POST | `/api/v1/products` | Yes | User | Create product (purchaseId or subscription) |
| GET | `/api/v1/products/public` | Optional | Any | List active products |
| GET | `/api/v1/products/public/:id` | Optional | Any | Get product details |
| GET | `/api/v1/products/my` | Yes | User | List my products (now includes expired filter) |
| PATCH | `/api/v1/products/:id` | Yes | Owner | Update product (category change blocked) |
| DELETE | `/api/v1/products/:id` | Yes | Owner | Soft-delete product |
| POST | `/api/v1/products/:id/mark-sold` | Yes | Owner | Mark as sold |
| GET | `/api/v1/admin/listing-packages` | Yes | SuperAdmin | List all packages |
| GET | `/api/v1/admin/listing-packages/:id` | Yes | SuperAdmin | Get package |
| POST | `/api/v1/admin/listing-packages` | Yes | SuperAdmin | Create package |
| PATCH | `/api/v1/admin/listing-packages/:id` | Yes | SuperAdmin | Update package |
| DELETE | `/api/v1/admin/listing-packages/:id` | Yes | SuperAdmin | Delete package |
| PATCH | `/api/v1/admin/listing-packages/:id/toggle-status` | Yes | SuperAdmin | Toggle active/inactive |
| GET | `/api/v1/admin/listing-purchases` | Yes | SuperAdmin | List all purchases |
| GET | `/api/v1/admin/listing-purchases/stats` | Yes | SuperAdmin | Purchase statistics |
| GET | `/api/v1/admin/listings/overview` | Yes | SuperAdmin | Listing stats (includes expired count) |
| GET | `/api/v1/admin/listings` | Yes | SuperAdmin | List listings (includes expired filter) |
| PATCH | `/api/v1/admin/listings/:id/status` | Yes | SuperAdmin | Approve/reject (sets listingExpiresAt on approve) |
