import { NotFoundError, BadRequestError } from '@/core/errors';
import { CouponModel } from './coupon.model';
import type { CreateCouponBody, UpdateCouponBody, ValidateCouponQuery } from './coupon.validation';
import type { ICouponDocument } from './coupon.interface';

export const couponService = {
    async create(payload: CreateCouponBody): Promise<ICouponDocument> {
        const existing = await CouponModel.findOne({ code: payload.code.toUpperCase() });
        if (existing) {
            throw new BadRequestError('Coupon code already exists', 'COUPON_EXISTS');
        }

        const coupon = await CouponModel.create({
            code: payload.code,
            type: payload.type,
            value: payload.value,
            categories: payload.categories ?? [],
            expiryDate: new Date(payload.expiryDate),
            usageLimit: payload.usageLimit,
        });

        return coupon as any;
    },

    async getAll(): Promise<ICouponDocument[]> {
        return CouponModel.find()
            .populate('categories', '_id title')
            .sort({ createdAt: -1 })
            .lean() as any;
    },

    async getById(id: string): Promise<ICouponDocument> {
        const doc = await CouponModel.findById(id).populate('categories', '_id title').lean();
        if (!doc) throw new NotFoundError('Coupon not found');
        return doc as any;
    },

    async getStats(): Promise<{ activeCouponsCount: number; totalUsageCount: number }> {
        const now = new Date();
        const [activeCouponsCount, usageResult] = await Promise.all([
            CouponModel.countDocuments({
                isActive: true,
                expiryDate: { $gt: now },
                $expr: { $lt: ['$usage', '$usageLimit'] },
            }),
            CouponModel.aggregate([
                { $group: { _id: null, totalUsage: { $sum: '$usage' } } },
            ]),
        ]);
        const totalUsageCount = usageResult.length > 0 ? usageResult[0].totalUsage : 0;
        return { activeCouponsCount, totalUsageCount };
    },

    async update(id: string, payload: UpdateCouponBody): Promise<ICouponDocument> {
        const updateData: Record<string, unknown> = { ...payload };
        if (payload.code) {
            updateData.code = payload.code;
        }
        if (payload.expiryDate) {
            updateData.expiryDate = new Date(payload.expiryDate);
        }

        const updated = await CouponModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!updated) throw new NotFoundError('Coupon not found');
        return updated;
    },

    async delete(id: string): Promise<void> {
        const existing = await CouponModel.findById(id);
        if (!existing) throw new NotFoundError('Coupon not found');
        await CouponModel.deleteOne({ _id: id });
    },

    async toggleStatus(id: string): Promise<ICouponDocument> {
        const coupon = await CouponModel.findById(id);
        if (!coupon) throw new NotFoundError('Coupon not found');

        coupon.isActive = !coupon.isActive;
        await coupon.save();
        return coupon;
    },

    async validate(query: ValidateCouponQuery): Promise<ICouponDocument> {
        const coupon = await CouponModel.findOne({ code: query.code.toUpperCase() }).lean() as any;
        if (!coupon) {
            throw new NotFoundError('Invalid coupon code', 'INVALID_COUPON');
        }

        if (!coupon.isActive) {
            throw new BadRequestError('Coupon is no longer active', 'COUPON_INACTIVE');
        }

        if (new Date(coupon.expiryDate) < new Date()) {
            throw new BadRequestError('Coupon has expired', 'COUPON_EXPIRED');
        }

        if (coupon.usage >= coupon.usageLimit) {
            throw new BadRequestError('Coupon usage limit reached', 'COUPON_LIMIT_REACHED');
        }

        if (query.categoryId && coupon.categories.length > 0) {
            const categoryMatch = coupon.categories.some(
                (catId: any) => catId.toString() === query.categoryId,
            );
            if (!categoryMatch) {
                throw new BadRequestError('Coupon not applicable for this category', 'COUPON_CATEGORY_MISMATCH');
            }
        }

        return coupon;
    },
};
