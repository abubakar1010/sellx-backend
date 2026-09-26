import { AdPackageModel } from '@/modules/ads/ads.model';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';

const AD_PACKAGES = [
    { name: 'Standard', durationDays: 3, price: 59, adType: 'standard' },
    { name: 'Popular', durationDays: 7, price: 109, adType: 'popular' },
    { name: 'Premium', durationDays: 15, price: 189, adType: 'premium' },
    { name: 'Ultimate', durationDays: 30, price: 309, adType: 'ultimate' },
];

export const seedAdPackages = async (): Promise<void> => {
    await connectDatabase();

    try {
        let createdCount = 0;
        let skippedCount = 0;

        for (const pkg of AD_PACKAGES) {
            const existing = await AdPackageModel.findOne({ durationDays: pkg.durationDays });
            if (existing) {
                logger.info(`Skipped ad package "${pkg.name}" (already exists)`);
                skippedCount++;
                continue;
            }

            await AdPackageModel.create(pkg);
            logger.info(`Created ad package "${pkg.name}"`);
            createdCount++;
        }

        logger.info(`Ad package seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`);
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedAdPackages()
        .then(() => process.exit(0))
        .catch((error) => {
            logger.error('Ad package seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
