import type { Document, Types } from 'mongoose';
import type {
    ProductStatus,
    TransactionType,
    Condition,
    TransmissionType,
    PromotionPlanType,
} from './product.enum';

export interface IMedia {
    url: string;
    publicId?: string;
    type: 'image' | 'video';
}

export interface IDocument {
    url: string;
    publicId?: string;
    name?: string;
    mimeType?: string;
    size?: number;
}

export interface IViewing {
    date: Date;
    fromTime?: string;
    toTime?: string;
}

export interface IContactPerson {
    name: string;
    title?: string;
    phone?: string;
    email?: string;
}

export interface ILocation {
    address: string;
    city?: string;
    country?: string;
    coordinates?: {
        type: 'Point';
        coordinates: [number, number];
    };
}

export interface IContact {
    type: 'phone' | 'email' | 'whatsapp';
    value: string;
}

export interface IPrivacy {
    hideName: boolean;
    hideProfile: boolean;
    hidePhone: boolean;
}

export interface IPromotion {
    isActive: boolean;
    plan: PromotionPlanType;
    startedAt: Date | null;
    expiresAt: Date | null;
    durationDays: number | null;
    purchaseDate: Date | null;
    transactionId?: string;
    metadata: {
        boostScore: number;
        backgroundColor: string;
        label: string;
    };
}

export interface IProduct extends Document {
    user: Types.ObjectId;
    store?: Types.ObjectId;
    category: Types.ObjectId;
    media: IMedia[];
    title?: string;
    description?: string;
    price: number;
    currency: string;
    transactionType: TransactionType;

    brand?: string;
    carModel?: string;
    variant?: string;
    condition?: Condition;
    manufacturedYear?: number;
    registrationYear?: number;
    registrationNumber?: string;
    seats?: number;
    doors?: number;
    fuel?: string;
    horsepower?: number;
    transmission?: TransmissionType;
    bodyType?: string;
    bodyColor?: string;
    interiorColor?: string;
    mileage?: number;
    hasDamage?: boolean;
    hasRepairs?: boolean;
    type?: string;
    usableArea?: number;
    internalArea?: number;
    externalArea?: number;
    balconyArea?: number;
    yearBuilt?: number;
    renovatedYear?: number;
    bedrooms?: number;
    totalRooms?: number;
    floorLevel?: string;
    plotSize?: number;
    leaseInfo?: string;
    year?: number;
    length?: number;
    width?: number;

    // Vehicle extended
    vehicleLocation?: string;
    vehicleType?: string;
    driveType?: string;
    equipment?: string[];
    trailerWeight?: number;
    warrantyType?: string;
    taxClass?: string;

    // Property extended
    ownershipType?: string;
    commonExpenses?: number;
    energyRating?: string;
    showingDate?: Date;

    // Boat extended
    maxSpeedKnots?: number;
    motorIncluded?: boolean;
    motorType?: string;
    buildMaterial?: string;
    sleepingPlaces?: number;

    // Motorcycle extended
    mcType?: string;
    mopedType?: string;
    motorcycleType?: string;
    displacement?: number;

    // Bike
    bikeType?: string;

    // Job
    employmentType?: string;
    remoteWork?: boolean;
    workLanguage?: string;
    contractType?: string;
    sector?: string;

    // Book
    bookCategory?: string;

    // Common (every category)
    videoLink?: string;
    /** Server-computed, never client-set. Property: price + sharedDebt + additionalCosts.
     *  Car / motorcycle: price + reRegistrationFee. */
    totalPrice?: number;
    documents?: IDocument[];
    viewings?: IViewing[];

    // Property - basic and official identification
    accessDescription?: string;
    locationDescription?: string;
    neighborhood?: string;
    municipalityNumber?: string;
    farmNumber?: string;
    usageNumber?: string;
    sectionNumber?: string;
    leaseholdNumber?: string;
    apartmentNumber?: string;

    // Property - areas
    primaryRoomArea?: number;
    groundArea?: number;
    areaDescription?: string;

    // Property - construction
    heatingRating?: string;

    // Property - land
    leaseTerm?: string;
    leaseFee?: number;
    plotCharacteristics?: string;

    // Property - financial
    sharedCostsAfterInterestFree?: number;
    sharedCostsInclude?: string;
    propertyTaxValue?: number;
    additionalCosts?: number;
    additionalCostsInclude?: string;
    sharedDebt?: number;
    appraisalValue?: number;
    loanValue?: number;
    sharedEquity?: number;
    annualMunicipalFees?: number;
    annualPropertyTax?: number;
    debtAndCostsInfo?: string;
    rightOfFirstRefusal?: string;
    virtualTourLink?: string;

    // Property - rental
    furnishing?: string;
    deposit?: number;
    rentIncludes?: string;
    rentalPeriodStart?: Date;
    rentalPeriodEnd?: Date;
    additionalRemarks?: string;

    // Property - wanted to rent
    preferredArea?: string;
    preferredPropertyType?: string;
    numberOfTenants?: number;
    moveInDate?: Date;

    // Vehicle - car, motorhome and caravan
    chassisNumber?: string;
    engineTuned?: boolean;
    transmissionDesignation?: string;
    driveTypeDesignation?: string;
    trunkVolume?: number;
    weight?: number;
    totalWeight?: number;
    colorDescription?: string;
    firstRegistered?: Date;
    numberOfOwners?: number;
    lastEuApprovedAt?: Date;
    nextEuInspectionAt?: Date;
    hasConditionReport?: boolean;
    hasWarranty?: boolean;
    conditionReportProvider?: string;
    maintenanceProgramFollowed?: boolean;
    reRegistrationFee?: number;
    reRegistrationExempt?: boolean;
    hasLiens?: boolean;
    motorhomeType?: string;
    chassisType?: string;
    cylinderCapacity?: number;
    bedType?: string;
    registeredSeats?: number;
    totalLength?: number;
    interiorLength?: number;

    // Boat
    engineBrand?: string;
    depth?: number;
    lysNumber?: string;
    /** Boats take equipment as free text rather than checkboxes. */
    equipmentDescription?: string;
    color?: string;

    // Job
    jobTitle?: string;
    numberOfPositions?: number;
    industry?: string;
    jobFunction?: string;
    remoteWorkType?: string;
    keywords?: string[];
    salaryDescription?: string;
    otherInfo?: string;
    employerName?: string;
    companyInfo?: string;
    website?: string;
    linkedin?: string;
    contactPersons?: IContactPerson[];

    location?: ILocation;
    contacts?: IContact[];
    facilities?: string[];
    privacy?: IPrivacy;
    quantity?: number;
    promotion: IPromotion;
    listingPurchase?: Types.ObjectId;
    userSubscription?: Types.ObjectId;
    listingExpiresAt?: Date | null;
    status: ProductStatus;
    rejectionReason?: string;
    viewCount: number;
    favoriteCount: number;
    soldCount: number;
    isDeleted: boolean;
    deletedAt?: Date | null;
    version: number;
    lastEditedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * A listing body after the category schema has parsed it. The exact shape varies
 * per category, so only the fields the service itself reads are pinned here.
 */
export interface IProductWritePayload {
    [key: string]: unknown;
    category?: string;
    storeId?: string;
    purchaseId?: string;
    title?: string;
    price?: number;
    transactionType?: string;
    location?: {
        address: string;
        city?: string;
        country?: string;
        latitude: number;
        longitude: number;
    };
}

export interface IRecentlyViewed {
    user: Types.ObjectId;
    product: Types.ObjectId;
    viewedAt: Date;
}

export interface IFavorite {
    user: Types.ObjectId;
    product: Types.ObjectId;
}
export interface IFavoriteDocument extends IFavorite, Document {}

export interface IProductReport {
    product: Types.ObjectId;
    reporter: Types.ObjectId;
    reason: string;
    details?: string;
}
export interface IProductReportDocument extends IProductReport, Document {}
