import type { Document, Types } from 'mongoose';

export type PaymentType = 'boost' | 'story' | 'listing' | 'subscription' | 'ad';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface IPaymentTransaction {
    user: Types.ObjectId;
    store?: Types.ObjectId;
    email: string;
    paymentType: PaymentType;
    amount: number;
    currency: string;
    status: PaymentStatus;
    referenceId?: Types.ObjectId;
    referenceModel?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPaymentTransactionDocument extends IPaymentTransaction, Document {
    id: string;
}
