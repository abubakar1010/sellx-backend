import { getProductSchema } from '../../../../src/modules/products/schemas/registry';

const CATEGORY_ID = '507f1f77bcf86cd799439011';

const location = {
    address: 'Karl Johans gate 1',
    city: 'Oslo',
    country: 'Norge',
    latitude: 59.9139,
    longitude: 10.7522,
};

/** Field paths reported by the schema, so a test can assert *which* field failed. */
const failedFields = (slug: string, body: unknown): string[] => {
    const result = getProductSchema(slug).safeParse(body);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

const parse = (slug: string, body: unknown) => getProductSchema(slug).safeParse(body);

describe('per-category listing validation', () => {
    describe('simple categories', () => {
        const body = {
            category: CATEGORY_ID,
            title: 'Rolex Submariner',
            description: 'Boxed, papers included, barely worn.',
            price: 95000,
            brand: 'Rolex',
            condition: 'used',
            location,
        };

        it('accepts a complete SellX listing and defaults to selling', () => {
            const result = parse('sellx', body);

            expect(result.success).toBe(true);
            if (result.success) {
                expect((result.data as Record<string, unknown>).transactionType).toBe('for_sell');
            }
        });

        it('requires a description', () => {
            expect(failedFields('sellx', { ...body, description: undefined })).toContain('description');
        });

        it('rejects a giveaway that still carries a price', () => {
            expect(failedFields('sellx', { ...body, transactionType: 'give_away' })).toContain('price');
        });

        it('strips fields belonging to other categories', () => {
            const result = parse('book', {
                ...body,
                brand: undefined,
                bookCategory: 'romaner',
                horsepower: 320,
                plotSize: 900,
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('horsepower');
                expect(result.data).not.toHaveProperty('plotSize');
            }
        });

        it('accepts a bike type on the bike form', () => {
            expect(parse('bike', { ...body, bikeType: 'terreng' }).success).toBe(true);
        });

        describe('book', () => {
            const book = {
                category: CATEGORY_ID,
                title: 'Clean Code — Robert C. Martin',
                description: 'Pensumbok, lite brukt. Ingen notater.',
                price: 350,
                bookCategory: 'universitet',
                condition: 'used',
                location,
            };

            it.each([['videregaende'], ['universitet'], ['barneboker'], ['romaner']])(
                'accepts the %s book category',
                (bookCategory) => {
                    expect(parse('book', { ...book, bookCategory }).success).toBe(true);
                },
            );

            it('rejects a category outside the four', () => {
                expect(failedFields('book', { ...book, bookCategory: 'lydboker' })).toContain(
                    'bookCategory',
                );
            });

            it('does not require the book category', () => {
                expect(parse('book', { ...book, bookCategory: undefined }).success).toBe(true);
            });

            /** The books form has no Brand Name field — that is the SellX form. */
            it('strips a brand', () => {
                const result = parse('book', { ...book, brand: 'Gyldendal' });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).not.toHaveProperty('brand');
                }
            });
        });
    });

    describe('property', () => {
        const forSale = {
            category: CATEGORY_ID,
            transactionType: 'for_sell',
            title: 'Bright 3-room apartment',
            location,
            type: 'leilighet',
            ownershipType: 'eier_selveier',
            municipalityNumber: '0301',
            farmNumber: '208',
            usageNumber: '145',
            apartmentNumber: 'H0201',
            usableArea: 78,
            yearBuilt: 2004,
            bedrooms: 2,
            floorLevel: 'kjeller',
            facilities: ['heis', 'takterrasse', 'bredband'],
            commonExpenses: 3400,
            sharedCostsInclude: 'Heating, cable TV and building insurance.',
            propertyTaxValue: 2400000,
            price: 6500000,
            additionalCosts: 165000,
            additionalCostsInclude: 'Document duty and registration fees.',
            sharedDebt: 250000,
            viewings: [{ date: '2026-09-14', fromTime: '17:00', toTime: '18:00' }],
        };

        it('accepts a complete for-sale listing', () => {
            expect(parse('property', forSale).success).toBe(true);
        });

        it('keeps a basement floor level, which the old numeric column could not hold', () => {
            const result = parse('property', forSale);

            expect(result.success).toBe(true);
            if (result.success) {
                expect((result.data as Record<string, unknown>).floorLevel).toBe('kjeller');
            }
        });

        it.each([
            ['municipalityNumber'],
            ['farmNumber'],
            ['usageNumber'],
            ['usableArea'],
            ['yearBuilt'],
            ['bedrooms'],
            ['commonExpenses'],
            ['sharedCostsInclude'],
            ['propertyTaxValue'],
            ['additionalCosts'],
            ['additionalCostsInclude'],
            ['sharedDebt'],
            ['ownershipType'],
            ['type'],
        ])('requires %s', (field) => {
            expect(failedFields('property', { ...forSale, [field]: undefined })).toContain(field);
        });

        it('requires the apartment number to be a letter plus four digits', () => {
            expect(failedFields('property', { ...forSale, apartmentNumber: 'X12' })).toContain(
                'apartmentNumber',
            );
        });

        it('rejects a facility outside the 24 the form offers', () => {
            expect(failedFields('property', { ...forSale, facilities: ['helipad'] })).toContain(
                'facilities.0',
            );
        });

        it.each([['hytte'], ['tomter']])(
            'accepts %s, the Cabins and Land Plot choices, on the for-sale form',
            (type) => {
                expect(parse('property', { ...forSale, type }).success).toBe(true);
            },
        );

        const forRent = {
            category: CATEGORY_ID,
            transactionType: 'for_rent',
            title: 'Room to let',
            location,
            primaryRoomArea: 42,
            bedrooms: 1,
            price: 14000,
            furnishing: 'mobelert',
            deposit: 42000,
        };

        it('accepts a rental', () => {
            expect(parse('property', forRent).success).toBe(true);
        });

        it('requires the primary room area on a rental', () => {
            expect(failedFields('property', { ...forRent, primaryRoomArea: undefined })).toContain(
                'primaryRoomArea',
            );
        });

        it('rejects a rental period that ends before it starts', () => {
            const fields = failedFields('property', {
                ...forRent,
                rentalPeriodStart: '2026-10-01',
                rentalPeriodEnd: '2026-09-01',
            });

            expect(fields).toContain('rentalPeriodEnd');
        });

        const wanted = {
            category: CATEGORY_ID,
            transactionType: 'wants_to_rent',
            title: 'Nurse seeks flat',
            location,
            price: 16000,
            preferredArea: 'trondheim',
            preferredPropertyType: 'hybel',
            numberOfTenants: 1,
        };

        it('accepts a wanted-to-rent ad', () => {
            expect(parse('property', wanted).success).toBe(true);
        });

        it('rejects a preferred area outside the twenty in the spec', () => {
            expect(failedFields('property', { ...wanted, preferredArea: 'atlantis' })).toContain(
                'preferredArea',
            );
        });

        /** A wanted ad describes the tenant, not a property, so it carries no unit fields. */
        it.each([
            ['type'],
            ['internalArea'],
            ['externalArea'],
            ['balconyArea'],
            ['primaryRoomArea'],
            ['bedrooms'],
            ['viewings'],
        ])('strips %s from a wanted-to-rent ad', (field) => {
            const values: Record<string, unknown> = {
                type: 'leilighet',
                internalArea: 40,
                externalArea: 5,
                balconyArea: 6,
                primaryRoomArea: 42,
                bedrooms: 2,
                viewings: [{ date: '2026-09-14' }],
            };
            const result = parse('property', { ...wanted, [field]: values[field] });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty(field);
            }
        });

        describe('land plot', () => {
            const landPlot = {
                ...forSale,
                type: 'tomter',
                usableArea: undefined,
                yearBuilt: undefined,
                bedrooms: undefined,
                apartmentNumber: undefined,
                floorLevel: undefined,
            };

            it('does not ask bare ground for a build year, bedrooms or a usable area', () => {
                expect(parse('property', landPlot).success).toBe(true);
            });

            it.each([['usableArea'], ['yearBuilt'], ['bedrooms']])(
                'still requires %s on every other for-sale choice',
                (field) => {
                    expect(failedFields('property', { ...forSale, [field]: undefined })).toContain(
                        field,
                    );
                },
            );

            it('accepts a cabin, which is the plain for-sale form', () => {
                expect(parse('property', { ...forSale, type: 'hytte' }).success).toBe(true);
            });
        });

        /** These two are on the filter page but on no form. */
        it.each([['bygaard_flermannsbolig'], ['produksjon_industri']])(
            'rejects the filter-only property type %s',
            (type) => {
                expect(failedFields('property', { ...forSale, type })).toContain('type');
            },
        );

        /**
         * `z.coerce.number()` read all of these as 0 (or 1 for `true`), so a blank
         * input passed a required field and understated the computed total price.
         */
        it.each([
            ['commonExpenses', ''],
            ['sharedDebt', null],
            ['additionalCosts', true],
            ['propertyTaxValue', '   '],
            ['usableArea', ''],
            ['bedrooms', ''],
            ['plotSize', []],
        ])('rejects %s: %p instead of reading it as a number', (field, value) => {
            expect(failedFields('property', { ...forSale, [field]: value })).toContain(field);
        });

        it('rejects an area with more than two decimals', () => {
            expect(failedFields('property', { ...forSale, usableArea: 78.999 })).toContain(
                'usableArea',
            );
        });

        it('rejects a fractional bedroom count', () => {
            expect(failedFields('property', { ...forSale, bedrooms: 2.5 })).toContain('bedrooms');
        });

        it('accepts a numeric string, which is what a form posts', () => {
            const result = parse('property', { ...forSale, usableArea: '78.5', bedrooms: '2' });

            expect(result.success).toBe(true);
            if (result.success) {
                const data = result.data as Record<string, unknown>;
                expect(data.usableArea).toBe(78.5);
                expect(data.bedrooms).toBe(2);
            }
        });
    });

    describe('car', () => {
        const car = {
            category: CATEGORY_ID,
            vehicleType: 'personbil',
            title: 'BMW 320d xDrive',
            location,
            taxClass: 'personbil',
            manufacturedYear: 2019,
            brand: 'BMW',
            carModel: '3-serie',
            fuel: 'diesel',
            transmission: 'automatic',
            driveType: 'firehjulsdrift',
            bodyType: 'sedan',
            seats: 5,
            bodyColor: 'Obsidian Black',
            mileage: 120000,
            price: 349000,
            reRegistrationFee: 6800,
            equipment: ['abs_bremser', 'ryggekamera', 'lettmetallfelger_vinter'],
        };

        it('accepts a passenger car', () => {
            expect(parse('car', car).success).toBe(true);
        });

        it.each([['taxClass'], ['brand'], ['carModel'], ['fuel'], ['transmission'], ['driveType'], ['bodyType'], ['seats'], ['bodyColor'], ['mileage']])(
            'requires %s',
            (field) => {
                expect(failedFields('car', { ...car, [field]: undefined })).toContain(field);
            },
        );

        it('rejects equipment outside the spec list', () => {
            expect(failedFields('car', { ...car, equipment: ['ejector_seat'] })).toContain('equipment.0');
        });

        it('requires a re-registration fee unless the listing is exempt', () => {
            expect(failedFields('car', { ...car, reRegistrationFee: undefined })).toContain(
                'reRegistrationFee',
            );
            expect(
                parse('car', { ...car, reRegistrationFee: undefined, reRegistrationExempt: true }).success,
            ).toBe(true);
        });

        it('accepts a motorhome', () => {
            const result = parse('car', {
                category: CATEGORY_ID,
                vehicleType: 'bobil',
                title: 'Hymer B-Klasse',
                location,
                motorhomeType: 'integrert',
                manufacturedYear: 2021,
                fuel: 'diesel',
                cylinderCapacity: 2.3,
                horsepower: 140,
                driveType: 'forhjulsdrift',
                weight: 3200,
                totalWeight: 3500,
                length: 720,
                registeredSeats: 4,
                sleepingPlaces: 4,
                price: 890000,
                reRegistrationExempt: true,
                equipment: ['markise', 'tv_antenne'],
            });

            expect(result.success).toBe(true);
        });

        const caravan = {
            category: CATEGORY_ID,
            vehicleType: 'campingvogn',
            title: 'Kabe Royal',
            location,
            manufacturedYear: 2018,
            sleepingPlaces: 5,
            weight: 1400,
            totalWeight: 1800,
            condition: 'used',
            price: 245000,
            reRegistrationExempt: true,
            equipment: ['fortelt_vinter'],
        };

        it('accepts a caravan', () => {
            expect(parse('car', caravan).success).toBe(true);
        });

        const motorhome = {
            category: CATEGORY_ID,
            vehicleType: 'bobil',
            title: 'Hobby Optima',
            location,
            manufacturedYear: 2018,
            fuel: 'diesel',
            cylinderCapacity: 2.3,
            horsepower: 150,
            driveType: 'forhjulsdrift',
            weight: 3200,
            totalWeight: 3500,
            length: 699,
            registeredSeats: 4,
            sleepingPlaces: 4,
            price: 890000,
            reRegistrationExempt: true,
        };

        it('accepts a motorhome', () => {
            expect(parse('car', motorhome).success).toBe(true);
        });

        /** The spec lists the motorhome type without marking it required. */
        it('does not require the motorhome type', () => {
            expect(parse('car', { ...motorhome, motorhomeType: undefined }).success).toBe(true);
        });

        /**
         * The vehicle registration document belongs to the car and motorhome
         * forms; the spec's caravan form asks for none of it, and no vehicle form
         * asks a caravan or motorhome for a paint colour.
         */
        it.each([
            ['registrationNumber', 'AB12345'],
            ['chassisNumber', 'WVW1234567'],
            ['numberOfOwners', 2],
            ['firstRegistered', '2020-01-01'],
            ['maintenanceProgramFollowed', true],
            ['bodyColor', 'Hvit'],
            ['colorDescription', 'Snow white'],
            ['interiorColor', 'Grey'],
        ])('strips %s from a caravan', (field, value) => {
            const result = parse('car', { ...caravan, [field]: value });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty(field);
            }
        });

        it.each([['bodyColor'], ['colorDescription'], ['interiorColor']])(
            'strips %s from a motorhome',
            (field) => {
                const result = parse('car', { ...motorhome, [field]: 'Hvit' });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).not.toHaveProperty(field);
                }
            },
        );

        it.each([['hasConditionReport'], ['hasWarranty']])('strips %s from a car', (field) => {
            const result = parse('car', { ...car, [field]: true });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty(field);
            }
        });

        /**
         * `z.coerce.number()` read all of these as 0 (or 1 for `true`). `mileage`
         * and `reRegistrationFee` are the expensive ones: mileage is required, and
         * the fee feeds the computed total price.
         */
        it.each([
            ['mileage', ''],
            ['mileage', null],
            ['reRegistrationFee', ''],
            ['horsepower', true],
            ['seats', ''],
            ['doors', []],
            ['trailerWeight', '  '],
        ])('rejects %s: %p instead of reading it as a number', (field, value) => {
            expect(failedFields('car', { ...car, [field]: value })).toContain(field);
        });

        it.each([
            ['weight', ''],
            ['totalWeight', null],
            ['length', ''],
            ['cylinderCapacity', ''],
            ['registeredSeats', ''],
        ])('rejects %s: %p on a motorhome', (field, value) => {
            expect(failedFields('car', { ...motorhome, [field]: value })).toContain(field);
        });

        it('rejects a fractional mileage', () => {
            expect(failedFields('car', { ...car, mileage: 84000.5 })).toContain('mileage');
        });

        it('accepts numeric strings, which is what a form posts', () => {
            const result = parse('car', { ...car, mileage: '120000', seats: '5', horsepower: '190' });

            expect(result.success).toBe(true);
            if (result.success) {
                const data = result.data as Record<string, unknown>;
                expect(data.mileage).toBe(120000);
                expect(data.seats).toBe(5);
                expect(data.horsepower).toBe(190);
            }
        });
    });

    describe('boat', () => {
        const boat = {
            category: CATEGORY_ID,
            transactionType: 'for_sell',
            title: 'Askeladden C65',
            location,
            type: 'bowrider',
            manufacturedYear: 2016,
            length: 21,
            price: 420000,
            motorIncluded: true,
            motorType: 'utenbords',
            fuel: 'bensin',
            color: 'White/Grey',
            equipmentDescription: 'Chartplotter, VHF, bathing ladder.',
        };

        it('accepts a boat for sale', () => {
            expect(parse('boat', boat).success).toBe(true);
        });

        it('requires a length in feet on the full form', () => {
            expect(failedFields('boat', { ...boat, length: undefined })).toContain('length');
        });

        const wanted = {
            category: CATEGORY_ID,
            transactionType: 'wants_to_buy',
            title: 'Looking for a RIB',
            location,
            price: 150000,
        };

        it('accepts the short wanted-to-buy form', () => {
            expect(parse('boat', wanted).success).toBe(true);
        });

        /** The wanted ad asks for a type, a title, a price and a description — nothing else. */
        it.each([
            ['manufacturedYear', 2016],
            ['length', 21],
            ['brand', 'Askeladden'],
            ['registrationNumber', 'NOR-12345'],
            ['motorType', 'utenbords'],
            ['horsepower', 150],
            ['buildMaterial', 'glassfiber'],
            ['lysNumber', '1.15'],
            ['equipmentDescription', 'Kartplotter'],
            ['seats', 6],
        ])('strips %s from a wanted-to-buy ad', (field, value) => {
            const result = parse('boat', { ...wanted, [field]: value });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty(field);
            }
        });

        /** Neither boat form collects a condition — the filter sheet no longer offers one. */
        it('does not store a condition', () => {
            const result = parse('boat', { ...boat, condition: 'used' });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('condition');
            }
        });

        it.each([
            ['horsepower', ''],
            ['maxSpeedKnots', null],
            ['seats', true],
            ['width', ''],
            ['weight', '   '],
            ['depth', ''],
            ['sleepingPlaces', []],
        ])('rejects %s: %p instead of reading it as a number', (field, value) => {
            expect(failedFields('boat', { ...boat, [field]: value })).toContain(field);
        });

        it('rejects a length of zero feet', () => {
            expect(failedFields('boat', { ...boat, length: 0 })).toContain('length');
        });

        it('accepts numeric strings, which is what a form posts', () => {
            const result = parse('boat', { ...boat, length: '21', seats: '6', weight: '1250.5' });

            expect(result.success).toBe(true);
            if (result.success) {
                const data = result.data as Record<string, unknown>;
                expect(data.length).toBe(21);
                expect(data.seats).toBe(6);
                expect(data.weight).toBe(1250.5);
            }
        });
    });

    describe('motorcycle', () => {
        const mc = {
            category: CATEGORY_ID,
            mcType: 'motorsykkel',
            title: 'Yamaha MT-07',
            location,
            motorcycleType: 'classic_nakne',
            manufacturedYear: 2020,
            price: 89000,
            reRegistrationFee: 2500,
            fuel: 'bensin',
            equipment: ['abs', 'varmehandtak'],
        };

        it('accepts a motorcycle', () => {
            expect(parse('motorcycle', mc).success).toBe(true);
        });

        it('requires a motorcycle sub-type', () => {
            expect(failedFields('motorcycle', { ...mc, motorcycleType: undefined })).toContain(
                'motorcycleType',
            );
        });

        const atv = {
            category: CATEGORY_ID,
            mcType: 'atv',
            title: 'Polaris Sportsman',
            location,
            manufacturedYear: 2022,
            price: 120000,
            reRegistrationExempt: true,
        };

        it('does not ask an ATV for a sub-type', () => {
            expect(parse('motorcycle', atv).success).toBe(true);
        });

        it('requires a moped sub-type', () => {
            const moped = { ...mc, mcType: 'moped', motorcycleType: undefined };

            expect(failedFields('motorcycle', moped)).toContain('mopedType');
            expect(parse('motorcycle', { ...moped, mopedType: 'scooter' }).success).toBe(true);
        });

        it('accepts a snowmobile without a sub-type', () => {
            expect(parse('motorcycle', { ...atv, mcType: 'snoscooter' }).success).toBe(true);
        });

        /** ATVs and snowmobiles skip the sub-type question, so neither is stored. */
        it.each([['motorcycleType', 'sport'], ['mopedType', 'scooter']])(
            'strips %s from an ATV',
            (field, value) => {
                const result = parse('motorcycle', { ...atv, [field]: value });

                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data).not.toHaveProperty(field);
                }
            },
        );

        it('strips a motorcycle sub-type from a moped', () => {
            const result = parse('motorcycle', {
                ...mc,
                mcType: 'moped',
                mopedType: 'scooter',
                motorcycleType: 'sport',
            });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('motorcycleType');
            }
        });

        /** The MC form carries its own warranty values, not the car form's. */
        it('rejects a car warranty type', () => {
            expect(failedFields('motorcycle', { ...mc, warrantyType: 'nybilgaranti' })).toContain(
                'warrantyType',
            );
            expect(
                parse('motorcycle', { ...mc, warrantyType: 'resterende_ny_garanti' }).success,
            ).toBe(true);
        });

        it.each([
            ['horsepower', ''],
            ['displacement', ''],
            ['weight', null],
            ['mileage', '   '],
            ['numberOfOwners', true],
            ['reRegistrationFee', ''],
        ])('rejects %s: %p instead of reading it as a number', (field, value) => {
            expect(failedFields('motorcycle', { ...mc, [field]: value })).toContain(field);
        });

        it('accepts numeric strings, which is what a form posts', () => {
            const result = parse('motorcycle', {
                ...mc,
                displacement: '689',
                mileage: '12000',
                weight: '184.5',
            });

            expect(result.success).toBe(true);
            if (result.success) {
                const data = result.data as Record<string, unknown>;
                expect(data.displacement).toBe(689);
                expect(data.mileage).toBe(12000);
                expect(data.weight).toBe(184.5);
            }
        });
    });

    describe('job', () => {
        const job = {
            category: CATEGORY_ID,
            title: 'Senior utvikler',
            location,
            employmentType: 'lederstilling',
            jobTitle: 'Teamleder',
            numberOfPositions: 2,
            contractType: 'fast',
            sector: 'privat',
            industry: 'IT og teknologi',
            employerName: 'Ikea',
            keywords: ['node', 'typescript'],
            workLanguage: 'norsk',
            website: 'https://example.com',
            contactPersons: [{ name: 'Kari Nordmann', title: 'Daglig leder', email: 'kari@example.com' }],
        };

        it('accepts a job ad and defaults the price to zero', () => {
            const result = parse('job', job);

            expect(result.success).toBe(true);
            if (result.success) {
                expect((result.data as Record<string, unknown>).price).toBe(0);
            }
        });

        it.each([['employerName'], ['jobTitle'], ['numberOfPositions'], ['contractType'], ['sector'], ['industry'], ['employmentType']])(
            'requires %s',
            (field) => {
                expect(failedFields('job', { ...job, [field]: undefined })).toContain(field);
            },
        );

        it('allows at most five keywords', () => {
            expect(failedFields('job', { ...job, keywords: ['a', 'b', 'c', 'd', 'e', 'f'] })).toContain(
                'keywords',
            );
        });

        it.each([['heltid'], ['deltid'], ['lederstilling']])(
            'accepts the %s ad type',
            (employmentType) => {
                expect(parse('job', { ...job, employmentType }).success).toBe(true);
            },
        );

        it.each([
            ['engasjement'], ['fast'], ['laerling'], ['prosjekt'],
            ['selvstendig_naeringsdrivende'], ['sommer_sesong'], ['trainee'], ['vikariat'],
        ])('accepts the %s contract type', (contractType) => {
            expect(parse('job', { ...job, contractType }).success).toBe(true);
        });

        /** On the filter page but on no form. */
        it('rejects the filter-only bemanningsbyra contract type', () => {
            expect(failedFields('job', { ...job, contractType: 'bemanningsbyra' })).toContain(
                'contractType',
            );
        });

        it.each([['delvis_hjemmearbeid'], ['kun_hjemmearbeid']])(
            'accepts %s as the remote-work answer',
            (remoteWorkType) => {
                expect(parse('job', { ...job, remoteWorkType }).success).toBe(true);
            },
        );

        /** The model's unused `remoteWork` boolean is not part of the form. */
        it('strips a remoteWork boolean', () => {
            const result = parse('job', { ...job, remoteWork: true });

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).not.toHaveProperty('remoteWork');
            }
        });

        it.each([[''], [null], [true], ['  ']])(
            'rejects %p as a number of positions',
            (numberOfPositions) => {
                expect(failedFields('job', { ...job, numberOfPositions })).toContain(
                    'numberOfPositions',
                );
            },
        );

        it('requires at least one position', () => {
            expect(failedFields('job', { ...job, numberOfPositions: 0 })).toContain(
                'numberOfPositions',
            );
        });
    });

    it('falls back to the SellX schema for a category with no bespoke form', () => {
        const result = parse('something-an-admin-added', {
            category: CATEGORY_ID,
            title: 'Anything',
            description: 'Falls back to the SellX shape.',
            price: 100,
            location,
        });

        expect(result.success).toBe(true);
    });
});
