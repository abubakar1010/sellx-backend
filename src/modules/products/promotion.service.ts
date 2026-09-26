import { Product } from './products.model';
import { PromotionPlanType } from './product.enum';

const PLAN_CONFIG: Record<string, any> = {
    [PromotionPlanType.FREE]: { days: 0, boost: 0, color: '#9E9E9E', label: '' },
    [PromotionPlanType.BASIC]: { days: 7, boost: 5, color: '#2196F3', label: 'Basic' },
    [PromotionPlanType.FEATURED]: { days: 14, boost: 15, color: '#FF9800', label: 'Featured' },
    [PromotionPlanType.URGENT]: { days: 7, boost: 20, color: '#F44336', label: 'Urgent' },
    [PromotionPlanType.SPOTLIGHT]: { days: 30, boost: 30, color: '#9C27B0', label: 'Spotlight' },
    [PromotionPlanType.PREMIUM]: { days: 90, boost: 50, color: '#E91E63', label: 'Premium' },
};

export class PromotionService {
    static async promote(productId: string, plan: PromotionPlanType, transactionId?: string) {
        const config = PLAN_CONFIG[plan];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + config.days);

        return await Product.findByIdAndUpdate(
            productId,
            {
                'promotion.isActive': true,
                'promotion.plan': plan,
                'promotion.startedAt': new Date(),
                'promotion.expiresAt': expiresAt,
                'promotion.durationDays': config.days,
                'promotion.purchaseDate': new Date(),
                'promotion.transactionId': transactionId,
                'promotion.metadata.boostScore': config.boost,
                'promotion.metadata.backgroundColor': config.color,
                'promotion.metadata.label': config.label,
            },
            { new: true },
        );
    }

    static async cronExpirePromotions() {
        return await Product.updateMany(
            { 'promotion.isActive': true, 'promotion.expiresAt': { $lt: new Date() } },
            { 'promotion.isActive': false, 'promotion.metadata.boostScore': 0 },
        );
    }
}
