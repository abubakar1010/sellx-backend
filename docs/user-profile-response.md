# User Profile Response Structure

This document describes the response structure returned by all endpoints that return user profile data.

## Endpoints

| Method | Endpoint                          | Description                |
| ------ | --------------------------------- | -------------------------- |
| POST   | `/api/v1/auth/login`              | Login                      |
| POST   | `/api/v1/auth/register`           | Register                   |
| POST   | `/api/v1/auth/refresh`            | Refresh tokens             |
| POST   | `/api/v1/auth/verify-email`       | Email verification         |
| POST   | `/api/v1/auth/verify-reset-code`  | Password reset code verify |
| GET    | `/api/v1/auth/me`                 | Current user profile       |
| GET    | `/api/v1/auth/google/callback`    | Google OAuth callback      |
| GET    | `/api/v1/users/me`                | Get my profile             |
| PATCH  | `/api/v1/users/me`                | Update my profile          |
| GET    | `/api/v1/users/:id`               | Get user by ID             |
| PATCH  | `/api/v1/users/:id`               | Update user by ID          |
| POST   | `/api/v1/onboarding/profile`            | Complete profile step |
| POST   | `/api/v1/onboarding/categories`         | Select categories step |

---

## Auth Response (Login / Register / Refresh / OAuth / Verify Email)

```jsonc
{
  "success": true,
  "message": "...",
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "phone": "string",
      "firstName": "string",
      "lastName": "string",
      "fullName": "string",
      "role": "string",                        // "user" | "admin" | "super_admin"
      "status": "string",                      // "active" | "inactive" | "blocked"
      "registrationStrategy": "string",        // "local" | "google" | "apple"
      "lastLoginStrategy": "string | null",
      "isEmailVerified": "boolean",
      "avatarUrl": "string | null",
      "onboardingStep": "string",              // "REGISTERED" | "EMAIL_VERIFIED" | "PROFILE_SETUP" | "COMPLETED"
      "isOnboardingCompleted": "boolean",
      "notificationToken": "string | null",
      "deviceType": "string | null",           // "ios" | "android" | "web"
      "activeProfileType": "string",           // "user" | "store"
      "activeStoreId": "string | null",
      "storeId": "string | null",
      "stores": [
        {
          "id": "string",
          "name": "string",
          "logo": "string | null",
          "category": {
            "id": "string",
            "title": "string",
            "slug": "string"
          },
          "isActive": "boolean",
          "isVerified": "boolean"
        }
      ],
      "addresses": [
        {
          "label": "string | null",            // e.g. "Home", "Office"
          "addressLine": "string",
          "city": "string | null",
          "state": "string | null",
          "country": "string | null",
          "postalCode": "string | null",
          "location": {
            "type": "Point",
            "coordinates": ["longitude", "latitude"]  // [number, number]
          },
          "isDefault": "boolean"
        }
      ],
      "totalProducts": "number",
      "soldItemsCount": "number",
      "avgRating": "number",
      "totalReviewCount": "number",
      "ratingDistribution": {                  // optional
        "5": "number",
        "4": "number",
        "3": "number",
        "2": "number",
        "1": "number"
      }
    },
    "tokens": {
      "accessToken": "string",
      "refreshToken": "string"
    },
    "onboarding": {
      "step": "string",
      "isCompleted": "boolean",
      "nextRoute": "string"
    }
  }
}
```

---

## Me / User Profile Response (GET `/auth/me`)

```jsonc
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "bio": "string | null",
    "role": "string",
    "status": "string",
    "registrationStrategy": "string",
    "lastLoginStrategy": "string | null",
    "isEmailVerified": "boolean",
    "avatarUrl": "string | null",
    "onboardingStep": "string",
    "isOnboardingCompleted": "boolean",
    "totalProducts": "number",
    "soldItemsCount": "number",
    "avgRating": "number",
    "totalReviewCount": "number",
    "ratingDistribution": { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
    "ratingDistributionFormatted": {           // optional
      "five": "number",
      "four": "number",
      "three": "number",
      "two": "number",
      "one": "number"
    },
    "addresses": [
      {
        "label": "string | null",
        "addressLine": "string",
        "city": "string | null",
        "state": "string | null",
        "country": "string | null",
        "postalCode": "string | null",
        "location": {
          "type": "Point",
          "coordinates": ["longitude", "latitude"]
        },
        "isDefault": "boolean"
      }
    ],
    "stores": [{ "..." : "..." }],
    "notificationToken": "string | null",
    "deviceType": "string | null",
    "activeProfileType": "string",
    "activeStoreId": "string | null",
    "createdAt": "ISO 8601 date string",
    "updatedAt": "ISO 8601 date string"
  }
}
```

---

## User Controller Response (GET/PATCH `/users/me`, `/users/:id`)

```jsonc
{
  "success": true,
  "message": "...",
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "phone": "string",
      "firstName": "string",
      "lastName": "string",
      "fullName": "string",
      "role": "string",
      "status": "string",
      "registrationStrategy": "string",
      "lastLoginStrategy": "string | null",
      "isEmailVerified": "boolean",
      "avatarUrl": "string | null",
      "onboardingStep": "string",
      "isOnboardingCompleted": "boolean",
      "notificationToken": "string | null",
      "deviceType": "string | null",
      "addresses": [
        {
          "label": "string | null",
          "addressLine": "string",
          "city": "string | null",
          "state": "string | null",
          "country": "string | null",
          "postalCode": "string | null",
          "location": {
            "type": "Point",
            "coordinates": ["longitude", "latitude"]
          },
          "isDefault": "boolean"
        }
      ],
      "totalProducts": "number",
      "soldItemsCount": "number",
      "avgRating": "number",
      "totalReviewCount": "number",
      "ratingDistribution": { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
    },
    "onboarding": {
      "step": "string",
      "isCompleted": "boolean",
      "nextRoute": "string"
    }
  }
}
```

---

## Onboarding Response (POST `/onboarding/profile`, `/onboarding/categories`)

Same structure as the **User Controller Response** above.

---

## Address Object Reference

| Field         | Type                | Required | Description                          |
| ------------- | ------------------- | -------- | ------------------------------------ |
| `label`       | `string`            | No       | User-defined label (e.g. "Home")     |
| `addressLine` | `string`            | Yes      | Full street address                  |
| `city`        | `string`            | No       | City name                            |
| `state`       | `string`            | No       | State / province                     |
| `country`     | `string`            | No       | Country name                         |
| `postalCode`  | `string`            | No       | ZIP / postal code                    |
| `location`    | `GeoJSON Point`     | No       | `{ type: "Point", coordinates: [lng, lat] }` |
| `isDefault`   | `boolean`           | Yes      | Whether this is the default address  |

A user can have between **0 and 5** addresses. The `addresses` array will be empty (`[]`) if no addresses have been added yet (e.g. before onboarding step 3).
