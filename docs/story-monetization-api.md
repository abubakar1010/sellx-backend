# Story Monetization API Documentation

## Table of Contents

- [Overview](#overview)
- [Complete User Flow](#complete-user-flow)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
  - [User: Story Packages (Public)](#1-user-story-packages-public)
  - [User: Story Purchases](#2-user-story-purchases)
  - [User: Stories (Modified)](#3-user-stories-modified)
  - [Admin: Story Packages](#4-admin-story-packages)
  - [Admin: Story Purchases](#5-admin-story-purchases)
  - [Admin: Stories](#6-admin-stories)
- [Edge Cases & Error Handling](#edge-cases--error-handling)
- [Auto-Expiration Mechanisms](#auto-expiration-mechanisms)

---

## Overview

The Story Monetization system allows admins to create configurable pricing packages for stories, and users must purchase a package before uploading stories. Each package defines:

- **Price** and **currency** (e.g., $50 USD)
- **Duration** in hours (how long each story remains visible after upload)
- **Max stories** (how many stories the user can upload per purchase)
- **Validity window** in days (how long the purchase remains usable)

Stories automatically disappear after their duration expires via MongoDB TTL index.

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
Step 1:  User browses available story packages
         GET /api/v1/story-packages

Step 2:  User purchases a package
         POST /api/v1/story-purchases  { packageId: "..." }
         → For paid packages: returns { checkoutUrl } → user pays on Stripe
           → Stripe webhook creates the purchase after payment
         → For free packages: purchase created immediately

Step 3:  User checks their active purchases / remaining slots
         GET /api/v1/story-purchases/active

Step 4:  User uploads a story referencing the purchase
         POST /api/v1/stories  (multipart: media files + JSON body with purchaseId)

Step 5:  Story is live and visible to other users
         GET /api/v1/stories

Step 6:  After the package's durationHours, the story automatically disappears
         (MongoDB TTL index deletes the document)

Step 7:  When all story slots are used, the purchase status becomes "exhausted"
         When the validity window passes, the purchase status becomes "expired"
```

---

## Data Models

### Story Package (Admin-configured)

| Field          | Type    | Description                                          |
|----------------|---------|------------------------------------------------------|
| `id`           | string  | Unique identifier                                    |
| `name`         | string  | Human-readable name (e.g., "24h Basic Story")        |
| `description`  | string  | Detailed description of the package                  |
| `durationHours`| number  | How many hours each story stays visible              |
| `price`        | number  | Cost of the package (0 = free)                       |
| `maxStories`   | number  | Number of stories allowed per purchase               |
| `isActive`     | boolean | Whether the package is available for purchase         |
| `currency`     | string  | Currency code (default: "USD")                       |
| `validityDays` | number  | Days the purchase remains usable after buying         |
| `createdAt`    | date    | Creation timestamp                                   |
| `updatedAt`    | date    | Last update timestamp                                |

### Story Purchase

| Field              | Type   | Description                                      |
|--------------------|--------|--------------------------------------------------|
| `id`               | string | Unique identifier                                |
| `packageSnapshot`  | object | Frozen copy of the package at time of purchase   |
| `storiesUsed`      | number | How many stories have been uploaded              |
| `storiesRemaining` | number | Computed: maxStories - storiesUsed               |
| `status`           | string | `"active"`, `"exhausted"`, or `"expired"`        |
| `purchasedAt`      | date   | When the purchase was made                       |
| `expiresAt`        | date   | When the purchase validity expires               |
| `createdAt`        | date   | Creation timestamp                               |

### Story (Updated)

| Field        | Type        | Description                                     |
|--------------|-------------|-------------------------------------------------|
| `id`         | string      | Unique identifier                               |
| `purchase`   | string/null | ID of the purchase this story was created from  |
| `user`       | object/null | Creator info (id, firstName, lastName, avatarUrl)|
| `store`      | object/null | Associated store (id, name, logo)               |
| `media`      | string      | Media URL                                       |
| `texts`      | array       | Text overlays with styling                      |
| `product`    | object/null | Linked product (id, title, media, price, currency)|
| `expireIn`   | number      | Duration in hours (from purchased package)      |
| `expiresAt`  | date        | Exact expiration time                           |
| `viewCount`  | number      | Number of unique views                          |
| `isViewed`   | boolean     | Whether the requesting user has viewed it       |
| `createdAt`  | date        | Creation timestamp                              |
| `updatedAt`  | date        | Last update timestamp                           |

---

## API Endpoints

---

### 1. User: Story Packages (Public)

#### 1.1 List Available Packages

Returns all active story packages sorted by price ascending.

```
GET /api/v1/story-packages
```

**Auth:** Not required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story packages fetched successfully.",
  "data": [
    {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "name": "24h Basic Story",
      "description": "Upload 1 story visible for 24 hours",
      "durationHours": 24,
      "price": 4.99,
      "maxStories": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    },
    {
      "id": "6830a1b2c3d4e5f6a7b8c9d1",
      "name": "48h Multi-Story Pack",
      "description": "Upload up to 5 stories, each visible for 48 hours",
      "durationHours": 48,
      "price": 19.99,
      "maxStories": 5,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:05:00.000Z",
      "updatedAt": "2026-06-20T10:05:00.000Z"
    },
    {
      "id": "6830a1b2c3d4e5f6a7b8c9d2",
      "name": "7-Day Premium Story",
      "description": "Upload up to 10 stories, each visible for a full week",
      "durationHours": 168,
      "price": 49.99,
      "maxStories": 10,
      "isActive": true,
      "currency": "USD",
      "validityDays": 60,
      "createdAt": "2026-06-20T10:10:00.000Z",
      "updatedAt": "2026-06-20T10:10:00.000Z"
    }
  ]
}
```

---

#### 1.2 Get Package by ID

```
GET /api/v1/story-packages/:id
```

**Auth:** Not required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story package fetched successfully.",
  "data": {
    "id": "6830a1b2c3d4e5f6a7b8c9d0",
    "name": "24h Basic Story",
    "description": "Upload 1 story visible for 24 hours",
    "durationHours": 24,
    "price": 4.99,
    "maxStories": 1,
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
  "message": "Story package not found",
  "errorCode": "NOT_FOUND"
}
```

---

### 2. User: Story Purchases

#### 2.1 Purchase a Story Package

Initiates a purchase. **Paid packages** create a Stripe Checkout Session and return a `checkoutUrl` -- the user must complete payment on Stripe's hosted page. The actual `StoryPurchase` record is created by the Stripe webhook after payment confirmation. **Free packages** (price = 0) are activated immediately.

```
POST /api/v1/story-purchases
```

**Auth:** Required (Bearer token)

**Request Body:**

```json
{
  "packageId": "6830a1b2c3d4e5f6a7b8c9d0"
}
```

| Field       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| `packageId` | string | Yes      | MongoDB ObjectId of the package    |

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

> The user should be redirected to `checkoutUrl`. After successful payment, Stripe sends a webhook to the backend which creates the `StoryPurchase` record automatically.

**Response: 201 Created** (free package -- activated immediately)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Story package purchased successfully.",
  "data": {
    "id": "6831b2c3d4e5f6a7b8c9d0e1",
    "packageSnapshot": {
      "name": "24h Basic Story",
      "description": "Upload 1 story visible for 24 hours",
      "durationHours": 24,
      "price": 0,
      "maxStories": 1,
      "currency": "USD",
      "validityDays": 30
    },
    "storiesUsed": 0,
    "storiesRemaining": 1,
    "status": "active",
    "purchasedAt": "2026-06-26T14:30:00.000Z",
    "expiresAt": "2026-07-26T14:30:00.000Z",
    "createdAt": "2026-06-26T14:30:00.000Z"
  }
}
```

**Response: 404 Not Found** (package does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Story package not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 400 Bad Request** (package is deactivated)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This story package is currently unavailable",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (invalid packageId format)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "packageId",
      "message": "Invalid package ID"
    }
  ]
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

Returns paginated list of the authenticated user's purchases.

```
GET /api/v1/story-purchases
```

**Auth:** Required

**Query Parameters:**

| Param    | Type   | Default | Description                                   |
|----------|--------|---------|-----------------------------------------------|
| `page`   | number | 1       | Page number (min: 1)                          |
| `limit`  | number | 10      | Items per page (min: 1, max: 50)              |
| `status` | string | -       | Filter: `"active"`, `"exhausted"`, `"expired"`|

**Example:** `GET /api/v1/story-purchases?status=active&page=1&limit=10`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story purchases fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6831b2c3d4e5f6a7b8c9d0e1",
        "packageSnapshot": {
          "name": "48h Multi-Story Pack",
          "description": "Upload up to 5 stories, each visible for 48 hours",
          "durationHours": 48,
          "price": 19.99,
          "maxStories": 5,
          "currency": "USD",
          "validityDays": 30
        },
        "storiesUsed": 3,
        "storiesRemaining": 2,
        "status": "active",
        "purchasedAt": "2026-06-20T09:00:00.000Z",
        "expiresAt": "2026-07-20T09:00:00.000Z",
        "createdAt": "2026-06-20T09:00:00.000Z"
      },
      {
        "id": "6831b2c3d4e5f6a7b8c9d0e2",
        "packageSnapshot": {
          "name": "24h Basic Story",
          "description": "Upload 1 story visible for 24 hours",
          "durationHours": 24,
          "price": 4.99,
          "maxStories": 1,
          "currency": "USD",
          "validityDays": 30
        },
        "storiesUsed": 1,
        "storiesRemaining": 0,
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
GET /api/v1/story-purchases/active
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Active story purchases fetched successfully.",
  "data": [
    {
      "id": "6831b2c3d4e5f6a7b8c9d0e1",
      "packageSnapshot": {
        "name": "48h Multi-Story Pack",
        "description": "Upload up to 5 stories, each visible for 48 hours",
        "durationHours": 48,
        "price": 19.99,
        "maxStories": 5,
        "currency": "USD",
        "validityDays": 30
      },
      "storiesUsed": 3,
      "storiesRemaining": 2,
      "status": "active",
      "purchasedAt": "2026-06-20T09:00:00.000Z",
      "expiresAt": "2026-07-20T09:00:00.000Z",
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
  "message": "Active story purchases fetched successfully.",
  "data": []
}
```

---

#### 2.4 Get Purchase by ID

```
GET /api/v1/story-purchases/:id
```

**Auth:** Required

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story purchase fetched successfully.",
  "data": {
    "id": "6831b2c3d4e5f6a7b8c9d0e1",
    "packageSnapshot": {
      "name": "48h Multi-Story Pack",
      "description": "Upload up to 5 stories, each visible for 48 hours",
      "durationHours": 48,
      "price": 19.99,
      "maxStories": 5,
      "currency": "USD",
      "validityDays": 30
    },
    "storiesUsed": 3,
    "storiesRemaining": 2,
    "status": "active",
    "purchasedAt": "2026-06-20T09:00:00.000Z",
    "expiresAt": "2026-07-20T09:00:00.000Z",
    "createdAt": "2026-06-20T09:00:00.000Z"
  }
}
```

**Response: 404 Not Found**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Story purchase not found",
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

### 3. User: Stories (Modified)

#### 3.1 Create Story (Updated - requires purchaseId)

Upload one or more story media files. Each file consumes one story slot from the specified purchase.

```
POST /api/v1/stories
```

**Auth:** Required

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field        | Type   | Required | Description                                         |
|--------------|--------|----------|-----------------------------------------------------|
| `images`     | file[] | Yes      | One or more image files (each file = 1 story slot)  |
| `data`       | string | Yes      | JSON string containing the body fields below        |

**JSON Body (inside `data` field):**

```json
{
  "purchaseId": "6831b2c3d4e5f6a7b8c9d0e1",
  "texts": [
    {
      "text": "Check out our summer sale!",
      "style": {
        "fontSize": 24,
        "color": "#ffffff",
        "fontWeight": "bold",
        "textAlign": "center",
        "position": { "x": 50, "y": 30 }
      }
    }
  ],
  "product": "6830a1b2c3d4e5f6a7b8c9ff"
}
```

| Field        | Type   | Required | Description                                     |
|--------------|--------|----------|-------------------------------------------------|
| `purchaseId` | string | Yes      | ID of an active story purchase                  |
| `texts`      | array  | No       | Text overlays (max 20), each with text + style  |
| `product`    | string | No       | ObjectId of a product to link to the story      |

**Response: 201 Created** (single file uploaded)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Stories created successfully",
  "data": [
    {
      "id": "6832c3d4e5f6a7b8c9d0e1f2",
      "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
      "user": {
        "id": "6829a0b1c2d3e4f5a6b7c8d9",
        "firstName": "John",
        "lastName": "Doe",
        "avatarUrl": "/uploads/avatars/john.jpg"
      },
      "store": null,
      "media": "/uploads/stories/1719410000000-image.jpg",
      "texts": [
        {
          "text": "Check out our summer sale!",
          "style": {
            "fontSize": 24,
            "color": "#ffffff",
            "fontWeight": "bold",
            "textAlign": "center",
            "position": { "x": 50, "y": 30 }
          }
        }
      ],
      "product": {
        "id": "6830a1b2c3d4e5f6a7b8c9ff",
        "title": "Summer T-Shirt",
        "media": [{ "url": "/uploads/products/tshirt.jpg", "type": "image" }],
        "price": 29.99,
        "currency": "USD"
      },
      "expireIn": 48,
      "expiresAt": "2026-06-28T14:30:00.000Z",
      "viewCount": 0,
      "isViewed": false,
      "createdAt": "2026-06-26T14:30:00.000Z",
      "updatedAt": "2026-06-26T14:30:00.000Z"
    }
  ]
}
```

**Response: 201 Created** (multiple files uploaded, 3 files = 3 stories)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Stories created successfully",
  "data": [
    {
      "id": "6832c3d4e5f6a7b8c9d0e1f2",
      "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
      "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": null },
      "store": { "id": "...", "name": "John's Store", "logo": "/uploads/logos/store.jpg" },
      "media": "/uploads/stories/1719410000001-img1.jpg",
      "texts": [],
      "product": null,
      "expireIn": 48,
      "expiresAt": "2026-06-28T14:30:00.000Z",
      "viewCount": 0,
      "isViewed": false,
      "createdAt": "2026-06-26T14:30:00.000Z",
      "updatedAt": "2026-06-26T14:30:00.000Z"
    },
    {
      "id": "6832c3d4e5f6a7b8c9d0e1f3",
      "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
      "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": null },
      "store": { "id": "...", "name": "John's Store", "logo": "/uploads/logos/store.jpg" },
      "media": "/uploads/stories/1719410000002-img2.jpg",
      "texts": [],
      "product": null,
      "expireIn": 48,
      "expiresAt": "2026-06-28T14:30:00.000Z",
      "viewCount": 0,
      "isViewed": false,
      "createdAt": "2026-06-26T14:30:00.000Z",
      "updatedAt": "2026-06-26T14:30:00.000Z"
    },
    {
      "id": "6832c3d4e5f6a7b8c9d0e1f4",
      "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
      "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": null },
      "store": { "id": "...", "name": "John's Store", "logo": "/uploads/logos/store.jpg" },
      "media": "/uploads/stories/1719410000003-img3.jpg",
      "texts": [],
      "product": null,
      "expireIn": 48,
      "expiresAt": "2026-06-28T14:30:00.000Z",
      "viewCount": 0,
      "isViewed": false,
      "createdAt": "2026-06-26T14:30:00.000Z",
      "updatedAt": "2026-06-26T14:30:00.000Z"
    }
  ]
}
```

**Response: 404 Not Found** (purchase does not exist)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Story purchase not found",
  "errorCode": "NOT_FOUND"
}
```

**Response: 403 Forbidden** (purchase belongs to another user)

```json
{
  "success": false,
  "statusCode": 403,
  "message": "This purchase does not belong to you",
  "errorCode": "FORBIDDEN"
}
```

**Response: 400 Bad Request** (purchase fully used)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "All story slots in this purchase have been used",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (purchase validity expired)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "This purchase has expired",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (uploading more files than remaining slots)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Not enough remaining slots. You have 2 slots but are uploading 5 files",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (race condition - concurrent usage)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Insufficient story slots or purchase expired",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (no files uploaded)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "At least one image is required",
  "errorCode": "BAD_REQUEST"
}
```

**Response: 400 Bad Request** (missing purchaseId)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "purchaseId",
      "message": "Required"
    }
  ]
}
```

---

#### 3.2 List Stories (unchanged)

```
GET /api/v1/stories
```

**Auth:** Optional (if authenticated, `isViewed` is populated)

**Query Parameters:**

| Param     | Type   | Default | Description                       |
|-----------|--------|---------|-----------------------------------|
| `userId`  | string | -       | Filter stories by user ID         |
| `storeId` | string | -       | Filter stories by store ID        |
| `page`    | number | 1       | Page number                       |
| `limit`   | number | 20      | Items per page (max: 50)          |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stories fetched successfully",
  "data": {
    "groups": [
      {
        "user": {
          "id": "6829a0b1c2d3e4f5a6b7c8d9",
          "firstName": "John",
          "lastName": "Doe",
          "avatarUrl": "/uploads/avatars/john.jpg"
        },
        "store": null,
        "stories": [
          {
            "id": "6832c3d4e5f6a7b8c9d0e1f2",
            "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
            "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": "..." },
            "store": null,
            "media": "/uploads/stories/img.jpg",
            "texts": [],
            "product": null,
            "expireIn": 24,
            "expiresAt": "2026-06-27T14:30:00.000Z",
            "viewCount": 5,
            "isViewed": true,
            "createdAt": "2026-06-26T14:30:00.000Z",
            "updatedAt": "2026-06-26T14:30:00.000Z"
          }
        ]
      },
      {
        "user": null,
        "store": {
          "id": "682fa1b2c3d4e5f6a7b8c9d0",
          "name": "Fashion Hub",
          "logo": "/uploads/logos/fashion.jpg"
        },
        "stories": [
          {
            "id": "6832c3d4e5f6a7b8c9d0e1f5",
            "purchase": "6831b2c3d4e5f6a7b8c9d0e3",
            "user": { "id": "...", "firstName": "Jane", "lastName": "Smith", "avatarUrl": null },
            "store": { "id": "...", "name": "Fashion Hub", "logo": "..." },
            "media": "/uploads/stories/fashion-sale.jpg",
            "texts": [
              {
                "text": "Flash Sale - 50% off!",
                "style": { "fontSize": 28, "color": "#FFD700", "fontWeight": "bold" }
              }
            ],
            "product": {
              "id": "6830a1b2c3d4e5f6a7b8c9fe",
              "title": "Designer Dress",
              "media": [{ "url": "/uploads/products/dress.jpg", "type": "image" }],
              "price": 149.99,
              "currency": "USD"
            },
            "expireIn": 48,
            "expiresAt": "2026-06-28T10:00:00.000Z",
            "viewCount": 42,
            "isViewed": false,
            "createdAt": "2026-06-26T10:00:00.000Z",
            "updatedAt": "2026-06-26T10:00:00.000Z"
          }
        ]
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### 3.3 Get Story by ID (unchanged)

```
GET /api/v1/stories/:id
```

**Auth:** Optional (records a view if authenticated and not the owner)

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story fetched successfully",
  "data": {
    "id": "6832c3d4e5f6a7b8c9d0e1f2",
    "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
    "user": {
      "id": "6829a0b1c2d3e4f5a6b7c8d9",
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": null
    },
    "store": null,
    "media": "/uploads/stories/img.jpg",
    "texts": [],
    "product": null,
    "expireIn": 24,
    "expiresAt": "2026-06-27T14:30:00.000Z",
    "viewCount": 6,
    "isViewed": true,
    "createdAt": "2026-06-26T14:30:00.000Z",
    "updatedAt": "2026-06-26T14:30:00.000Z"
  }
}
```

---

#### 3.4 Update Story (Modified - expireIn removed)

Only text overlays and product link can be updated. Duration is locked to the purchased package.

```
PATCH /api/v1/stories/:id
```

**Auth:** Required (must be the story owner)

**Request Body:**

```json
{
  "texts": [
    {
      "text": "Updated headline!",
      "style": {
        "fontSize": 20,
        "color": "#00ff00"
      }
    }
  ],
  "product": "6830a1b2c3d4e5f6a7b8c9ff"
}
```

| Field     | Type         | Required | Description                        |
|-----------|--------------|----------|------------------------------------|
| `texts`   | array        | No       | Updated text overlays (max 20)     |
| `product` | string/null  | No       | Product ID to link (null to unlink)|

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story updated successfully",
  "data": {
    "id": "6832c3d4e5f6a7b8c9d0e1f2",
    "purchase": "6831b2c3d4e5f6a7b8c9d0e1",
    "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": null },
    "store": null,
    "media": "/uploads/stories/img.jpg",
    "texts": [
      { "text": "Updated headline!", "style": { "fontSize": 20, "color": "#00ff00" } }
    ],
    "product": {
      "id": "6830a1b2c3d4e5f6a7b8c9ff",
      "title": "Summer T-Shirt",
      "media": [{ "url": "/uploads/products/tshirt.jpg", "type": "image" }],
      "price": 29.99,
      "currency": "USD"
    },
    "expireIn": 24,
    "expiresAt": "2026-06-27T14:30:00.000Z",
    "viewCount": 6,
    "isViewed": true,
    "createdAt": "2026-06-26T14:30:00.000Z",
    "updatedAt": "2026-06-26T15:00:00.000Z"
  }
}
```

---

#### 3.5 Delete Story (unchanged)

Soft-deletes a story. The consumed story slot is NOT restored.

```
DELETE /api/v1/stories/:id
```

**Auth:** Required (must be the story owner)

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story deleted successfully",
  "data": null
}
```

---

### 4. Admin: Story Packages

All admin endpoints require `superAdmin` role.

```
Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>
```

#### 4.1 List All Packages

```
GET /api/v1/admin/story-packages
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story packages fetched successfully.",
  "data": [
    {
      "id": "6830a1b2c3d4e5f6a7b8c9d0",
      "name": "24h Basic Story",
      "description": "Upload 1 story visible for 24 hours",
      "durationHours": 24,
      "price": 4.99,
      "maxStories": 1,
      "isActive": true,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-06-20T10:00:00.000Z",
      "updatedAt": "2026-06-20T10:00:00.000Z"
    },
    {
      "id": "6830a1b2c3d4e5f6a7b8c9d3",
      "name": "Archived Package",
      "description": "This package is no longer available",
      "durationHours": 12,
      "price": 2.99,
      "maxStories": 1,
      "isActive": false,
      "currency": "USD",
      "validityDays": 30,
      "createdAt": "2026-05-01T08:00:00.000Z",
      "updatedAt": "2026-06-01T12:00:00.000Z"
    }
  ]
}
```

---

#### 4.2 Get Package by ID

```
GET /api/v1/admin/story-packages/:id
```

**Response: 200 OK** (same shape as list item above)

---

#### 4.3 Create Package

```
POST /api/v1/admin/story-packages
```

**Request Body:**

```json
{
  "name": "Weekend Special - 72h Story",
  "description": "Upload up to 3 stories, each visible for 72 hours",
  "durationHours": 72,
  "price": 14.99,
  "maxStories": 3,
  "currency": "USD",
  "validityDays": 30
}
```

| Field          | Type   | Required | Default | Validation               |
|----------------|--------|----------|---------|--------------------------|
| `name`         | string | Yes      | -       | 1-100 chars              |
| `description`  | string | Yes      | -       | 1-500 chars              |
| `durationHours`| number | Yes      | -       | Integer >= 1             |
| `price`        | number | Yes      | -       | >= 0 (0 = free)          |
| `maxStories`   | number | No       | 1       | Integer >= 1             |
| `currency`     | string | No       | "USD"   | Max 10 chars             |
| `validityDays` | number | No       | 30      | Integer >= 1             |

**Response: 201 Created**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Story package created successfully.",
  "data": {
    "id": "6830a1b2c3d4e5f6a7b8c9d4",
    "name": "Weekend Special - 72h Story",
    "description": "Upload up to 3 stories, each visible for 72 hours",
    "durationHours": 72,
    "price": 14.99,
    "maxStories": 3,
    "isActive": true,
    "currency": "USD",
    "validityDays": 30,
    "createdAt": "2026-06-26T16:00:00.000Z",
    "updatedAt": "2026-06-26T16:00:00.000Z"
  }
}
```

---

#### 4.4 Update Package

```
PATCH /api/v1/admin/story-packages/:id
```

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Package Name",
  "price": 9.99,
  "maxStories": 5,
  "isActive": false
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story package updated successfully.",
  "data": {
    "id": "6830a1b2c3d4e5f6a7b8c9d4",
    "name": "Updated Package Name",
    "description": "Upload up to 3 stories, each visible for 72 hours",
    "durationHours": 72,
    "price": 9.99,
    "maxStories": 5,
    "isActive": false,
    "currency": "USD",
    "validityDays": 30,
    "createdAt": "2026-06-26T16:00:00.000Z",
    "updatedAt": "2026-06-26T17:00:00.000Z"
  }
}
```

---

#### 4.5 Delete Package

```
DELETE /api/v1/admin/story-packages/:id
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story package deleted successfully.",
  "data": null
}
```

> **Note:** Existing purchases that reference this package are unaffected because they store a `packageSnapshot` with all the package details frozen at purchase time.

---

#### 4.6 Toggle Package Status

Flip a package between active and inactive.

```
PATCH /api/v1/admin/story-packages/:id/toggle-status
```

**Request Body:** None required

**Response: 200 OK** (was active, now deactivated)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story package deactivated successfully.",
  "data": {
    "id": "6830a1b2c3d4e5f6a7b8c9d0",
    "name": "24h Basic Story",
    "description": "Upload 1 story visible for 24 hours",
    "durationHours": 24,
    "price": 4.99,
    "maxStories": 1,
    "isActive": false,
    "currency": "USD",
    "validityDays": 30,
    "createdAt": "2026-06-20T10:00:00.000Z",
    "updatedAt": "2026-06-26T18:00:00.000Z"
  }
}
```

**Response: 200 OK** (was inactive, now activated)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story package activated successfully.",
  "data": {
    "id": "6830a1b2c3d4e5f6a7b8c9d0",
    "name": "24h Basic Story",
    "isActive": true,
    "..."
  }
}
```

---

### 5. Admin: Story Purchases

#### 5.1 List All Purchases

```
GET /api/v1/admin/story-purchases
```

**Query Parameters:**

| Param    | Type   | Default | Description                                    |
|----------|--------|---------|------------------------------------------------|
| `page`   | number | 1       | Page number                                    |
| `limit`  | number | 10      | Items per page (max: 50)                       |
| `status` | string | -       | Filter: `"active"`, `"exhausted"`, `"expired"` |
| `userId` | string | -       | Filter by user ObjectId                        |
| `search` | string | -       | Search term                                    |

**Example:** `GET /api/v1/admin/story-purchases?status=active&page=1&limit=20`

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story purchases fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6831b2c3d4e5f6a7b8c9d0e1",
        "user": {
          "id": "6829a0b1c2d3e4f5a6b7c8d9",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "avatarUrl": "/uploads/avatars/john.jpg"
        },
        "store": {
          "id": "682fa1b2c3d4e5f6a7b8c9d0",
          "name": "John's Store",
          "logo": "/uploads/logos/store.jpg"
        },
        "packageSnapshot": {
          "name": "48h Multi-Story Pack",
          "description": "Upload up to 5 stories, each visible for 48 hours",
          "durationHours": 48,
          "price": 19.99,
          "maxStories": 5,
          "currency": "USD",
          "validityDays": 30
        },
        "storiesUsed": 3,
        "storiesRemaining": 2,
        "status": "active",
        "purchasedAt": "2026-06-20T09:00:00.000Z",
        "expiresAt": "2026-07-20T09:00:00.000Z",
        "createdAt": "2026-06-20T09:00:00.000Z"
      },
      {
        "id": "6831b2c3d4e5f6a7b8c9d0e5",
        "user": {
          "id": "6829a0b1c2d3e4f5a6b7c8da",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com",
          "avatarUrl": null
        },
        "store": null,
        "packageSnapshot": {
          "name": "24h Basic Story",
          "description": "Upload 1 story visible for 24 hours",
          "durationHours": 24,
          "price": 4.99,
          "maxStories": 1,
          "currency": "USD",
          "validityDays": 30
        },
        "storiesUsed": 1,
        "storiesRemaining": 0,
        "status": "exhausted",
        "purchasedAt": "2026-06-18T15:00:00.000Z",
        "expiresAt": "2026-07-18T15:00:00.000Z",
        "createdAt": "2026-06-18T15:00:00.000Z"
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

#### 5.2 Purchase Statistics

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
    "totalPurchases": 156,
    "activePurchases": 42,
    "exhaustedPurchases": 89,
    "expiredPurchases": 25,
    "totalRevenue": 2847.50,
    "totalStoriesUsed": 312
  }
}
```

---

### 6. Admin: Stories

#### 6.1 List Stories (unchanged)

```
GET /api/v1/admin/stories
```

**Query Parameters:**

| Param      | Type    | Default | Description                       |
|------------|---------|---------|-----------------------------------|
| `page`     | number  | 1       | Page number                       |
| `limit`    | number  | 10      | Items per page (max: 50)          |
| `search`   | string  | -       | Search in story text content      |
| `userId`   | string  | -       | Filter by user                    |
| `isActive` | string  | -       | `"true"` or `"false"`             |

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stories fetched successfully.",
  "data": {
    "items": [
      {
        "id": "6832c3d4e5f6a7b8c9d0e1f2",
        "user": { "id": "...", "firstName": "John", "lastName": "Doe", "avatarUrl": null },
        "store": { "id": "...", "name": "John's Store", "logo": null },
        "media": "/uploads/stories/img.jpg",
        "title": "Check out our summer sale!",
        "product": { "id": "...", "title": "Summer T-Shirt" },
        "expiresAt": "2026-06-27T14:30:00.000Z",
        "expireHoursLeft": 18,
        "viewCount": 42,
        "createdAt": "2026-06-26T14:30:00.000Z"
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

#### 6.2 Story Statistics (unchanged)

```
GET /api/v1/admin/stories/stats
```

**Response: 200 OK**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Story stats fetched successfully.",
  "data": {
    "totalStories": 312,
    "activeStories": 47,
    "expiredStories": 265
  }
}
```

---

## Edge Cases & Error Handling

### Purchase Lifecycle

| Scenario | Behavior |
|----------|----------|
| Package deleted after purchase | Purchase still valid - `packageSnapshot` preserves all details |
| Package deactivated after purchase | Existing purchases remain usable until exhausted or expired |
| Package price changed after purchase | Purchase keeps original price in snapshot |
| Purchase validity window passes | Status changes to `"expired"` via hourly scheduler |
| All story slots consumed | Status changes to `"exhausted"` immediately after the last story upload |

### Story Creation Guards

| Scenario | HTTP Code | Error Message |
|----------|-----------|---------------|
| No `purchaseId` in body | 400 | Validation failed (field: purchaseId, message: Required) |
| Invalid `purchaseId` format | 400 | Invalid purchase ID |
| Purchase does not exist | 404 | Story purchase not found |
| Purchase belongs to another user | 403 | This purchase does not belong to you |
| Purchase expired (past `expiresAt`) | 400 | This purchase has expired |
| Purchase fully used (status: exhausted) | 400 | All story slots in this purchase have been used |
| Uploading 5 files but only 2 slots remain | 400 | Not enough remaining slots. You have 2 slots but are uploading 5 files |
| Concurrent race condition on quota | 400 | Insufficient story slots or purchase expired |
| No media files attached | 400 | At least one image is required |

### Quota Rules

- Each uploaded file consumes **1 story slot** from the purchase
- Uploading 3 files in one request consumes 3 slots
- Soft-deleting a story does **NOT** restore the consumed slot
- Quota is enforced atomically to prevent over-consumption under concurrent requests

---

## Auto-Expiration Mechanisms

### Story Expiration

- **Mechanism:** MongoDB TTL index on `expiresAt` field
- **Behavior:** MongoDB automatically deletes story documents when `expiresAt` is in the past
- **Timing:** MongoDB checks TTL indexes every 60 seconds (approximate, not exact)
- **User impact:** Expired stories are excluded from all queries via the `isDeleted: false, expiresAt: { $gt: now }` filter, so they disappear from API responses immediately even before physical deletion

### Purchase Expiration

- **Mechanism:** Scheduled job running every hour
- **Behavior:** Updates all purchases with `status: "active"` and `expiresAt <= now` to `status: "expired"`
- **Double guard:** Even if the scheduler hasn't run yet, the story creation endpoint independently checks `expiresAt > now` before allowing uploads, so expired purchases can never be used

### Purchase Exhaustion

- **Mechanism:** Inline check after each story creation
- **Behavior:** After atomically incrementing `storiesUsed`, if `storiesUsed >= packageSnapshot.maxStories`, the purchase status is set to `"exhausted"` immediately

---

## Endpoint Summary Table

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/story-packages` | No | Any | List active packages |
| GET | `/api/v1/story-packages/:id` | No | Any | Get package details |
| POST | `/api/v1/story-purchases` | Yes | User | Purchase a package (returns checkoutUrl for paid) |
| GET | `/api/v1/story-purchases` | Yes | User | List my purchases |
| GET | `/api/v1/story-purchases/active` | Yes | User | Get active purchases |
| GET | `/api/v1/story-purchases/:id` | Yes | User | Get purchase by ID |
| POST | `/api/v1/stories` | Yes | User | Create story (requires purchaseId) |
| GET | `/api/v1/stories` | Optional | Any | List active stories |
| GET | `/api/v1/stories/:id` | Optional | Any | Get story by ID |
| PATCH | `/api/v1/stories/:id` | Yes | Owner | Update story (texts/product only) |
| DELETE | `/api/v1/stories/:id` | Yes | Owner | Soft-delete story |
| GET | `/api/v1/admin/story-packages` | Yes | SuperAdmin | List all packages |
| GET | `/api/v1/admin/story-packages/:id` | Yes | SuperAdmin | Get package |
| POST | `/api/v1/admin/story-packages` | Yes | SuperAdmin | Create package |
| PATCH | `/api/v1/admin/story-packages/:id` | Yes | SuperAdmin | Update package |
| DELETE | `/api/v1/admin/story-packages/:id` | Yes | SuperAdmin | Delete package |
| PATCH | `/api/v1/admin/story-packages/:id/toggle-status` | Yes | SuperAdmin | Toggle active/inactive |
| GET | `/api/v1/admin/story-purchases` | Yes | SuperAdmin | List all purchases |
| GET | `/api/v1/admin/story-purchases/stats` | Yes | SuperAdmin | Purchase statistics |
| GET | `/api/v1/admin/stories` | Yes | SuperAdmin | List all stories |
| GET | `/api/v1/admin/stories/stats` | Yes | SuperAdmin | Story statistics |
