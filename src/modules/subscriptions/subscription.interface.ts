import type { Document } from 'mongoose';

export type BillingType = 'weekly' | 'monthly';

export interface ISubscription {
    name: string;
    icon: string;
    features: string[];
    description?: string;
    price: number;
    currency: string;
    billingType: BillingType;
    durationDays: number;
    maxListings: number;
    listingDurationHours: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISubscriptionDocument extends ISubscription, Document {
    id: string;
}
