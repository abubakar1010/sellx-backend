import { UserModel } from '@/modules/user/user.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

/**
 * Backfills `address: null` on user documents written before the field gained a
 * `default: null`, so every user document carries the key explicitly.
 * Also normalizes empty-string addresses to null. Safe to re-run.
 */
export const backfillUserAddress = async (): Promise<void> => {
    await connectDatabase();

    try {
        const result = await UserModel.updateMany(
            { $or: [{ address: { $exists: false } }, { address: '' }] },
            { $set: { address: null } },
        );

        logger.info('✅ User address backfill completed.', {
            matched: result.matchedCount,
            modified: result.modifiedCount,
        });
    } finally {
        await disconnectDatabase();
    }
};

// CLI execution
if (require.main === module) {
    void backfillUserAddress()
        .then(() => {
            logger.info('🎉 User address backfill finished successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ User address backfill failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
