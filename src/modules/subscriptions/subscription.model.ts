import mongoose, { Schema } from 'mongoose';
import type { ISubscriptionDocument } from './subscription.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const subscriptionSchema = new Schema<ISubscriptionDocument>(
    {
        name: {
            type: String,
            required: [true, 'Plan name is required'],
            trim: true,
            maxlength: 100,
        },
        icon: {
            type: String,
            trim: true,
            default: '',
        },
        features: {
            type: [String],
            default: [],
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: 0,
        },
        currency: {
            type: String,
            trim: true,
            enum: [CURRENCY],
            default: CURRENCY,
        },
        billingType: {
            type: String,
            enum: ['weekly', 'monthly'],
            required: [true, 'Billing type is required'],
        },
        durationDays: {
            type: Number,
            required: [true, 'Duration days is required'],
            min: 1,
        },
        maxListings: {
            type: Number,
            required: [true, 'Max listings is required'],
            min: -1,
        },
        listingDurationHours: {
            type: Number,
            required: [true, 'Listing duration hours is required'],
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

subscriptionSchema.plugin(toJSONPlugin);
subscriptionSchema.plugin(paginatePlugin);

export const SubscriptionModel = mongoose.model<
    ISubscriptionDocument,
    PaginateModel<ISubscriptionDocument>
>('Subscription', subscriptionSchema);
