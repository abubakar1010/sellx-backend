import mongoose, { Schema } from 'mongoose';
import type { IStoryPurchaseDocument } from './story-purchase.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const packageSnapshotSchema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        durationHours: { type: Number, required: true },
        price: { type: Number, required: true },
        maxStories: { type: Number, required: true },
        currency: { type: String, required: true, enum: [CURRENCY], default: CURRENCY },
        validityDays: { type: Number, required: true },
    },
    { _id: false },
);

const storyPurchaseSchema = new Schema<IStoryPurchaseDocument>(
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
        },
        storyPackage: {
            type: Schema.Types.ObjectId,
            ref: 'StoryPackage',
            required: true,
            index: true,
        },
        paymentTransaction: {
            type: Schema.Types.ObjectId,
            ref: 'PaymentTransaction',
        },
        packageSnapshot: {
            type: packageSnapshotSchema,
            required: true,
        },
        storiesUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'exhausted', 'expired'],
            default: 'active',
            index: true,
        },
        purchasedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'story_purchases',
    },
);

storyPurchaseSchema.virtual('storiesRemaining').get(function () {
    return Math.max(0, this.packageSnapshot.maxStories - this.storiesUsed);
});

storyPurchaseSchema.index({ user: 1, status: 1 });
storyPurchaseSchema.index({ createdAt: -1 });

storyPurchaseSchema.plugin(toJSONPlugin);
storyPurchaseSchema.plugin(paginatePlugin);

export const StoryPurchaseModel = mongoose.model<
    IStoryPurchaseDocument,
    PaginateModel<IStoryPurchaseDocument>
>('StoryPurchase', storyPurchaseSchema);
