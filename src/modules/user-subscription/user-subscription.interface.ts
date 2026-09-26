import type { Document, Types } from 'mongoose';

export interface IPlanSnapshot {
    name: string;
    price: number;
    currency: string;
    billingType: 'weekly' | 'monthly';
    durationDays: number;
    maxListings: number;
    listingDurationHours: number;
}

export const USER_SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
} as const;

export type UserSubscriptionStatus =
    (typeof USER_SUBSCRIPTION_STATUS)[keyof typeof USER_SUBSCRIPTION_STATUS];

export interface IUserSubscription {
    user: Types.ObjectId;
    store: Types.ObjectId;
    subscription: Types.ObjectId;
    planSnapshot: IPlanSnapshot;
    paymentTransaction?: Types.ObjectId;
    status: UserSubscriptionStatus;
    listingsUsed: number;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    stripeSubscriptionId?: string;
    cancelledAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserSubscriptionDocument extends IUserSubscription, Document {
    id: string;
    listingsRemaining: number;
}
