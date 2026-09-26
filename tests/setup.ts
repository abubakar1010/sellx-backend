process.env.NODE_ENV = 'test';

import { disconnectRedis } from '../src/infrastructure/cache/redis.client';
import { disconnectDatabase } from '../src/infrastructure/database/mongoose.connection';
import { closeBullConnection } from '../src/infrastructure/queue/bull.connection';
import { closeQueues } from '../src/jobs/queues';
import { closeRealtimeServer } from '../src/infrastructure/realtime';
process.env.PORT = process.env.PORT ?? '5001';
process.env.API_PREFIX = process.env.API_PREFIX ?? '/api/v1';
process.env.CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
process.env.REQUEST_TIMEOUT_MS = process.env.REQUEST_TIMEOUT_MS ?? '5000';
process.env.SHUTDOWN_TIMEOUT_MS = process.env.SHUTDOWN_TIMEOUT_MS ?? '5000';

/**
 * Tests must never reach a real database.
 *
 * `dotenv` has already run by the time this file executes, so `MONGODB_URI` is whatever `.env`
 * points the app at — an Atlas cluster in this repo. Five integration suites begin with
 * `deleteMany({})`, and they are harmless today only because nothing connects them. The URI is
 * therefore overwritten, not defaulted, and a non-local one is refused outright rather than
 * silently accepted.
 */
const TEST_DATABASE_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/sellx_test';

if (!/^mongodb:\/\/(localhost|127\.0\.0\.1)[:/]/.test(TEST_DATABASE_URI)) {
    throw new Error(
        'MONGODB_TEST_URI must point at a local database — refusing to run the suite against ' +
            'a remote one, because the integration tests delete every document they find.',
    );
}

process.env.MONGODB_URI = TEST_DATABASE_URI;
process.env.MONGODB_MIN_POOL_SIZE = process.env.MONGODB_MIN_POOL_SIZE ?? '1';
process.env.MONGODB_MAX_POOL_SIZE = process.env.MONGODB_MAX_POOL_SIZE ?? '5';
process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS =
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '2000';
process.env.MONGODB_SOCKET_TIMEOUT_MS = process.env.MONGODB_SOCKET_TIMEOUT_MS ?? '5000';

process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.REDIS_DB = process.env.REDIS_DB ?? '0';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? '';
process.env.REDIS_CONNECT_TIMEOUT_MS = process.env.REDIS_CONNECT_TIMEOUT_MS ?? '1000';
process.env.REDIS_KEEP_ALIVE_MS = process.env.REDIS_KEEP_ALIVE_MS ?? '1000';
process.env.REDIS_COMMAND_TIMEOUT_MS = process.env.REDIS_COMMAND_TIMEOUT_MS ?? '500';

process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret-123456';
process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-1234';
process.env.JWT_ACCESS_EXPIRATION_MINUTES = process.env.JWT_ACCESS_EXPIRATION_MINUTES ?? '15';
process.env.JWT_REFRESH_EXPIRATION_DAYS = process.env.JWT_REFRESH_EXPIRATION_DAYS ?? '7';
process.env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS =
    process.env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS ?? '24';
process.env.JWT_RESET_PASSWORD_EXPIRATION_HOURS =
    process.env.JWT_RESET_PASSWORD_EXPIRATION_HOURS ?? '1';

process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.test.local';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '587';
process.env.SMTP_USER = process.env.SMTP_USER ?? 'test-user';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? 'test-pass';
process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'noreply@app.dev';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? '';
process.env.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? '';
process.env.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? '';
process.env.FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL ?? '';

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? '';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? '';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ?? '';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

afterAll(async () => {
    // Order matters. Importing anything that reaches `jobs/queues` constructs four BullMQ
    // queues, and each one immediately queues a command on the shared ioredis connection.
    // Closing that connection first rejects those commands with "Connection is closed", and the
    // unhandled rejection kills the jest process before it can report a single result.
    await closeQueues();

    await Promise.allSettled([
        closeRealtimeServer(),
        closeBullConnection(),
        disconnectRedis(),
        disconnectDatabase(),
    ]);
});
