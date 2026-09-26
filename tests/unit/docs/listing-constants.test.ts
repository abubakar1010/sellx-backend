/**
 * `docs/frontend/listing-constants.ts` is generated from the backend source by
 * `scripts/print-listing-options.ts` and shipped to the client team as the option lists for the
 * listing forms — every brand, every car model, every enum with its Norwegian label.
 *
 * A generated file that nobody regenerates is worse than no file: the client renders a brand
 * list the server has since stopped accepting, and the 400 is unexplainable from the frontend.
 * This compares the checked-in file against a fresh run of the generator, so the only way to
 * change the option lists is to run `npm run docs:listing`.
 *
 * The generator is spawned rather than imported: `tsconfig.json` covers `src/**` and `tests/**`
 * only, so importing from `scripts/` would drag it into `npm run typecheck`. Spawning also
 * exercises the path `npm run docs:listing` actually takes. It costs about a second.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { FILTER_DEFINITIONS } from '@/modules/filter-options/filter-options.constants';
import { BOAT_BRANDS } from '@/modules/products/data/boat-brands.constants';
import { CAR_BRANDS } from '@/modules/products/data/car-brands.constants';
import { CARAVAN_BRANDS } from '@/modules/products/data/caravan-brands.constants';
import { MC_BRANDS } from '@/modules/products/data/mc-brands.constants';
import { MOTORHOME_BRANDS } from '@/modules/products/data/motorhome-brands.constants';
import { PRODUCT_CATEGORY_SLUGS } from '@/modules/products/schemas/registry';

const ROOT = path.resolve(__dirname, '../../..');
const GENERATED = path.join(ROOT, 'docs', 'frontend', 'listing-constants.ts');

const REGENERATE = 'run `npm run docs:listing` and commit the result';

const generate = (flag: '--typescript' | '--markdown'): string =>
    execFileSync(
        process.execPath,
        [
            '-r',
            'ts-node/register/transpile-only',
            '-r',
            'tsconfig-paths/register',
            path.join('scripts', 'print-listing-options.ts'),
            flag,
        ],
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );

jest.setTimeout(60_000);

describe('the generated client constants', () => {
    it('matches what the generator produces today', () => {
        const checkedIn = fs.readFileSync(GENERATED, 'utf8').replace(/\r\n/g, '\n');
        const fresh = generate('--typescript').replace(/\r\n/g, '\n');

        if (checkedIn !== fresh) {
            throw new Error(`docs/frontend/listing-constants.ts is stale — ${REGENERATE}`);
        }

        expect(checkedIn).toBe(fresh);
    });

    it('carries the option tables the markdown reference shows', () => {
        const md = fs
            .readFileSync(path.join(ROOT, 'docs', 'listing-forms-api.md'), 'utf8')
            .replace(/\r\n/g, '\n');
        const tables = generate('--markdown').replace(/\r\n/g, '\n').trimEnd();

        if (!md.includes(tables)) {
            throw new Error(`docs/listing-forms-api.md is stale — ${REGENERATE}`);
        }

        expect(md).toContain(tables);
    });
});

describe('the constants cover what the backend actually validates', () => {
    /** Read as text so a missing export fails loudly rather than becoming `undefined`. */
    const source = fs.readFileSync(GENERATED, 'utf8');

    it.each([
        ['CAR_BRAND_OPTIONS', Object.keys(CAR_BRANDS).length],
        ['CARAVAN_BRAND_OPTIONS', CARAVAN_BRANDS.length],
        ['BOAT_BRAND_OPTIONS', BOAT_BRANDS.length],
        ['MC_BRAND_OPTIONS', MC_BRANDS.length],
    ])('exports %s', (name, count) => {
        expect(source).toContain(`export const ${name}`);
        expect(count).toBeGreaterThan(0);
    });

    it('ships every car model the schema will accept', () => {
        const models = Object.values(CAR_BRANDS).flat();

        expect(source).toContain('export const CAR_MODELS_BY_BRAND');
        expect(models.length).toBeGreaterThan(1000);
    });

    it('reuses the caravan list for motorhomes rather than shipping a second copy', () => {
        expect(MOTORHOME_BRANDS).toBe(CARAVAN_BRANDS);
        expect(source).toContain('export const MOTORHOME_BRAND_OPTIONS = CARAVAN_BRAND_OPTIONS;');
    });

    it('maps every category slug the registry knows', () => {
        expect(source).toContain('export const CATEGORY_FILTER_SLUGS');

        for (const slug of PRODUCT_CATEGORY_SLUGS) {
            expect(source).toContain(`: '${slug}',`);
            expect(FILTER_DEFINITIONS[slug]).toBeDefined();
        }
    });
});
