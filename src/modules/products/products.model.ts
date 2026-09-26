import mongoose, { Schema, model } from 'mongoose';
import {
    ProductStatus,
    TransactionType,
    Condition,
    TransmissionType,
    PromotionPlanType,
} from './product.enum';
import type { IProduct, IRecentlyViewed } from './product.interface';
import { CURRENCY } from '@/core/constants/currency';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';

const MediaSchema = new Schema(
    {
        url: { type: String, required: true },
        publicId: String,
        type: { type: String, enum: ['image', 'video'], default: 'image' },
    },
    { _id: false },
);

const DocumentSchema = new Schema(
    {
        url: { type: String, required: true },
        publicId: String,
        name: String,
        mimeType: String,
        size: Number,
    },
    { _id: false },
);

/** A single viewing slot. The spec allows several per listing. */
const ViewingSchema = new Schema(
    {
        date: { type: Date, required: true },
        fromTime: String,
        toTime: String,
    },
    { _id: false },
);

/** Job listings may name several contact people. */
const ContactPersonSchema = new Schema(
    {
        name: { type: String, required: true },
        title: String,
        phone: String,
        email: String,
    },
    { _id: false },
);

const LocationSchema = new Schema(
    {
        address: { type: String, required: true },
        city: String,
        country: String,
        coordinates: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
    },
    { _id: false },
);

const ContactSchema = new Schema(
    {
        type: { type: String, enum: ['phone', 'email', 'whatsapp'], required: true },
        value: { type: String, required: true },
    },
    { _id: false },
);

const PrivacySchema = new Schema(
    {
        hideName: { type: Boolean, default: false },
        hideProfile: { type: Boolean, default: false },
        hidePhone: { type: Boolean, default: false },
    },
    { _id: false },
);

const PromotionSchema = new Schema(
    {
        isActive: { type: Boolean, default: false },
        plan: {
            type: String,
            enum: Object.values(PromotionPlanType),
            default: PromotionPlanType.FREE,
        },
        startedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        durationDays: { type: Number, default: null },
        purchaseDate: { type: Date, default: null },
        transactionId: String,
        metadata: {
            boostScore: { type: Number, default: 0 },
            backgroundColor: { type: String, default: '#000000' },
            label: { type: String, default: '' },
        },
    },
    { _id: false },
);

const ProductSchema = new Schema<IProduct>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        store: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
        // The lower bound is per-form, not per-model: every listing needs at least
        // one image except the property "wanted to rent" ad, so the controller
        // enforces it and this keeps the upper bound.
        media: {
            type: [MediaSchema],
            default: [],
            validate: [(v: any) => v.length <= 10, 'Media cannot exceed 10 items'],
        },
        title: String,
        description: String,
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: [CURRENCY], default: CURRENCY },
        transactionType: {
            type: String,
            enum: Object.values(TransactionType),
            default: TransactionType.FOR_SELL,
        },

        brand: String,
        carModel: String,
        variant: String,
        condition: { type: String, enum: Object.values(Condition) },
        manufacturedYear: Number,
        registrationYear: Number,
        registrationNumber: String,
        seats: Number,
        doors: Number,
        fuel: String,
        horsepower: Number,
        transmission: { type: String, enum: Object.values(TransmissionType) },
        bodyType: String,
        bodyColor: String,
        interiorColor: String,
        mileage: Number,
        hasDamage: { type: Boolean, default: false },
        hasRepairs: { type: Boolean, default: false },
        type: String,
        usableArea: Number,
        internalArea: Number,
        externalArea: Number,
        balconyArea: Number,
        yearBuilt: Number,
        renovatedYear: Number,
        bedrooms: Number,
        totalRooms: Number,
        floorLevel: String,
        plotSize: Number,
        leaseInfo: String,
        year: Number,
        length: Number,
        width: Number,

        // Vehicle extended
        vehicleLocation: String,
        vehicleType: String,
        driveType: String,
        equipment: [String],
        trailerWeight: Number,
        warrantyType: String,
        taxClass: String,

        // Property extended
        ownershipType: String,
        commonExpenses: Number,
        energyRating: String,
        showingDate: Date,

        // Boat extended
        maxSpeedKnots: Number,
        motorIncluded: Boolean,
        motorType: String,
        buildMaterial: String,
        sleepingPlaces: Number,

        // Motorcycle extended
        mcType: String,
        mopedType: String,
        motorcycleType: String,
        displacement: Number,

        // Bike
        bikeType: String,

        // Job
        employmentType: String,
        remoteWork: Boolean,
        workLanguage: String,
        contractType: String,
        sector: String,

        // Book
        bookCategory: String,

        // Common (every category)
        videoLink: String,
        totalPrice: { type: Number, min: 0 },
        documents: { type: [DocumentSchema], default: [] },
        viewings: { type: [ViewingSchema], default: [] },

        // Property - basic and official identification
        accessDescription: String,
        locationDescription: String,
        neighborhood: String,
        municipalityNumber: String,
        farmNumber: String,
        usageNumber: String,
        sectionNumber: String,
        leaseholdNumber: String,
        apartmentNumber: String,

        // Property - areas
        primaryRoomArea: Number,
        groundArea: Number,
        areaDescription: String,

        // Property - construction
        heatingRating: String,

        // Property - land
        leaseTerm: String,
        leaseFee: Number,
        plotCharacteristics: String,

        // Property - financial
        sharedCostsAfterInterestFree: Number,
        sharedCostsInclude: String,
        propertyTaxValue: Number,
        additionalCosts: Number,
        additionalCostsInclude: String,
        sharedDebt: Number,
        appraisalValue: Number,
        loanValue: Number,
        sharedEquity: Number,
        annualMunicipalFees: Number,
        annualPropertyTax: Number,
        debtAndCostsInfo: String,
        rightOfFirstRefusal: String,
        virtualTourLink: String,

        // Property - rental
        furnishing: String,
        deposit: Number,
        rentIncludes: String,
        rentalPeriodStart: Date,
        rentalPeriodEnd: Date,
        additionalRemarks: String,

        // Property - wanted to rent
        preferredArea: String,
        preferredPropertyType: String,
        numberOfTenants: Number,
        moveInDate: Date,

        // Vehicle - car, motorhome and caravan
        chassisNumber: String,
        engineTuned: Boolean,
        transmissionDesignation: String,
        driveTypeDesignation: String,
        trunkVolume: Number,
        weight: Number,
        totalWeight: Number,
        colorDescription: String,
        firstRegistered: Date,
        numberOfOwners: Number,
        lastEuApprovedAt: Date,
        nextEuInspectionAt: Date,
        hasConditionReport: Boolean,
        hasWarranty: Boolean,
        conditionReportProvider: String,
        maintenanceProgramFollowed: Boolean,
        reRegistrationFee: { type: Number, min: 0 },
        reRegistrationExempt: Boolean,
        hasLiens: Boolean,
        motorhomeType: String,
        chassisType: String,
        cylinderCapacity: Number,
        bedType: String,
        registeredSeats: Number,
        totalLength: Number,
        interiorLength: Number,

        // Boat
        engineBrand: String,
        depth: Number,
        lysNumber: String,
        equipmentDescription: String,
        color: String,

        // Job
        jobTitle: String,
        numberOfPositions: Number,
        industry: String,
        jobFunction: String,
        remoteWorkType: String,
        keywords: [String],
        salaryDescription: String,
        otherInfo: String,
        employerName: String,
        companyInfo: String,
        website: String,
        linkedin: String,
        contactPersons: { type: [ContactPersonSchema], default: [] },

        location: LocationSchema,
        contacts: [ContactSchema],
        facilities: [String],
        privacy: { type: PrivacySchema, default: () => ({}) },
        quantity: { type: Number, min: 0 },
        promotion: { type: PromotionSchema, default: () => ({}) },
        listingPurchase: { type: Schema.Types.ObjectId, ref: 'ListingPurchase', index: true },
        userSubscription: { type: Schema.Types.ObjectId, ref: 'UserSubscription', index: true },
        listingExpiresAt: { type: Date, default: null, index: true },
        status: { type: String, enum: Object.values(ProductStatus), default: ProductStatus.DRAFT },
        rejectionReason: { type: String },
        viewCount: { type: Number, default: 0, min: 0 },
        favoriteCount: { type: Number, default: 0, min: 0 },
        soldCount: { type: Number, default: 0, min: 0 },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        version: { type: Number, default: 1 },
        lastEditedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: 'products',
        versionKey: false,
    },
);

ProductSchema.index({ 'location.coordinates': '2dsphere' });

ProductSchema.pre(/^find/, function () {
    (this as any).where({ isDeleted: false });
});

ProductSchema.plugin(paginatePlugin);
ProductSchema.plugin(toJSONPlugin);

export const Product = model<IProduct, PaginateModel<IProduct>>('Product', ProductSchema);

export const FavoriteModel = mongoose.model(
    'Favorite',
    new Schema(
        {
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        },
        { timestamps: true, versionKey: false },
    ),
);

export const ProductReportModel = mongoose.model(
    'ProductReport',
    new Schema(
        {
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
            reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
            reason: { type: String, required: true },
            details: String,
        },
        { timestamps: true, versionKey: false },
    ),
);

export const RecentlyViewedModel = mongoose.model<IRecentlyViewed>(
    'RecentlyViewed',
    new Schema(
        {
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            viewedAt: { type: Date, default: Date.now },
        },
        { timestamps: true, versionKey: false },
    ),
);
RecentlyViewedModel.schema.index({ user: 1, product: 1 }, { unique: true });
RecentlyViewedModel.schema.index({ user: 1, viewedAt: -1 });

const BoostPlanSchema = new Schema(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: [CURRENCY], default: CURRENCY },
        durationHours: { type: Number, required: true, min: 1 },
        description: String,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'boostplans', versionKey: false },
);

BoostPlanSchema.plugin(paginatePlugin);
BoostPlanSchema.plugin(toJSONPlugin);

export const BoostPlanModel = mongoose.model('BoostPlan', BoostPlanSchema);
