import mongoose, { Schema } from 'mongoose';
import type { IAdCampaignDocument, IAdPackageDocument } from './ads.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const adCampaignSchema = new Schema<IAdCampaignDocument>(
    {
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true,
        },
        thumbnail: {
            type: String,
            required: true,
            trim: true,
        },
        destination: {
            type: String,
            required: true,
            trim: true,
        },
        adTitle: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        durationDays: {
            type: Number,
            required: true,
            min: 1,
        },
        adType: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: [CURRENCY],
            default: CURRENCY,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'ad_campaigns',
        versionKey: false,
    },
);

adCampaignSchema.index({ adType: 1, isActive: 1 });
adCampaignSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });

adCampaignSchema.plugin(toJSONPlugin);
adCampaignSchema.plugin(paginatePlugin);

export const AdCampaignModel = mongoose.model<IAdCampaignDocument, PaginateModel<IAdCampaignDocument>>(
    'AdCampaign',
    adCampaignSchema,
);

const adPackageSchema = new Schema<IAdPackageDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        durationDays: {
            type: Number,
            required: true,
            min: 1,
            unique: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: [CURRENCY],
            default: CURRENCY,
        },
        adType: {
            type: String,
            required: true,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        collection: 'ad_packages',
        versionKey: false,
    },
);

adPackageSchema.plugin(toJSONPlugin);
adPackageSchema.plugin(paginatePlugin);

export const AdPackageModel = mongoose.model<IAdPackageDocument>(
    'AdPackage',
    adPackageSchema,
);
