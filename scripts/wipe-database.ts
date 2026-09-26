/**
 * Wipe the entire MongoDB database.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/wipe-database.ts
 *
 * Or from Docker:
 *   docker compose exec api npx ts-node -r tsconfig-paths/register scripts/wipe-database.ts
 *
 * Requires MONGODB_URI in .env
 */

import mongoose from 'mongoose';
import { config } from '@/config';

const CONFIRMATION = '--yes-i-am-sure';

const wipe = async (): Promise<void> => {
    if (!process.argv.includes(CONFIRMATION)) {
        console.error(
            `\n  This will permanently DELETE ALL DATA in the database.\n\n` +
            `  Database: ${config.db.uri}\n\n` +
            `  To confirm, run:\n` +
            `    npx ts-node -r tsconfig-paths/register scripts/wipe-database.ts ${CONFIRMATION}\n`,
        );
        process.exit(1);
    }

    if (config.isProduction) {
        console.error('  Refusing to wipe a production database.');
        process.exit(1);
    }

    console.log(`Connecting to ${config.db.uri} ...`);
    await mongoose.connect(config.db.uri);
    console.log('Connected.');

    const db = mongoose.connection.db;
    if (!db) {
        console.error('No database instance.');
        process.exit(1);
    }

    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Dropping all...`);

    for (const col of collections) {
        await db.dropCollection(col.name);
        console.log(`  Dropped: ${col.name}`);
    }

    console.log('\nDatabase wiped. All collections removed.');
    await mongoose.disconnect();
};

wipe().catch((err) => {
    console.error('Wipe failed:', err);
    process.exit(1);
});
