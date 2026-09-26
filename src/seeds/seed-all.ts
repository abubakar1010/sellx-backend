import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { seedSuperAdmin } from './superAdmin.seed';
import { seedCategories } from './categories.seed';
import { seedProducts } from './products.seed';
import { seedBoostPlans } from './boost-plans.seed';
import { seedAdPackages } from './ads-packages.seed';
import { seedAdminNotifications } from './adminNotifications.seed';
import { seedPayments } from './payments.seed';
import { seedStories } from './stories.seed';
import { seedListingPackages } from './listing-packages.seed';
import { seedNotifications } from './notifications.seed';

const seeds = [
    { name: 'Super Admin', fn: seedSuperAdmin },
    { name: 'Categories', fn: seedCategories },
    { name: 'Boost Plans', fn: seedBoostPlans },
    { name: 'Ad Packages', fn: seedAdPackages },
    { name: 'Products', fn: seedProducts },
    { name: 'Admin Notifications', fn: seedAdminNotifications },
    { name: 'Payments', fn: seedPayments },
    { name: 'Stories', fn: seedStories },
    { name: 'Listing Packages', fn: seedListingPackages },
    { name: 'Notifications', fn: seedNotifications },
];

const seedAll = async (): Promise<void> => {
    console.log('🌱 Starting full database seed...\n');

    const results: { name: string; status: 'success' | 'failed'; error?: string }[] = [];

    for (const seed of seeds) {
        try {
            console.log(`▶ Seeding: ${seed.name}...`);
            await seed.fn();
            console.log(`✅ ${seed.name} seeded successfully.\n`);
            results.push({ name: seed.name, status: 'success' });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`❌ ${seed.name} failed: ${message}\n`);
            results.push({ name: seed.name, status: 'failed', error: message });
        }
    }

    console.log('\n--- Seed Summary ---');
    for (const r of results) {
        const icon = r.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${r.name}${r.error ? ` — ${r.error}` : ''}`);
    }

    const failed = results.filter((r) => r.status === 'failed');
    if (failed.length > 0) {
        console.log(`\n⚠️  ${failed.length}/${results.length} seeds failed.`);
    } else {
        console.log(`\n🎉 All ${results.length} seeds completed successfully!`);
    }
};

if (require.main === module) {
    seedAll()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal error during seeding:', err);
            process.exit(1);
        });
}

export { seedAll };
