import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const cwd = process.cwd();
const nodeEnv = process.env.NODE_ENV ?? 'development';

const envFiles = [
    `.env.${nodeEnv}.local`,
    ...(nodeEnv !== 'test' ? ['.env.local'] : []),
    `.env.${nodeEnv}`,
    '.env',
];

for (const file of envFiles) {
    const envPath = path.resolve(cwd, file);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: false, quiet: true });
    }
}

const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z.coerce.number().int().min(1).max(65535).default(5000),
        API_PREFIX: z
            .string()
            .regex(/^\/[a-z0-9/-]*$/i)
            .default('/api/v1'),
        CLIENT_URL: z.url().default('http://localhost:3000'),
        CORS_ORIGIN: z.string().default('http://localhost:3000'),
        REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15_000),
        SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),

        MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
        MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(5),
        MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).default(20),
        MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5_000),
        MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().min(1000).default(45_000),

        REDIS_HOST: z.string().default('localhost'),
        REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
        REDIS_DB: z.coerce.number().int().min(0).default(0),
        REDIS_PASSWORD: z.string().optional().default(''),
        REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5_000),
        REDIS_KEEP_ALIVE_MS: z.coerce.number().int().min(1000).default(30_000),
        REDIS_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(100).default(2_000),

        JWT_ACCESS_SECRET: z.string().min(32),
        JWT_REFRESH_SECRET: z.string().min(32),
        JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().int().min(1).default(15),
        JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().int().min(1).default(7),
        JWT_VERIFY_EMAIL_EXPIRATION_HOURS: z.coerce.number().int().min(1).default(24),
        JWT_RESET_PASSWORD_EXPIRATION_HOURS: z.coerce.number().int().min(1).default(1),

        GOOGLE_CLIENT_ID: z.string().default(''),
        GOOGLE_CLIENT_SECRET: z.string().default(''),
        GOOGLE_CALLBACK_URL: z.string().default(''),
        FACEBOOK_APP_ID: z.string().default(''),
        FACEBOOK_APP_SECRET: z.string().default(''),
        FACEBOOK_CALLBACK_URL: z.string().default(''),
        APPLE_CLIENT_ID: z.string().default(''),

        SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
        SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
        SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
        SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
        MAIL_FROM: z.string().email('MAIL_FROM must be a valid email'),

        CLOUDINARY_CLOUD_NAME: z.string().default(''),
        CLOUDINARY_API_KEY: z.string().default(''),
        CLOUDINARY_API_SECRET: z.string().default(''),

        STRIPE_SECRET_KEY: z.string().default(''),
        STRIPE_WEBHOOK_SECRET: z.string().default(''),
        STRIPE_SUCCESS_URL: z.string().default('sellx://payment/success'),
        STRIPE_CANCEL_URL: z.string().default('sellx://payment/cancel'),

        SOCKET_IO_PATH: z
            .string()
            .regex(/^\/[A-Za-z0-9/._-]*$/, 'SOCKET_IO_PATH must start with "/" and use safe chars.')
            .default('/socket.io'),
        SOCKET_IO_PING_INTERVAL_MS: z.coerce.number().int().min(5_000).default(25_000),
        SOCKET_IO_PING_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(20_000),
        SOCKET_IO_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(45_000),
        SOCKET_IO_MAX_PAYLOAD_BYTES: z.coerce.number().int().min(1_024).default(1_000_000),
        SOCKET_IO_MESSAGE_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).default(120),
        SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH: z.coerce.number().int().min(50).default(2_000),
        SOCKET_IO_USE_REDIS_ADAPTER: z.enum(['true', 'false']).default('true'),

        // App Configuration
        APP_NAME: z.string().default('Backend Template'),

        // Auth Configuration
        AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).default(10),
        AUTH_LOCK_DURATION_MINUTES: z.coerce.number().int().min(1).default(60),

        // Firebase Configuration
        FIREBASE_CONFIG_PATH: z.string().default(''),

        // Deep Link Configuration
        DEEPLINK_IOS_BUNDLE_ID: z.string().default(''),
        DEEPLINK_IOS_TEAM_ID: z.string().default(''),
        DEEPLINK_ANDROID_PACKAGE_NAME: z.string().default(''),
        DEEPLINK_ANDROID_SHA256_FINGERPRINT: z.string().default(''),
        DEEPLINK_APP_STORE_URL: z.string().default(''),
        DEEPLINK_PLAY_STORE_URL: z.string().default(''),
        DEEPLINK_APP_SCHEME: z.string().default('sellx'),
        DEEPLINK_WEB_FALLBACK_URL: z.string().default(''),
    })
    .superRefine((value, ctx) => {
        if (value.NODE_ENV === 'production') {
            if (value.JWT_ACCESS_SECRET.length < 64) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['JWT_ACCESS_SECRET'],
                    message: 'In production, JWT_ACCESS_SECRET must be at least 64 chars.',
                });
            }
            if (value.JWT_REFRESH_SECRET.length < 64) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['JWT_REFRESH_SECRET'],
                    message: 'In production, JWT_REFRESH_SECRET must be at least 64 chars.',
                });
            }
        } else {
            // For non-production environments, allow shorter secrets
            if (value.JWT_ACCESS_SECRET.length < 32) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['JWT_ACCESS_SECRET'],
                    message: 'JWT_ACCESS_SECRET must be at least 32 chars.',
                });
            }
            if (value.JWT_REFRESH_SECRET.length < 32) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['JWT_REFRESH_SECRET'],
                    message: 'JWT_REFRESH_SECRET must be at least 32 chars.',
                });
            }
        }

        if (value.MONGODB_MIN_POOL_SIZE > value.MONGODB_MAX_POOL_SIZE) {
            ctx.addIssue({
                code: 'custom',
                path: ['MONGODB_MIN_POOL_SIZE'],
                message: 'MONGODB_MIN_POOL_SIZE cannot be greater than MONGODB_MAX_POOL_SIZE.',
            });
        }

        if (value.SOCKET_IO_PING_TIMEOUT_MS >= value.SOCKET_IO_PING_INTERVAL_MS) {
            ctx.addIssue({
                code: 'custom',
                path: ['SOCKET_IO_PING_TIMEOUT_MS'],
                message: 'SOCKET_IO_PING_TIMEOUT_MS must be less than SOCKET_IO_PING_INTERVAL_MS.',
            });
        }

        if (value.SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH > value.SOCKET_IO_MAX_PAYLOAD_BYTES) {
            ctx.addIssue({
                code: 'custom',
                path: ['SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH'],
                message:
                    'SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH cannot exceed SOCKET_IO_MAX_PAYLOAD_BYTES.',
            });
        }
    });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
}

export const env = parsed.data;
