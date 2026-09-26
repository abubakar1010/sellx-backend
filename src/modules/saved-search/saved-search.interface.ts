import type { Document } from 'mongoose';

export interface ISavedSearchFilters {
    [key: string]: unknown;
}

export interface ISavedSearch {
    user: string;
    text?: string;
    category?: string;
    filters?: ISavedSearchFilters;
    sort?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISavedSearchDocument extends ISavedSearch, Document {
    id: string;
}
