import type { Document, Types } from 'mongoose';

export type ProfileType = 'user' | 'store';

export interface IStoreContact {
    type: 'phone' | 'email' | 'whatsapp';
    value: string;
}

export interface IDailyStat {
    date: Date;
    views: number;
    clicks: number;
}

export type StoreStatus = 'active' | 'pending' | 'blocked';
export type StoreType = 'regular' | 'professional';

export interface IStore {
    user: Types.ObjectId;
    name: string;
    slug: string;
    logo?: string;
    banner?: string;
    description?: string;
    category: Types.ObjectId;
    contacts: IStoreContact[];
    status: StoreStatus;
    storeType: StoreType;
    isActive: boolean;
    isVerified: boolean;
    totalProducts: number;
    avgRating: number;
    totalReviewCount: number;
    followerCount: number;
    totalViews: number;
    totalClicks: number;
    totalMessages: number;
    dailyStats: IDailyStat[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoreDocument extends IStore, Document {
    id: string;
}

export type StoreProfileType = ProfileType;

export interface IStoreBasic {
    id: string;
    name: string;
    logo?: string;
    banner?: string;
    category: {
        id: string;
        title: string;
        slug: string;
    };
    isActive: boolean;
    isVerified: boolean;
}

export interface CreateStoreInput {
    name: string;
    category: string;
    logo?: string;
    banner?: string;
    description?: string;
    contacts?: IStoreContact[];
}

export interface UpdateStoreInput {
    name?: string;
    category?: string;
    logo?: string;
    banner?: string;
    description?: string;
    contacts?: IStoreContact[];
}
