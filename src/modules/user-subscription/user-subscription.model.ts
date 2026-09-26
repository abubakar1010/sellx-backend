import mongoose, { Schema } from 'mongoose';

import type { IUserSubscriptionDocument } from './user-subscription.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const planSnapshotSchema = new Schema(
    {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        currency: { type: String, required: true, enum: [CURRENCY], default: CURRENCY },
        billingType: { type: String, enum: ['weekly', 'monthly'], required: true },
        durationDays: { type: Number, required: true },
        maxListings: { type: Number, required: true },
        listingDurationHours: { type: Number, required: true },
    },
    { _id: false },
);

const userSubscriptionSchema = new Schema<IUserSubscriptionDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        store: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true,
        },
        subscription: {
            type: Schema.Types.ObjectId,
            ref: 'Subscription',
            required: true,
            index: true,
        },
        planSnapshot: {
            type: planSnapshotSchema,
            required: true,
        },
        paymentTransaction: {
            type: Schema.Types.ObjectId,
            ref: 'PaymentTransaction',
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'cancelled'],
            default: 'active',
            index: true,
        },
        listingsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
            index: true,
        },
        autoRenew: {
            type: Boolean,
            default: true,
        },
        stripeSubscriptionId: {
            type: String,
            trim: true,
            sparse: true,
            index: true,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'user_subscriptions',
    },
);

userSubscriptionSchema.virtual('listingsRemaining').get(function () {
    if (this.planSnapshot.maxListings === -1) return Infinity;
    return Math.max(0, this.planSnapshot.maxListings - this.listingsUsed);
});

userSubscriptionSchema.index({ user: 1, store: 1, status: 1 });
userSubscriptionSchema.index({ status: 1, endDate: 1 });
userSubscriptionSchema.index({ createdAt: -1 });

userSubscriptionSchema.plugin(toJSONPlugin);
userSubscriptionSchema.plugin(paginatePlugin);

export const UserSubscriptionModel = mongoose.model<
    IUserSubscriptionDocument,
    PaginateModel<IUserSubscriptionDocument>
>('UserSubscription', userSubscriptionSchema);
