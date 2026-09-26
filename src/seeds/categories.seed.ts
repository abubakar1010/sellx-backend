import fs from 'node:fs';
import path from 'node:path';

import { CategoryModel } from '@/modules/categories/category.model';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { UPLOAD_DIRECTORY } from '@/infrastructure/storage/local-storage';

const generateSlug = (title: string): string =>
    title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ICONS_SOURCE_DIR = __dirname;
const ICONS_DEST_DIR = path.join(UPLOAD_DIRECTORY, 'categories');

const CATEGORIES: {
    title: string;
    description: string;
    iconFile: string;
}[] = [
    { title: 'Car', description: 'Cars, SUVs, and other vehicles for sale or rent', iconFile: 'Cars.png' },
    { title: 'Property', description: 'Houses, apartments, and commercial properties', iconFile: 'Properties.png' },
    { title: 'Boat', description: 'Boats, yachts, and watercraft for sale or rent', iconFile: 'Boats.png' },
    { title: 'Motorcycle', description: 'Motorcycles and scooters for sale or rent', iconFile: 'MotorCycles.png' },
    { title: 'Bike', description: 'Bicycles and e-bikes for sale or rent', iconFile: 'Bicycles.png' },
    { title: 'Job', description: 'Job listings and employment opportunities', iconFile: 'Jobs.png' },
    { title: 'Electronics', description: 'Phones, computers, gadgets, and consumer electronics', iconFile: 'Electronics.png' },
    { title: 'Book', description: 'Books, textbooks, and educational materials', iconFile: 'Books.png' },
    { title: 'Furniture', description: 'Home and office furniture for sale or rent', iconFile: 'Furniture.png' },
    { title: 'Clothing', description: 'Clothing, shoes, and fashion accessories', iconFile: 'Clothing.png' },
    { title: 'SellX', description: 'Miscellaneous items and services', iconFile: 'Sellx.png' },
];

/**
 * Copy category icon files from source to uploads/categories directory.
 */
const copyIcons = (): void => {
    fs.mkdirSync(ICONS_DEST_DIR, { recursive: true });

    for (const cat of CATEGORIES) {
        const src = path.join(ICONS_SOURCE_DIR, cat.iconFile);
        const dest = path.join(ICONS_DEST_DIR, cat.iconFile);

        if (!fs.existsSync(src)) {
            logger.warn(`Icon file not found: ${src}`);
            continue;
        }

        fs.copyFileSync(src, dest);
    }

    logger.info(`Copied category icons to ${ICONS_DEST_DIR}`);
};

export const seedCategories = async (): Promise<void> => {
    await connectDatabase();

    try {
        copyIcons();

        let createdCount = 0;
        let skippedCount = 0;

        for (const cat of CATEGORIES) {
            const slug = generateSlug(cat.title);

            const existing = await CategoryModel.findOne({
                $or: [{ title: cat?.title }, { slug }],
            });

            if (existing) {
                const newThumbnail = `/uploads/categories/${cat.iconFile}`;
                if (existing.thumbnail !== newThumbnail) {
                    existing.thumbnail = newThumbnail;
                    await existing.save();
                    logger.info(`Updated thumbnail for category "${cat.title}"`);
                } else {
                    logger.info(`Skipped category "${cat.title}" (already exists)`);
                }
                skippedCount++;
                continue;
            }

            await CategoryModel.create({
                title: cat.title,
                slug,
                description: cat.description,
                thumbnail: `/uploads/categories/${cat.iconFile}`,
                sortOrder: CATEGORIES.indexOf(cat) + 1,
            });

            logger.info(`Created category "${cat.title}"`);
            createdCount++;
        }

        logger.info(
            `Category seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`,
        );
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedCategories()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Category seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
