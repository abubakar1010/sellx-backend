import mongoose, { Schema } from 'mongoose';
import type { IListingPurchaseDocument } from './listing-purchase.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const packageSnapshotSchema = new Schema(
    {
        name: { type: String, required: true },
        category: { type: String, required: true },
        categoryName: { type: String, required: true },
        durationHours: { type: Number, required: true },
        price: { type: Number, required: true },
        maxListings: { type: Number, required: true },
        currency: { type: String, required: true, enum: [CURRENCY], default: CURRENCY },
        validityDays: { type: Number, required: true },
    },
    { _id: false },
);

const listingPurchaseSchema = new Schema<IListingPurchaseDocument>(
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
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true,
        },
        listingPackage: {
            type: Schema.Types.ObjectId,
            ref: 'ListingPackage',
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
        listingsUsed: {
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
        collection: 'listing_purchases',
    },
);

listingPurchaseSchema.virtual('listingsRemaining').get(function () {
    return Math.max(0, this.packageSnapshot.maxListings - this.listingsUsed);
});

listingPurchaseSchema.index({ user: 1, status: 1 });
listingPurchaseSchema.index({ createdAt: -1 });

listingPurchaseSchema.plugin(toJSONPlugin);
listingPurchaseSchema.plugin(paginatePlugin);

export const ListingPurchaseModel = mongoose.model<
    IListingPurchaseDocument,
    PaginateModel<IListingPurchaseDocument>
>('ListingPurchase', listingPurchaseSchema);
