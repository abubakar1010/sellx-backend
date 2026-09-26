import type { Document } from 'mongoose';

export type SettingSlug = 'about_us' | 'privacy_policy' | 'terms_and_conditions';

export interface ISetting {
    slug: SettingSlug;
    title: string;
    content: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISettingDocument extends ISetting, Document {
    id: string;
}
