import type { Document, Types } from 'mongoose';

export interface IListingPackageSnapshot {
    name: string;
    category: string;
    categoryName: string;
    durationHours: number;
    price: number;
    maxListings: number;
    currency: string;
    validityDays: number;
}

export const LISTING_PURCHASE_STATUS = {
    ACTIVE: 'active',
    EXHAUSTED: 'exhausted',
    EXPIRED: 'expired',
} as const;

export type ListingPurchaseStatus = (typeof LISTING_PURCHASE_STATUS)[keyof typeof LISTING_PURCHASE_STATUS];

export interface IListingPurchase {
    user: Types.ObjectId;
    store?: Types.ObjectId;
    category: Types.ObjectId;
    listingPackage: Types.ObjectId;
    paymentTransaction?: Types.ObjectId;
    packageSnapshot: IListingPackageSnapshot;
    listingsUsed: number;
    status: ListingPurchaseStatus;
    purchasedAt: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IListingPurchaseDocument extends IListingPurchase, Document {
    id: string;
    listingsRemaining: number;
}
