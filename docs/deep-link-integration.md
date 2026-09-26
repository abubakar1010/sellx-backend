# Deep Link Integration Guide — Flutter App

## Overview

The backend serves deep link verification files and a smart redirect endpoint for product sharing. The Flutter app needs to register the URL scheme, listen for incoming links, and handle navigation.

---

## URL Formats

| Type | Format | Example |
|------|--------|---------|
| App scheme | `sellx://product/{productId}` | `sellx://product/6650abc123def` |
| Share URL | `https://{BACKEND_DOMAIN}/share/product/{productId}` | `https://api.sellx.com/share/product/6650abc123def` |

The **share URL** can be constructed client-side — no API call needed. Just concatenate the backend domain + `/share/product/` + product ID.

---

## What the Flutter App Must Implement

### 1. Register Custom URL Scheme — `sellx://`

**Android** — `AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="sellx" android:host="product" />
</intent-filter>
```

**iOS** — `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>sellx</string>
        </array>
    </dict>
</array>
```

### 2. Register Universal Links / App Links

**Android** — `AndroidManifest.xml` (add a second intent filter):

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="{BACKEND_DOMAIN}" android:pathPrefix="/share" />
</intent-filter>
```

**iOS** — Xcode > Signing & Capabilities > Associated Domains:

```
applinks:{BACKEND_DOMAIN}
```

### 3. Listen for Incoming Deep Links

Use the `app_links` package (or `uni_links`). Handle both cases:

- **Cold start** — app was not running, opened via deep link
- **Warm resume** — app was in background, brought to foreground via deep link

**Parse the URL:**

```
sellx://product/6650abc123def
                 ^^^^^^^^^^^^^ extract this as productId
```

Navigate to `ProductDetailScreen(productId)`.

### 4. Handle FCM Notification Tap

When a user follows a store and a new product is listed, the backend sends a push notification. The `data` payload contains:

```json
{
  "type": "new_product",
  "productId": "6650abc123def",
  "deepLink": "sellx://product/6650abc123def"
}
```

On notification tap, read `data["deepLink"]`, parse the product ID, and navigate to the product detail screen.

### 5. Share Flow

When a user taps "Share" on a product:

1. Build the share URL: `https://{BACKEND_DOMAIN}/share/product/{productId}`
2. Use Flutter's `Share.share(url)` to open the native share sheet

No API call required.

---

## What I Need From You

| Item | Where to find it | Example |
|------|-------------------|---------|
| **iOS Bundle ID** | Xcode > General > Bundle Identifier | `com.sellx.app` |
| **iOS Team ID** | Apple Developer > Membership > Team ID | `ABC123XYZ` |
| **Android Package Name** | `android/app/build.gradle` > `applicationId` | `com.sellx.app` |
| **Android SHA256 Fingerprint** | Run: `keytool -list -v -keystore your-key.jks` | `14:6D:E9:...` |
| **App Store URL** | App Store Connect (once published) | `https://apps.apple.com/app/sellx/id000000000` |
| **Play Store URL** | Google Play Console (once published) | `https://play.google.com/store/apps/details?id=com.sellx.app` |

I need these values to configure the backend verification files (`apple-app-site-association` and `assetlinks.json`) so that iOS and Android recognize our domain as trusted for the app.

---

## What the Backend Already Provides

| Endpoint | Purpose |
|----------|---------|
| `GET /.well-known/apple-app-site-association` | iOS Universal Links verification (auto-configured) |
| `GET /.well-known/assetlinks.json` | Android App Links verification (auto-configured) |
| `GET /share/product/:id` | Smart redirect — opens app on mobile, falls back to app store if not installed |
| FCM push `data.deepLink` | Deep link URL included in new-product notifications |

---

## Testing Checklist

- [ ] Tapping `sellx://product/{id}` opens the product detail screen
- [ ] Tapping `https://{BACKEND_DOMAIN}/share/product/{id}` opens the app (if installed) or redirects to store (if not)
- [ ] Cold start deep link navigates correctly
- [ ] Warm resume deep link navigates correctly
- [ ] Tapping a "New Product Alert" notification opens the correct product
- [ ] Share button generates the correct URL and opens the share sheet
