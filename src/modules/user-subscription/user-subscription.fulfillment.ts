import { SubscriptionModel } from '@/modules/subscriptions/subscription.model';
import { StoreModel } from '@/modules/stores/store.model';
import { userSubscriptionRepository } from './user-subscription.repository';
import type { IUserSubscriptionDocument } from './user-subscription.interface';

export interface FulfillSubscriptionParams {
    userId: string;
    subscriptionPlanId: string;
    storeId: string;
    paymentTransactionId?: string;
    stripeSubscriptionId?: string;
}

export async function fulfillUserSubscription(
    params: FulfillSubscriptionParams,
): Promise<IUserSubscriptionDocument> {
    const plan = await SubscriptionModel.findById(params.subscriptionPlanId).lean();
    if (!plan) throw new Error('Subscription plan not found during fulfillment');

    const now = new Date();
    const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const planSnapshot = {
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billingType: plan.billingType as 'weekly' | 'monthly',
        durationDays: plan.durationDays,
        maxListings: plan.maxListings,
        listingDurationHours: plan.listingDurationHours,
    };

    const subscription = await userSubscriptionRepository.create({
        user: params.userId,
        store: params.storeId,
        subscription: params.subscriptionPlanId,
        planSnapshot,
        paymentTransaction: params.paymentTransactionId,
        status: 'active',
        listingsUsed: 0,
        startDate: now,
        endDate,
        autoRenew: true,
        stripeSubscriptionId: params.stripeSubscriptionId,
    } as any);

    await StoreModel.updateOne({ _id: params.storeId }, { storeType: 'professional' });

    return subscription;
}
