import type { Document, Types } from 'mongoose';

export interface IListingPackage {
    name: string;
    category: Types.ObjectId;
    durationHours: number;
    price: number;
    currency: string;
    maxListings: number;
    isActive: boolean;
    validityDays: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IListingPackageDocument extends IListingPackage, Document {
    id: string;
}
