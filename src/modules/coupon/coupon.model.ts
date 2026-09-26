import mongoose, { Schema } from 'mongoose';

import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@/infrastructure/database/plugins/paginate.plugin';
import type { ICouponDocument } from './coupon.interface';

const couponSchema = new Schema<ICouponDocument>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['percentage', 'flat'],
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        categories: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Category',
            },
        ],
        expiryDate: {
            type: Date,
            required: true,
        },
        usageLimit: {
            type: Number,
            required: true,
            min: 1,
        },
        usage: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

couponSchema.plugin(toJSONPlugin);
couponSchema.plugin(paginatePlugin);

export const CouponModel = mongoose.model<ICouponDocument, PaginateModel<ICouponDocument>>(
    'Coupon',
    couponSchema,
    'coupons',
);
