import type { Document, Types } from 'mongoose';

import type { Currency } from '@/core/constants/currency';

export interface IAdCampaign {
    store: Types.ObjectId;
    thumbnail: string;
    destination: string;
    adTitle: string;
    description?: string;
    durationDays: number;
    adType: string;
    price: number;
    currency: Currency;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAdCampaignDocument extends IAdCampaign, Document {
    id: string;
}

export interface IAdPackage {
    name: string;
    durationDays: number;
    price: number;
    currency: Currency;
    adType: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAdPackageDocument extends IAdPackage, Document {
    id: string;
}
