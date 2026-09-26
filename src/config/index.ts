import { env } from './env';

const corsOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const config = {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',

    app: {
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        clientUrl: env.CLIENT_URL,
        corsOrigins,
        requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
        shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
        name: env.APP_NAME,
    },

    auth: {
        maxFailedAttempts: env.AUTH_MAX_FAILED_ATTEMPTS,
        lockDurationMinutes: env.AUTH_LOCK_DURATION_MINUTES,
    },

    db: {
        uri: env.MONGODB_URI,
        minPoolSize: env.MONGODB_MIN_POOL_SIZE,
        maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
        serverSelectionTimeoutMs: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMs: env.MONGODB_SOCKET_TIMEOUT_MS,
    },

    redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        db: env.REDIS_DB,
        password: env.REDIS_PASSWORD || undefined,
        connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
        keepAliveMs: env.REDIS_KEEP_ALIVE_MS,
        commandTimeoutMs: env.REDIS_COMMAND_TIMEOUT_MS,
    },

    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpirationMinutes: env.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: env.JWT_REFRESH_EXPIRATION_DAYS,
        verifyEmailExpirationHours: env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS,
        resetPasswordExpirationHours: env.JWT_RESET_PASSWORD_EXPIRATION_HOURS,
    },

    oauth: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackUrl: env.GOOGLE_CALLBACK_URL,
        },
        facebook: {
            appId: env.FACEBOOK_APP_ID,
            appSecret: env.FACEBOOK_APP_SECRET,
            callbackUrl: env.FACEBOOK_CALLBACK_URL,
        },
        apple: {
            clientId: env.APPLE_CLIENT_ID,
        },
    },

    mail: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.MAIL_FROM,
    },

    cloudinary: {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
    },

    stripe: {
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        successUrl: env.STRIPE_SUCCESS_URL,
        cancelUrl: env.STRIPE_CANCEL_URL,
    },

    realtime: {
        path: env.SOCKET_IO_PATH,
        pingIntervalMs: env.SOCKET_IO_PING_INTERVAL_MS,
        pingTimeoutMs: env.SOCKET_IO_PING_TIMEOUT_MS,
        connectTimeoutMs: env.SOCKET_IO_CONNECT_TIMEOUT_MS,
        maxPayloadBytes: env.SOCKET_IO_MAX_PAYLOAD_BYTES,
        messageRateLimitPerMinute: env.SOCKET_IO_MESSAGE_RATE_LIMIT_PER_MINUTE,
        chatMaxMessageLength: env.SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH,
        useRedisAdapter: env.SOCKET_IO_USE_REDIS_ADAPTER === 'true',
    },

    firebase: {
        configPath: env.FIREBASE_CONFIG_PATH,
    },

    deepLink: {
        iosBundleId: env.DEEPLINK_IOS_BUNDLE_ID,
        iosTeamId: env.DEEPLINK_IOS_TEAM_ID,
        androidPackageName: env.DEEPLINK_ANDROID_PACKAGE_NAME,
        androidSha256Fingerprint: env.DEEPLINK_ANDROID_SHA256_FINGERPRINT,
        appStoreUrl: env.DEEPLINK_APP_STORE_URL,
        playStoreUrl: env.DEEPLINK_PLAY_STORE_URL,
        appScheme: env.DEEPLINK_APP_SCHEME,
        webFallbackUrl: env.DEEPLINK_WEB_FALLBACK_URL,
    },
} as const;
