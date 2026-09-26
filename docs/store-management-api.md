# Store Management API Documentation

## Table of Contents

- [Overview](#overview)
- [Complete User Flow](#complete-user-flow)
- [Complete Admin Flow](#complete-admin-flow)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [User: Store Management](#1-user-store-management)
  - [User: Store Follow](#2-user-store-follow)
  - [Admin: Store List & Stats](#3-admin-store-list--stats)
  - [Admin: Store Detail (Overview Tab)](#4-admin-store-detail-overview-tab)
  - [Admin: Store Listings Tab](#5-admin-store-listings-tab)
  - [Admin: Store Ads Tab](#6-admin-store-ads-tab)
  - [Admin: Store Payments Tab](#7-admin-store-payments-tab)
  - [Admin: Store Actions](#8-admin-store-actions)
- [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## Overview

Stores are the seller profiles in the SellX marketplace. Each user can create **one active store** tied to a specific category. Stores can be either `"regular"` (default) or `"professional"` (upgraded via subscription).

The admin dashboard provides a detailed store management view with **4 tabs**:

| Tab | Description | API |
|-----|-------------|-----|
| **Overview** | Store info, owner details, stats (listings, revenue, followers) | `GET /admin/stores/:id` |
| **Listings** | Paginated products with status filters and search | `GET /admin/stores/:id/products` |
| **Ads** | Ad campaigns associated with the store | `GET /admin/stores/:id/ads` |
| **Payments** | Payment history (promotions + ad campaigns) | `GET /admin/stores/:id/payments` |

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
Step 1:  User creates a store (one per account)
         POST /api/v1/stores  (multipart: logo, banner + JSON body)
         { name: "My Store", category: "catId", description: "...", contacts: [...] }
         -> Store created with status "active", storeType "regular"
         -> User's activeProfileType set to "store"

Step 2:  User views their own store
         GET /api/v1/stores/self
         -> Returns store with populated category

Step 3:  User updates their store
         PATCH /api/v1/stores/self  (multipart: logo, banner + JSON body)
         { name: "Updated Name", description: "..." }

Step 4:  User views their store's products
         GET /api/v1/stores/self/products?page=1&limit=20&status=active

Step 5:  User views their store's reviews
         GET /api/v1/stores/self/reviews?page=1&limit=20

Step 6:  Other users can follow/unfollow a store
         POST /api/v1/stores/:id/follow
         DELETE /api/v1/stores/:id/follow

Step 7:  Anyone can browse stores
         GET /api/v1/stores
         GET /api/v1/stores/by-slug/my-store
```

---

## Complete Admin Flow

```
Step 1:  Admin views all stores
         GET /api/v1/admin/stores?filter=active&search=tech
         -> Paginated list with category, product count, status

Step 2:  Admin views store statistics
         GET /api/v1/admin/stores/stats
         -> Total stores, pending, blocked, monthly revenue

Step 3:  Admin opens a store detail page (Overview tab)
         GET /api/v1/admin/stores/:id
         -> Full store info, owner details, stats

Step 4:  Admin views store's Listings tab
         GET /api/v1/admin/stores/:id/products?status=pending&page=1
         -> Paginated products with filters and search

Step 5:  Admin views store's Ads tab
         GET /api/v1/admin/stores/:id/ads?page=1&limit=10
         -> Ad campaigns for this store

Step 6:  Admin views store's Payments tab
         GET /api/v1/admin/stores/:id/payments?page=1&limit=10
         -> Promoted products + ad campaign payment history

Step 7:  Admin toggles store status
         PATCH /api/v1/admin/stores/:id/toggle-status
         { status: "blocked" }
         -> Store blocked, isActive set to false
```

---

## Data Models

### Store

| Field              | Type     | Description                                              |
|--------------------|----------|----------------------------------------------------------|
| `id`               | string   | Unique identifier                                        |
| `name`             | string   | Store name (2-100 chars)                                 |
| `slug`             | string   | URL-friendly slug (auto-generated, unique)               |
| `logo`             | string   | Logo image URL                                           |
| `banner`           | string   | Banner image URL                                         |
| `description`      | string   | Store description (max 1000 chars)                       |
| `category`         | object   | Category this store belongs to (id, title, slug)         |
| `contacts`         | array    | Contact methods (phone, email, whatsapp)                 |
| `status`           | string   | `"active"`, `"pending"`, or `"blocked"`                  |
| `storeType`        | string   | `"regular"` or `"professional"` (subscription-based)     |
| `isActive`         | boolean  | Whether store is active                                  |
| `isVerified`       | boolean  | Verification status                                      |
| `totalProducts`    | number   | Total product count                                      |
| `avgRating`        | number   | Average rating (0-5)                                     |
| `totalReviewCount` | number   | Total number of reviews                                  |
| `followerCount`    | number   | Number of followers                                      |
| `totalViews`       | number   | Total page views                                         |
| `totalClicks`      | number   | Total clicks                                             |
| `totalMessages`    | number   | Total messages received                                  |
| `dailyStats`       | array    | Last 30 days of daily views/clicks                       |
| `createdAt`        | date     | Creation timestamp                                       |
| `updatedAt`        | date     | Last update timestamp                                    |

### Store Contact

| Field   | Type   | Description                          |
|---------|--------|--------------------------------------|
| `type`  | string | `"phone"`, `"email"`, or `"whatsapp"` |
| `value` | string | Contact value                        |

### Store Detail (Admin Overview Tab)

| Field              | Type    | Description                              |
|--------------------|---------|------------------------------------------|
| `id`               | string  | Store ID                                 |
| `name`             | string  | Store name                               |
| `slug`             | string  | URL slug                                 |
| `logo`             | string  | Logo URL                                 |
| `banner`           | string  | Banner URL                               |
| `description`      | string  | Store description                        |
| `category`         | object  | Category (id, title, slug)               |
| `status`           | string  | Store status                             |
| `totalProducts`    | number  | Total Listings count                     |
| `revenue`          | number  | Revenue amount                           |
| `followerCount`    | number  | Followers count                          |
| `totalReviewCount` | number  | Reviews count                            |
| `avgRating`        | number  | Average rating                           |
| `responseRate`     | number  | Response rate percentage                 |
| `contacts`         | array   | Contact methods                          |
| `owner`            | object  | Owner info (id, name, email, avatar)     |
| `createdAt`        | date    | Created timestamp                        |
| `updatedAt`        | date    | Updated timestamp                        |

### Store Product Row (Admin Listings Tab)

| Field           | Type   | Description                     |
|-----------------|--------|---------------------------------|
| `id`            | string | Product ID                      |
| `title`         | string | Listing title                   |
| `price`         | number | Price                           |
| `currency`      | string | Currency code                   |
| `status`        | string | Product status                  |
| `thumbnail`     | string | First media image URL           |
| `category_name` | string | Category name                   |
| `created_at`    | date   | Created timestamp               |
| `viewCount`     | number | View count                      |

### Ad Row (Admin Ads Tab)

| Field          | Type    | Description                  |
|----------------|---------|------------------------------|
| `id`           | string  | Ad campaign ID               |
| `adTitle`      | string  | Ad title                     |
| `adType`       | string  | Type of ad                   |
| `price`        | number  | Ad price                     |
| `durationDays` | number  | Duration in days             |
| `startDate`    | date    | Campaign start date          |
| `endDate`      | date    | Campaign end date            |
| `isActive`     | boolean | Whether currently active     |
| `createdAt`    | date    | Created timestamp            |

### Payment Row (Admin Payments Tab)

| Field         | Type   | Description                                    |
|---------------|--------|------------------------------------------------|
| `id`          | string | Record ID                                      |
| `packageName` | string | Product title or ad campaign name              |
| `type`        | string | `"promotion"` or `"ad"`                        |
| `price`       | number | Amount paid                                    |
| `date`        | date   | Payment date                                   |

---

## API Endpoints

---

### 1. User: Store Management

#### 1.1 Create Store

Creates a new store for the authenticated user. Each user can only have **one active store**.

```
POST /api/v1/stores
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field    | Type   | Required | Description            |
|----------|--------|----------|------------------------|
| `logo`   | file   | No       | Store logo image       |
| `banner` | file   | No       | Store banner image     |
| `data`   | string | Yes      | JSON string with body  |

**JSON Body (inside `data` field):**

```json
{
  "name": "TechHaven Pro",
  "category": "6830a1b2c3d4e5f6a7b8c9d0",
  "description": "Premium electronics and accessories",
  "contacts": [
    { "type": "email", "value": "contact@techhaven.com" },
    { "type": "whatsapp", "value": "+4712345678" }
  ]
}
```

| Field         | Type   | Required | Description                      |
|---------------|--------|----------|----------------------------------|
| `name`        | string | Yes      | Store name (2-100 chars)         |
| `category`    | string | Yes      | Category ObjectId                |
| `description` | string | No       | Description (max 1000 chars)     |
| `contacts`    | array  | No       | Contact methods                  |

**Response: 201 Created**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Store created successfully.",
  "data": {
    "id": "6835b1c2d3e4f5a6b7c8d9e0",
    "name": "TechHaven Pro",
    "slug": "techhaven-pro",
    "logo": "/uploads/stores/1719500000000-logo.jpg",
    "banner": "/uploads/stores/1719500000000-banner.jpg",
    "description": "Premium electronics and accessories",
    "category": "6830a1b2c3d4e5f6a7b8c9d0",
    "contacts": [
      { "type": "email", "value": "contact@techhaven.com" },
      { "type": "whatsapp", "value": "+4712345678" }
    ],
    "status": "active",
    "storeType": "regular",
    "isActive": true,
    "isVerified": false,
    "totalProducts": 0,
    "avgRating": 0,
    "followerCount": 0,
    "createdAt": "2026-06-27T10:00:00.000Z"
  }
}
```

**Response: 409 Conflict** (user already has a store)

```json
{
  "success": false,
  "statusCode": 409,
  "message": "You can only create one store per account",
  "errorCode": "STORE_ALREADY_EXISTS"
}
```

---

#### 1.2 Get My Store

```
GET /api/v1/stores/self
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store fetched successfully.",
  "data": {
    "id": "6835b1c2d3e4f5a6b7c8d9e0",
    "name": "TechHaven Pro",
    "slug": "techhaven-pro",
    "category": {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "title": "Electronics",
      "slug": "electronics"
    },
    "status": "active",
    "storeType": "regular",
    "totalProducts": 12,
    "avgRating": 4.5,
    "followerCount": 34,
    "..."
  }
}
```

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Store not found",
  "errorCode": "STORE_NOT_FOUND"
}
```

---

#### 1.3 Update My Store

```
PATCH /api/v1/stores/self
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:** `logo` (file, optional), `banner` (file, optional), `data` (JSON string)

**JSON Body:** (all fields optional)

```json
{
  "name": "TechHaven Pro Updated",
  "description": "Updated description",
  "contacts": [
    { "type": "email", "value": "new@techhaven.com" }
  ]
}
```

**Response: 200 OK** (full updated store object)

---

#### 1.4 Get My Store Products

```
GET /api/v1/stores/self/products
```

**Auth:** Required

**Query Parameters:**

| Param    | Type   | Default | Description                                 |
|----------|--------|---------|---------------------------------------------|
| `page`   | number | 1       | Page number                                 |
| `limit`  | number | 20      | Items per page (max: 50)                    |
| `status` | string | -       | Filter: `"active"`, `"draft"`, `"sold"`, etc. |

**Response: 200 OK** (paginated products)

---

#### 1.5 Get My Store Reviews

```
GET /api/v1/stores/self/reviews
```

**Auth:** Required

**Query Parameters:**

| Param  | Type   | Default | Description              |
|--------|--------|---------|--------------------------|
| `page` | number | 1       | Page number              |
| `limit`| number | 20      | Items per page (max: 50) |

**Response: 200 OK** (paginated reviews)

---

#### 1.6 Browse Stores (Public)

```
GET /api/v1/stores
```

**Auth:** Not required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stores fetched successfully.",
  "data": {
    "data": [
      {
        "id": "6835b1c2d3e4f5a6b7c8d9e0",
        "name": "TechHaven Pro",
        "logo": "/uploads/stores/logo.jpg",
        "slug": "techhaven-pro",
        "category": {
          "id": "6830a1b2c3d4e5f6a7b8c9d0",
          "title": "Electronics",
          "slug": "electronics"
        },
        "isVerified": false,
        "totalProducts": 12,
        "avgRating": 4.5,
        "followerCount": 34
      }
    ],
    "meta": {
      "pagination": {
        "currentPage": 1,
        "limit": 10,
        "totalCount": 25,
        "totalPages": 3,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
}
```

---

#### 1.7 Get Store by Slug (Public)

```
GET /api/v1/stores/by-slug/:slug
```

**Auth:** Optional

**Response: 200 OK** (full store object with populated category)

---

### 2. User: Store Follow

#### 2.1 Follow a Store

```
POST /api/v1/stores/:id/follow
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store followed successfully.",
  "data": null
}
```

---

#### 2.2 Unfollow a Store

```
DELETE /api/v1/stores/:id/follow
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store unfollowed successfully.",
  "data": null
}
```

---

### 3. Admin: Store List & Stats

All admin endpoints require `superAdmin` role.

#### 3.1 List All Stores

```
GET /api/v1/admin/stores
```

**Query Parameters:**

| Param    | Type   | Default | Description                                    |
|----------|--------|---------|------------------------------------------------|
| `page`   | number | 1       | Page number                                    |
| `limit`  | number | 10      | Items per page (max: 50)                       |
| `filter` | string | `"all"` | `"all"`, `"active"`, `"pending"`, `"blocked"`  |
| `search` | string | -       | Search in store name and slug                  |

**Example:** `GET /api/v1/admin/stores?filter=active&search=tech`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stores fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6835b1c2d3e4f5a6b7c8d9e0",
        "name": "TechHaven Pro",
        "slug": "techhaven-pro",
        "logo": "/uploads/stores/logo.jpg",
        "banner": "/uploads/stores/banner.jpg",
        "category": {
          "id": "6830a1b2c3d4e5f6a7b8c9d0",
          "title": "Electronics",
          "slug": "electronics"
        },
        "totalProducts": 12,
        "status": "active",
        "createdAt": "2026-06-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

---

#### 3.2 Store Statistics

```
GET /api/v1/admin/stores/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store stats fetched successfully.",
  "data": {
    "totalStores": 156,
    "pendingStores": 8,
    "blockedStores": 3,
    "monthlyRevenue": 0
  }
}
```

---

### 4. Admin: Store Detail (Overview Tab)

Returns full store information including owner details. This powers the **Overview** tab on the admin store detail page.

```
GET /api/v1/admin/stores/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store details fetched successfully.",
  "data": {
    "id": "6835b1c2d3e4f5a6b7c8d9e0",
    "name": "TechHaven Pro",
    "slug": "techhaven-pro",
    "logo": "/uploads/stores/logo.jpg",
    "banner": "/uploads/stores/banner.jpg",
    "description": "Premium electronics and accessories",
    "category": {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "title": "Electronics",
      "slug": "electronics"
    },
    "status": "active",
    "totalProducts": 12,
    "revenue": 0,
    "followerCount": 34,
    "totalReviewCount": 15,
    "avgRating": 4.5,
    "responseRate": 0,
    "contacts": [
      { "type": "email", "value": "contact@techhaven.com" },
      { "type": "whatsapp", "value": "+4712345678" }
    ],
    "owner": {
      "id": "6829a0b1c2d3e4f5a6b7c8d9",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "/uploads/avatars/john.jpg"
    },
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-27T14:30:00.000Z"
  }
}
```

> The **Total Listings**, **Revenue**, and **Followers** cards at the top of the page are populated from `totalProducts`, `revenue`, and `followerCount` respectively.

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Store not found",
  "errorCode": "NOT_FOUND"
}
```

---

### 5. Admin: Store Listings Tab

Returns paginated products for a specific store with status filtering and search. This powers the **Listings** tab.

```
GET /api/v1/admin/stores/:id/products
```

**Query Parameters:**

| Param    | Type   | Default | Description                                                          |
|----------|--------|---------|----------------------------------------------------------------------|
| `page`   | number | 1       | Page number                                                          |
| `limit`  | number | 10      | Items per page (max: 50)                                             |
| `status` | string | `"all"` | `"all"`, `"draft"`, `"active"`, `"rejected"`, `"sold"`, `"expired"`, `"removed"` |
| `search` | string | -       | Search in title and description                                      |

**Example:** `GET /api/v1/admin/stores/:id/products?status=pending&search=headphones`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store products fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6842c3d4e5f6a7b8c9d0e1f2",
        "title": "Pro Audio Headphones X1",
        "price": 299,
        "currency": "NOK",
        "status": "pending",
        "thumbnail": "/uploads/products/headphones.jpg",
        "category_name": "Electronics",
        "created_at": "2026-06-25T12:00:00.000Z",
        "viewCount": 45
      },
      {
        "id": "6842c3d4e5f6a7b8c9d0e1f3",
        "title": "Minimalist White Watch",
        "price": 145,
        "currency": "NOK",
        "status": "pending",
        "thumbnail": "/uploads/products/watch.jpg",
        "category_name": "Accessories",
        "created_at": "2026-06-24T09:30:00.000Z",
        "viewCount": 23
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

> Each row shows IMAGE (from `thumbnail`), LISTING TITLE, CATEGORY, SELLER (store name), PRICE, STATUS, and ACTIONS (approve/reject/view) as seen in the UI screenshot.

---

### 6. Admin: Store Ads Tab

Returns ad campaigns associated with the store. This powers the **Ads** tab.

```
GET /api/v1/admin/stores/:id/ads
```

**Query Parameters:**

| Param  | Type   | Default | Description              |
|--------|--------|---------|--------------------------|
| `page` | number | 1       | Page number              |
| `limit`| number | 10      | Items per page (max: 50) |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store ads fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6845e5f6a7b8c9d0e1f2a3b4",
        "adTitle": "Summer Electronics Sale",
        "adType": "banner",
        "price": 49.99,
        "durationDays": 7,
        "startDate": "2026-06-20T00:00:00.000Z",
        "endDate": "2026-06-27T00:00:00.000Z",
        "isActive": true,
        "createdAt": "2026-06-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

**Response: 200 OK** (no ads)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store ads fetched successfully.",
  "data": {
    "items": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    }
  }
}
```

---

### 7. Admin: Store Payments Tab

Returns payment history for the store, combining promoted product payments and ad campaign payments. This powers the **Payments** tab.

```
GET /api/v1/admin/stores/:id/payments
```

**Query Parameters:**

| Param  | Type   | Default | Description              |
|--------|--------|---------|--------------------------|
| `page` | number | 1       | Page number              |
| `limit`| number | 10      | Items per page (max: 50) |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store payments fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6842c3d4e5f6a7b8c9d0e1f2",
        "packageName": "Pro Audio Headphones X1",
        "type": "promotion",
        "price": 0,
        "date": "2026-06-25T12:00:00.000Z"
      },
      {
        "id": "6845e5f6a7b8c9d0e1f2a3b4",
        "packageName": "Summer Electronics Sale",
        "type": "ad",
        "price": 49.99,
        "date": "2026-06-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

> The payments tab combines two sources:
> - **Promoted products** (`type: "promotion"`) -- products with active boost/promotion
> - **Ad campaigns** (`type: "ad"`) -- ad campaigns purchased for this store

---

### 8. Admin: Store Actions

#### 8.1 Toggle Store Status

Change a store's status between `active`, `pending`, and `blocked`. Blocking a store sets `isActive` to `false`.

```
PATCH /api/v1/admin/stores/:id/toggle-status
```

**Request Body:**

```json
{
  "status": "blocked"
}
```

| Field    | Type   | Required | Description                              |
|----------|--------|----------|------------------------------------------|
| `status` | string | Yes      | `"active"`, `"pending"`, or `"blocked"`  |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store status updated to blocked.",
  "data": {
    "id": "6835b1c2d3e4f5a6b7c8d9e0",
    "name": "TechHaven Pro",
    "slug": "techhaven-pro",
    "logo": "/uploads/stores/logo.jpg",
    "category": {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "title": "Electronics",
      "slug": "electronics"
    },
    "totalProducts": 12,
    "status": "blocked",
    "createdAt": "2026-06-20T10:00:00.000Z"
  }
}
```

> When status is set to `"blocked"`, `isActive` is automatically set to `false`. When status is set to `"active"` or `"pending"`, `isActive` is set to `true`.

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Store not found",
  "errorCode": "NOT_FOUND"
}
```

---

## Edge Cases & Error Handling

### Store Lifecycle

| Scenario | Behavior |
|----------|----------|
| User tries to create a second store | 409 Conflict -- one active store per account |
| Store name already exists (same slug) | 409 Conflict -- slug must be unique |
| Admin blocks a store | `isActive` set to `false`, store hidden from public |
| Admin reactivates a blocked store | `isActive` set to `true`, store visible again |
| Blocked store tries to create listings | 403 Forbidden -- blocked stores cannot create listings |
| User deletes their store | Soft delete -- `status` set to `"blocked"`, `isActive` = `false` |

### Store Type Rules

| Scenario | Store Type |
|----------|------------|
| Store created (no subscription) | `"regular"` |
| User subscribes to a plan | `"professional"` |
| Subscription expires or cancelled | `"regular"` |
| Professional store can create products | Without `purchaseId` (subscription covers it) |
| Regular store creates products | Requires `purchaseId` from listing purchase |

### Admin Tab Data Sources

| Tab | Data Source | Model |
|-----|-------------|-------|
| Overview | Store document + User (owner) lookup | `Store`, `User` |
| Listings | Products filtered by `store` field | `Product` |
| Ads | Ad campaigns filtered by `store` field | `AdCampaign` |
| Payments | Promoted products + ad campaigns combined | `Product` (promotion), `AdCampaign` |

---

## Endpoint Summary Table

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/stores` | No | Any | Browse stores (public) |
| GET | `/api/v1/stores/by-slug/:slug` | Optional | Any | Get store by slug |
| POST | `/api/v1/stores` | Yes | User | Create a store |
| GET | `/api/v1/stores/self` | Yes | User | Get my store |
| PATCH | `/api/v1/stores/self` | Yes | User | Update my store |
| GET | `/api/v1/stores/self/products` | Yes | User | My store products |
| GET | `/api/v1/stores/self/reviews` | Yes | User | My store reviews |
| POST | `/api/v1/stores/:id/follow` | Yes | User | Follow a store |
| DELETE | `/api/v1/stores/:id/follow` | Yes | User | Unfollow a store |
| GET | `/api/v1/admin/stores` | Yes | SuperAdmin | List all stores |
| GET | `/api/v1/admin/stores/stats` | Yes | SuperAdmin | Store statistics |
| GET | `/api/v1/admin/stores/:id` | Yes | SuperAdmin | Store detail (Overview tab) |
| GET | `/api/v1/admin/stores/:id/products` | Yes | SuperAdmin | Store listings (Listings tab) |
| GET | `/api/v1/admin/stores/:id/ads` | Yes | SuperAdmin | Store ads (Ads tab) |
| GET | `/api/v1/admin/stores/:id/payments` | Yes | SuperAdmin | Store payments (Payments tab) |
| PATCH | `/api/v1/admin/stores/:id/toggle-status` | Yes | SuperAdmin | Toggle store status |
