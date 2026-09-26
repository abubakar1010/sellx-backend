import type { Document, Types } from 'mongoose';

export type CouponType = 'percentage' | 'flat';

export interface ICoupon {
    code: string;
    type: CouponType;
    value: number;
    categories: Types.ObjectId[];
    expiryDate: Date;
    usageLimit: number;
    usage: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICouponDocument extends ICoupon, Document {
    id: string;
}

export interface CreateCouponInput {
    code: string;
    type: CouponType;
    value: number;
    categories?: string[];
    expiryDate: string;
    usageLimit: number;
}

export interface UpdateCouponInput {
    code?: string;
    type?: CouponType;
    value?: number;
    categories?: string[];
    expiryDate?: string;
    usageLimit?: number;
    isActive?: boolean;
}
