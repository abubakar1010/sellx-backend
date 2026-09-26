import { config } from '@/config';
import { ProductCategory } from '@/modules/products/product.enum';
import { Product } from '@/modules/products/products.model';
import { CategoryModel } from '@/modules/categories/category.model';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { UserModel } from '@/modules/user/user.model';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import { UPLOAD_DIR } from '@/infrastructure/storage/multer.config';

const downloadImage = (url: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const follow = (url: string) => {
            https.get(url, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    follow(res.headers.location);
                    return;
                }
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            }).on('error', reject);
        };
        follow(url);
    });
};

const downloadSeedImages = async (): Promise<{ url: string; type: string }[]> => {
    fs.mkdirSync(path.join(UPLOAD_DIR, 'seeds'), { recursive: true });
    const media: { url: string; type: string }[] = [];

    for (let i = 1; i <= 2; i++) {
        const filename = `seed-${randomUUID()}.jpg`;
        const dest = path.join(UPLOAD_DIR, 'seeds', filename);
        // picsum.photos provides real stock photos, each seed ID gives a different image
        const imageUrl = `https://picsum.photos/seed/sellx-${Date.now()}-${i}/640/480`;
        try {
            await downloadImage(imageUrl, dest);
            media.push({ url: `/uploads/seeds/${filename}`, type: 'image' });
            logger.info(`📷 Downloaded seed image: ${filename}`);
        } catch (err) {
            logger.warn(`⚠️  Failed to download seed image ${i}, skipping`);
        }
    }

    return media;
};

const LOCATION_OSLO = {
    address: 'Karl Johans gate 1',
    city: 'Oslo',
    country: 'Norway',
    coordinates: { type: 'Point' as const, coordinates: [10.7522, 59.9139] },
};

const LOCATION_BERGEN = {
    address: 'Torgallmenningen 1',
    city: 'Bergen',
    country: 'Norway',
    coordinates: { type: 'Point' as const, coordinates: [5.7332, 60.3913] },
};

const LOCATION_TRONDHEIM = {
    address: 'Nidarosdomen 1',
    city: 'Trondheim',
    country: 'Norway',
    coordinates: { type: 'Point' as const, coordinates: [10.3955, 63.4305] },
};

const SEED_PRODUCTS: Record<string, any[]> = {
    Car: [
        {
            title: 'Toyota Corolla Hybrid 2023',
            description: 'Excellent condition, single owner, full service history, low mileage',
            price: 285000,
            vehicleType: 'personbil',
            taxClass: 'personbil',
            driveType: 'forhjulsdrift',
            brand: 'Toyota',
            carModel: 'Corolla',
            variant: 'Hybrid',
            condition: 'used',
            manufacturedYear: 2023,
            registrationYear: 2023,
            seats: 5,
            doors: 4,
            fuel: 'elektrisitet_bensin',
            horsepower: 122,
            transmission: 'automatic',
            bodyType: 'sedan',
            bodyColor: 'White',
            mileage: 15000,
            hasDamage: false,
            hasRepairs: false,
        },
    ],
    Property: [
        {
            title: 'Modern 2-Bedroom Apartment in Oslo',
            description: 'Beautiful modern apartment with balcony and city view, perfect for young professionals',
            price: 4200000,
            condition: 'used',
            type: 'leilighet',
            usableArea: 75,
            internalArea: 68,
            balconyArea: 7,
            yearBuilt: 2020,
            bedrooms: 2,
            totalRooms: 3,
            floorLevel: '5',
            ownershipType: 'eier_selveier',
        },
    ],
    Boat: [
        {
            title: 'Princess V48 Yacht',
            description: 'Luxury yacht in excellent condition, perfect for coastal cruising',
            price: 8500000,
            brand: 'Princess',
            type: 'yacht',
            year: 2022,
            condition: 'used',
            length: 14.8,
            width: 4.3,
            seats: 8,
            fuel: 'diesel',
            horsepower: 1200,
            bodyColor: 'White',
        },
    ],
    Motorcycle: [
        {
            title: 'Harley-Davidson Street Glide',
            description: 'Low mileage, well maintained, perfect for touring',
            price: 320000,
            brand: 'Harley-Davidson',
            condition: 'used',
            mcType: 'motorsykkel',
            motorcycleType: 'touring',
            bodyColor: 'Black',
            fuel: 'bensin',
            horsepower: 90,
        },
    ],
    Bike: [
        {
            title: 'Specialized Turbo Vado Electric Bike',
            description: 'Electric mountain bike, 250W motor, 80km range, barely used',
            price: 28000,
            brand: 'Specialized',
            condition: 'used',
            bikeType: 'elektriske',
        },
    ],
    Job: [
        {
            title: 'Senior Full-Stack Developer Wanted',
            description: 'Looking for experienced developer for our Oslo office. Remote work possible. Competitive salary and benefits.',
            price: 0,
            employmentType: 'heltid',
            contractType: 'fast',
            sector: 'privat',
            industry: 'IT og teknologi',
            jobTitle: 'Senior Full-Stack Developer',
            numberOfPositions: 1,
            employerName: 'TechStart Norway',
        },
    ],
    Electronics: [
        {
            title: 'MacBook Pro 14" M3 Pro - 512GB',
            description: 'Brand new, sealed, original packaging, 18-month Apple warranty',
            price: 22999,
            brand: 'Apple',
            condition: 'new',
        },
    ],
    Book: [
        {
            title: 'Clean Code by Robert C. Martin',
            description: 'Essential reading for software developers, excellent condition with minimal highlighting',
            price: 350,
            brand: 'Prentice Hall',
            condition: 'used',
        },
    ],
    Furniture: [
        {
            title: 'Modern L-Shaped Gray Sofa',
            description: '3-year-old gray fabric sofa, excellent condition, washable covers',
            price: 12000,
            brand: 'IKEA',
            condition: 'used',
        },
    ],
    Clothing: [
        {
            title: 'Canada Goose Expedition Parka - Size L',
            description: 'Worn twice, like new condition, black color',
            price: 4500,
            brand: 'Canada Goose',
            condition: 'used',
        },
    ],
    SellX: [
        {
            title: 'Moving Sale - Complete Household Items',
            description: 'Moving sale! TV, furniture, kitchenware, books - everything must go',
            price: 15000,
            condition: 'used',
        },
    ],
};

const getLocation = (index: number) => {
    const locations = [LOCATION_OSLO, LOCATION_BERGEN, LOCATION_TRONDHEIM];
    return locations[index % locations.length];
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
    Car: 'car',
    Property: 'property',
    Boat: 'boat',
    Motorcycle: 'motorcycle',
    Bike: 'bike',
    Job: 'job',
    Electronics: 'electronics',
    Book: 'book',
    Furniture: 'furniture',
    Clothing: 'clothing',
    SellX: 'sellx',
};

export const seedProducts = async (): Promise<void> => {
    await connectDatabase();

    try {
        const user = await UserModel.findOne({ role: { $in: ['user', 'superAdmin'] }, isDeleted: false });
        if (!user) {
            throw new Error('No user found. Please run user seeds first.');
        }

        logger.info('📷 Downloading seed images...');
        const seedMedia = await downloadSeedImages();
        if (seedMedia.length === 0) {
            throw new Error('Failed to download any seed images. Check network connectivity.');
        }

        const categories = await CategoryModel.find({ isActive: true }).lean();
        const categoryBySlug: Record<string, string> = {};
        for (const cat of categories) {
            categoryBySlug[cat.slug] = String(cat._id);
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const [enumKey, products] of Object.entries(SEED_PRODUCTS)) {
            const slug = CATEGORY_SLUG_MAP[enumKey] as string;
            const categoryId = categoryBySlug[slug];
            if (!categoryId) {
                logger.warn(`⚠️  Category not found for slug "${slug}", skipping ${enumKey} products`);
                continue;
            }

            for (const seed of products) {
                const existing = await Product.findOne({ title: seed.title, isDeleted: false });
                if (existing) {
                    logger.info(`⏭️  Skipped product "${seed.title}" (already exists)`);
                    skippedCount++;
                    continue;
                }

                const productData = {
                    user: user._id,
                    category: categoryId,
                    title: seed.title,
                    description: seed.description,
                    price: seed.price,
                    currency: 'NOK',
                    transactionType: seed.price === 0 ? 'give_away' : 'for_sell',
                    media: seedMedia,
                    location: getLocation(createdCount + skippedCount),
                    contacts: user.phone ? [{ type: 'phone', value: user.phone }] : [{ type: 'email', value: user.email }],
                    status: 'active',
                    ...seed,
                };

                delete productData.title;
                delete productData.description;
                delete productData.price;
                const finalData = { ...seed, ...productData };

                await Product.create([finalData]);

                logger.info(`✅ Created product "${seed.title}"`);
                createdCount++;
            }
        }

        logger.info(
            `🎉 Product seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
        );
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedProducts()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Product seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
