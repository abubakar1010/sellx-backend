// category.interface.ts
import type { Document } from 'mongoose';

export interface ICategory {
    title: string;
    slug: string;
    thumbnail: string;
    description?: string;
    basicPricing?: number;
    plusPricing?: number;
    sortOrder: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICategoryDocument extends ICategory, Document {
    id: string;
}
