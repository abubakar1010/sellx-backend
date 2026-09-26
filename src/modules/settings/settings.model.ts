import mongoose, { Schema } from 'mongoose';
import type { ISettingDocument } from './settings.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const settingSchema = new Schema<ISettingDocument>(
    {
        slug: {
            type: String,
            enum: ['about_us', 'privacy_policy', 'terms_and_conditions'],
            required: [true, 'Slug is required'],
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: 200,
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'settings',
    },
);

settingSchema.plugin(toJSONPlugin);

export const SettingModel = mongoose.model<ISettingDocument>('Setting', settingSchema);
