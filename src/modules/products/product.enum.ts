export enum ProductCategory {
    CAR = 'Car',
    PROPERTY = 'Property',
    BOAT = 'Boat',
    MOTORCYCLE = 'Motorcycle',
    BIKE = 'Bike',
    JOB = 'Job',
    ELECTRONICS = 'Electronics',
    BOOK = 'Book',
    FURNITURE = 'Furniture',
    CLOTHING = 'Clothing',
    SELLX = 'SellX',
}

export enum TransactionType {
    FOR_SELL = 'for_sell',
    FOR_RENT = 'for_rent',
    GIVE_AWAY = 'give_away',
    WANTS_TO_BUY = 'wants_to_buy',
    WANTS_TO_RENT = 'wants_to_rent',
}

export enum Condition {
    NEW = 'new',
    USED = 'used',
}

export enum FuelType {
    PETROL = 'petrol',
    DIESEL = 'diesel',
    ELECTRIC = 'electric',
    HYBRID = 'hybrid',
    CNG = 'cng',
    OTHER = 'other',
}

export enum TransmissionType {
    MANUAL = 'manual',
    AUTOMATIC = 'automatic',
    SEMI_AUTOMATIC = 'semi_automatic',
}

export enum ProductStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    SOLD = 'sold',
    EXPIRED = 'expired',
    REMOVED = 'removed',
    REJECTED = 'rejected',
}

export enum PromotionPlanType {
    FREE = 'free',
    BASIC = 'basic',
    STANDARD = 'standard',
    PREMIUM = 'premium',
    FEATURED = 'featured',
    URGENT = 'urgent',
    SPOTLIGHT = 'spotlight',
}

// --- New as-const value sets (per CLAUDE.md: no new enums) ---

export const VehicleLocation = {
    NORWAY: 'norge',
    ABROAD: 'utlandet',
} as const;
export type VehicleLocationValue = (typeof VehicleLocation)[keyof typeof VehicleLocation];

export const VehicleType = {
    PERSONBIL: 'personbil',
    CAMPINGVOGN: 'campingvogn',
    BOBIL: 'bobil',
} as const;
export type VehicleTypeValue = (typeof VehicleType)[keyof typeof VehicleType];

export const DriveType = {
    FWD: 'forhjulsdrift',
    RWD: 'bakhjulsdrift',
    AWD: 'firehjulsdrift',
} as const;
export type DriveTypeValue = (typeof DriveType)[keyof typeof DriveType];

export const WarrantyType = {
    NEW_CAR: 'nybilgaranti',
    DEALER: 'gammelbilgaranti_fra_forhandler',
} as const;
export type WarrantyTypeValue = (typeof WarrantyType)[keyof typeof WarrantyType];

export const TaxClass = {
    KOMBINERTBIL: 'kombinertbil',
    LETT_LASTEBIL: 'lett_lastebil',
    MINIBUSS: 'minibuss',
    PERSONBIL: 'personbil',
    VAREBIL: 'varebil',
    ANDRE: 'andre',
} as const;
export type TaxClassValue = (typeof TaxClass)[keyof typeof TaxClass];

export const OwnershipType = {
    AKSJE: 'aksje',
    ANDEL: 'andel',
    SELVEIER: 'eier_selveier',
    OBLIGASJON: 'obligasjon',
    ANDRE: 'andre',
} as const;
export type OwnershipTypeValue = (typeof OwnershipType)[keyof typeof OwnershipType];

export const EnergyRating = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
} as const;
export type EnergyRatingValue = (typeof EnergyRating)[keyof typeof EnergyRating];

export const McType = {
    MOTORSYKKEL: 'motorsykkel',
    MOPED: 'moped',
    ATV: 'atv',
    SNOSCOOTER: 'snoscooter',
} as const;
export type McTypeValue = (typeof McType)[keyof typeof McType];

export const MopedType = {
    MOPED: 'moped',
    SCOOTER: 'scooter',
} as const;
export type MopedTypeValue = (typeof MopedType)[keyof typeof MopedType];

export const MotorcycleType = {
    CHOPPER: 'chopper',
    CRUISER: 'cruiser',
    CLASSIC_NAKNE: 'classic_nakne',
    CROSS_ENDURO_TRIAL: 'cross_enduro_trial',
    CUSTOM: 'custom',
    LETT_MC: 'lett_mc',
    OFFROAD_MOTARD: 'offroad_motard',
    SCOOTER: 'scooter',
    SIDEVOGN: 'sidevogn',
    SPORT: 'sport',
    TOURING: 'touring',
    TRIKE: 'trike',
    VETERAN: 'veteran',
    ANDRE: 'andre',
} as const;
export type MotorcycleTypeValue = (typeof MotorcycleType)[keyof typeof MotorcycleType];

export const MotorType = {
    INNENBORDS: 'innenbords',
    UTENBORDS: 'utenbords',
    ANDRE: 'andre',
} as const;
export type MotorTypeValue = (typeof MotorType)[keyof typeof MotorType];

export const BuildMaterial = {
    PLAST: 'plast',
    GLASSFIBER: 'glassfiber',
    TRE: 'tre',
    ALUMINIUM: 'aluminium',
    ANDRE: 'andre',
} as const;
export type BuildMaterialValue = (typeof BuildMaterial)[keyof typeof BuildMaterial];

export const BoatType = {
    BOWRIDER: 'bowrider',
    CABINCRUISER: 'cabincruiser',
    DAYCRUISER: 'daycruiser',
    GUMMIBAT_JOLLE: 'gummibat_jolle',
    RIB: 'rib',
    SEILBAT_MOTORSEILER: 'seilbat_motorseiler',
    SKJAERGAARDSJEEP: 'skjaergaardsjeep',
    PILOTHOUSE: 'pilothouse',
    SPEEDBAT: 'speedbat',
    TREBAT_SNEKKE: 'trebat_snekke',
    YACHT: 'yacht',
    VANNSCOOTER: 'vannscooter',
    YRKESBAT_SJARK: 'yrkesbat_sjark',
    ANDRE: 'andre',
} as const;
export type BoatTypeValue = (typeof BoatType)[keyof typeof BoatType];

export const BikeType = {
    BMX: 'bmx',
    CYCLOCROSS_GRAVEL: 'cyclocross_gravel',
    ELEKTRISKE: 'elektriske',
    FULLDAMPER: 'fulldamper',
    HYBRID: 'hybrid',
    LANDEVEI: 'landevei',
    TERRENG: 'terreng',
    BARNESYKKEL: 'barnesykkel_2_12',
    BYSYKKEL: 'bysykkel_sammenleggbare',
    SPARKESYKKEL: 'sparkesykkel',
    TREHJULSSYKKEL: 'trehjulssykkel_lopesykkel',
    ANDRE: 'andre',
} as const;
export type BikeTypeValue = (typeof BikeType)[keyof typeof BikeType];

export const EmploymentType = {
    DELTID: 'deltid',
    HELTID: 'heltid',
    LEDERSTILLING: 'lederstilling',
} as const;
export type EmploymentTypeValue = (typeof EmploymentType)[keyof typeof EmploymentType];

export const ContractType = {
    BEMANNINGSBYRA: 'bemanningsbyra',
    ENGASJEMENT: 'engasjement',
    FAST: 'fast',
    LAERLING: 'laerling',
    PROSJEKT: 'prosjekt',
    SELVSTENDIG: 'selvstendig_naeringsdrivende',
    SOMMER_SESONG: 'sommer_sesong',
    TRAINEE: 'trainee',
    VIKARIAT: 'vikariat',
} as const;
export type ContractTypeValue = (typeof ContractType)[keyof typeof ContractType];

export const Sector = {
    FRANCHISE: 'franchise_selvstendig',
    OFFENTLIG: 'offentlig',
    ORGANISASJONER: 'organisasjoner',
    PRIVAT: 'privat',
    SAMVIRKE: 'samvirke',
} as const;
export type SectorValue = (typeof Sector)[keyof typeof Sector];

export const WorkLanguage = {
    NORSK: 'norsk',
    ENGELSK: 'engelsk',
} as const;
export type WorkLanguageValue = (typeof WorkLanguage)[keyof typeof WorkLanguage];

export const BookCategory = {
    VIDEREGAENDE: 'videregaende',
    UNIVERSITET: 'universitet',
    BARNEBOKER: 'barneboker',
    ROMANER: 'romaner',
} as const;
export type BookCategoryValue = (typeof BookCategory)[keyof typeof BookCategory];

export const PropertyType = {
    LEILIGHET: 'leilighet',
    ENEBOLIG: 'enebolig',
    REKKEHUS: 'rekkehus',
    TOMANNSBOLIG: 'tomannsbolig',
    GAARDSBRUK: 'gaardsbruk_smaabruk',
    GARASJE_PARKERING: 'garasje_parkering',
    BYGAARD: 'bygaard_flermannsbolig',
    TOMTER: 'tomter',
    PRODUKSJON_INDUSTRI: 'produksjon_industri',
    HYTTE: 'hytte',
    ANDRE: 'andre',
} as const;
export type PropertyTypeValue = (typeof PropertyType)[keyof typeof PropertyType];

export const FloorLevel = {
    KJELLER: 'kjeller',
    FIRST: '1',
    SECOND: '2',
    THIRD: '3',
    FOURTH: '4',
    FIFTH: '5',
    SIXTH: '6',
    SEVENTH: '7',
    EIGHTH: '8',
    ABOVE_EIGHTH: 'over_8',
} as const;
export type FloorLevelValue = (typeof FloorLevel)[keyof typeof FloorLevel];

export const CarBodyType = {
    CABRIOLET: 'cabriolet',
    COUPE: 'coupe',
    FLERBRUKSBIL: 'flerbruksbil',
    KASSE: 'kasse',
    KOMBI_3: 'kombi_3_dors',
    KOMBI_5: 'kombi_5_dors',
    PICKUP: 'pickup',
    SUV_OFFROAD: 'suv_offroad',
    SEDAN: 'sedan',
    STASJONSVOGN: 'stasjonsvogn',
    ANDRE: 'andre',
} as const;
export type CarBodyTypeValue = (typeof CarBodyType)[keyof typeof CarBodyType];

export const CarFuelType = {
    BENSIN: 'bensin',
    DIESEL: 'diesel',
    GASS: 'gass',
    ELEKTRISITET: 'elektrisitet',
    ELEKTRISITET_BENSIN: 'elektrisitet_bensin',
    ELEKTRISITET_DIESEL: 'elektrisitet_diesel',
    GASS_BENSIN: 'gass_bensin',
    GASS_DIESEL: 'gass_diesel',
    HYDROGEN: 'hydrogen',
} as const;
export type CarFuelTypeValue = (typeof CarFuelType)[keyof typeof CarFuelType];

export const BoatFuelType = {
    BENSIN: 'bensin',
    DIESEL: 'diesel',
    ELEKTRISITET: 'elektrisitet',
    HYBRID: 'hybrid',
    ANDRE: 'andre',
} as const;
export type BoatFuelTypeValue = (typeof BoatFuelType)[keyof typeof BoatFuelType];

export const McFuelType = {
    BENSIN: 'bensin',
    DIESEL: 'diesel',
    ELEKTRISITET: 'elektrisitet',
} as const;
export type McFuelTypeValue = (typeof McFuelType)[keyof typeof McFuelType];

export const PropertyFacility = {
    BALKONG_TERRASSE: 'balkong_terrasse',
    GARASJE_PARKERING: 'garasje_parkeringsplass',
    HEIS: 'heis',
    LADEMULIGHET: 'lademulighet',
    PEIS_ILDSTED: 'peis_ildsted',
    STRANDLINJE: 'strandlinje',
    TURTERRENG: 'turterreng',
    UTSIKT: 'utsikt',
    VAKTMESTER: 'vaktmester',
    INGEN_GJENBOERE: 'ingen_gjenboere',
} as const;
export type PropertyFacilityValue = (typeof PropertyFacility)[keyof typeof PropertyFacility];

export const CarEquipment = {
    ABS_BREMSER: 'abs_bremser',
    AIRBAG_FORAN: 'airbag_foran',
    ALARM: 'alarm',
    KLIMAANLEGG: 'klimaanlegg',
    RADIO_DAB: 'radio_dab_plus',
    HENGERFESTE: 'hengerfeste_fast_krok',
} as const;
export type CarEquipmentValue = (typeof CarEquipment)[keyof typeof CarEquipment];

export const HeatingRating = {
    YELLOW: 'gul',
    LIGHT_GREEN: 'lysegronn',
    DARK_GREEN: 'morkegronn',
    ORANGE: 'oransje',
    RED: 'rod',
} as const;
export type HeatingRatingValue = (typeof HeatingRating)[keyof typeof HeatingRating];

export const Furnishing = {
    FURNISHED: 'mobelert',
    PARTIALLY_FURNISHED: 'delvis_mobelert',
    UNFURNISHED: 'umobelert',
} as const;
export type FurnishingValue = (typeof Furnishing)[keyof typeof Furnishing];

/** Property types offered on the "wanted to rent" form. Differs from PropertyType:
 *  it adds hybel / rom_i_bofellesskap and drops the commercial types. */
export const PreferredPropertyType = {
    HYBEL: 'hybel',
    GARASJE_PARKERING: 'garasje_parkering',
    TOMANNSBOLIG: 'tomannsbolig',
    ENEBOLIG: 'enebolig',
    ROM_I_BOFELLESSKAP: 'rom_i_bofellesskap',
    REKKEHUS: 'rekkehus',
    LEILIGHET: 'leilighet',
    ANDRE: 'andre',
} as const;
export type PreferredPropertyTypeValue =
    (typeof PreferredPropertyType)[keyof typeof PreferredPropertyType];

export const MotorhomeType = {
    ALKOVE: 'alkove',
    BYBOBIL: 'bybobil',
    CAMPER: 'camper',
    DELINTEGRERT: 'delintegrert',
    INTEGRERT: 'integrert',
} as const;
export type MotorhomeTypeValue = (typeof MotorhomeType)[keyof typeof MotorhomeType];

export const BedType = {
    ENKELSENG: 'enkelseng',
    DOBBELTSENG: 'dobbeltseng',
    FRANSK: 'fransk_senglosning',
    TVERSGAENDE: 'tversgaende_seng',
} as const;
export type BedTypeValue = (typeof BedType)[keyof typeof BedType];

export const ConditionReportProvider = {
    NAF: 'naf',
    VIKING: 'viking',
} as const;
export type ConditionReportProviderValue =
    (typeof ConditionReportProvider)[keyof typeof ConditionReportProvider];

/** Shared by motorhome and motorcycle: "resterende ny/brukt garanti". */
export const RemainingWarrantyType = {
    NY: 'resterende_ny_garanti',
    BRUKT: 'resterende_brukt_garanti',
} as const;
export type RemainingWarrantyTypeValue =
    (typeof RemainingWarrantyType)[keyof typeof RemainingWarrantyType];

export const RemoteWorkType = {
    DELVIS: 'delvis_hjemmearbeid',
    KUN_HJEMME: 'kun_hjemmearbeid',
} as const;
export type RemoteWorkTypeValue = (typeof RemoteWorkType)[keyof typeof RemoteWorkType];
