import { BoostPlanModel } from '@/modules/products/products.model';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';

const BOOST_PLANS = [
    { name: 'Basic Boost', price: 29, durationHours: 24, description: 'Visibility for 24h' },
    { name: 'Standard Boost', price: 59, durationHours: 72, description: 'Visibility for 3 days' },
    { name: 'Premium Boost', price: 99, durationHours: 168, description: 'Visibility for 7 days' },
];

export const seedBoostPlans = async (): Promise<void> => {
    await connectDatabase();

    try {
        let createdCount = 0;
        let skippedCount = 0;

        for (const plan of BOOST_PLANS) {
            const existing = await BoostPlanModel.findOne({ name: plan.name });
            if (existing) {
                logger.info(`⏭️  Skipped boost plan "${plan.name}" (already exists)`);
                skippedCount++;
                continue;
            }

            await BoostPlanModel.create(plan);
            logger.info(`✅ Created boost plan "${plan.name}"`);
            createdCount++;
        }

        logger.info(`🎉 Boost plan seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`);
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedBoostPlans()
        .then(() => process.exit(0))
        .catch((error) => {
            logger.error('❌ Boost plan seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
