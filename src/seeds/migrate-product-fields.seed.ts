import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { CategoryModel } from '@/modules/categories/category.model';
import { Product } from '@/modules/products/products.model';
import { BoatFuelType, CarFuelType, FloorLevel, McFuelType } from '@/modules/products/product.enum';

/**
 * Brings two stored fields onto the values the listing forms and filters use.
 *
 * - `floorLevel` was a Number, but the spec's floor list includes "kjeller" and
 *   "over_8", so it is now a string.
 * - `fuel` was validated against petrol/diesel/electric/..., while the spec and
 *   every filter use the Norwegian sets. The target set differs per category, so
 *   the mapping is joined on the product's category slug.
 *
 * Re-running is safe: rows already holding a current value are not selected.
 */

/** Old `FuelType` value -> new value, per category. `null` means drop the field. */
const FUEL_MAP: Record<string, Record<string, string | null>> = {
    car: {
        petrol: CarFuelType.BENSIN,
        electric: CarFuelType.ELEKTRISITET,
        hybrid: CarFuelType.ELEKTRISITET_BENSIN,
        cng: CarFuelType.GASS,
        other: null,
    },
    boat: {
        petrol: BoatFuelType.BENSIN,
        electric: BoatFuelType.ELEKTRISITET,
        hybrid: BoatFuelType.HYBRID,
        cng: BoatFuelType.ANDRE,
        other: BoatFuelType.ANDRE,
    },
    motorcycle: {
        petrol: McFuelType.BENSIN,
        electric: McFuelType.ELEKTRISITET,
        hybrid: McFuelType.ELEKTRISITET,
        cng: null,
        other: null,
    },
};

/** 'diesel' is valid before and after, so it is intentionally not listed. */
const LEGACY_FUEL_VALUES = ['petrol', 'electric', 'hybrid', 'cng', 'other'];

const toFloorLevel = (value: number): string => {
    if (value <= 0) return FloorLevel.KJELLER;
    if (value > 8) return FloorLevel.ABOVE_EIGHTH;
    return String(value);
};

export const migrateProductFields = async (dryRun = false): Promise<void> => {
    await connectDatabase();

    try {
        const categories = await CategoryModel.find({}).select('slug').lean();
        const slugById = new Map(categories.map((c) => [String(c._id), c.slug]));

        // --- floorLevel: Number -> String ---
        const products = Product.collection;

        const floorDocs = await products
            .find({ floorLevel: { $type: ['double', 'int', 'long'] } }, { projection: { floorLevel: 1 } })
            .toArray();

        for (const doc of floorDocs) {
            const next = toFloorLevel(Number(doc.floorLevel));
            logger.info(`  floorLevel ${String(doc._id)}`, { from: doc.floorLevel, to: next });

            if (!dryRun) {
                await products.updateOne({ _id: doc._id }, { $set: { floorLevel: next } });
            }
        }

        logger.info(
            `${dryRun ? '(dry-run) ' : ''}✅ floorLevel: ${floorDocs.length} record(s) migrated`,
        );

        // --- fuel: English -> Norwegian, per category ---
        const fuelDocs = await products
            .find({ fuel: { $in: LEGACY_FUEL_VALUES } }, { projection: { fuel: 1, category: 1 } })
            .toArray();

        let fuelMigrated = 0;
        let fuelSkipped = 0;

        for (const doc of fuelDocs) {
            const slug = slugById.get(String(doc.category));
            const mapping = slug ? FUEL_MAP[slug] : undefined;

            if (!mapping) {
                logger.warn(`  fuel ${String(doc._id)} skipped: no mapping for category "${slug ?? 'unknown'}"`);
                fuelSkipped += 1;
                continue;
            }

            const next = mapping[String(doc.fuel)];
            logger.info(`  fuel ${String(doc._id)} (${slug})`, {
                from: doc.fuel,
                to: next ?? '(removed)',
            });

            if (!dryRun) {
                await products.updateOne(
                    { _id: doc._id },
                    next === null || next === undefined
                        ? { $unset: { fuel: '' } }
                        : { $set: { fuel: next } },
                );
            }
            fuelMigrated += 1;
        }

        logger.info(
            `${dryRun ? '(dry-run) ' : ''}✅ fuel: ${fuelMigrated} record(s) migrated, ${fuelSkipped} skipped`,
        );
    } finally {
        await disconnectDatabase();
    }
};

// CLI execution
if (require.main === module) {
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) logger.info('Running in --dry-run mode: no writes will be made.');

    void migrateProductFields(dryRun)
        .then(() => {
            logger.info('🎉 Product field migration finished successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Product field migration failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
