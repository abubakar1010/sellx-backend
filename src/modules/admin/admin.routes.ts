import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';

import dashboardRoutes from './dashboard/dashboard.routes';
import activityRoutes from './activity/activity.routes';
import listingsRoutes from './listings/listings.routes';
import categoriesRoutes from './categories/categories.routes';
import usersRoutes from './users/users.routes';
import storesRoutes from './stores/stores.routes';
import storiesRoutes from './stories/stories.routes';
import subscriptionsRoutes from './subscriptions/subscriptions.routes';
import paymentsRoutes from './payments/payments.routes';
import notificationsRoutes from './notifications/notifications.routes';
import settingsRoutes from './settings/settings.routes';
import couponRoutes from './coupon/coupon.routes';
import boostPlanRoutes from './boost-plans/boost-plans.routes';
import adPackageRoutes from './ads-packages/ads-packages.routes';
import storyPackageRoutes from './story-packages/story-packages.routes';
import storyPurchaseRoutes from './story-purchases/story-purchases.routes';
import listingPackageAdminRoutes from './listing-packages/listing-packages.routes';
import listingPurchaseAdminRoutes from './listing-purchases/listing-purchases.routes';
import userSubscriptionAdminRoutes from './user-subscriptions/user-subscriptions.routes';

const router = Router();

router.use(authenticate, authorize('superAdmin'));

router.use('/dashboard', dashboardRoutes);
router.use('/activities', activityRoutes);
router.use('/listings', listingsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/users', usersRoutes);
router.use('/stores', storesRoutes);
router.use('/stories', storiesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/settings', settingsRoutes);
router.use('/coupons', couponRoutes);
router.use('/boost-plans', boostPlanRoutes);
router.use('/ads-packages', adPackageRoutes);
router.use('/story-packages', storyPackageRoutes);
router.use('/story-purchases', storyPurchaseRoutes);
router.use('/listing-packages', listingPackageAdminRoutes);
router.use('/listing-purchases', listingPurchaseAdminRoutes);
router.use('/user-subscriptions', userSubscriptionAdminRoutes);

export default router;
