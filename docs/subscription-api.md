# Professional Store Subscription API Documentation

## Table of Contents

- [Overview](#overview)
- [How It Relates to Per-Use Packages](#how-it-relates-to-per-use-packages)
- [Complete User Flow](#complete-user-flow)
- [Complete Admin Flow](#complete-admin-flow)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [User: Subscription Plans (Public)](#1-user-subscription-plans-public)
  - [User: Subscribe & Manage](#2-user-subscribe--manage)
  - [User: Products (Subscription Path)](#3-user-products-subscription-path)
  - [Admin: Subscription Plans](#4-admin-subscription-plans)
  - [Admin: User Subscriptions](#5-admin-user-subscriptions)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Auto-Expiration & Renewal Mechanisms](#auto-expiration--renewal-mechanisms)

---

## Overview

The Subscription system allows store owners to upgrade to a **Professional Store** by purchasing a weekly or monthly subscription plan. Once subscribed, the user can create product listings **without purchasing per-use listing packages** -- the subscription covers listing usage within the plan limits.

Each subscription plan defines:

- **Billing type** (`weekly` or `monthly`)
- **Duration** in days (e.g., 7 for weekly, 30 for monthly)
- **Price** and **currency** (e.g., 299 NOK)
- **Max listings** per period (how many products can be listed; `-1` = unlimited)
- **Listing duration** in hours (how long each product stays visible after admin approval)

> **Note:** Subscriptions cover **product listings only**. Stories are **not included** in subscriptions -- users must always purchase story packages separately via the [Story Monetization API](./story-monetization-api.md).

When a user subscribes:
1. Their store is upgraded to `"professional"` type
2. They can create products without buying per-use listing packages
3. Listing usage is tracked per subscription period (resets on renewal)
4. Auto-renewal creates a new billing period when the current one expires
5. Stories still require a separate per-use story purchase

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

## How It Relates to Per-Use Packages

The subscription system works **alongside** the existing per-use listing/story package system. Subscriptions cover **product listings only** -- stories always require a separate per-use purchase.

| Feature | Per-Use Packages | Subscription |
|---------|-----------------|--------------|
| Target user | Casual sellers | Active store owners |
| Payment model | Pay per batch of listings/stories | Pay weekly/monthly for listing access |
| Store type | Regular | Professional |
| Product creation | Requires `purchaseId` in body | Automatic -- no `purchaseId` needed |
| Story creation | Requires `purchaseId` in body | **Still requires `purchaseId`** (not covered) |
| Category restriction | Package is per-category | Store-wide (follows store category) |
| Listing duration | Defined by per-use package | Defined by subscription plan |
| Story duration | Defined by per-use story package | Defined by per-use story package (unchanged) |

**Dual-path logic for products:** When a user creates a product, the system first checks if their store has an active subscription. If yes, it uses the subscription. If no, it falls back to requiring a per-use `purchaseId`.

**Stories are always per-use:** Regardless of subscription status, stories always require a `purchaseId` from a story package purchase.

---

## Complete User Flow

```
Step 1:  User browses available subscription plans
         GET /api/v1/subscriptions
         -> sees plans with pricing, limits, and features

Step 2:  User purchases a subscription for their store
         POST /api/v1/user-subscriptions
         { subscriptionId: "...", storeId: "..." }
         -> store upgraded to "professional"
         -> subscription is active with usage counters at 0

Step 3:  User checks their active subscription
         GET /api/v1/user-subscriptions/my?storeId=...
         -> sees remaining listings, expiry date

Step 4:  User creates a product WITHOUT purchaseId
         POST /api/v1/products  (multipart: images + JSON body)
         -> system auto-detects subscription, consumes 1 listing slot
         -> product created with status "draft"

Step 5:  Admin reviews and approves the product
         PATCH /api/v1/admin/listings/:id/status  { status: "active" }
         -> listingExpiresAt set from subscription's listingDurationHours
         -> product goes live

Step 6:  User uploads stories (requires separate story purchase)
         POST /api/v1/story-purchases  { packageId: "..." }
         POST /api/v1/stories  (multipart: media files + JSON body with purchaseId)
         -> stories are NOT covered by subscription, always need a per-use story purchase

Step 7:  Subscription period ends
         -> If autoRenew is ON:  new period created, usage counters reset, payment charged
         -> If autoRenew is OFF: subscription expires, store reverts to "regular"

Step 8:  User can cancel subscription at any time
         PATCH /api/v1/user-subscriptions/:id/cancel
         { immediate: false }  -> turns off auto-renew, stays active until period ends
         { immediate: true }   -> cancels now, store reverts to "regular"

Step 9:  User can manually renew an expired subscription
         POST /api/v1/user-subscriptions/:id/renew
         -> new period created, store re-upgraded to "professional"
```

---

## Complete Admin Flow

```
Step 1:  Admin creates subscription plans
         POST /api/v1/admin/subscriptions
         { name: "Pro Weekly", billingType: "weekly", durationDays: 7,
           price: 99, maxListings: 20,
           listingDurationHours: 168, ... }

Step 2:  Admin manages plans (update, toggle, delete)
         PATCH /api/v1/admin/subscriptions/:id
         PATCH /api/v1/admin/subscriptions/:id/toggle-status
         DELETE /api/v1/admin/subscriptions/:id

Step 3:  Admin monitors user subscriptions
         GET /api/v1/admin/user-subscriptions
         -> paginated list with user, store, plan details

Step 4:  Admin views subscription statistics
         GET /api/v1/admin/user-subscriptions/stats
         -> total, active, expired, cancelled, revenue, usage

Step 5:  Admin can force-cancel a user's subscription
         PATCH /api/v1/admin/user-subscriptions/:id/cancel
         -> immediately cancels, store reverts to "regular"

Step 6:  Admin approves products from subscribed users
         PATCH /api/v1/admin/listings/:id/status  { status: "active" }
         -> listingExpiresAt set from subscription's listingDurationHours
         (same approval flow as per-use, duration source differs)
```

---

## Data Models

### Subscription Plan (Admin-configured)

| Field                | Type     | Description                                              |
|----------------------|----------|----------------------------------------------------------|
| `id`                 | string   | Unique identifier                                        |
| `name`               | string   | Plan name (e.g., "Pro Weekly", "Business Monthly")       |
| `icon`               | string   | Icon string/emoji for UI                                 |
| `features`           | string[] | Feature bullet points for UI display                     |
| `description`        | string   | Plan description                                         |
| `price`              | number   | Cost per billing period (0 = free)                       |
| `currency`           | string   | Currency code (default: "USD")                           |
| `billingType`        | string   | `"weekly"` or `"monthly"`                                |
| `durationDays`       | number   | Duration in days (e.g., 7, 30)                           |
| `maxListings`        | number   | Max product listings per period (`-1` = unlimited)       |
| `listingDurationHours` | number | How long each product stays visible after approval       |
| `isActive`           | boolean  | Whether the plan is available for purchase                |
| `createdAt`          | date     | Creation timestamp                                       |
| `updatedAt`          | date     | Last update timestamp                                    |

### User Subscription (Active subscription record)

| Field               | Type    | Description                                          |
|---------------------|---------|------------------------------------------------------|
| `id`                | string  | Unique identifier                                    |
| `store`             | object  | Store this subscription is for (id, name, logo)      |
| `planSnapshot`      | object  | Frozen copy of the plan at time of purchase           |
| `listingsUsed`      | number  | Listings consumed in current period                   |
| `listingsRemaining` | number  | Computed: maxListings - listingsUsed (`-1` = unlimited) |
| `status`            | string  | `"active"`, `"expired"`, or `"cancelled"`            |
| `startDate`         | date    | Start of current billing period                       |
| `endDate`           | date    | End of current billing period                         |
| `autoRenew`         | boolean | Whether to auto-renew at period end                   |
| `cancelledAt`       | date    | When cancellation occurred (null if not cancelled)    |
| `createdAt`         | date    | Creation timestamp                                    |

### Plan Snapshot (frozen at purchase time)

| Field                  | Type   | Description                            |
|------------------------|--------|----------------------------------------|
| `name`                 | string | Plan name                              |
| `price`                | number | Price paid per period                   |
| `currency`             | string | Currency code                          |
| `billingType`          | string | `"weekly"` or `"monthly"`              |
| `durationDays`         | number | Period length in days                   |
| `maxListings`          | number | Listing limit (`-1` = unlimited)       |
| `listingDurationHours` | number | Listing visibility hours               |

### Store (Updated fields)

| Field       | Type   | Description                                                    |
|-------------|--------|----------------------------------------------------------------|
| `storeType` | string | `"regular"` (default) or `"professional"` (has active subscription) |
| *(all existing fields remain unchanged)* | | |

### Product (Updated fields)

| Field              | Type      | Description                                                  |
|--------------------|-----------|--------------------------------------------------------------|
| `userSubscription` | ObjectId  | Reference to UserSubscription (set when created via subscription) |
| `listingPurchase`  | ObjectId  | Reference to ListingPurchase (set when created via per-use purchase) |
| *(only one of the above is set per product)* | | |

### Story (Unchanged)

Stories are **not affected** by the subscription system. They always require a per-use story purchase with `purchaseId`. No `userSubscription` field exists on stories.

---

## API Endpoints

---

### 1. User: Subscription Plans (Public)

#### 1.1 List Active Subscription Plans

Returns all active subscription plans, sorted by price ascending.

```
GET /api/v1/subscriptions
```

**Auth:** Not required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active subscriptions fetched successfully.",
  "data": [
    {
      "id": "6850a1b2c3d4e5f6a7b8c9d0",
      "name": "Pro Weekly",
      "icon": "⚡",
      "features": [
        "20 product listings per week",
        "7-day listing visibility",
        "Professional store badge",
        "No per-listing purchase needed"
      ],
      "description": "Perfect for active sellers who list regularly.",
      "price": 99,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168,
      "isActive": true,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    },
    {
      "id": "6850a1b2c3d4e5f6a7b8c9d1",
      "name": "Business Monthly",
      "icon": "🏆",
      "features": [
        "Unlimited product listings",
        "30-day listing visibility",
        "Professional store badge",
        "No per-listing purchase needed",
        "Priority support"
      ],
      "description": "Best value for high-volume professional stores.",
      "price": 299,
      "currency": "NOK",
      "billingType": "monthly",
      "durationDays": 30,
      "maxListings": -1,
      "listingDurationHours": 720,
      "isActive": true,
      "createdAt": "2026-06-20T10:05:00.000Z",
      "updatedAt": "2026-06-20T10:05:00.000Z"
    }
  ]
}
```

---

### 2. User: Subscribe & Manage

#### 2.1 Subscribe to a Plan

Initiates a subscription for the user's store. **Paid plans** create a Stripe Checkout Session in `subscription` mode and return a `checkoutUrl`. The `UserSubscription` record and store upgrade happen automatically via the Stripe webhook after payment. **Free plans** are activated immediately.

```
POST /api/v1/user-subscriptions
```

**Auth:** Required (Bearer token)

**Request Body:**

```json
{
  "subscriptionId": "6850a1b2c3d4e5f6a7b8c9d0",
  "storeId": "6835b1c2d3e4f5a6b7c8d9e0"
}
```

| Field            | Type   | Required | Description                             |
|------------------|--------|----------|-----------------------------------------|
| `subscriptionId` | string | Yes      | MongoDB ObjectId of the subscription plan |
| `storeId`        | string | Yes      | MongoDB ObjectId of the user's store    |

**Response: 200 OK** (paid plan -- Stripe checkout required)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checkout session created. Complete payment to activate your subscription.",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

> The user should be redirected to `checkoutUrl`. After successful payment, Stripe sends a webhook which creates the `UserSubscription`, upgrades the store to `"professional"`, and manages recurring billing automatically.

**Response: 201 Created** (free plan -- activated immediately)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription purchased successfully.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "store": "6835b1c2d3e4f5a6b7c8d9e0",
    "planSnapshot": {
      "name": "Pro Weekly",
      "price": 0,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168
    },
    "listingsUsed": 0,
    "listingsRemaining": 20,
    "status": "active",
    "startDate": "2026-06-27T14:30:00.000Z",
    "endDate": "2026-07-04T14:30:00.000Z",
    "autoRenew": true,
    "cancelledAt": null,
    "createdAt": "2026-06-27T14:30:00.000Z"
  }
}
```

**Response: 404 Not Found** (plan does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Subscription plan not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 400 Bad Request** (plan is deactivated)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This subscription plan is currently unavailable",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 404 Not Found** (store does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Store not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 403 Forbidden** (store belongs to another user)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "This store does not belong to you",
  "errorCode": "FORBIDDEN"
}
```

**Response: 403 Forbidden** (store is blocked)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Store is blocked",
  "errorCode": "FORBIDDEN"
}
```

**Response: 409 Conflict** (store already has active subscription)

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Store already has an active subscription",
  "errorCode": "SUBSCRIPTION_ALREADY_ACTIVE"
}
```

---

#### 2.2 Get My Active Subscription

Returns the active subscription for the user, optionally filtered by store.

```
GET /api/v1/user-subscriptions/my
GET /api/v1/user-subscriptions/my?storeId=6835b1c2d3e4f5a6b7c8d9e0
```

**Auth:** Required

**Query Parameters:**

| Param     | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| `storeId` | string | No       | Filter by specific store      |

**Response: 200 OK** (has active subscription)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active subscription fetched successfully.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "store": "6835b1c2d3e4f5a6b7c8d9e0",
    "planSnapshot": {
      "name": "Pro Weekly",
      "price": 99,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168
    },
    "listingsUsed": 8,
    "listingsRemaining": 12,
    "status": "active",
    "startDate": "2026-06-27T14:30:00.000Z",
    "endDate": "2026-07-04T14:30:00.000Z",
    "autoRenew": true,
    "cancelledAt": null,
    "createdAt": "2026-06-27T14:30:00.000Z"
  }
}
```

**Response: 200 OK** (no active subscription)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "No active subscription found.",
  "data": null
}
```

---

#### 2.3 List My Subscriptions

Returns paginated list of all the user's subscriptions (active, expired, cancelled).

```
GET /api/v1/user-subscriptions
```

**Auth:** Required

**Query Parameters:**

| Param    | Type   | Default | Description                                       |
|----------|--------|---------|---------------------------------------------------|
| `page`   | number | 1       | Page number (min: 1)                              |
| `limit`  | number | 10      | Items per page (min: 1, max: 50)                  |
| `status` | string | -       | Filter: `"active"`, `"expired"`, `"cancelled"`    |

**Example:** `GET /api/v1/user-subscriptions?status=active`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscriptions fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6851b2c3d4e5f6a7b8c9d0e1",
        "store": {
          "id": "6835b1c2d3e4f5a6b7c8d9e0",
          "name": "TechStore Oslo",
          "logo": "/uploads/stores/techstore.jpg"
        },
        "planSnapshot": {
          "name": "Pro Weekly",
          "price": 99,
          "currency": "NOK",
          "billingType": "weekly",
          "durationDays": 7,
          "maxListings": 20,
          "listingDurationHours": 168
        },
        "listingsUsed": 8,
        "listingsRemaining": 12,
        "status": "active",
        "startDate": "2026-06-27T14:30:00.000Z",
        "endDate": "2026-07-04T14:30:00.000Z",
        "autoRenew": true,
        "cancelledAt": null,
        "createdAt": "2026-06-27T14:30:00.000Z"
      },
      {
        "id": "6851b2c3d4e5f6a7b8c9d0e0",
        "store": {
          "id": "6835b1c2d3e4f5a6b7c8d9e0",
          "name": "TechStore Oslo",
          "logo": "/uploads/stores/techstore.jpg"
        },
        "planSnapshot": {
          "name": "Pro Weekly",
          "price": 99,
          "currency": "NOK",
          "billingType": "weekly",
          "durationDays": 7,
          "maxListings": 20,
          "listingDurationHours": 168
        },
        "listingsUsed": 20,
        "listingsRemaining": 0,
        "status": "expired",
        "startDate": "2026-06-20T14:30:00.000Z",
        "endDate": "2026-06-27T14:30:00.000Z",
        "autoRenew": true,
        "cancelledAt": null,
        "createdAt": "2026-06-20T14:30:00.000Z"
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

#### 2.4 Get Subscription by ID

```
GET /api/v1/user-subscriptions/:id
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription fetched successfully.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "store": {
      "id": "6835b1c2d3e4f5a6b7c8d9e0",
      "name": "TechStore Oslo",
      "logo": "/uploads/stores/techstore.jpg"
    },
    "planSnapshot": { "..." },
    "listingsUsed": 8,
    "listingsRemaining": 12,
    "status": "active",
    "startDate": "2026-06-27T14:30:00.000Z",
    "endDate": "2026-07-04T14:30:00.000Z",
    "autoRenew": true,
    "cancelledAt": null,
    "createdAt": "2026-06-27T14:30:00.000Z"
  }
}
```

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Subscription not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 403 Forbidden** (another user's subscription)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "This subscription does not belong to you",
  "errorCode": "FORBIDDEN"
}
```

---

#### 2.5 Cancel Subscription

Two modes: **deferred** (turn off auto-renew) or **immediate** (cancel now).

```
PATCH /api/v1/user-subscriptions/:id/cancel
```

**Auth:** Required

**Request Body:**

```json
{
  "immediate": false
}
```

| Field       | Type    | Default | Description                                          |
|-------------|---------|---------|------------------------------------------------------|
| `immediate` | boolean | false   | `false` = disable auto-renew; `true` = cancel now    |

**Response: 200 OK** (deferred cancellation)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Auto-renewal disabled. Subscription will expire at end of current period.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "status": "active",
    "autoRenew": false,
    "endDate": "2026-07-04T14:30:00.000Z",
    "cancelledAt": null,
    "..."
  }
}
```

**Response: 200 OK** (immediate cancellation)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled immediately.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "status": "cancelled",
    "autoRenew": false,
    "cancelledAt": "2026-06-29T10:15:00.000Z",
    "..."
  }
}
```

> **Note:** Immediate cancellation reverts the store's `storeType` to `"regular"` (unless the store has another active subscription).

**Response: 400 Bad Request** (subscription not active)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Subscription is not active",
  "errorCode": "BAD_REQUEST"
}
```

---

#### 2.6 Renew Subscription

Manually renew an expired or cancelled subscription. Creates a new billing period.

```
POST /api/v1/user-subscriptions/:id/renew
```

**Auth:** Required

**Request Body:** None

**Response: 201 Created**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Subscription renewed successfully.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e2",
    "store": "6835b1c2d3e4f5a6b7c8d9e0",
    "planSnapshot": {
      "name": "Pro Weekly",
      "price": 99,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168
    },
    "listingsUsed": 0,
    "listingsRemaining": 20,
    "status": "active",
    "startDate": "2026-07-04T14:30:00.000Z",
    "endDate": "2026-07-11T14:30:00.000Z",
    "autoRenew": true,
    "cancelledAt": null,
    "createdAt": "2026-07-04T14:30:00.000Z"
  }
}
```

> **Note:** Renewal creates a **new subscription document** (preserving the history of the old period). Usage counters reset to 0. The store is re-upgraded to `"professional"`.

**Response: 400 Bad Request** (subscription still active)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Subscription is still active",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 409 Conflict** (store already has another active subscription)

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Store already has an active subscription",
  "errorCode": "SUBSCRIPTION_ALREADY_ACTIVE"
}
```

---

### 3. User: Products (Subscription Path)

#### 3.1 Create Product (Updated - purchaseId now optional)

When the user's store has an active subscription, `purchaseId` is not required. The system automatically detects the subscription and uses it.

```
POST /api/v1/products
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**JSON Body (inside `data` field):**

```json
{
  "category": "6830a1b2c3d4e5f6a7b8c9d0",
  "storeId": "6835b1c2d3e4f5a6b7c8d9e0",
  "title": "iPhone 15 Pro Max - Like New",
  "description": "Barely used iPhone 15 Pro Max...",
  "price": 899,
  "currency": "NOK",
  "location": {
    "address": "Karl Johans gate 1",
    "city": "Oslo",
    "country": "Norway"
  }
}
```

| Field        | Type   | Required    | Description                                                       |
|--------------|--------|-------------|-------------------------------------------------------------------|
| `purchaseId` | string | **Conditional** | Required if no active subscription; ignored if subscription exists |
| `storeId`    | string | No          | Associate with a store (triggers subscription check)              |
| `category`   | string | Yes         | Category ObjectId                                                 |
| *(all other product fields unchanged)* | | | |

**How the dual-path works:**

1. If `storeId` is provided, the system checks for an active subscription on that store
2. If subscription found: uses subscription, sets `userSubscription` on the product
3. If no subscription: requires `purchaseId`, uses per-use purchase flow (existing behavior)

**Response: 201 Created** (via subscription)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "id": "6842c3d4e5f6a7b8c9d0e1f2",
    "status": "draft",
    "listingExpiresAt": null,
    "..."
  }
}
```

**Response: 400 Bad Request** (subscription listing limit reached)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Subscription listing limit reached or subscription expired",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (no subscription and no purchaseId)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "A listing purchase or active subscription is required to create a product",
  "errorCode": "BAD_REQUEST"
}
```

---

#### 3.2 Product After Admin Approval (Subscription path)

When admin approves a product created via subscription, `listingExpiresAt` is calculated from the subscription plan's `listingDurationHours` (instead of the per-use package's `durationHours`).

```json
{
  "id": "6842c3d4e5f6a7b8c9d0e1f2",
  "title": "iPhone 15 Pro Max - Like New",
  "status": "active",
  "listingExpiresAt": "2026-07-04T16:45:00.000Z",
  "..."
}
```

> If the subscription plan has `listingDurationHours: 168` (7 days), and admin approves at 4:45 PM on June 27, the listing expires at 4:45 PM on July 4.

---

### 4. Admin: Subscription Plans

All admin endpoints require `superAdmin` role.

#### 4.1 List All Plans

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
      "id": "6850a1b2c3d4e5f6a7b8c9d0",
      "name": "Pro Weekly",
      "icon": "⚡",
      "features": ["20 product listings per week", "7-day listing visibility"],
      "description": "Perfect for active sellers.",
      "price": 99,
      "currency": "NOK",
      "billingType": "weekly",
      "durationDays": 7,
      "maxListings": 20,
      "listingDurationHours": 168,
      "isActive": true,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    }
  ]
}
```

---

#### 4.2 Get Plan by ID

```
GET /api/v1/admin/subscriptions/:id
```

**Response: 200 OK** (same shape as single item above)

---

#### 4.3 Create Plan

```
POST /api/v1/admin/subscriptions
```

**Request Body:**

```json
{
  "name": "Pro Weekly",
  "icon": "⚡",
  "features": [
    "20 product listings per week",
    "7-day listing visibility",
    "No per-listing purchase needed"
  ],
  "description": "Perfect for active sellers who list regularly.",
  "price": 99,
  "currency": "NOK",
  "billingType": "weekly",
  "durationDays": 7,
  "maxListings": 20,
  "listingDurationHours": 168
}
```

| Field                  | Type     | Required | Default | Validation                          |
|------------------------|----------|----------|---------|-------------------------------------|
| `name`                 | string   | Yes      | -       | 2-100 chars                         |
| `icon`                 | string   | No       | `""`    | Icon/emoji for UI                   |
| `features`             | string[] | No       | `[]`    | Feature bullet points               |
| `description`          | string   | No       | -       | Max 500 chars                       |
| `price`                | number   | Yes      | -       | >= 0 (0 = free tier)                |
| `currency`             | string   | No       | `"USD"` | Max 10 chars                        |
| `billingType`          | string   | Yes      | -       | `"weekly"` or `"monthly"`           |
| `durationDays`         | number   | Yes      | -       | Integer >= 1                        |
| `maxListings`          | number   | Yes      | -       | Integer >= -1 (`-1` = unlimited)    |
| `listingDurationHours` | number   | Yes      | -       | Integer >= 1                        |
| `isActive`             | boolean  | No       | `true`  | Whether plan is available           |

**Response: 201 Created** (same shape as list item)

---

#### 4.4 Update Plan

```
PATCH /api/v1/admin/subscriptions/:id
```

**Request Body:** (all fields optional, at least one required)

```json
{
  "price": 149,
  "maxListings": 30
}
```

**Response: 200 OK** (full updated plan object)

> **Note:** Updating a plan does NOT affect existing user subscriptions. They use `planSnapshot` (frozen at purchase time).

---

#### 4.5 Delete Plan

```
DELETE /api/v1/admin/subscriptions/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription deleted successfully.",
  "data": null
}
```

> **Note:** Existing user subscriptions are unaffected -- they retain their `planSnapshot`.

---

#### 4.6 Toggle Plan Status

```
PATCH /api/v1/admin/subscriptions/:id/toggle-status
```

**Request Body:**

```json
{
  "isActive": false
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription deactivated successfully.",
  "data": {
    "id": "6850a1b2c3d4e5f6a7b8c9d0",
    "name": "Pro Weekly",
    "isActive": false,
    "..."
  }
}
```

---

### 5. Admin: User Subscriptions

#### 5.1 List All User Subscriptions

```
GET /api/v1/admin/user-subscriptions
```

**Query Parameters:**

| Param            | Type   | Default | Description                                        |
|------------------|--------|---------|----------------------------------------------------|
| `page`           | number | 1       | Page number                                        |
| `limit`          | number | 10      | Items per page (max: 50)                           |
| `status`         | string | -       | Filter: `"active"`, `"expired"`, `"cancelled"`     |
| `userId`         | string | -       | Filter by user ObjectId                            |
| `subscriptionId` | string | -       | Filter by subscription plan ObjectId               |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User subscriptions fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6851b2c3d4e5f6a7b8c9d0e1",
        "user": {
          "id": "6829a0b1c2d3e4f5a6b7c8d9",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "avatarUrl": "/uploads/avatars/john.jpg"
        },
        "store": {
          "id": "6835b1c2d3e4f5a6b7c8d9e0",
          "name": "TechStore Oslo",
          "logo": "/uploads/stores/techstore.jpg",
          "storeType": "professional"
        },
        "plan": {
          "id": "6850a1b2c3d4e5f6a7b8c9d0",
          "name": "Pro Weekly",
          "billingType": "weekly",
          "price": 99
        },
        "planSnapshot": {
          "name": "Pro Weekly",
          "price": 99,
          "currency": "NOK",
          "billingType": "weekly",
          "durationDays": 7,
          "maxListings": 20,
          "listingDurationHours": 168
        },
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

#### 5.2 Subscription Statistics

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

#### 5.3 Get User Subscription by ID

```
GET /api/v1/admin/user-subscriptions/:id
```

**Response: 200 OK** (full subscription with populated user, store, plan, and payment transaction)

---

#### 5.4 Admin Cancel Subscription

Force-cancels a user's subscription immediately. Store reverts to `"regular"`.

```
PATCH /api/v1/admin/user-subscriptions/:id/cancel
```

**Request Body:** None

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Subscription cancelled successfully.",
  "data": {
    "id": "6851b2c3d4e5f6a7b8c9d0e1",
    "status": "cancelled",
    "autoRenew": false,
    "cancelledAt": "2026-06-29T10:15:00.000Z",
    "..."
  }
}
```

**Response: 400 Bad Request** (subscription not active)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Subscription is not active",
  "errorCode": "BAD_REQUEST"
}
```

---

## Edge Cases & Error Handling

### Subscription Lifecycle

| Scenario | Behavior |
|----------|----------|
| Plan deleted after subscription purchased | Subscription still valid -- `planSnapshot` preserves all details |
| Plan deactivated after subscription purchased | Existing subscriptions remain active until they expire |
| Plan price changed after subscription purchased | Subscription keeps original price in snapshot |
| Admin changes maxListings on plan | Existing subscriptions unaffected (use snapshot value) |
| Subscription period ends with autoRenew ON | New period created automatically, usage counters reset |
| Subscription period ends with autoRenew OFF | Subscription expires, store reverts to `"regular"` |
| User cancels immediately | Subscription status = `"cancelled"`, store reverts to `"regular"` |
| User cancels with deferred (immediate=false) | autoRenew set to false, subscription stays active until endDate |
| Store already has active subscription | 409 Conflict -- one active subscription per store |
| Trying to renew while still active | 400 -- must wait until current period expires |

### Product Creation Guards (Subscription Path)

| Scenario | HTTP Code | Error Message |
|----------|-----------|---------------|
| No subscription AND no `purchaseId` | 400 | A listing purchase or active subscription is required to create a product |
| Subscription exists but all listing slots used | 400 | Subscription listing limit reached or subscription expired |
| Subscription exists but expired | 400 | Subscription listing limit reached or subscription expired |
| Unlimited plan (maxListings = -1) | - | Always succeeds (no slot limit) |

### Story Creation (Not Covered by Subscription)

Stories always require a per-use `purchaseId` regardless of subscription status. See the [Story Monetization API](./story-monetization-api.md) for story purchase details.

### Store Type Rules

| Scenario | Store Type |
|----------|------------|
| Store created (no subscription) | `"regular"` |
| User subscribes | `"professional"` |
| Subscription expires (no auto-renew) | `"regular"` |
| Subscription auto-renewed | stays `"professional"` |
| User cancels immediately | `"regular"` |
| User cancels deferred (auto-renew off) | stays `"professional"` until period ends |
| Admin force-cancels | `"regular"` |
| User manually renews expired subscription | `"professional"` |

### Quota Rules

- Each product creation consumes **1 listing slot** from the subscription
- Slot consumption is **atomic** (race-condition safe via `$expr` + `$or` guard)
- Soft-deleting or selling a product does **NOT** restore the consumed slot
- When `maxListings` is `-1`, slots are tracked but never limited
- Usage counters reset to 0 on each new billing period (renewal)

---

## Stripe Payment Integration

### How Payments Work

All paid purchases (listing packages, story packages, subscriptions) are processed through **Stripe Checkout**. The flow is:

1. User calls a purchase endpoint (e.g., `POST /api/v1/user-subscriptions`)
2. Backend creates a `PaymentTransaction` with `status: 'pending'` and a Stripe Checkout Session
3. Backend returns `{ checkoutUrl }` -- user is redirected to Stripe's hosted checkout page
4. After successful payment, Stripe sends a webhook to `POST /api/v1/webhooks/stripe`
5. Webhook handler verifies the signature, then fulfills the purchase (creates the resource, updates PaymentTransaction to `'approved'`)

**Free items** (price = 0) bypass Stripe and are activated immediately.

### Stripe Webhook Events

| Event | Trigger | Action |
|-------|---------|--------|
| `checkout.session.completed` | User completes payment | Creates the purchase record (ListingPurchase / StoryPurchase / UserSubscription) |
| `invoice.paid` | Stripe auto-charges for subscription renewal | Creates new subscription period, resets usage counters |
| `customer.subscription.deleted` | Subscription cancelled or payment exhausted | Expires UserSubscription, reverts store to `"regular"` |
| `invoice.payment_failed` | Renewal payment fails | Logs failure, records rejected PaymentTransaction |

### Webhook Endpoint

```
POST /api/v1/webhooks/stripe
```

- **Auth:** Not required (uses Stripe signature verification)
- **Content-Type:** `application/json` (raw body for signature verification)
- **Idempotent:** Duplicate events are safely ignored

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret | `whsec_...` |
| `STRIPE_SUCCESS_URL` | Deep link to redirect after successful payment | `sellx://payment/success` |
| `STRIPE_CANCEL_URL` | Deep link to redirect if user cancels checkout | `sellx://payment/cancel` |

---

## Auto-Expiration & Renewal Mechanisms

### Subscription Auto-Renewal (Stripe-Managed)

For Stripe-managed subscriptions (all paid subscriptions), auto-renewal is handled entirely by Stripe:

1. When the billing period ends, Stripe automatically charges the customer
2. Stripe fires an `invoice.paid` webhook
3. The webhook handler creates a new `UserSubscription` period with reset usage counters
4. The old subscription is marked as `'expired'`
5. Store remains `"professional"`

If payment fails, Stripe retries according to its retry schedule and fires `invoice.payment_failed`. If all retries fail, Stripe fires `customer.subscription.deleted`.

### Subscription Expiry Scheduler

- **Mechanism:** Scheduled job running **every hour**
- **Two tasks per tick:**

#### Task 1: Expire non-renewing subscriptions

- **Query:** `status='active' AND endDate <= now AND autoRenew = false`
- **Action:** Sets `status` to `'expired'`

#### Task 2: Revert stores with no active subscriptions

- **Query:** Recently expired subscriptions (within last hour)
- **For each store:** Check if any other active subscription exists
- **If no active subscription:** Set store `storeType` to `"regular"`

### Product Listing Expiration (unchanged)

- **Mechanism:** Scheduled job every **15 minutes**
- **Query:** `status='active' AND listingExpiresAt != null AND listingExpiresAt <= now`
- **Action:** Sets product `status` to `'expired'`
- **Note:** Works identically for subscription-based and per-use-based products

### Story Expiration (unchanged)

- **Mechanism:** MongoDB TTL index on `expiresAt`
- **Action:** Stories automatically deleted when `expiresAt` passes
- **Note:** Works identically for subscription-based and per-use-based stories

---

## Endpoint Summary Table

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/subscriptions` | No | Any | List active subscription plans |
| POST | `/api/v1/user-subscriptions` | Yes | User | Subscribe to a plan |
| GET | `/api/v1/user-subscriptions/my` | Yes | User | Get active subscription |
| GET | `/api/v1/user-subscriptions` | Yes | User | List all my subscriptions |
| GET | `/api/v1/user-subscriptions/:id` | Yes | User | Get subscription by ID |
| PATCH | `/api/v1/user-subscriptions/:id/cancel` | Yes | User | Cancel subscription |
| POST | `/api/v1/user-subscriptions/:id/renew` | Yes | User | Renew expired subscription |
| POST | `/api/v1/products` | Yes | User | Create product (purchaseId optional with subscription) |
| POST | `/api/v1/stories` | Yes | User | Create story (always requires purchaseId) |
| GET | `/api/v1/admin/subscriptions` | Yes | SuperAdmin | List all plans |
| GET | `/api/v1/admin/subscriptions/:id` | Yes | SuperAdmin | Get plan by ID |
| POST | `/api/v1/admin/subscriptions` | Yes | SuperAdmin | Create plan |
| PATCH | `/api/v1/admin/subscriptions/:id` | Yes | SuperAdmin | Update plan |
| DELETE | `/api/v1/admin/subscriptions/:id` | Yes | SuperAdmin | Delete plan |
| PATCH | `/api/v1/admin/subscriptions/:id/toggle-status` | Yes | SuperAdmin | Toggle plan active/inactive |
| GET | `/api/v1/admin/user-subscriptions` | Yes | SuperAdmin | List all user subscriptions |
| GET | `/api/v1/admin/user-subscriptions/stats` | Yes | SuperAdmin | Subscription statistics |
| GET | `/api/v1/admin/user-subscriptions/:id` | Yes | SuperAdmin | Get user subscription by ID |
| PATCH | `/api/v1/admin/user-subscriptions/:id/cancel` | Yes | SuperAdmin | Admin cancel subscription |
| POST | `/api/v1/webhooks/stripe` | No (Stripe signature) | Stripe | Stripe webhook handler |
