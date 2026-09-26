import mongoose, { Schema } from 'mongoose';
import type { IPaymentTransactionDocument } from './payment.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import { CURRENCY } from '@/core/constants/currency';

const paymentTransactionSchema = new Schema<IPaymentTransactionDocument>(
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
            index: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        paymentType: {
            type: String,
            enum: ['boost', 'story', 'listing', 'subscription', 'ad'],
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            required: true,
            trim: true,
            enum: [CURRENCY],
            default: CURRENCY,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        referenceId: {
            type: Schema.Types.ObjectId,
        },
        referenceModel: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        stripeSessionId: {
            type: String,
            trim: true,
            sparse: true,
            index: true,
        },
        stripePaymentIntentId: {
            type: String,
            trim: true,
            sparse: true,
        },
        stripeSubscriptionId: {
            type: String,
            trim: true,
            sparse: true,
            index: true,
        },
        stripeInvoiceId: {
            type: String,
            trim: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'payment_transactions',
    },
);

paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });
paymentTransactionSchema.index({ paymentType: 1, status: 1 });

paymentTransactionSchema.plugin(toJSONPlugin);
paymentTransactionSchema.plugin(paginatePlugin);

export const PaymentTransactionModel = mongoose.model<
    IPaymentTransactionDocument,
    PaginateModel<IPaymentTransactionDocument>
>('PaymentTransaction', paymentTransactionSchema);
