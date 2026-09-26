/**
 * Reports the listings that the brand/model rules added alongside the spec
 * transcription would now reject.
 *
 *   npm run audit:vehicle-brands
 *
 * Read-only: it writes nothing. Run it before deploying the stricter schemas so
 * the size of the backfill is known rather than discovered by a user's failed edit.
 */
import type { Types } from 'mongoose';

import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { CategoryModel } from '@modules/categories/category.model';
import { Product } from '@modules/products/products.model';
import { CAR_BRANDS } from '@modules/products/data/car-brands.constants';
import { BOAT_BRANDS } from '@modules/products/data/boat-brands.constants';
import { MC_BRANDS } from '@modules/products/data/mc-brands.constants';
import { CARAVAN_BRANDS } from '@modules/products/data/caravan-brands.constants';
import { MOTORHOME_BRANDS } from '@modules/products/data/motorhome-brands.constants';
import { VehicleType } from '@modules/products/product.enum';

const OTHER_MODEL = 'Andre';

type Row = {
    _id: unknown;
    brand?: string;
    carModel?: string;
    vehicleType?: string;
    mileage?: number;
    transmission?: string;
};

const tally = (rows: Row[], allowed: Set<string>): Map<string, number> => {
    const bad = new Map<string, number>();
    for (const r of rows) {
        if (r.brand && !allowed.has(r.brand)) {
            bad.set(r.brand, (bad.get(r.brand) ?? 0) + 1);
        }
    }
    return bad;
};

const report = (label: string, total: number, bad: Map<string, number>): void => {
    const n = [...bad.values()].reduce((a, b) => a + b, 0);
    console.warn(`\n${label}: ${total} listing(s), ${n} would now be rejected`);
    if (!bad.size) return;
    for (const [brand, count] of [...bad].sort((a, b) => b[1] - a[1])) {
        console.warn(`    ${String(count).padStart(5)}  ${JSON.stringify(brand)}`);
    }
};

const run = async (): Promise<void> => {
    await connectDatabase();

    const slugs = ['car', 'boat', 'motorcycle'];
    const cats = (await CategoryModel.find({ slug: { $in: slugs } })
        .select('slug')
        .lean()) as unknown as { _id: Types.ObjectId; slug: string }[];
    const idOf = (slug: string): Types.ObjectId | undefined =>
        cats.find((c) => c.slug === slug)?._id;

    // --- cars, caravans, motorhomes all live under the `car` category ---
    const carRows = (await Product.find({ category: idOf('car') })
        .select('brand carModel vehicleType mileage transmission')
        .lean()) as Row[];

    const cars = carRows.filter((r) => r.vehicleType === VehicleType.PERSONBIL);
    const caravans = carRows.filter((r) => r.vehicleType === VehicleType.CAMPINGVOGN);
    const homes = carRows.filter((r) => r.vehicleType === VehicleType.BOBIL);

    report('Car brands', cars.length, tally(cars, new Set(Object.keys(CAR_BRANDS))));
    report('Caravan brands', caravans.length, tally(caravans, new Set(CARAVAN_BRANDS)));
    report('Motorhome brands', homes.length, tally(homes, new Set(MOTORHOME_BRANDS)));

    // --- brand/model pairing, cars only ---
    const pairBad = new Map<string, number>();
    for (const r of cars) {
        const models = CAR_BRANDS[r.brand as keyof typeof CAR_BRANDS] as readonly string[] | undefined;
        if (!models || !r.carModel || r.carModel === OTHER_MODEL) continue;
        if (!models.includes(r.carModel)) {
            const key = `${r.brand} / ${r.carModel}`;
            pairBad.set(key, (pairBad.get(key) ?? 0) + 1);
        }
    }
    report('Car brand/model pairs', cars.length, pairBad);

    // --- fields the car form tightened to match the spec ---
    const missingMileage = cars.filter((r) => r.mileage == null).length;
    report(
        'Car mileage (spec field 27, now required)',
        cars.length,
        missingMileage ? new Map([['(no mileage stored)', missingMileage]]) : new Map(),
    );

    const badGearbox = new Map<string, number>();
    for (const r of cars) {
        if (r.transmission && r.transmission !== 'manual' && r.transmission !== 'automatic') {
            badGearbox.set(r.transmission, (badGearbox.get(r.transmission) ?? 0) + 1);
        }
    }
    report('Car gearbox (spec field 13: manual or automatic only)', cars.length, badGearbox);

    const boats = (await Product.find({ category: idOf('boat') })
        .select('brand carModel')
        .lean()) as Row[];
    report('Boat brands', boats.length, tally(boats, new Set(BOAT_BRANDS)));

    const mcs = (await Product.find({ category: idOf('motorcycle') })
        .select('brand carModel')
        .lean()) as Row[];
    report('Motorcycle brands', mcs.length, tally(mcs, new Set(MC_BRANDS)));

    await disconnectDatabase();
};

run().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
