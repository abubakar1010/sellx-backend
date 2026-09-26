import mongoose, { Schema } from 'mongoose';

import type { IStoreDocument } from './store.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

const generateSlug = (name: string): string =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

const storeContactSchema = new Schema(
    {
        type: { type: String, enum: ['phone', 'email', 'whatsapp'], required: true },
        value: { type: String, required: true },
    },
    { _id: false },
);

const storeSchema = new Schema<IStoreDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Store name is required'],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        logo: {
            type: String,
            trim: true,
        },
        banner: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
            index: true,
        },
        contacts: [storeContactSchema],
        status: {
            type: String,
            enum: ['active', 'pending', 'blocked'],
            default: 'active',
            index: true,
        },
        storeType: {
            type: String,
            enum: ['regular', 'professional'],
            default: 'regular',
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        totalProducts: {
            type: Number,
            default: 0,
            min: 0,
        },
        avgRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalReviewCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        followerCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalViews: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalClicks: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalMessages: {
            type: Number,
            default: 0,
            min: 0,
        },
        dailyStats: [
            {
                date: { type: Date, required: true },
                views: { type: Number, default: 0, min: 0 },
                clicks: { type: Number, default: 0, min: 0 },
                _id: false,
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

storeSchema.pre('validate', async function () {
    if (this.isNew && this.name && !this.slug) {
        this.slug = generateSlug(this.name);
    }
});

storeSchema.index({ user: 1, isActive: 1 }, { unique: true });
storeSchema.index({ isActive: 1, totalProducts: -1 });
storeSchema.index({ name: 'text', description: 'text' });

storeSchema.plugin(toJSONPlugin);
storeSchema.plugin(paginatePlugin);

export const StoreModel = mongoose.model<IStoreDocument, PaginateModel<IStoreDocument>>(
    'Store',
    storeSchema,
    'stores',
);
