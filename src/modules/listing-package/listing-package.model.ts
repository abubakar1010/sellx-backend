import mongoose, { Schema } from 'mongoose';
import type { IListingPackageDocument } from './listing-package.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const listingPackageSchema = new Schema<IListingPackageDocument>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true,
        },
        durationHours: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: [CURRENCY], default: CURRENCY, trim: true },
        maxListings: { type: Number, required: true, min: 1, default: 1 },
        isActive: { type: Boolean, default: true, index: true },
        validityDays: { type: Number, required: true, min: 1, default: 30 },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'listing_packages',
    },
);

listingPackageSchema.index({ category: 1, isActive: 1 });
listingPackageSchema.index({ price: 1 });

listingPackageSchema.plugin(toJSONPlugin);
listingPackageSchema.plugin(paginatePlugin);

export const ListingPackageModel = mongoose.model<
    IListingPackageDocument,
    PaginateModel<IListingPackageDocument>
>('ListingPackage', listingPackageSchema);
