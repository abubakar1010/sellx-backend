/**
 * Every value of every category enum, checked against the form that offers it.
 *
 * Around twenty of these enums had no test at all — `TaxClass`, `DriveType`, `CarBodyType`,
 * `OwnershipType`, `EnergyRating`, `BoatType`, `BuildMaterial`, `Sector` and the rest — so a
 * value could be added to `product.enum.ts` and silently never wired into a schema, or wired
 * into the wrong one.
 *
 * The values are read from the enum rather than retyped, which is the point: the assertion is
 * that the *schema* offers what the *enum* declares. A retyped list would only prove that
 * whoever wrote the test could copy.
 */
import {
    BedType,
    BikeType,
    BoatFuelType,
    BoatType,
    BookCategory,
    BuildMaterial,
    CarBodyType,
    CarFuelType,
    Condition,
    ConditionReportProvider,
    ContractType,
    DriveType,
    EmploymentType,
    EnergyRating,
    FloorLevel,
    Furnishing,
    HeatingRating,
    McFuelType,
    MopedType,
    MotorType,
    MotorcycleType,
    MotorhomeType,
    OwnershipType,
    PreferredPropertyType,
    PropertyType,
    RemainingWarrantyType,
    RemoteWorkType,
    Sector,
    TaxClass,
    TransmissionType,
    VehicleLocation,
    WarrantyType,
    WorkLanguage,
} from '@/modules/products/product.enum';
import { CAR_EQUIPMENT_VALUES } from '@/modules/products/data/car-equipment.constants';
import { MOTORHOME_EQUIPMENT_VALUES } from '@/modules/products/data/motorhome-equipment.constants';
import { getProductSchema } from '@/modules/products/schemas/registry';
import { validListing, type VariantId } from '@tests/factories/product.factory';

const parse = (slug: string, body: unknown) => getProductSchema(slug).safeParse(body);

const slugOfVariant = (id: VariantId): string => id.split(':')[0]!;

const accepts = (id: VariantId, field: string, value: unknown): boolean =>
    parse(slugOfVariant(id), validListing(id, { [field]: value })).success;

const failedFields = (id: VariantId, field: string, value: unknown): string[] => {
    const result = parse(slugOfVariant(id), validListing(id, { [field]: value }));
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

/** `[variant, field, enum]` — which form offers which list. */
const ENUMS: [VariantId, string, Record<string, string>][] = [
    // Shared
    ['sellx', 'condition', Condition],

    // Car — personbil
    ['car:personbil', 'taxClass', TaxClass],
    ['car:personbil', 'fuel', CarFuelType],
    ['car:personbil', 'driveType', DriveType],
    ['car:personbil', 'bodyType', CarBodyType],
    ['car:personbil', 'vehicleLocation', VehicleLocation],
    ['car:personbil', 'warrantyType', WarrantyType],
    ['car:personbil', 'conditionReportProvider', ConditionReportProvider],

    // Car — bobil and campingvogn
    ['car:bobil', 'motorhomeType', MotorhomeType],
    ['car:bobil', 'bedType', BedType],
    ['car:bobil', 'transmission', TransmissionType],
    ['car:bobil', 'warrantyType', RemainingWarrantyType],
    ['car:bobil', 'condition', Condition],
    ['car:campingvogn', 'condition', Condition],

    // Property
    ['property:for_sell', 'ownershipType', OwnershipType],
    ['property:for_sell', 'energyRating', EnergyRating],
    ['property:for_sell', 'heatingRating', HeatingRating],
    ['property:for_sell', 'floorLevel', FloorLevel],
    ['property:for_rent', 'furnishing', Furnishing],
    ['property:wants_to_rent', 'preferredPropertyType', PreferredPropertyType],
    ['property:wants_to_rent', 'furnishing', Furnishing],

    // Boat
    ['boat:for_sell', 'type', BoatType],
    ['boat:for_sell', 'fuel', BoatFuelType],
    ['boat:for_sell', 'motorType', MotorType],
    ['boat:for_sell', 'buildMaterial', BuildMaterial],

    // Motorcycle
    ['motorcycle:motorsykkel', 'motorcycleType', MotorcycleType],
    ['motorcycle:motorsykkel', 'fuel', McFuelType],
    ['motorcycle:motorsykkel', 'warrantyType', RemainingWarrantyType],
    ['motorcycle:moped', 'mopedType', MopedType],

    // Bike and book
    ['bike', 'bikeType', BikeType],
    ['book', 'bookCategory', BookCategory],

    // Job
    ['job', 'employmentType', EmploymentType],
    ['job', 'sector', Sector],
    ['job', 'workLanguage', WorkLanguage],
    ['job', 'remoteWorkType', RemoteWorkType],
];

describe('every enum value its form declares is accepted', () => {
    it.each(ENUMS)('%s accepts every %s', (id, field, values) => {
        for (const value of Object.values(values)) {
            expect([value, accepts(id, field, value)]).toEqual([value, true]);
        }
    });

    it.each(ENUMS)('%s rejects an unlisted %s', (id, field) => {
        expect(failedFields(id, field, 'definitely-not-a-listed-value')).toContain(field);
    });

    it('covers every list the forms offer', () => {
        expect(ENUMS.length).toBeGreaterThanOrEqual(34);
    });
});

describe('the lists that are deliberately not the full enum', () => {
    it('property takes the nine form types and refuses the two filter-only ones', () => {
        const form = [
            PropertyType.ENEBOLIG,
            PropertyType.GARASJE_PARKERING,
            PropertyType.GAARDSBRUK,
            PropertyType.LEILIGHET,
            PropertyType.REKKEHUS,
            PropertyType.TOMANNSBOLIG,
            PropertyType.HYTTE,
            PropertyType.TOMTER,
            PropertyType.ANDRE,
        ];

        for (const type of form) {
            // The land-plot exemption means `tomter` needs a different fixture shape.
            const body =
                type === PropertyType.TOMTER
                    ? validListing('property:for_sell', {
                          type,
                          usableArea: undefined,
                          yearBuilt: undefined,
                          bedrooms: undefined,
                      })
                    : validListing('property:for_sell', { type });

            expect([type, parse('property', body).success]).toEqual([type, true]);
        }

        for (const type of [PropertyType.BYGAARD, PropertyType.PRODUKSJON_INDUSTRI]) {
            expect([type, accepts('property:for_sell', 'type', type)]).toEqual([type, false]);
        }
    });

    it('job takes eight contract types and refuses the staffing-agency one', () => {
        for (const contractType of Object.values(ContractType)) {
            const allowed = contractType !== ContractType.BEMANNINGSBYRA;
            expect([contractType, accepts('job', 'contractType', contractType)]).toEqual([
                contractType,
                allowed,
            ]);
        }
    });

    it('a passenger car has two transmissions where a motorhome has three', () => {
        expect(accepts('car:personbil', 'transmission', TransmissionType.SEMI_AUTOMATIC)).toBe(false);
        expect(accepts('car:bobil', 'transmission', TransmissionType.SEMI_AUTOMATIC)).toBe(true);

        for (const transmission of [TransmissionType.MANUAL, TransmissionType.AUTOMATIC]) {
            expect(accepts('car:personbil', 'transmission', transmission)).toBe(true);
        }
    });

    it('a motorcycle warranty is not a car warranty', () => {
        expect(accepts('motorcycle:motorsykkel', 'warrantyType', WarrantyType.NEW_CAR)).toBe(
            false,
        );
        expect(
            accepts('motorcycle:motorsykkel', 'warrantyType', RemainingWarrantyType.NY),
        ).toBe(true);
    });

    it('the wanted-to-rent property list is not the sale list', () => {
        // Two values exist only on the wanted form...
        for (const type of [PreferredPropertyType.HYBEL, PreferredPropertyType.ROM_I_BOFELLESSKAP]) {
            expect(accepts('property:wants_to_rent', 'preferredPropertyType', type)).toBe(true);
            expect(accepts('property:for_sell', 'type', type)).toBe(false);
        }

        // ...and the commercial ones exist only on the sale form.
        expect(
            accepts('property:wants_to_rent', 'preferredPropertyType', PropertyType.GAARDSBRUK),
        ).toBe(false);
    });

    it('a boat has no condition and a caravan must have one', () => {
        const result = parse('boat', validListing('boat:for_sell', { condition: Condition.USED }));
        expect(result.success).toBe(true);
        if (result.success) expect(result.data).not.toHaveProperty('condition');

        expect(accepts('car:campingvogn', 'condition', Condition.NEW)).toBe(true);
    });
});

describe('array-valued option lists', () => {
    it('car equipment takes listed values and refuses the rest', () => {
        expect(accepts('car:personbil', 'equipment', ['abs_bremser', 'klimaanlegg'])).toBe(true);
        expect(accepts('car:personbil', 'equipment', ['ejector_seat'])).toBe(false);
        expect(accepts('car:personbil', 'equipment', [])).toBe(true);
    });

    it('each vehicle form has its own equipment list', () => {
        // The lists overlap (both offer ABS), so the exclusive values are computed rather than
        // guessed — otherwise the test rots the moment a fitting is added to one of them.
        const carOnly = CAR_EQUIPMENT_VALUES.filter(
            (value) => !(MOTORHOME_EQUIPMENT_VALUES as readonly string[]).includes(value),
        );
        const motorhomeOnly = MOTORHOME_EQUIPMENT_VALUES.filter(
            (value) => !(CAR_EQUIPMENT_VALUES as readonly string[]).includes(value),
        );

        expect(carOnly.length).toBeGreaterThan(0);
        expect(motorhomeOnly.length).toBeGreaterThan(0);

        expect(accepts('car:personbil', 'equipment', [carOnly[0]])).toBe(true);
        expect(accepts('car:bobil', 'equipment', [carOnly[0]])).toBe(false);
        expect(accepts('car:bobil', 'equipment', [motorhomeOnly[0]])).toBe(true);
        expect(accepts('car:personbil', 'equipment', [motorhomeOnly[0]])).toBe(false);
    });

    it('property facilities take the 24 form values, a superset of the 10 filterable ones', () => {
        expect(accepts('property:for_sell', 'facilities', ['heis', 'takterrasse', 'bredband'])).toBe(
            true,
        );
        expect(accepts('property:for_sell', 'facilities', ['helipad'])).toBe(false);
        expect(accepts('property:for_sell', 'facilities', [])).toBe(true);
    });

    it('motorcycle equipment defaults to an empty list', () => {
        const result = parse(
            'motorcycle',
            validListing('motorcycle:motorsykkel', { equipment: undefined }),
        );
        expect(result.success && (result.data as Record<string, unknown>).equipment).toEqual([]);
    });
});
