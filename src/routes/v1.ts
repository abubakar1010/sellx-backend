import { Router } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';

import { HealthService } from '@/infrastructure/health/health.service';

import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import storeRoutes from '@/modules/stores/store.routes';
import storyRoutes from '@/modules/stories/story.routes';
import reviewRoutes from '@/modules/reviews/review.routes';
import productRoutes from '@/modules/products/product.routes';
import categoryRoutes from '@/modules/categories/category.routes';
import onboardingRoutes from '@/modules/onboarding/onboarding.routes';
import savedSearchRoutes from '@/modules/saved-search/saved-search.routes';
import filterOptionsRoutes from '@/modules/filter-options/filter-options.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import adRoutes from '@/modules/ads/ads.routes';
import chatRoutes from '@/modules/chat/chat.routes';
import subscriptionRoutes from '@/modules/subscriptions/subscription.routes';
import settingRoutes from '@/modules/settings/settings.routes';
import couponRoutes from '@/modules/coupon/coupon.routes';
import storyPurchaseRoutes from '@/modules/story-purchase/story-purchase.routes';
import storyPackagePublicRoutes from '@/modules/story-package/story-package.routes';
import listingPurchaseRoutes from '@/modules/listing-purchase/listing-purchase.routes';
import listingPackagePublicRoutes from '@/modules/listing-package/listing-package.routes';
import userSubscriptionRoutes from '@/modules/user-subscription/user-subscription.routes';
import adminRoutes from '@/modules/admin/admin.routes';

const router = Router();
const healthService = new HealthService();

router.get(
    '/health',
    catchAsync(async (_req, res) => {
        const report = await healthService.check();
        const statusCode =
            report.status === 'down' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK;

        return sendResponse(res, {
            statusCode,
            message: 'Health report fetched successfully.',
            data: report,
        });
    }),
);

router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stores', storeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/stories', storyRoutes);
router.use('/saved-searches', savedSearchRoutes);
router.use('/filters', filterOptionsRoutes);
router.use('/ads', adRoutes);
router.use('/chat', chatRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/settings', settingRoutes);
router.use('/coupons', couponRoutes);
router.use('/story-purchases', storyPurchaseRoutes);
router.use('/story-packages', storyPackagePublicRoutes);
router.use('/listing-purchases', listingPurchaseRoutes);
router.use('/listing-packages', listingPackagePublicRoutes);
router.use('/user-subscriptions', userSubscriptionRoutes);
router.use('/admin', adminRoutes);

export default router;
