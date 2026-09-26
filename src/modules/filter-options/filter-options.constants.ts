import type { IFilterField, ISortOption } from './filter-options.interface';
import { CAR_BRANDS } from '@modules/products/data/car-brands.constants';
import { BOAT_BRANDS } from '@modules/products/data/boat-brands.constants';
import { MC_BRANDS } from '@modules/products/data/mc-brands.constants';
import {
    VehicleLocation, VehicleType, DriveType, WarrantyType, TaxClass,
    OwnershipType, EnergyRating, McType, MopedType, MotorcycleType,
    MotorType, BuildMaterial, BoatType, BikeType, EmploymentType,
    ContractType, RemoteWorkType, Sector, WorkLanguage, BookCategory, PropertyType,
    FloorLevel, CarBodyType, CarFuelType, BoatFuelType, McFuelType,
    PropertyFacility, CarEquipment,
} from '@modules/products/product.enum';

// --- Helpers ---

const opt = (value: string, en: string, no: string) => ({ value, label: { en, no } });

// --- Common filter fields ---

const LOCATION_FILTER: IFilterField = {
    key: 'city',
    label: { en: 'Area', no: 'Område' },
    inputType: 'location',
};

const MAP_FILTER: IFilterField = {
    key: 'near',
    label: { en: 'Area on map', no: 'Område i kart' },
    inputType: 'map',
};

const PRICE_RANGE: IFilterField = {
    key: 'price',
    label: { en: 'Price', no: 'Pris' },
    inputType: 'range',
};

const CONDITION_FILTER: IFilterField = {
    key: 'condition',
    label: { en: 'Condition', no: 'Tilstand' },
    inputType: 'single_select',
    options: [
        opt('new', 'New', 'Ny'),
        opt('used', 'Used', 'Brukt'),
    ],
};

const SALE_FORM_FILTER: IFilterField = {
    key: 'transactionType',
    label: { en: 'Sale type', no: 'Salgsform' },
    inputType: 'single_select',
    options: [
        opt('for_sell', 'For sale', 'Til salgs'),
        opt('for_rent', 'For rent', 'Til leie'),
        opt('give_away', 'Give away', 'Gis bort'),
        opt('wants_to_buy', 'Wants to buy', 'Ønskes kjøpt'),
    ],
};

const SALE_FORM_NO_GIVEAWAY: IFilterField = {
    ...SALE_FORM_FILTER,
    options: [
        opt('for_sell', 'For sale', 'Til salgs'),
        opt('for_rent', 'For rent', 'Til leie'),
    ],
};

// --- Category-specific filter definitions ---

const SELLX_FILTERS: IFilterField[] = [
    LOCATION_FILTER,
    MAP_FILTER,
    PRICE_RANGE,
    CONDITION_FILTER,
    SALE_FORM_FILTER,
];

const PROPERTY_FILTERS: IFilterField[] = [
    LOCATION_FILTER,
    MAP_FILTER,
    { key: 'price', label: { en: 'Total price', no: 'Totalpris' }, inputType: 'range' },
    { key: 'commonExpenses', label: { en: 'Common expenses per month', no: 'Fellesutgifter per måned' }, inputType: 'range' },
    { key: 'usableArea', label: { en: 'Size', no: 'Størrelse' }, inputType: 'range' },
    { key: 'bedrooms', label: { en: 'Bedrooms', no: 'Antall soverom' }, inputType: 'range' },
    { key: 'yearBuilt', label: { en: 'Year built', no: 'Byggeår' }, inputType: 'range' },
    {
        key: 'type',
        label: { en: 'Property type', no: 'Boligtype' },
        inputType: 'single_select',
        options: [
            opt(PropertyType.LEILIGHET, 'Apartment', 'Leilighet'),
            opt(PropertyType.ENEBOLIG, 'Detached house', 'Enebolig'),
            opt(PropertyType.REKKEHUS, 'Townhouse', 'Rekkehus'),
            opt(PropertyType.TOMANNSBOLIG, 'Duplex', 'Tomannsbolig'),
            opt(PropertyType.GAARDSBRUK, 'Farm/Smallholding', 'Gårdsbruk/Småbruk'),
            opt(PropertyType.GARASJE_PARKERING, 'Garage/Parking', 'Garasje/Parkering'),
            opt(PropertyType.BYGAARD, 'Multi-dwelling', 'Bygård/Flermannsbolig'),
            opt(PropertyType.TOMTER, 'Plots', 'Tomter'),
            opt(PropertyType.PRODUKSJON_INDUSTRI, 'Production/Industry', 'Produksjon/Industri'),
            opt(PropertyType.ANDRE, 'Other', 'Andre'),
        ],
    },
    {
        key: 'ownershipType',
        label: { en: 'Ownership type', no: 'Eieform' },
        inputType: 'single_select',
        options: [
            opt(OwnershipType.AKSJE, 'Share', 'Aksje'),
            opt(OwnershipType.ANDEL, 'Co-op share', 'Andel'),
            opt(OwnershipType.SELVEIER, 'Freehold', 'Eier (Selveier)'),
            opt(OwnershipType.OBLIGASJON, 'Bond', 'Obligasjon'),
            opt(OwnershipType.ANDRE, 'Other', 'Andre'),
        ],
    },
    {
        key: 'facilities',
        label: { en: 'Facilities', no: 'Fasiliteter' },
        inputType: 'multi_select',
        options: [
            opt(PropertyFacility.BALKONG_TERRASSE, 'Balcony/Terrace', 'Balkong/terrasse'),
            opt(PropertyFacility.GARASJE_PARKERING, 'Garage/Parking', 'Garasje/Parkeringsplass'),
            opt(PropertyFacility.HEIS, 'Elevator', 'Heis'),
            opt(PropertyFacility.LADEMULIGHET, 'EV charging', 'Lademulighet'),
            opt(PropertyFacility.PEIS_ILDSTED, 'Fireplace', 'Peis/Ildsted'),
            opt(PropertyFacility.STRANDLINJE, 'Waterfront', 'Strandlinje'),
            opt(PropertyFacility.TURTERRENG, 'Hiking area', 'Turterreng'),
            opt(PropertyFacility.UTSIKT, 'View', 'Utsikt'),
            opt(PropertyFacility.VAKTMESTER, 'Caretaker', 'Vaktmester'),
            opt(PropertyFacility.INGEN_GJENBOERE, 'No facing neighbours', 'Ingen gjenboere'),
        ],
    },
    { key: 'showingDate', label: { en: 'Showing date', no: 'Visningsdato' }, inputType: 'date' },
    {
        key: 'floorLevel',
        label: { en: 'Floor', no: 'Etasje' },
        inputType: 'single_select',
        options: [
            opt(FloorLevel.KJELLER, 'Basement', 'Kjeller'),
            opt(FloorLevel.FIRST, '1st floor', '1. etasje'),
            opt(FloorLevel.SECOND, '2nd floor', '2. etasje'),
            opt(FloorLevel.THIRD, '3rd floor', '3. etasje'),
            opt(FloorLevel.FOURTH, '4th floor', '4. etasje'),
            opt(FloorLevel.FIFTH, '5th floor', '5. etasje'),
            opt(FloorLevel.SIXTH, '6th floor', '6. etasje'),
            opt(FloorLevel.SEVENTH, '7th floor', '7. etasje'),
            opt(FloorLevel.EIGHTH, '8th floor', '8. etasje'),
            opt(FloorLevel.ABOVE_EIGHTH, 'Above 8th', 'Over 8. etasje'),
        ],
    },
    {
        key: 'energyRating',
        label: { en: 'Energy rating', no: 'Energikarakter' },
        inputType: 'single_select',
        options: Object.values(EnergyRating).map(v => opt(v, v, v)),
    },
    { key: 'plotSize', label: { en: 'Plot size', no: 'Tomtestørrelse' }, inputType: 'range' },
];

const CAR_FILTERS: IFilterField[] = [
    {
        key: 'vehicleLocation',
        label: { en: 'Vehicle location', no: 'Bilen står i' },
        inputType: 'single_select',
        options: [
            opt(VehicleLocation.NORWAY, 'Norway', 'Norge'),
            opt(VehicleLocation.ABROAD, 'Abroad', 'Utlandet'),
        ],
    },
    {
        key: 'brand',
        label: { en: 'Brand', no: 'Merke' },
        inputType: 'single_select',
        options: Object.keys(CAR_BRANDS).map(b => opt(b, b, b)),
    },
    {
        key: 'carModel',
        label: { en: 'Model', no: 'Modell' },
        inputType: 'single_select',
        options: [],
        dependsOn: { field: 'brand' },
    },
    {
        key: 'vehicleType',
        label: { en: 'Vehicle type', no: 'Kjøretøytype' },
        inputType: 'single_select',
        options: [
            opt(VehicleType.PERSONBIL, 'Passenger car', 'Personbil'),
            opt(VehicleType.CAMPINGVOGN, 'Caravan', 'Campingvogn'),
            opt(VehicleType.BOBIL, 'Motorhome', 'Bobil'),
        ],
    },
    { key: 'manufacturedYear', label: { en: 'Year model', no: 'Årsmodell' }, inputType: 'range' },
    { key: 'mileage', label: { en: 'Mileage', no: 'Kilometerstand' }, inputType: 'range' },
    PRICE_RANGE,
    LOCATION_FILTER,
    MAP_FILTER,
    {
        key: 'bodyType',
        label: { en: 'Body type', no: 'Karosseri' },
        inputType: 'single_select',
        options: [
            opt(CarBodyType.CABRIOLET, 'Cabriolet', 'Cabriolet'),
            opt(CarBodyType.COUPE, 'Coupe', 'Coupe'),
            opt(CarBodyType.FLERBRUKSBIL, 'Multi-purpose', 'Flerbruksbil'),
            opt(CarBodyType.KASSE, 'Van', 'Kasse'),
            opt(CarBodyType.KOMBI_3, 'Hatchback 3-door', 'Kombi 3-dørs'),
            opt(CarBodyType.KOMBI_5, 'Hatchback 5-door', 'Kombi 5-dørs'),
            opt(CarBodyType.PICKUP, 'Pickup', 'Pickup'),
            opt(CarBodyType.SUV_OFFROAD, 'SUV/Offroad', 'SUV/Offroad'),
            opt(CarBodyType.SEDAN, 'Sedan', 'Sedan'),
            opt(CarBodyType.STASJONSVOGN, 'Estate', 'Stasjonsvogn'),
            opt(CarBodyType.ANDRE, 'Other', 'Andre'),
        ],
    },
    SALE_FORM_NO_GIVEAWAY,
    {
        key: 'fuel',
        label: { en: 'Fuel', no: 'Drivstoff' },
        inputType: 'single_select',
        options: [
            opt(CarFuelType.BENSIN, 'Petrol', 'Bensin'),
            opt(CarFuelType.DIESEL, 'Diesel', 'Diesel'),
            opt(CarFuelType.GASS, 'Gas', 'Gass'),
            opt(CarFuelType.ELEKTRISITET, 'Electric', 'Elektrisitet'),
            opt(CarFuelType.ELEKTRISITET_BENSIN, 'Electric + Petrol', 'Elektrisitet + bensin'),
            opt(CarFuelType.ELEKTRISITET_DIESEL, 'Electric + Diesel', 'Elektrisitet + diesel'),
            opt(CarFuelType.GASS_BENSIN, 'Gas + Petrol', 'Gass + bensin'),
            opt(CarFuelType.GASS_DIESEL, 'Gas + Diesel', 'Gass + diesel'),
            opt(CarFuelType.HYDROGEN, 'Hydrogen', 'Hydrogen'),
        ],
    },
    // Colours are free text on the listing form, so there is no option list to
    // render. The query matches them case-insensitively, and still accepts a
    // comma-separated list.
    { key: 'bodyColor', label: { en: 'Main colour', no: 'Hovedfarge' }, inputType: 'text' },
    { key: 'interiorColor', label: { en: 'Interior colour', no: 'Interiørfarge' }, inputType: 'text' },
    { key: 'horsepower', label: { en: 'Horsepower', no: 'Hestekrefter' }, inputType: 'range' },
    { key: 'seats', label: { en: 'Seats', no: 'Antall seter' }, inputType: 'range' },
    {
        key: 'driveType',
        label: { en: 'Drivetrain', no: 'Hjuldrift' },
        inputType: 'single_select',
        options: [
            opt(DriveType.RWD, 'Rear-wheel drive', 'Bakhjulsdrift'),
            opt(DriveType.FWD, 'Front-wheel drive', 'Forhjulsdrift'),
            opt(DriveType.AWD, 'All-wheel drive', 'Firehjulsdrift'),
        ],
    },
    {
        key: 'transmission',
        label: { en: 'Gearbox', no: 'Girkasse' },
        inputType: 'single_select',
        options: [
            opt('manual', 'Manual', 'Manuell'),
            opt('automatic', 'Automatic', 'Automat'),
        ],
    },
    {
        key: 'equipment',
        label: { en: 'Equipment', no: 'Utstyr' },
        inputType: 'multi_select',
        options: [
            opt(CarEquipment.ABS_BREMSER, 'ABS brakes', 'ABS-bremser'),
            opt(CarEquipment.AIRBAG_FORAN, 'Front airbag', 'Airbag foran'),
            opt(CarEquipment.ALARM, 'Alarm', 'Alarm'),
            opt(CarEquipment.KLIMAANLEGG, 'Air conditioning', 'Klimaanlegg'),
            opt(CarEquipment.RADIO_DAB, 'Radio DAB+', 'Radio DAB+'),
            opt(CarEquipment.HENGERFESTE, 'Tow bar', 'Hengerfeste fast krok'),
        ],
    },
    { key: 'trailerWeight', label: { en: 'Trailer weight', no: 'Tilhengervekt' }, inputType: 'range' },
    {
        key: 'warrantyType',
        label: { en: 'Warranty', no: 'Garantitype' },
        inputType: 'single_select',
        options: [
            opt(WarrantyType.NEW_CAR, 'New car warranty', 'Nybilgaranti'),
            opt(WarrantyType.DEALER, 'Dealer warranty', 'Gammelbilgaranti fra forhandler'),
        ],
    },
    // A passenger car has no condition field on its form — only motorhomes and
    // caravans do — so an unscoped chip would hide every car the moment it was
    // tapped. The dependency lets the client show it for those two only.
    {
        ...CONDITION_FILTER,
        dependsOn: { field: 'vehicleType', values: [VehicleType.BOBIL, VehicleType.CAMPINGVOGN] },
    },
    {
        key: 'taxClass',
        label: { en: 'Tax class', no: 'Avgiftsklasse' },
        inputType: 'single_select',
        options: [
            opt(TaxClass.KOMBINERTBIL, 'Combined', 'Kombinertbil'),
            opt(TaxClass.LETT_LASTEBIL, 'Light truck', 'Lett lastebil'),
            opt(TaxClass.MINIBUSS, 'Minibus', 'Minibuss'),
            opt(TaxClass.PERSONBIL, 'Passenger car', 'Personbil'),
            opt(TaxClass.VAREBIL, 'Van', 'Varebil'),
            opt(TaxClass.ANDRE, 'Other', 'Andre'),
        ],
    },
];

const BOAT_FILTERS: IFilterField[] = [
    {
        key: 'vehicleLocation',
        label: { en: 'Boat location', no: 'Båten står i' },
        inputType: 'single_select',
        options: [
            opt(VehicleLocation.NORWAY, 'Norway', 'Norge'),
            opt(VehicleLocation.ABROAD, 'Abroad', 'Utlandet'),
        ],
    },
    // No condition chip: neither boat form collects a condition, so it could only
    // ever return an empty list.
    {
        key: 'type',
        label: { en: 'Boat type', no: 'Båttype' },
        inputType: 'single_select',
        options: [
            opt(BoatType.BOWRIDER, 'Bowrider', 'Bowrider'),
            opt(BoatType.CABINCRUISER, 'Cabin cruiser', 'Cabincruiser'),
            opt(BoatType.DAYCRUISER, 'Daycruiser', 'Daycruiser'),
            opt(BoatType.GUMMIBAT_JOLLE, 'Dinghy/Tender', 'Gummibåt/Jolle'),
            opt(BoatType.RIB, 'RIB', 'RIB'),
            opt(BoatType.SEILBAT_MOTORSEILER, 'Sailboat/Motorsailer', 'Seilbåt/Motorseiler'),
            opt(BoatType.SKJAERGAARDSJEEP, 'Island hopper', 'Skjærgårdsjeep/Landstedsbåt'),
            opt(BoatType.PILOTHOUSE, 'Pilothouse', 'Pilothouse'),
            opt(BoatType.SPEEDBAT, 'Speedboat', 'Speedbåt'),
            opt(BoatType.TREBAT_SNEKKE, 'Wooden boat', 'Trebåt/Snekke'),
            opt(BoatType.YACHT, 'Yacht', 'Yacht'),
            opt(BoatType.VANNSCOOTER, 'Jet ski', 'Vannscooter'),
            opt(BoatType.YRKESBAT_SJARK, 'Commercial/Fishing', 'Yrkesbåt/Sjark/Skøyte'),
            opt(BoatType.ANDRE, 'Other', 'Andre'),
        ],
    },
    {
        key: 'brand',
        label: { en: 'Brand', no: 'Merke' },
        inputType: 'single_select',
        options: BOAT_BRANDS.map(b => opt(b, b, b)),
    },
    PRICE_RANGE,
    { key: 'length', label: { en: 'Length in feet', no: 'Lengde i fot' }, inputType: 'range' },
    { key: 'width', label: { en: 'Width in cm', no: 'Bredde i cm' }, inputType: 'range' },
    { key: 'manufacturedYear', label: { en: 'Year model', no: 'Årsmodell' }, inputType: 'range' },
    { key: 'maxSpeedKnots', label: { en: 'Max speed in knots', no: 'Maks fart i knop' }, inputType: 'range' },
    {
        key: 'motorIncluded',
        label: { en: 'Motor included', no: 'Motor inkludert' },
        inputType: 'single_select',
        options: [opt('true', 'Yes', 'Ja'), opt('false', 'No', 'Nei')],
    },
    {
        key: 'motorType',
        label: { en: 'Motor type', no: 'Motortype' },
        inputType: 'single_select',
        options: [
            opt(MotorType.INNENBORDS, 'Inboard', 'Innenbords'),
            opt(MotorType.UTENBORDS, 'Outboard', 'Utenbords'),
            opt(MotorType.ANDRE, 'Other', 'Andre'),
        ],
    },
    {
        key: 'buildMaterial',
        label: { en: 'Build material', no: 'Byggemateriale' },
        inputType: 'single_select',
        options: [
            opt(BuildMaterial.PLAST, 'Plastic', 'Plast'),
            opt(BuildMaterial.GLASSFIBER, 'Fiberglass', 'Glassfiber'),
            opt(BuildMaterial.TRE, 'Wood', 'Tre'),
            opt(BuildMaterial.ALUMINIUM, 'Aluminium', 'Aluminium'),
            opt(BuildMaterial.ANDRE, 'Other', 'Andre'),
        ],
    },
    {
        key: 'fuel',
        label: { en: 'Fuel', no: 'Drivstoff' },
        inputType: 'single_select',
        options: [
            opt(BoatFuelType.BENSIN, 'Petrol', 'Bensin'),
            opt(BoatFuelType.DIESEL, 'Diesel', 'Diesel'),
            opt(BoatFuelType.ELEKTRISITET, 'Electric', 'Elektrisitet'),
            opt(BoatFuelType.HYBRID, 'Hybrid', 'Hybrid'),
            opt(BoatFuelType.ANDRE, 'Other', 'Andre'),
        ],
    },
    LOCATION_FILTER,
    MAP_FILTER,
    { key: 'seats', label: { en: 'Sitting places', no: 'Antall sitteplasser' }, inputType: 'range' },
    { key: 'sleepingPlaces', label: { en: 'Sleeping places', no: 'Antall soveplasser' }, inputType: 'range' },
    { key: 'horsepower', label: { en: 'Horsepower', no: 'Antall hestekrefter' }, inputType: 'range' },
];

const MOTORCYCLE_FILTERS: IFilterField[] = [
    {
        key: 'brand',
        label: { en: 'Brand', no: 'Merke' },
        inputType: 'single_select',
        options: MC_BRANDS.map(b => opt(b, b, b)),
    },
    PRICE_RANGE,
    { key: 'manufacturedYear', label: { en: 'Year model', no: 'Årsmodell' }, inputType: 'range' },
    { key: 'mileage', label: { en: 'Mileage', no: 'Kilometerstand' }, inputType: 'range' },
    {
        key: 'mcType',
        label: { en: 'MC type', no: 'MC-type' },
        inputType: 'single_select',
        options: [
            opt(McType.MOTORSYKKEL, 'Motorcycle', 'Motorsykkel'),
            opt(McType.MOPED, 'Moped', 'Moped'),
            opt(McType.ATV, 'ATV', 'ATV'),
            opt(McType.SNOSCOOTER, 'Snowmobile', 'Snøscooter'),
        ],
    },
    {
        key: 'mopedType',
        label: { en: 'Moped type', no: 'Type Moped' },
        inputType: 'single_select',
        options: [
            opt(MopedType.MOPED, 'Moped', 'Moped'),
            opt(MopedType.SCOOTER, 'Scooter', 'Scooter'),
        ],
        dependsOn: { field: 'mcType', value: McType.MOPED },
    },
    {
        key: 'motorcycleType',
        label: { en: 'Motorcycle type', no: 'Type Motorsykkel' },
        inputType: 'single_select',
        options: [
            opt(MotorcycleType.CHOPPER, 'Chopper', 'Chopper'),
            opt(MotorcycleType.CRUISER, 'Cruiser', 'Cruiser'),
            opt(MotorcycleType.CLASSIC_NAKNE, 'Classic/Naked', 'Classic/Nakne'),
            opt(MotorcycleType.CROSS_ENDURO_TRIAL, 'Cross/Enduro/Trial', 'Cross/Enduro/Trial'),
            opt(MotorcycleType.CUSTOM, 'Custom', 'Custom'),
            opt(MotorcycleType.LETT_MC, 'Light MC', 'Lett MC'),
            opt(MotorcycleType.OFFROAD_MOTARD, 'Offroad/Motard', 'Offroad/Motard'),
            opt(MotorcycleType.SCOOTER, 'Scooter', 'Scooter'),
            opt(MotorcycleType.SIDEVOGN, 'Sidecar', 'Sidevogn'),
            opt(MotorcycleType.SPORT, 'Sport', 'Sport'),
            opt(MotorcycleType.TOURING, 'Touring', 'Touring'),
            opt(MotorcycleType.TRIKE, 'Trike', 'Trike'),
            opt(MotorcycleType.VETERAN, 'Veteran', 'Veteran'),
            opt(MotorcycleType.ANDRE, 'Other', 'Andre'),
        ],
        dependsOn: { field: 'mcType', value: McType.MOTORSYKKEL },
    },
    {
        key: 'fuel',
        label: { en: 'Fuel', no: 'Drivstoff' },
        inputType: 'single_select',
        options: [
            opt(McFuelType.BENSIN, 'Petrol', 'Bensin'),
            opt(McFuelType.DIESEL, 'Diesel', 'Diesel'),
            opt(McFuelType.ELEKTRISITET, 'Electric', 'Elektrisitet'),
        ],
    },
    LOCATION_FILTER,
    MAP_FILTER,
    { key: 'displacement', label: { en: 'Displacement (ccm)', no: 'Slagvolum i ccm' }, inputType: 'range' },
    { key: 'horsepower', label: { en: 'Horsepower', no: 'Antall hestekrefter' }, inputType: 'range' },
    CONDITION_FILTER,
];

const BIKE_FILTERS: IFilterField[] = [
    LOCATION_FILTER,
    MAP_FILTER,
    {
        key: 'bikeType',
        label: { en: 'Bike type', no: 'Sykkeltype' },
        inputType: 'single_select',
        options: [
            opt(BikeType.BMX, 'BMX', 'BMX'),
            opt(BikeType.CYCLOCROSS_GRAVEL, 'Cyclocross/Gravel', 'Cyclocross/gravel'),
            opt(BikeType.ELEKTRISKE, 'Electric', 'Elektriske'),
            opt(BikeType.FULLDAMPER, 'Full suspension', 'Fulldamper'),
            opt(BikeType.HYBRID, 'Hybrid', 'Hybrid'),
            opt(BikeType.LANDEVEI, 'Road', 'Landevei'),
            opt(BikeType.TERRENG, 'Mountain', 'Terreng'),
            opt(BikeType.BARNESYKKEL, "Children's bike 2-12 yr", 'Barnesykkel 2-12 år'),
            opt(BikeType.BYSYKKEL, 'City/Folding', 'Bysykkel/sammenleggbare'),
            opt(BikeType.SPARKESYKKEL, 'Kick scooter', 'Sparkesykkel'),
            opt(BikeType.TREHJULSSYKKEL, 'Tricycle/Balance bike', 'Trehjulssykkel/løpesykkel'),
            opt(BikeType.ANDRE, 'Other', 'Andre'),
        ],
    },
    CONDITION_FILTER,
    SALE_FORM_FILTER,
];

const JOB_FILTERS: IFilterField[] = [
    {
        key: 'employmentType',
        label: { en: 'Employment type', no: 'Stillingstype' },
        inputType: 'single_select',
        options: [
            opt(EmploymentType.HELTID, 'Full-time', 'Heltid'),
            opt(EmploymentType.DELTID, 'Part-time', 'Deltid'),
            opt(EmploymentType.LEDERSTILLING, 'Management', 'Lederstilling'),
        ],
    },
    // The form stores `remoteWorkType`, never the model's unused `remoteWork`
    // boolean, so a yes/no chip here matched no job at all.
    {
        key: 'remoteWorkType',
        label: { en: 'Remote work', no: 'Hjemmekontor' },
        inputType: 'single_select',
        options: [
            opt(RemoteWorkType.DELVIS, 'Partly remote', 'Delvis hjemmearbeid'),
            opt(RemoteWorkType.KUN_HJEMME, 'Fully remote', 'Kun hjemmearbeid'),
        ],
    },
    LOCATION_FILTER,
    MAP_FILTER,
    {
        key: 'workLanguage',
        label: { en: 'Work language', no: 'Arbeidsspråk' },
        inputType: 'single_select',
        options: [
            opt(WorkLanguage.NORSK, 'Norwegian', 'Norsk'),
            opt(WorkLanguage.ENGELSK, 'English', 'Engelsk'),
        ],
    },
    {
        key: 'contractType',
        label: { en: 'Contract type', no: 'Ansettelsesform' },
        inputType: 'single_select',
        options: [
            opt(ContractType.BEMANNINGSBYRA, 'Staffing agency', 'Bemanningsbyrå'),
            opt(ContractType.ENGASJEMENT, 'Engagement', 'Engasjement'),
            opt(ContractType.FAST, 'Permanent', 'Fast'),
            opt(ContractType.LAERLING, 'Apprentice', 'Lærling'),
            opt(ContractType.PROSJEKT, 'Project', 'Prosjekt'),
            opt(ContractType.SELVSTENDIG, 'Self-employed', 'Selvstendig næringsdrivende'),
            opt(ContractType.SOMMER_SESONG, 'Summer/Seasonal', 'Sommer/Sesong'),
            opt(ContractType.TRAINEE, 'Trainee', 'Trainee'),
            opt(ContractType.VIKARIAT, 'Temporary', 'Vikariat'),
        ],
    },
    {
        key: 'sector',
        label: { en: 'Sector', no: 'Sektor' },
        inputType: 'single_select',
        options: [
            opt(Sector.FRANCHISE, 'Franchise/Self-employed', 'Franchise/Selvstendig næringsdrivende'),
            opt(Sector.OFFENTLIG, 'Public', 'Offentlig'),
            opt(Sector.ORGANISASJONER, 'Organizations', 'Organisasjoner'),
            opt(Sector.PRIVAT, 'Private', 'Privat'),
            opt(Sector.SAMVIRKE, 'Cooperative', 'Samvirke'),
        ],
    },
];

const BOOK_FILTERS: IFilterField[] = [
    LOCATION_FILTER,
    MAP_FILTER,
    {
        key: 'bookCategory',
        label: { en: 'Category', no: 'Kategori' },
        inputType: 'single_select',
        options: [
            opt(BookCategory.VIDEREGAENDE, 'High school books', 'Videregående bøker'),
            opt(BookCategory.UNIVERSITET, 'University books', 'Universitetsbøker'),
            opt(BookCategory.BARNEBOKER, "Children's books", 'Barnebøker'),
            opt(BookCategory.ROMANER, 'Novels', 'Romaner'),
        ],
    },
    CONDITION_FILTER,
    SALE_FORM_FILTER,
];

export const FURNITURE_BRANDS = ['Ikea', 'Samsung', 'LG', 'Sony', 'Artwood', 'Saxo Living', 'Englesson'] as const;
export const ELECTRONICS_BRANDS = ['Apple', 'Sony', 'Samsung', 'Xiaomi', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft', 'Dell'] as const;
export const CLOTHING_BRANDS = ['Adidas', 'Nike', 'Gant', 'Holzweiler', 'Levis', 'Fila', 'Hugo Boss', 'Line of Oslo', 'Valentino', 'Armani', 'Les Deux', 'Diesel', 'Ganni'] as const;

/**
 * Brand on these forms is free text with no list behind it, so a select would
 * hide every listing whose brand is not one of the handful below — and the
 * query matches case-insensitively as a substring anyway. The options ride
 * along as *suggestions* for an autocomplete; the input accepts anything.
 */
const makeBrandFilter = (brands: readonly string[]): IFilterField => ({
    key: 'brand',
    label: { en: 'Brand', no: 'Merke' },
    inputType: 'text',
    options: brands.map(b => opt(b, b, b)),
});

const FURNITURE_FILTERS: IFilterField[] = [
    LOCATION_FILTER, MAP_FILTER, makeBrandFilter(FURNITURE_BRANDS), CONDITION_FILTER, SALE_FORM_FILTER,
];

const ELECTRONICS_FILTERS: IFilterField[] = [
    LOCATION_FILTER, MAP_FILTER, makeBrandFilter(ELECTRONICS_BRANDS), CONDITION_FILTER, SALE_FORM_FILTER,
];

const CLOTHING_FILTERS: IFilterField[] = [
    LOCATION_FILTER, MAP_FILTER, makeBrandFilter(CLOTHING_BRANDS), CONDITION_FILTER, SALE_FORM_FILTER,
];

// --- Exported registries ---

export const FILTER_DEFINITIONS: Record<string, IFilterField[]> = {
    sellx: SELLX_FILTERS,
    property: PROPERTY_FILTERS,
    car: CAR_FILTERS,
    boat: BOAT_FILTERS,
    motorcycle: MOTORCYCLE_FILTERS,
    bike: BIKE_FILTERS,
    job: JOB_FILTERS,
    book: BOOK_FILTERS,
    furniture: FURNITURE_FILTERS,
    electronics: ELECTRONICS_FILTERS,
    clothing: CLOTHING_FILTERS,
};

// --- Sort definitions ---

const BASE_SORTS: ISortOption[] = [
    { key: 'createdAt', label: { en: 'Oldest first', no: 'Eldste først' } },
    { key: 'relevance', label: { en: 'Most relevant', no: 'Mest relevant' }, isDefault: true },
    { key: '-createdAt', label: { en: 'Newest first', no: 'Nyeste først' } },
    { key: '-price', label: { en: 'Price high-low', no: 'Pris høy-lav' } },
    { key: 'price', label: { en: 'Price low-high', no: 'Pris lav-høy' } },
    { key: 'nearest', label: { en: 'Nearest', no: 'Nærmest' } },
];

const YEAR_MILEAGE_SORTS: ISortOption[] = [
    { key: 'manufacturedYear', label: { en: 'Year oldest-newest', no: 'Årsmodell eldst-nyest' } },
    { key: '-manufacturedYear', label: { en: 'Year newest-oldest', no: 'Årsmodell nyest-eldst' } },
    { key: '-mileage', label: { en: 'Mileage high-low', no: 'km høy-lav' } },
    { key: 'mileage', label: { en: 'Mileage low-high', no: 'km lav-høy' } },
];

export const SORT_DEFINITIONS: Record<string, ISortOption[]> = {
    sellx: BASE_SORTS,
    property: [
        ...BASE_SORTS,
        { key: 'usableArea', label: { en: 'Area low-high', no: 'Areal lav-høy' } },
        { key: '-usableArea', label: { en: 'Area high-low', no: 'Areal høy-lav' } },
    ],
    car: [...BASE_SORTS, ...YEAR_MILEAGE_SORTS],
    boat: [
        ...BASE_SORTS,
        { key: '-length', label: { en: 'Length high-low', no: 'Fot høy-lav' } },
        { key: 'length', label: { en: 'Length low-high', no: 'Fot lav-høy' } },
        { key: '-maxSpeedKnots', label: { en: 'Knots high-low', no: 'Knop høy-lav' } },
        { key: 'maxSpeedKnots', label: { en: 'Knots low-high', no: 'Knop lav-høy' } },
        { key: 'year', label: { en: 'Year oldest-newest', no: 'Årsmodell eldst-nyest' } },
        { key: '-year', label: { en: 'Year newest-oldest', no: 'Årsmodell nyest-eldst' } },
    ],
    motorcycle: [...BASE_SORTS, ...YEAR_MILEAGE_SORTS],
    bike: BASE_SORTS,
    job: BASE_SORTS.filter(s => !s.key.includes('price')),
    electronics: BASE_SORTS,
    book: BASE_SORTS,
    furniture: BASE_SORTS,
    clothing: BASE_SORTS,
};

// --- Brand-model maps for dependent lookups ---

export const BRAND_MODEL_MAPS: Record<string, Record<string, readonly string[]>> = {
    car: CAR_BRANDS,
};
