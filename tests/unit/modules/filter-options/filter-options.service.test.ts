import { FilterOptionsService } from '@modules/filter-options/filter-options.service';

describe('FilterOptionsService', () => {
    const service = new FilterOptionsService();

    describe('getOptions', () => {
        it('returns filters and sorts for a known category', () => {
            const result = service.getOptions('car');
            expect(result.category).toBe('car');
            expect(result.filters.length).toBeGreaterThan(0);
            expect(result.sorts.length).toBeGreaterThan(0);
        });

        it('returns sellx filters as fallback for unknown category', () => {
            const result = service.getOptions('nonexistent');
            expect(result.category).toBe('nonexistent');
            expect(result.filters).toEqual(service.getOptions('sellx').filters);
        });

        it('includes brand filter with options for car category', () => {
            const result = service.getOptions('car');
            const brandFilter = result.filters.find(f => f.key === 'brand');
            expect(brandFilter).toBeDefined();
            expect(brandFilter!.inputType).toBe('single_select');
            expect(brandFilter!.options!.length).toBeGreaterThan(0);
        });

        it('includes model filter with brand dependency for car', () => {
            const result = service.getOptions('car');
            const modelFilter = result.filters.find(f => f.key === 'carModel');
            expect(modelFilter).toBeDefined();
            expect(modelFilter!.dependsOn).toEqual({ field: 'brand' });
        });

        /**
         * The car form has no condition field — only motorhomes and caravans do —
         * so an unscoped chip hid every passenger car the moment it was tapped.
         */
        it('scopes the car condition filter to motorhomes and caravans', () => {
            const conditionFilter = service
                .getOptions('car')
                .filters.find((f) => f.key === 'condition');

            expect(conditionFilter!.dependsOn).toEqual({
                field: 'vehicleType',
                values: ['bobil', 'campingvogn'],
            });
        });

        /** Colours are free text on the form, so there is no option list to render. */
        it.each([['bodyColor'], ['interiorColor']])('offers %s as a text input', (key) => {
            const colorFilter = service.getOptions('car').filters.find((f) => f.key === key);

            expect(colorFilter!.inputType).toBe('text');
            expect(colorFilter!.options).toBeUndefined();
        });

        it('leaves the condition filter unscoped where the form does collect it', () => {
            for (const slug of ['sellx', 'motorcycle', 'bike', 'book']) {
                const conditionFilter = service
                    .getOptions(slug)
                    .filters.find((f) => f.key === 'condition');

                expect(conditionFilter).toBeDefined();
                expect(conditionFilter!.dependsOn).toBeUndefined();
            }
        });

        /** No boat form collects a condition, so the chip could only return an empty list. */
        it('offers no condition filter for boats', () => {
            const filters = service.getOptions('boat').filters;

            expect(filters.find((f) => f.key === 'condition')).toBeUndefined();
        });

        it('keys the boat year range by its field name, like every other sheet', () => {
            const filters = service.getOptions('boat').filters;

            expect(filters.find((f) => f.key === 'manufacturedYear')).toBeDefined();
            expect(filters.find((f) => f.key === 'year')).toBeUndefined();
        });

        it('offers all three job ad types', () => {
            const filter = service.getOptions('job').filters.find((f) => f.key === 'employmentType');

            expect(filter!.options!.map((o) => o.value)).toEqual([
                'heltid',
                'deltid',
                'lederstilling',
            ]);
        });

        /** The job form stores `remoteWorkType`; the old boolean chip matched no job. */
        it('filters job remote work by the value the form stores', () => {
            const filters = service.getOptions('job').filters;
            const filter = filters.find((f) => f.key === 'remoteWorkType');

            expect(filters.find((f) => f.key === 'remoteWork')).toBeUndefined();
            expect(filter!.options!.map((o) => o.value)).toEqual([
                'delvis_hjemmearbeid',
                'kun_hjemmearbeid',
            ]);
        });

        /** Brand is free text on these forms, so a select would hide most listings. */
        it.each([['electronics'], ['furniture'], ['clothing']])(
            'offers the %s brand filter as a text input with suggestions',
            (slug) => {
                const filter = service.getOptions(slug).filters.find((f) => f.key === 'brand');

                expect(filter!.inputType).toBe('text');
                expect(filter!.options!.length).toBeGreaterThan(0);
            },
        );

        /** The spec names these as its examples, so the autocomplete has to offer them. */
        it.each([
            ['furniture', ['Ikea', 'Samsung', 'LG']],
            ['clothing', ['Adidas', 'Nike', 'Gant']],
            ['electronics', ['Sony', 'Apple']],
        ])('suggests the %s brands the spec names', (slug, expected) => {
            const filter = service.getOptions(slug).filters.find((f) => f.key === 'brand');
            const values = filter!.options!.map((o) => o.value);

            for (const brand of expected) {
                expect(values).toContain(brand);
            }
        });

        it('keeps the car brand filter a select, since that list is validated', () => {
            const filter = service.getOptions('car').filters.find((f) => f.key === 'brand');

            expect(filter!.inputType).toBe('single_select');
        });

        it('includes moped/motorcycle type dependencies for motorcycle', () => {
            const result = service.getOptions('motorcycle');
            const mopedFilter = result.filters.find(f => f.key === 'mopedType');
            const mcFilter = result.filters.find(f => f.key === 'motorcycleType');
            expect(mopedFilter!.dependsOn).toEqual({ field: 'mcType', value: 'moped' });
            expect(mcFilter!.dependsOn).toEqual({ field: 'mcType', value: 'motorsykkel' });
        });

        it('returns default sort flagged for each category', () => {
            const categories = ['sellx', 'car', 'property', 'boat', 'motorcycle', 'bike', 'job', 'book', 'furniture', 'electronics', 'clothing'];
            for (const cat of categories) {
                const result = service.getOptions(cat);
                const defaultSort = result.sorts.find(s => s.isDefault);
                expect(defaultSort).toBeDefined();
                expect(defaultSort!.key).toBe('relevance');
            }
        });

        it('excludes price sorts for job category', () => {
            const result = service.getOptions('job');
            const priceSorts = result.sorts.filter(s => s.key.includes('price'));
            expect(priceSorts.length).toBe(0);
        });

        it('includes year/mileage sorts for car category', () => {
            const result = service.getOptions('car');
            const sortKeys = result.sorts.map(s => s.key);
            expect(sortKeys).toContain('manufacturedYear');
            expect(sortKeys).toContain('-manufacturedYear');
            expect(sortKeys).toContain('mileage');
            expect(sortKeys).toContain('-mileage');
        });

        it('includes length/knots sorts for boat category', () => {
            const result = service.getOptions('boat');
            const sortKeys = result.sorts.map(s => s.key);
            expect(sortKeys).toContain('-length');
            expect(sortKeys).toContain('length');
            expect(sortKeys).toContain('-maxSpeedKnots');
        });

        it('includes area sorts for property category', () => {
            const result = service.getOptions('property');
            const sortKeys = result.sorts.map(s => s.key);
            expect(sortKeys).toContain('usableArea');
            expect(sortKeys).toContain('-usableArea');
        });

        it('returns all 11 categories with valid filter definitions', () => {
            const categories = ['sellx', 'car', 'property', 'boat', 'motorcycle', 'bike', 'job', 'book', 'furniture', 'electronics', 'clothing'];
            for (const cat of categories) {
                const result = service.getOptions(cat);
                expect(result.filters.length).toBeGreaterThan(0);
                expect(result.sorts.length).toBeGreaterThan(0);
                for (const filter of result.filters) {
                    expect(filter.key).toBeTruthy();
                    expect(filter.label.en).toBeTruthy();
                    expect(filter.label.no).toBeTruthy();
                    expect(filter.inputType).toBeTruthy();
                }
            }
        });
    });

    describe('getModelsForBrand', () => {
        it('returns models for a known car brand', () => {
            const models = service.getModelsForBrand('car', 'Audi');
            expect(models.length).toBeGreaterThan(0);
            expect(models).toContain('A3');
            expect(models).toContain('Q5');
        });

        it('returns empty array for unknown brand', () => {
            const models = service.getModelsForBrand('car', 'NonexistentBrand');
            expect(models).toEqual([]);
        });

        it('returns empty array for category without brand-model map', () => {
            const models = service.getModelsForBrand('furniture', 'Ikea');
            expect(models).toEqual([]);
        });
    });
});
