# Admin Panel API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [1. Dashboard](#1-dashboard)
  - [2. Listings Management](#2-listings-management)
  - [3. Listing Packages](#3-listing-packages)
  - [4. Listing Purchases](#4-listing-purchases)
  - [5. Stories Management](#5-stories-management)
  - [6. Story Packages](#6-story-packages)
  - [7. Story Purchases](#7-story-purchases)
  - [8. Store Management](#8-store-management)
  - [9. Subscription Plans](#9-subscription-plans)
  - [10. User Subscriptions](#10-user-subscriptions)
  - [11. Payments](#11-payments)
- [Endpoint Summary Table](#endpoint-summary-table)

---

## Overview

All admin endpoints are mounted under `/api/v1/admin/` and require **superAdmin** role authentication. These endpoints power the admin dashboard for managing the SellX marketplace.

### Base URL

```
/api/v1/admin
```

### Authentication

Every admin request requires:
```
Authorization: Bearer <JWT_TOKEN>
```

The JWT must belong to a user with `role: "superAdmin"`. All admin routes are protected by `authenticate` + `authorize('superAdmin')` middleware.

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

## API Endpoints

---

### 1. Dashboard

#### 1.1 Get Dashboard Summary

```
GET /api/v1/admin/dashboard/summary
```

**Query Parameters:**

| Param      | Type   | Description                 |
|------------|--------|-----------------------------|
| `period`   | string | Time period for stats       |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard summary fetched successfully.",
  "data": { }
}
```

---

### 2. Listings Management

#### 2.1 Listings Overview

Returns count statistics for all product listing statuses.

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

#### 2.2 List All Listings

Paginated list of all products with filters.

```
GET /api/v1/admin/listings
```

**Query Parameters:**

| Param      | Type   | Default | Description                                                      |
|------------|--------|---------|------------------------------------------------------------------|
| `page`     | number | 1       | Page number                                                      |
| `limit`    | number | 10      | Items per page (max: 50)                                         |
| `status`   | string | `"all"` | `"all"`, `"pending"`, `"active"`, `"rejected"`, `"sold"`, `"expired"` |
| `search`   | string | -       | Search in title and description                                  |
| `category` | string | -       | Filter by category ObjectId                                      |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listings fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6842c3d4e5f6a7b8c9d0e1f2",
        "title": "Pro Audio Headphones X1",
        "price": 299,
        "status": "draft",
        "thumbnail": "/uploads/products/headphones.jpg",
        "category_name": "Electronics",
        "seller_name": "John Doe",
        "seller_avatar": "/uploads/avatars/john.jpg",
        "created_at": "2026-06-25T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "total_pages": 16
    }
  }
}
```

---

#### 2.3 Get Listing Detail

```
GET /api/v1/admin/listings/:id
```

**Response: 200 OK** (full product object with seller info, favorites, reports)

---

#### 2.4 Approve / Reject Listing

Approving sets status to `"active"` and calculates `listingExpiresAt` from the listing purchase or subscription duration. Rejecting sets status to `"rejected"`.

```
PATCH /api/v1/admin/listings/:id/status
```

**Request Body:**

```json
{
  "status": "active"
}
```

Or with rejection reason:

```json
{
  "status": "rejected",
  "rejectionReason": "Images are not clear enough"
}
```

| Field             | Type   | Required | Description                       |
|-------------------|--------|----------|-----------------------------------|
| `status`          | string | Yes      | `"active"` or `"rejected"`        |
| `rejectionReason` | string | No       | Reason for rejection (max 500)    |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing approved successfully.",
  "data": {
    "id": "6842c3d4e5f6a7b8c9d0e1f2",
    "title": "Pro Audio Headphones X1",
    "status": "active",
    "listingExpiresAt": "2026-07-02T12:00:00.000Z",
    "..."
  }
}
```

---

#### 2.5 Delete Listing

Soft-deletes a product.

```
DELETE /api/v1/admin/listings/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Product deleted successfully.",
  "data": null
}
```

---

### 3. Listing Packages

Admin CRUD for per-category listing pricing packages.

#### 3.1 List All Listing Packages

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
      "category": { "id": "...", "title": "Electronics", "slug": "electronics", "thumbnail": "..." },
      "durationHours": 24,
      "price": 9.99,
      "maxListings": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:00:00.000Z"
    }
  ]
}
```

---

#### 3.2 Get Listing Package by ID

```
GET /api/v1/admin/listing-packages/:id
```

---

#### 3.3 Create Listing Package

```
POST /api/v1/admin/listing-packages
```

**Request Body:**

```json
{
  "name": "Electronics 7-Day Premium",
  "category": "6830a1b2c3d4e5f6a7b8c9d0",
  "durationHours": 168,
  "price": 39.99,
  "maxListings": 5,
  "currency": "USD",
  "validityDays": 60
}
```

| Field          | Type   | Required | Default | Description                       |
|----------------|--------|----------|---------|-----------------------------------|
| `name`         | string | Yes      | -       | Package name (1-100 chars)        |
| `category`     | string | Yes      | -       | Category ObjectId                 |
| `durationHours`| number | Yes      | -       | Listing visibility hours          |
| `price`        | number | Yes      | -       | Price (0 = free)                  |
| `maxListings`  | number | No       | 1       | Listings per purchase             |
| `currency`     | string | No       | `"USD"` | Currency code                     |
| `validityDays` | number | No       | 30      | Purchase validity window          |

**Response: 201 Created**

---

#### 3.4 Update Listing Package

```
PATCH /api/v1/admin/listing-packages/:id
```

**Request Body:** (all fields optional)

```json
{
  "price": 29.99,
  "maxListings": 3
}
```

---

#### 3.5 Delete Listing Package

```
DELETE /api/v1/admin/listing-packages/:id
```

> Existing purchases are unaffected (they use `packageSnapshot`).

---

#### 3.6 Toggle Listing Package Status

Toggles `isActive` between `true` and `false`.

```
PATCH /api/v1/admin/listing-packages/:id/toggle-status
```

---

### 4. Listing Purchases

View all user listing purchases and revenue stats.

#### 4.1 List All Listing Purchases

```
GET /api/v1/admin/listing-purchases
```

**Query Parameters:**

| Param      | Type   | Default | Description                                    |
|------------|--------|---------|------------------------------------------------|
| `page`     | number | 1       | Page number                                    |
| `limit`    | number | 10      | Items per page (max: 50)                       |
| `status`   | string | -       | `"active"`, `"exhausted"`, `"expired"`         |
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
        "user": { "id": "...", "firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatarUrl": "..." },
        "store": { "id": "...", "name": "TechStore", "logo": "..." },
        "category": { "id": "...", "title": "Electronics", "slug": "electronics" },
        "packageSnapshot": { "name": "Electronics 7-Day Premium", "price": 39.99, "maxListings": 5, "..." },
        "listingsUsed": 3,
        "listingsRemaining": 2,
        "status": "active",
        "purchasedAt": "2026-06-20T09:00:00.000Z",
        "expiresAt": "2026-08-19T09:00:00.000Z"
      }
    ],
    "pagination": { "total": 245, "page": 1, "limit": 10, "totalPages": 25 }
  }
}
```

---

#### 4.2 Listing Purchase Statistics

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

### 5. Stories Management

#### 5.1 List All Stories

```
GET /api/v1/admin/stories
```

**Query Parameters:**

| Param    | Type   | Default | Description              |
|----------|--------|---------|--------------------------|
| `page`   | number | 1       | Page number              |
| `limit`  | number | 10      | Items per page (max: 50) |
| `userId` | string | -       | Filter by user ObjectId  |

**Response: 200 OK** (paginated stories with user/store populates)

---

#### 5.2 Story Statistics

```
GET /api/v1/admin/stories/stats
```

**Response: 200 OK** (total stories, active, expired, total views)

---

### 6. Story Packages

Admin CRUD for story pricing packages. Same CRUD pattern as listing packages.

#### 6.1 List All Story Packages

```
GET /api/v1/admin/story-packages
```

---

#### 6.2 Get Story Package by ID

```
GET /api/v1/admin/story-packages/:id
```

---

#### 6.3 Create Story Package

```
POST /api/v1/admin/story-packages
```

**Request Body:**

```json
{
  "name": "48h Standard Story",
  "description": "48-hour story boost",
  "durationHours": 48,
  "price": 7.99,
  "maxStories": 3,
  "currency": "USD",
  "validityDays": 30
}
```

| Field          | Type   | Required | Default | Description                    |
|----------------|--------|----------|---------|--------------------------------|
| `name`         | string | Yes      | -       | Package name (1-100 chars)     |
| `description`  | string | Yes      | -       | Description (1-500 chars)      |
| `durationHours`| number | Yes      | -       | Story visibility hours         |
| `price`        | number | Yes      | -       | Price (0 = free)               |
| `maxStories`   | number | No       | 1       | Stories per purchase           |
| `currency`     | string | No       | `"USD"` | Currency code                  |
| `validityDays` | number | No       | 30      | Purchase validity window       |

---

#### 6.4 Update Story Package

```
PATCH /api/v1/admin/story-packages/:id
```

---

#### 6.5 Delete Story Package

```
DELETE /api/v1/admin/story-packages/:id
```

---

#### 6.6 Toggle Story Package Status

```
PATCH /api/v1/admin/story-packages/:id/toggle-status
```

---

### 7. Story Purchases

#### 7.1 List All Story Purchases

```
GET /api/v1/admin/story-purchases
```

**Query Parameters:**

| Param    | Type   | Default | Description                                    |
|----------|--------|---------|------------------------------------------------|
| `page`   | number | 1       | Page number                                    |
| `limit`  | number | 10      | Items per page (max: 50)                       |
| `status` | string | -       | `"active"`, `"exhausted"`, `"expired"`         |
| `userId` | string | -       | Filter by user ObjectId                        |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story purchases fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
        "user": { "id": "...", "firstName": "John", "lastName": "Doe", "email": "...", "avatarUrl": "..." },
        "store": { "id": "...", "name": "TechStore", "logo": "..." },
        "packageSnapshot": { "name": "48h Standard Story", "price": 7.99, "maxStories": 3, "..." },
        "storiesUsed": 2,
        "storiesRemaining": 1,
        "status": "active",
        "purchasedAt": "2026-06-25T10:00:00.000Z",
        "expiresAt": "2026-07-25T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 89, "page": 1, "limit": 10, "totalPages": 9 }
  }
}
```

---

#### 7.2 Story Purchase Statistics

```
GET /api/v1/admin/story-purchases/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story purchase stats fetched successfully.",
  "data": {
    "totalPurchases": 89,
    "activePurchases": 34,
    "exhaustedPurchases": 41,
    "expiredPurchases": 14,
    "totalRevenue": 2350.00,
    "totalStoriesUsed": 156
  }
}
```

---

### 8. Store Management

#### 8.1 List All Stores

```
GET /api/v1/admin/stores
```

**Query Parameters:**

| Param    | Type   | Default | Description                                   |
|----------|--------|---------|-----------------------------------------------|
| `page`   | number | 1       | Page number                                   |
| `limit`  | number | 10      | Items per page (max: 50)                      |
| `filter` | string | `"all"` | `"all"`, `"active"`, `"pending"`, `"blocked"` |
| `search` | string | -       | Search in store name and slug                 |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stores fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
        "name": "TechHaven Pro",
        "slug": "techhaven-pro",
        "logo": "/uploads/stores/logo.jpg",
        "banner": "/uploads/stores/banner.jpg",
        "category": { "id": "...", "title": "Electronics", "slug": "electronics" },
        "totalProducts": 12,
        "status": "active",
        "createdAt": "2026-06-20T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 156, "page": 1, "limit": 10, "totalPages": 16 }
  }
}
```

---

#### 8.2 Store Statistics

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

#### 8.3 Store Detail (Overview Tab)

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
    "id": "...",
    "name": "TechHaven Pro",
    "slug": "techhaven-pro",
    "logo": "...",
    "banner": "...",
    "description": "Premium electronics and accessories",
    "category": { "id": "...", "title": "Electronics", "slug": "electronics" },
    "status": "active",
    "totalProducts": 12,
    "revenue": 0,
    "followerCount": 34,
    "totalReviewCount": 15,
    "avgRating": 4.5,
    "responseRate": 0,
    "contacts": [{ "type": "email", "value": "contact@techhaven.com" }],
    "owner": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "..."
    },
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-27T14:30:00.000Z"
  }
}
```

---

#### 8.4 Store Listings Tab

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

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store products fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
        "title": "Pro Audio Headphones X1",
        "price": 299,
        "currency": "NOK",
        "status": "pending",
        "thumbnail": "/uploads/products/headphones.jpg",
        "category_name": "Electronics",
        "created_at": "2026-06-25T12:00:00.000Z",
        "viewCount": 45
      }
    ],
    "pagination": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
  }
}
```

---

#### 8.5 Store Ads Tab

```
GET /api/v1/admin/stores/:id/ads
```

**Query Parameters:** `page`, `limit`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store ads fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
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
    "pagination": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

#### 8.6 Store Payments Tab

```
GET /api/v1/admin/stores/:id/payments
```

**Query Parameters:** `page`, `limit`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store payments fetched successfully.",
  "data": {
    "items": [
      { "id": "...", "packageName": "Pro Audio Headphones X1", "type": "promotion", "price": 0, "date": "..." },
      { "id": "...", "packageName": "Summer Electronics Sale", "type": "ad", "price": 49.99, "date": "..." }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

#### 8.7 Toggle Store Status

```
PATCH /api/v1/admin/stores/:id/toggle-status
```

**Request Body:**

```json
{
  "status": "blocked"
}
```

| Field    | Type   | Required | Description                             |
|----------|--------|----------|-----------------------------------------|
| `status` | string | Yes      | `"active"`, `"pending"`, or `"blocked"` |

> Blocking sets `isActive = false`. Activating sets `isActive = true`.

---

### 9. Subscription Plans

Admin CRUD for professional store subscription plans (listings only, stories not included).

#### 9.1 List All Subscription Plans

```
GET /api/v1/admin/subscriptions
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscriptions fetched successfully.",
  "data": [
    {
      "id": "...",
      "name": "Pro Weekly",
      "icon": "...",
      "features": ["20 product listings per week", "7-day listing visibility"],
      "description": "Perfect for active sellers.",
      "price": 99,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168,
      "isActive": true,
      "createdAt": "2026-06-20T10:00:00.000Z"
    }
  ]
}
```

---

#### 9.2 Get Subscription Plan by ID

```
GET /api/v1/admin/subscriptions/:id
```

---

#### 9.3 Create Subscription Plan

```
POST /api/v1/admin/subscriptions
```

**Request Body:**

```json
{
  "name": "Pro Weekly",
  "icon": "",
  "features": ["20 product listings per week", "7-day listing visibility"],
  "description": "Perfect for active sellers.",
  "price": 99,
  "currency": "NOK",
  "billingType": "weekly",
  "durationDays": 7,
  "maxListings": 20,
  "listingDurationHours": 168
}
```

| Field                  | Type     | Required | Default | Description                          |
|------------------------|----------|----------|---------|--------------------------------------|
| `name`                 | string   | Yes      | -       | Plan name (2-100 chars)              |
| `icon`                 | string   | No       | `""`    | Icon/emoji                           |
| `features`             | string[] | No       | `[]`    | Feature bullet points                |
| `description`          | string   | No       | -       | Description (max 500)                |
| `price`                | number   | Yes      | -       | Price per period (0 = free)          |
| `currency`             | string   | No       | `"USD"` | Currency code                        |
| `billingType`          | string   | Yes      | -       | `"weekly"` or `"monthly"`            |
| `durationDays`         | number   | Yes      | -       | Period length in days                |
| `maxListings`          | number   | Yes      | -       | Listings per period (`-1` = unlimited) |
| `listingDurationHours` | number   | Yes      | -       | Listing visibility hours             |

---

#### 9.4 Update Subscription Plan

```
PATCH /api/v1/admin/subscriptions/:id
```

> Existing user subscriptions are unaffected (they use `planSnapshot`).

---

#### 9.5 Delete Subscription Plan

```
DELETE /api/v1/admin/subscriptions/:id
```

---

#### 9.6 Toggle Subscription Plan Status

```
PATCH /api/v1/admin/subscriptions/:id/toggle-status
```

**Request Body:**

```json
{
  "isActive": false
}
```

---

### 10. User Subscriptions

Monitor and manage active user subscriptions.

#### 10.1 List All User Subscriptions

```
GET /api/v1/admin/user-subscriptions
```

**Query Parameters:**

| Param            | Type   | Default | Description                                    |
|------------------|--------|---------|------------------------------------------------|
| `page`           | number | 1       | Page number                                    |
| `limit`          | number | 10      | Items per page (max: 50)                       |
| `status`         | string | -       | `"active"`, `"expired"`, `"cancelled"`         |
| `userId`         | string | -       | Filter by user ObjectId                        |
| `subscriptionId` | string | -       | Filter by subscription plan ObjectId           |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User subscriptions fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
        "user": { "id": "...", "firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatarUrl": "..." },
        "store": { "id": "...", "name": "TechStore Oslo", "logo": "...", "storeType": "professional" },
        "plan": { "id": "...", "name": "Pro Weekly", "billingType": "weekly", "price": 99 },
        "planSnapshot": { "name": "Pro Weekly", "price": 99, "maxListings": 20, "listingDurationHours": 168, "..." },
        "listingsUsed": 8,
        "listingsRemaining": 12,
        "status": "active",
        "startDate": "2026-06-27T14:30:00.000Z",
        "endDate": "2026-07-04T14:30:00.000Z",
        "autoRenew": true,
        "cancelledAt": null,
        "createdAt": "2026-06-27T14:30:00.000Z"
      }
    ],
    "pagination": { "total": 89, "page": 1, "limit": 10, "totalPages": 9 }
  }
}
```

---

#### 10.2 User Subscription Statistics

```
GET /api/v1/admin/user-subscriptions/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription stats fetched successfully.",
  "data": {
    "totalSubscriptions": 156,
    "activeSubscriptions": 89,
    "expiredSubscriptions": 52,
    "cancelledSubscriptions": 15,
    "totalRevenue": 23450,
    "totalListingsUsed": 1247
  }
}
```

---

#### 10.3 Get User Subscription by ID

```
GET /api/v1/admin/user-subscriptions/:id
```

**Response: 200 OK** (full subscription with populated user, store, plan, and payment transaction)

---

#### 10.4 Admin Cancel Subscription

Force-cancels a user's subscription immediately. Reverts store to `"regular"` if no other active subscription exists.

```
PATCH /api/v1/admin/user-subscriptions/:id/cancel
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled successfully.",
  "data": {
    "id": "...",
    "status": "cancelled",
    "autoRenew": false,
    "cancelledAt": "2026-06-29T10:15:00.000Z",
    "..."
  }
}
```

---

### 11. Payments

Global payment transaction management across all payment types.

#### 11.1 List All Payment Transactions

```
GET /api/v1/admin/payments
```

**Query Parameters:**

| Param         | Type   | Default | Description                                            |
|---------------|--------|---------|--------------------------------------------------------|
| `page`        | number | 1       | Page number                                            |
| `limit`       | number | 10      | Items per page (max: 50)                               |
| `paymentType` | string | -       | `"boost"`, `"story"`, `"listing"`, `"subscription"`, `"ad"` |
| `status`      | string | -       | `"pending"`, `"approved"`, `"rejected"`                |
| `search`      | string | -       | Search in email and description                        |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment transactions fetched successfully.",
  "data": {
    "items": [
      {
        "id": "...",
        "user": { "id": "...", "firstName": "John", "lastName": "Doe", "email": "john@example.com", "avatarUrl": "..." },
        "paymentType": "subscription",
        "amount": 99,
        "currency": "NOK",
        "date": "2026-06-27T14:30:00.000Z",
        "status": "approved",
        "description": "Subscription: Pro Weekly (weekly)"
      }
    ],
    "pagination": { "total": 500, "page": 1, "limit": 10, "totalPages": 50 }
  }
}
```

---

#### 11.2 Payment Statistics

```
GET /api/v1/admin/payments/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment stats fetched successfully.",
  "data": {
    "totalEarnings": 125000,
    "totalTransactions": 1250,
    "boost": { "amount": 15000, "percentage": 12 },
    "story": { "amount": 8500, "percentage": 6.8 },
    "listing": { "amount": 45000, "percentage": 36 },
    "subscription": { "amount": 52000, "percentage": 41.6 },
    "ad": { "amount": 4500, "percentage": 3.6 }
  }
}
```

---

## Endpoint Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Dashboard** | | |
| GET | `/admin/dashboard/summary` | Dashboard summary stats |
| **Listings** | | |
| GET | `/admin/listings/overview` | Listing count stats (pending, active, sold, rejected, expired) |
| GET | `/admin/listings` | List all listings with filters |
| GET | `/admin/listings/:id` | Get listing detail |
| PATCH | `/admin/listings/:id/status` | Approve or reject listing |
| DELETE | `/admin/listings/:id` | Soft-delete listing |
| **Listing Packages** | | |
| GET | `/admin/listing-packages` | List all listing packages |
| GET | `/admin/listing-packages/:id` | Get listing package by ID |
| POST | `/admin/listing-packages` | Create listing package |
| PATCH | `/admin/listing-packages/:id` | Update listing package |
| DELETE | `/admin/listing-packages/:id` | Delete listing package |
| PATCH | `/admin/listing-packages/:id/toggle-status` | Toggle active/inactive |
| **Listing Purchases** | | |
| GET | `/admin/listing-purchases` | List all listing purchases |
| GET | `/admin/listing-purchases/stats` | Listing purchase statistics |
| **Stories** | | |
| GET | `/admin/stories` | List all stories |
| GET | `/admin/stories/stats` | Story statistics |
| **Story Packages** | | |
| GET | `/admin/story-packages` | List all story packages |
| GET | `/admin/story-packages/:id` | Get story package by ID |
| POST | `/admin/story-packages` | Create story package |
| PATCH | `/admin/story-packages/:id` | Update story package |
| DELETE | `/admin/story-packages/:id` | Delete story package |
| PATCH | `/admin/story-packages/:id/toggle-status` | Toggle active/inactive |
| **Story Purchases** | | |
| GET | `/admin/story-purchases` | List all story purchases |
| GET | `/admin/story-purchases/stats` | Story purchase statistics |
| **Stores** | | |
| GET | `/admin/stores` | List all stores |
| GET | `/admin/stores/stats` | Store statistics |
| GET | `/admin/stores/:id` | Store detail (Overview tab) |
| GET | `/admin/stores/:id/products` | Store listings (Listings tab) |
| GET | `/admin/stores/:id/ads` | Store ads (Ads tab) |
| GET | `/admin/stores/:id/payments` | Store payments (Payments tab) |
| PATCH | `/admin/stores/:id/toggle-status` | Toggle store status |
| **Subscription Plans** | | |
| GET | `/admin/subscriptions` | List all subscription plans |
| GET | `/admin/subscriptions/:id` | Get plan by ID |
| POST | `/admin/subscriptions` | Create subscription plan |
| PATCH | `/admin/subscriptions/:id` | Update subscription plan |
| DELETE | `/admin/subscriptions/:id` | Delete subscription plan |
| PATCH | `/admin/subscriptions/:id/toggle-status` | Toggle plan active/inactive |
| **User Subscriptions** | | |
| GET | `/admin/user-subscriptions` | List all user subscriptions |
| GET | `/admin/user-subscriptions/stats` | Subscription statistics |
| GET | `/admin/user-subscriptions/:id` | Get user subscription by ID |
| PATCH | `/admin/user-subscriptions/:id/cancel` | Force-cancel subscription |
| **Payments** | | |
| GET | `/admin/payments` | List all payment transactions |
| GET | `/admin/payments/stats` | Payment statistics by type |
