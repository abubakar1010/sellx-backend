import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/core/errors';

import { SubscriptionModel } from '@/modules/subscriptions/subscription.model';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { StoreModel } from '@/modules/stores/store.model';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { userSubscriptionRepository } from './user-subscription.repository';
import { UserSubscriptionModel } from './user-subscription.model';
import { fulfillUserSubscription } from './user-subscription.fulfillment';
import type { IUserSubscriptionDocument } from './user-subscription.interface';
import type { ListUserSubscriptionsQuery } from './user-subscription.validation';

export type SubscribeResult =
    | { requiresPayment: false; subscription: IUserSubscriptionDocument }
    | { requiresPayment: true; checkoutUrl: string };

export class UserSubscriptionService {
    async subscribe(
        userId: string,
        email: string,
        subscriptionId: string,
        storeId: string,
    ): Promise<SubscribeResult> {
        const plan = await SubscriptionModel.findById(subscriptionId).lean();
        if (!plan) throw new NotFoundError('Subscription plan not found');
        if (!plan.isActive) throw new BadRequestError('This subscription plan is currently unavailable');

        const store = await StoreModel.findById(storeId).lean();
        if (!store) throw new NotFoundError('Store not found');
        if (String(store.user) !== userId) throw new ForbiddenError('This store does not belong to you');
        if (store.status === 'blocked') throw new ForbiddenError('Store is blocked');

        const existing = await userSubscriptionRepository.findActiveByUserAndStore(userId, storeId);
        if (existing) {
            throw new ConflictError(
                'Store already has an active subscription',
                'SUBSCRIPTION_ALREADY_ACTIVE',
            );
        }

        // Paid plan: create pending payment + Stripe Checkout Session
        if (plan.price > 0) {
            const paymentTransaction = await PaymentTransactionModel.create({
                user: userId,
                store: storeId,
                email,
                paymentType: 'subscription',
                amount: plan.price,
                currency: plan.currency,
                status: 'pending',
                referenceModel: 'UserSubscription',
                description: `Subscription: ${plan.name} (${plan.billingType})`,
                metadata: {
                    subscriptionId,
                    billingType: plan.billingType,
                    durationDays: plan.durationDays,
                },
            });

            const interval = plan.billingType === 'weekly' ? 'week' : 'month';

            const session = await stripeService.createSubscriptionCheckoutSession({
                unitAmount: plan.price,
                productName: `${plan.name} (${plan.billingType})`,
                recurringInterval: interval,
                customerEmail: email,
                metadata: {
                    userId,
                    paymentType: 'subscription',
                    subscriptionPlanId: subscriptionId,
                    storeId,
                    paymentTransactionId: paymentTransaction._id.toString(),
                },
            });

            await PaymentTransactionModel.updateOne(
                { _id: paymentTransaction._id },
                { stripeSessionId: session.sessionId },
            );

            return { requiresPayment: true, checkoutUrl: session.url };
        }

        // Free plan: auto-create immediately
        const subscription = await fulfillUserSubscription({
            userId,
            subscriptionPlanId: subscriptionId,
            storeId,
        });

        return { requiresPayment: false, subscription };
    }

    async getMyActive(
        userId: string,
        storeId?: string,
    ): Promise<IUserSubscriptionDocument | null> {
        if (storeId) {
            return userSubscriptionRepository.findActiveByUserAndStore(userId, storeId);
        }

        const subscriptions = await userSubscriptionRepository.findActiveByUser(userId);
        return subscriptions[0] ?? null;
    }

    async listMy(userId: string, query: ListUserSubscriptionsQuery) {
        const filter: Record<string, unknown> = { user: userId };

        if (query.status) {
            if (query.status === 'active') {
                filter.status = 'active';
                filter.endDate = { $gt: new Date() };
            } else {
                filter.status = query.status;
            }
        }

        const page = Math.max(1, query.page);
        const limit = Math.min(50, Math.max(1, query.limit));
        const skip = (page - 1) * limit;

        const [total, docs] = await Promise.all([
            UserSubscriptionModel.countDocuments(filter),
            UserSubscriptionModel.find(filter)
                .populate('store', 'name logo slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        return {
            items: docs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async getById(
        subscriptionId: string,
        userId: string,
    ): Promise<IUserSubscriptionDocument> {
        const sub = await UserSubscriptionModel.findById(subscriptionId)
            .populate('store', 'name logo slug')
            .lean<IUserSubscriptionDocument>();
        if (!sub) throw new NotFoundError('Subscription not found');
        if (String(sub.user) !== userId) {
            throw new ForbiddenError('This subscription does not belong to you');
        }
        return sub;
    }

    async cancel(
        subscriptionId: string,
        userId: string,
        immediate: boolean,
    ): Promise<IUserSubscriptionDocument> {
        const sub = await UserSubscriptionModel.findById(subscriptionId).lean<IUserSubscriptionDocument>();
        if (!sub) throw new NotFoundError('Subscription not found');
        if (String(sub.user) !== userId) {
            throw new ForbiddenError('This subscription does not belong to you');
        }
        if (sub.status !== 'active') {
            throw new BadRequestError('Subscription is not active');
        }

        // Cancel on Stripe if managed by Stripe
        if (sub.stripeSubscriptionId) {
            await stripeService.cancelSubscription(sub.stripeSubscriptionId, immediate);
        }

        if (immediate) {
            await UserSubscriptionModel.updateOne(
                { _id: subscriptionId },
                { status: 'cancelled', cancelledAt: new Date(), autoRenew: false },
            );

            const hasOtherActive = await UserSubscriptionModel.findOne({
                store: sub.store,
                status: 'active',
                endDate: { $gt: new Date() },
                _id: { $ne: subscriptionId },
            });
            if (!hasOtherActive) {
                await StoreModel.updateOne({ _id: sub.store }, { storeType: 'regular' });
            }
        } else {
            await UserSubscriptionModel.updateOne(
                { _id: subscriptionId },
                { autoRenew: false },
            );
        }

        return (await UserSubscriptionModel.findById(subscriptionId)
            .populate('store', 'name logo slug')
            .lean<IUserSubscriptionDocument>())!;
    }

    async renew(
        subscriptionId: string,
        userId: string,
        email: string,
    ): Promise<SubscribeResult> {
        const sub = await UserSubscriptionModel.findById(subscriptionId).lean<IUserSubscriptionDocument>();
        if (!sub) throw new NotFoundError('Subscription not found');
        if (String(sub.user) !== userId) {
            throw new ForbiddenError('This subscription does not belong to you');
        }
        if (sub.status === 'active' && sub.endDate > new Date()) {
            throw new BadRequestError('Subscription is still active');
        }

        const existingActive = await userSubscriptionRepository.findActiveByUserAndStore(
            userId,
            String(sub.store),
        );
        if (existingActive) {
            throw new ConflictError(
                'Store already has an active subscription',
                'SUBSCRIPTION_ALREADY_ACTIVE',
            );
        }

        // Paid renewal: create Stripe checkout session
        if (sub.planSnapshot.price > 0) {
            const paymentTransaction = await PaymentTransactionModel.create({
                user: userId,
                store: sub.store,
                email,
                paymentType: 'subscription',
                amount: sub.planSnapshot.price,
                currency: sub.planSnapshot.currency,
                status: 'pending',
                referenceModel: 'UserSubscription',
                description: `Renewal: ${sub.planSnapshot.name} (${sub.planSnapshot.billingType})`,
                metadata: {
                    subscriptionId: String(sub.subscription),
                    billingType: sub.planSnapshot.billingType,
                    renewal: true,
                },
            });

            const interval = sub.planSnapshot.billingType === 'weekly' ? 'week' : 'month';

            const session = await stripeService.createSubscriptionCheckoutSession({
                unitAmount: sub.planSnapshot.price,
                productName: `${sub.planSnapshot.name} (${sub.planSnapshot.billingType})`,
                recurringInterval: interval,
                customerEmail: email,
                metadata: {
                    userId,
                    paymentType: 'subscription',
                    subscriptionPlanId: String(sub.subscription),
                    storeId: String(sub.store),
                    paymentTransactionId: paymentTransaction._id.toString(),
                },
            });

            await PaymentTransactionModel.updateOne(
                { _id: paymentTransaction._id },
                { stripeSessionId: session.sessionId },
            );

            return { requiresPayment: true, checkoutUrl: session.url };
        }

        // Free renewal: auto-create immediately
        const renewed = await fulfillUserSubscription({
            userId,
            subscriptionPlanId: String(sub.subscription),
            storeId: String(sub.store),
        });

        return { requiresPayment: false, subscription: renewed };
    }
}

export const userSubscriptionService = new UserSubscriptionService();
