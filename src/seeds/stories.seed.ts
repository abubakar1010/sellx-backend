import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { UserModel } from '@/modules/user/user.model';
import { StoreModel } from '@/modules/stores/store.model';
import { Product } from '@/modules/products/products.model';
import { CategoryModel } from '@/modules/categories/category.model';
import { StoryModel, StoryPackageModel } from '@/modules/stories/story.model';
import { StoryPurchaseModel } from '@/modules/story-purchase/story-purchase.model';
import { TransactionType, Condition, ProductStatus } from '@/modules/products/product.enum';

const hoursFromNow = (hours: number): Date => new Date(Date.now() + hours * 60 * 60 * 1000);
const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const STORY_PACKAGES = [
    { name: '24h Basic Story', description: '24-hour story boost', durationHours: 24, price: 4.99, maxStories: 1, currency: 'USD', validityDays: 30 },
    { name: '48h Standard Story', description: '48-hour story boost', durationHours: 48, price: 7.99, maxStories: 3, currency: 'USD', validityDays: 30 },
    { name: '72h Premium Story', description: '72-hour story boost', durationHours: 72, price: 9.99, maxStories: 5, currency: 'USD', validityDays: 60 },
];

export const seedStories = async (): Promise<void> => {
    await connectDatabase();

    try {
        // ── 1. Ensure a user exists ──────────────────────────────────────
        const user = await UserModel.findOne({ isDeleted: false }).lean();
        if (!user) {
            throw new Error('No user found. Run "seed:super-admin" first.');
        }
        logger.info(`Using user: ${user.firstName} ${user.lastName} (${user.email})`);

        // ── 2. Ensure a category exists (needed for Store) ───────────────
        const category = await CategoryModel.findOne({ isActive: true }).lean();
        if (!category) {
            throw new Error('No category found. Run "seed:categories" first.');
        }
        logger.info(`Using category: ${category.title}`);

        // ── 3. Ensure a store exists for this user ───────────────────────
        let store = await StoreModel.findOne({ user: user._id, isActive: true }).lean();
        if (!store) {
            const created = await StoreModel.create({
                user: user._id,
                name: 'Seed Demo Store',
                slug: `seed-demo-store-${Date.now()}`,
                description: 'Auto-created store for story seed data',
                category: category._id,
                contacts: [{ type: 'email', value: user.email }],
                status: 'active',
                isActive: true,
            });
            store = created.toObject();
            logger.info('Created seed store: "Seed Demo Store"');
        } else {
            logger.info(`Using existing store: "${store.name}"`);
        }

        const storeId = store._id;

        // ── 4. Ensure products exist for this user ───────────────────────
        let products = await Product.find({ user: user._id, isDeleted: false }).limit(3).lean();
        if (products.length === 0) {
            const productDefs = [
                { title: 'Story Seed - Electronics Item', price: 1999, description: 'Sample electronics for story' },
                { title: 'Story Seed - Furniture Item', price: 4500, description: 'Sample furniture for story' },
                { title: 'Story Seed - Clothing Item', price: 299, description: 'Sample clothing for story' },
            ];
            for (const def of productDefs) {
                const created = await Product.create({
                    user: user._id,
                    store: storeId,
                    category: category._id,
                    title: def.title,
                    description: def.description,
                    price: def.price,
                    currency: 'NOK',
                    transactionType: TransactionType.FOR_SELL,
                    media: [{ url: '/uploads/seeds/seed-13be6bb4-12fc-4954-91b9-19a66d708519.jpg', type: 'image' }],
                    location: {
                        address: 'Karl Johans gate 1',
                        city: 'Oslo',
                        country: 'Norway',
                        coordinates: { type: 'Point', coordinates: [10.7522, 59.9139] },
                    },
                    contacts: [{ type: 'email', value: user.email }],
                    status: ProductStatus.ACTIVE,
                    condition: Condition.USED,
                });
                products.push(created.toObject());
            }
            logger.info(`Created ${productDefs.length} seed products for stories`);
        } else {
            logger.info(`Using ${products.length} existing product(s)`);
        }

        // ── 5. Seed story packages ──────────────────────────────────────
        let pkgCreated = 0;
        let pkgSkipped = 0;
        for (const pkg of STORY_PACKAGES) {
            const exists = await StoryPackageModel.findOne({ name: pkg.name });
            if (exists) {
                pkgSkipped++;
                continue;
            }
            await StoryPackageModel.create(pkg);
            pkgCreated++;
        }
        logger.info(`Story packages - created: ${pkgCreated}, skipped: ${pkgSkipped}`);

        // ── 5b. Seed a story purchase ───────────────────────────────────
        const seedPkg = await StoryPackageModel.findOne({ name: '24h Basic Story' }).lean();
        let seedPurchase = await StoryPurchaseModel.findOne({ user: user._id, status: 'active' }).lean();
        if (!seedPurchase && seedPkg) {
            const created = await StoryPurchaseModel.create({
                user: user._id,
                store: storeId,
                storyPackage: seedPkg._id,
                packageSnapshot: {
                    name: seedPkg.name,
                    description: seedPkg.description,
                    durationHours: seedPkg.durationHours,
                    price: seedPkg.price,
                    maxStories: 10,
                    currency: seedPkg.currency ?? 'USD',
                    validityDays: seedPkg.validityDays ?? 30,
                },
                storiesUsed: 0,
                status: 'active',
                purchasedAt: new Date(),
                expiresAt: daysFromNow(30),
            });
            seedPurchase = created.toObject();
            logger.info('Created seed story purchase');
        } else {
            logger.info('Using existing story purchase (or no package found)');
        }
        const purchaseId = seedPurchase?._id;

        // ── 6. Seed stories ─────────────────────────────────────────────
        const product0 = products[0];
        const product1 = products[1];
        const product2 = products[2];

        const SEED_STORIES: Array<{
            title: string;
            media: string;
            expireIn: 24 | 48 | 72;
            expiresAt: Date;
            product?: typeof product0;
            storeRef?: typeof storeId;
            texts: Array<{ text: string; style: Record<string, unknown> }>;
            viewCount: number;
            views: Array<{ user: typeof user._id; viewedAt: Date }>;
        }> = [
            {
                title: 'Check out our new arrivals!',
                media: '/uploads/seeds/seed-13be6bb4-12fc-4954-91b9-19a66d708519.jpg',
                expireIn: 24,
                expiresAt: hoursFromNow(20),
                product: product0,
                storeRef: storeId,
                texts: [
                    {
                        text: 'Check out our new arrivals!',
                        style: {
                            fontSize: 24, color: '#ffffff', fontWeight: 'bold',
                            textAlign: 'center', position: { x: 50, y: 30 },
                        },
                    },
                ],
                viewCount: 12,
                views: [{ user: user._id, viewedAt: new Date() }],
            },
            {
                title: 'Summer sale - up to 50% off!',
                media: '/uploads/seeds/seed-5e8bbb5c-add4-4cef-af63-9d1e7ad31280.jpg',
                expireIn: 48,
                expiresAt: hoursFromNow(40),
                product: product1,
                storeRef: storeId,
                texts: [
                    {
                        text: 'Summer sale - up to 50% off!',
                        style: {
                            fontSize: 28, color: '#FFD700', fontWeight: 'bold',
                            textAlign: 'center', position: { x: 50, y: 50 },
                        },
                    },
                ],
                viewCount: 34,
                views: [{ user: user._id, viewedAt: new Date() }],
            },
            {
                title: 'New in store today',
                media: '/uploads/seeds/seed-13be6bb4-12fc-4954-91b9-19a66d708519.jpg',
                expireIn: 72,
                expiresAt: hoursFromNow(65),
                product: product2,
                storeRef: storeId,
                texts: [
                    {
                        text: 'New in store today',
                        style: {
                            fontSize: 20, color: '#ffffff', fontWeight: 'normal',
                            textAlign: 'left', position: { x: 10, y: 80 },
                        },
                    },
                ],
                viewCount: 5,
                views: [],
            },
            {
                title: 'Story without product link',
                media: '/uploads/seeds/seed-5e8bbb5c-add4-4cef-af63-9d1e7ad31280.jpg',
                expireIn: 24,
                expiresAt: hoursFromNow(18),
                storeRef: storeId,
                texts: [
                    {
                        text: 'Just sharing vibes today',
                        style: {
                            fontSize: 18, color: '#00BFFF', fontWeight: 'normal',
                            textAlign: 'center', position: { x: 50, y: 60 },
                        },
                    },
                ],
                viewCount: 8,
                views: [{ user: user._id, viewedAt: new Date() }],
            },
            {
                title: 'Story without store',
                media: '/uploads/seeds/seed-13be6bb4-12fc-4954-91b9-19a66d708519.jpg',
                expireIn: 24,
                expiresAt: hoursFromNow(22),
                product: product0,
                texts: [
                    {
                        text: 'Personal listing spotlight',
                        style: {
                            fontSize: 22, color: '#ffffff', fontWeight: 'bold',
                            textAlign: 'center', position: { x: 50, y: 40 },
                        },
                    },
                ],
                viewCount: 2,
                views: [],
            },
        ];

        let storyCreated = 0;
        let storySkipped = 0;

        for (const seed of SEED_STORIES) {
            const exists = await StoryModel.findOne({
                user: user._id,
                'texts.0.text': seed.texts[0]!.text,
                isDeleted: false,
            });
            if (exists) {
                logger.info(`Skipped story "${seed.title}" (already exists)`);
                storySkipped++;
                continue;
            }

            await StoryModel.create({
                user: user._id,
                store: seed.storeRef,
                purchase: purchaseId,
                media: seed.media,
                texts: seed.texts,
                product: seed.product?._id,
                expireIn: seed.expireIn,
                expiresAt: seed.expiresAt,
                viewCount: seed.viewCount,
                views: seed.views,
                isDeleted: false,
            });

            logger.info(`Created story "${seed.title}"`);
            storyCreated++;
        }

        logger.info(
            `Story seeding completed. Created: ${storyCreated}, Skipped: ${storySkipped}`,
        );
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedStories()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Story seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
