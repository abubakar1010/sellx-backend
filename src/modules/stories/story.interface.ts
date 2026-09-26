import type { Document, Types } from 'mongoose';

export interface ITextOverlay {
    text: string;
    style?: {
        fontSize?: number;
        color?: string;
        fontWeight?: 'normal' | 'bold';
        fontFamily?: string;
        textAlign?: 'left' | 'center' | 'right';
        position?: { x: number; y: number };
    };
}

export interface IStoryView {
    user: Types.ObjectId;
    viewedAt: Date;
}

export interface IStory {
    user: Types.ObjectId;
    store?: Types.ObjectId;
    purchase?: Types.ObjectId;
    media: string;
    texts: ITextOverlay[];
    product?: Types.ObjectId;
    expireIn: number;
    expiresAt: Date;
    views: IStoryView[];
    viewCount: number;
    isDeleted: boolean;
    deletedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoryDocument extends IStory, Document {
    id: string;
    isActive: boolean;
}

export interface CreateStoryInput {
    texts?: ITextOverlay[];
    product?: string;
    purchaseId: string;
}

export interface ListStoriesQuery {
    userId?: string;
    storeId?: string;
    page?: number;
    limit?: number;
}

export interface IStoryPackage {
    name: string;
    description: string;
    durationHours: number;
    price: number;
    maxStories: number;
    isActive: boolean;
    currency: string;
    validityDays: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStoryPackageDocument extends IStoryPackage, Document {
    id: string;
}
