import type { Document, Types } from 'mongoose';

export interface IPackageSnapshot {
    name: string;
    description: string;
    durationHours: number;
    price: number;
    maxStories: number;
    currency: string;
    validityDays: number;
}

export const STORY_PURCHASE_STATUS = {
    ACTIVE: 'active',
    EXHAUSTED: 'exhausted',
    EXPIRED: 'expired',
} as const;

export type StoryPurchaseStatus = (typeof STORY_PURCHASE_STATUS)[keyof typeof STORY_PURCHASE_STATUS];

export interface IStoryPurchase {
    user: Types.ObjectId;
    store?: Types.ObjectId;
    storyPackage: Types.ObjectId;
    paymentTransaction?: Types.ObjectId;
    packageSnapshot: IPackageSnapshot;
    storiesUsed: number;
    status: StoryPurchaseStatus;
    purchasedAt: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoryPurchaseDocument extends IStoryPurchase, Document {
    id: string;
    storiesRemaining: number;
}
