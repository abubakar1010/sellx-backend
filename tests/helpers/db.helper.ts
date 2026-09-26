import mongoose from 'mongoose';

/**
 * Support for the handful of suites that need a real MongoDB.
 *
 * ## Why these are opt-in
 *
 * `dotenv` loads `.env` before jest's setup file runs, so inside a test `MONGODB_URI` is
 * whatever the developer points the app at — in this repo, an Atlas cluster. Five integration
 * suites open with `await SomeModel.deleteMany({})`. Today they survive only because nothing
 * ever opened a connection, so the queries buffer and the tests time out harmlessly. Connect
 * them without thinking and `npm run test` empties the production database.
 *
 * So: `tests/setup.ts` pins `MONGODB_URI` to a local test database and refuses anything else,
 * and these suites run only when `RUN_DB_TESTS=1` says a local MongoDB is up:
 *
 *     docker compose up -d mongo
 *     RUN_DB_TESTS=1 npm run test
 *
 * Without it they are skipped, visibly, rather than failing for 90 seconds against a database
 * that is not there.
 */
export const databaseTestsEnabled = process.env.RUN_DB_TESTS === '1';

/** `describe` when a local MongoDB is available, `describe.skip` otherwise. */
export const describeWithDatabase = databaseTestsEnabled ? describe : describe.skip;

export const connectTestDatabase = async (): Promise<void> => {
    if (!databaseTestsEnabled || mongoose.connection.readyState === 1) {
        return;
    }

    await mongoose.connect(process.env.MONGODB_URI as string, {
        serverSelectionTimeoutMS: 2000,
    });
};

export const clearTestDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const disconnectTestDatabase = async (): Promise<void> => {
    if (mongoose.connection.readyState === 0) {
        return;
    }

    await mongoose.disconnect();
};
