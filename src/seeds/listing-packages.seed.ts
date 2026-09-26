import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { CURRENCY } from '@/core/constants/currency';
import { CategoryModel } from '@/modules/categories/category.model';
import { UserModel } from '@/modules/user/user.model';
import { StoreModel } from '@/modules/stores/store.model';
import { ListingPackageModel } from '@/modules/listing-package/listing-package.model';
import { ListingPurchaseModel } from '@/modules/listing-purchase/listing-purchase.model';

const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

interface PackageDef {
    name: string;
    durationHours: number;
    price: number;
    maxListings: number;
    currency: string;
    validityDays: number;
}

// Packages to create per category
const PACKAGE_TIERS: PackageDef[] = [
    { name: '24h Basic', durationHours: 24, price: 59, maxListings: 1, currency: CURRENCY, validityDays: 30 },
    { name: '7-Day Standard', durationHours: 168, price: 159, maxListings: 1, currency: CURRENCY, validityDays: 30 },
    { name: '30-Day Premium', durationHours: 720, price: 309, maxListings: 3, currency: CURRENCY, validityDays: 60 },
];

// Category-specific price multipliers (some categories cost more)
const CATEGORY_MULTIPLIERS: Record<string, number> = {
    Car: 5,
    Property: 8,
    Boat: 4,
    Motorcycle: 3,
    Electronics: 1,
    Furniture: 1,
    Clothing: 1,
    Book: 0.5,
    Bike: 1,
    Job: 2,
    SellX: 1,
};

export const seedListingPackages = async (): Promise<void> => {
    await connectDatabase();

    try {
        // ── 1. Get all active categories ─────────────────────────────
        const categories = await CategoryModel.find({ isActive: true }).lean();
        if (!categories.length) {
            throw new Error('No categories found. Run "seed:categories" first.');
        }
        logger.info(`Found ${categories.length} active categories`);

        // ── 2. Seed listing packages per category ────────────────────
        let pkgCreated = 0;
        let pkgSkipped = 0;

        for (const cat of categories) {
            const multiplier = CATEGORY_MULTIPLIERS[cat.title as string] ?? 1;

            for (const tier of PACKAGE_TIERS) {
                const fullName = `${cat.title} ${tier.name}`;
                const exists = await ListingPackageModel.findOne({ name: fullName });
                if (exists) {
                    pkgSkipped++;
                    continue;
                }

                await ListingPackageModel.create({
                    name: fullName,
                    category: cat._id,
                    durationHours: tier.durationHours,
                    price: Math.round(tier.price * multiplier),
                    maxListings: tier.maxListings,
                    currency: tier.currency,
                    validityDays: tier.validityDays,
                    isActive: true,
                });
                pkgCreated++;
            }
        }
        logger.info(`Listing packages - created: ${pkgCreated}, skipped: ${pkgSkipped}`);

        // ── 3. Seed a listing purchase for the first user ────────────
        const user = await UserModel.findOne({ isDeleted: false }).lean();
        if (!user) {
            logger.warn('No user found, skipping listing purchase seed');
            return;
        }

        const store = await StoreModel.findOne({ user: user._id, isActive: true }).lean();

        const existingPurchase = await ListingPurchaseModel.findOne({ user: user._id, status: 'active' }).lean();
        if (existingPurchase) {
            logger.info('Listing purchase already exists, skipping');
            return;
        }

        // Pick the first category's 24h package
        const seedPkg = await ListingPackageModel.findOne({ name: `${categories[0]!.title} 24h Basic` }).lean();
        if (!seedPkg) {
            logger.warn('No seed package found, skipping listing purchase');
            return;
        }

        const cat = categories[0]!;

        await ListingPurchaseModel.create({
            user: user._id,
            ...(store ? { store: store._id } : {}),
            category: cat._id,
            listingPackage: seedPkg._id,
            packageSnapshot: {
                name: seedPkg.name,
                category: String(cat._id),
                categoryName: cat.title,
                durationHours: seedPkg.durationHours,
                price: seedPkg.price,
                maxListings: 1,
                currency: seedPkg.currency ?? CURRENCY,
                validityDays: seedPkg.validityDays ?? 30,
            },
            listingsUsed: 0,
            status: 'active',
            purchasedAt: new Date(),
            expiresAt: daysFromNow(30),
        });

        logger.info(`Created seed listing purchase for "${cat.title}" category (maxListings: 1)`);
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedListingPackages()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Listing packages seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
