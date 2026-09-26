import type { Request, Response } from 'express';
import Stripe from 'stripe';

import { logger } from '@/infrastructure/logger/winston.logger';
import { CURRENCY, CURRENCY_MINOR_UNIT_FACTOR } from '@/core/constants/currency';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { PaymentTransactionModel } from '@/modules/payments/payment.model';
import { ListingPackageModel } from '@/modules/listing-package/listing-package.model';
import { CategoryModel } from '@/modules/categories/category.model';
import { listingPurchaseRepository } from '@/modules/listing-purchase/listing-purchase.repository';
import { StoryPackageModel } from '@/modules/stories/story.model';
import { storyPurchaseRepository } from '@/modules/story-purchase/story-purchase.repository';
import { fulfillUserSubscription } from '@/modules/user-subscription/user-subscription.fulfillment';
import { UserSubscriptionModel } from '@/modules/user-subscription/user-subscription.model';
import { StoreModel } from '@/modules/stores/store.model';
import { UserModel } from '@/modules/user/user.model';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    const { paymentType, paymentTransactionId } = metadata;

    if (!paymentTransactionId) {
        logger.warn('Stripe checkout session missing paymentTransactionId in metadata', {
            sessionId: session.id,
        });
        return;
    }

    // Idempotency: check if already processed
    const existing = await PaymentTransactionModel.findById(paymentTransactionId).lean();
    if (!existing) {
        logger.warn('PaymentTransaction not found for checkout session', {
            paymentTransactionId,
            sessionId: session.id,
        });
        return;
    }
    if (existing.status === 'approved') {
        logger.debug('Checkout session already processed, skipping', { sessionId: session.id });
        return;
    }

    // Update payment transaction to approved
    await PaymentTransactionModel.updateOne(
        { _id: paymentTransactionId },
        {
            status: 'approved',
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id,
            stripeSubscriptionId: typeof session.subscription === 'string'
                ? session.subscription
                : (session.subscription as any)?.id,
        },
    );

    switch (paymentType) {
        case 'listing':
            await fulfillListingPurchase(metadata, paymentTransactionId);
            break;
        case 'story':
            await fulfillStoryPurchase(metadata, paymentTransactionId);
            break;
        case 'subscription':
            await fulfillSubscription(metadata, paymentTransactionId, session);
            break;
        default:
            logger.warn('Unknown paymentType in checkout session metadata', {
                paymentType,
                sessionId: session.id,
            });
    }
}

async function fulfillListingPurchase(
    metadata: Record<string, string>,
    paymentTransactionId: string,
) {
    const { userId, packageId, storeId } = metadata;

    const pkg = await ListingPackageModel.findById(packageId).lean();
    if (!pkg) {
        logger.error('Listing package not found during webhook fulfillment', { packageId });
        return;
    }

    const category = await CategoryModel.findById(pkg.category).lean();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);

    const purchaseData: Record<string, unknown> = {
        user: userId,
        category: pkg.category,
        listingPackage: packageId,
        packageSnapshot: {
            name: pkg.name,
            category: String(pkg.category),
            categoryName: category?.title ?? '',
            durationHours: pkg.durationHours,
            price: pkg.price,
            maxListings: pkg.maxListings,
            currency: pkg.currency,
            validityDays: pkg.validityDays,
        },
        listingsUsed: 0,
        status: 'active',
        purchasedAt: now,
        expiresAt,
        paymentTransaction: paymentTransactionId,
    };

    if (storeId) purchaseData.store = storeId;

    const purchase = await listingPurchaseRepository.create(purchaseData as any);

    await PaymentTransactionModel.updateOne(
        { _id: paymentTransactionId },
        { referenceId: purchase._id },
    );

    logger.info('Listing purchase fulfilled via Stripe webhook', {
        purchaseId: purchase._id?.toString(),
        userId,
        packageId,
    });
}

async function fulfillStoryPurchase(
    metadata: Record<string, string>,
    paymentTransactionId: string,
) {
    const { userId, packageId, storeId } = metadata;

    const pkg = await StoryPackageModel.findById(packageId).lean();
    if (!pkg) {
        logger.error('Story package not found during webhook fulfillment', { packageId });
        return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);

    const purchaseData: Record<string, unknown> = {
        user: userId,
        storyPackage: packageId,
        packageSnapshot: {
            name: pkg.name,
            description: pkg.description,
            durationHours: pkg.durationHours,
            price: pkg.price,
            maxStories: pkg.maxStories,
            currency: pkg.currency,
            validityDays: pkg.validityDays,
        },
        storiesUsed: 0,
        status: 'active',
        purchasedAt: now,
        expiresAt,
        paymentTransaction: paymentTransactionId,
    };

    if (storeId) purchaseData.store = storeId;

    const purchase = await storyPurchaseRepository.create(purchaseData as any);

    await PaymentTransactionModel.updateOne(
        { _id: paymentTransactionId },
        { referenceId: purchase._id },
    );

    logger.info('Story purchase fulfilled via Stripe webhook', {
        purchaseId: purchase._id?.toString(),
        userId,
        packageId,
    });
}

async function fulfillSubscription(
    metadata: Record<string, string>,
    paymentTransactionId: string,
    session: Stripe.Checkout.Session,
) {
    const { userId, subscriptionPlanId, storeId } = metadata;

    const stripeSubscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as any)?.id;

    if (!userId || !subscriptionPlanId || !storeId) {
        logger.error('Missing required metadata for subscription fulfillment', metadata);
        return;
    }

    const subscription = await fulfillUserSubscription({
        userId,
        subscriptionPlanId,
        storeId,
        paymentTransactionId,
        stripeSubscriptionId: stripeSubscriptionId ?? undefined,
    });

    await PaymentTransactionModel.updateOne(
        { _id: paymentTransactionId },
        { referenceId: subscription._id },
    );

    logger.info('Subscription fulfilled via Stripe webhook', {
        subscriptionId: subscription._id?.toString(),
        userId,
        storeId,
        stripeSubscriptionId,
    });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    const stripeSubId = typeof invoiceData.subscription === 'string'
        ? invoiceData.subscription
        : invoiceData.subscription?.id;

    if (!stripeSubId) return;

    // Skip the first invoice (handled by checkout.session.completed)
    if (invoiceData.billing_reason === 'subscription_create') return;

    // Find the current subscription by stripeSubscriptionId
    const currentSub = await UserSubscriptionModel.findOne({
        stripeSubscriptionId: stripeSubId,
        status: 'active',
    }).lean();

    if (!currentSub) {
        logger.warn('No active subscription found for Stripe subscription renewal', {
            stripeSubscriptionId: stripeSubId,
        });
        return;
    }

    // Idempotency: check if we already created a payment for this invoice
    const existingPayment = await PaymentTransactionModel.findOne({
        stripeInvoiceId: invoice.id,
        status: 'approved',
    }).lean();
    if (existingPayment) {
        logger.debug('Invoice already processed, skipping', { invoiceId: invoice.id });
        return;
    }

    const user = await UserModel.findById(currentSub.user).select('email').lean();

    // Create payment transaction for the renewal
    const payment = await PaymentTransactionModel.create({
        user: currentSub.user,
        store: currentSub.store,
        email: user?.email ?? '',
        paymentType: 'subscription',
        amount: currentSub.planSnapshot.price,
        currency: currentSub.planSnapshot.currency,
        status: 'approved',
        referenceModel: 'UserSubscription',
        description: `Auto-renewal: ${currentSub.planSnapshot.name} (${currentSub.planSnapshot.billingType})`,
        stripeInvoiceId: invoice.id,
        stripeSubscriptionId: stripeSubId,
        metadata: { autoRenewal: true },
    });

    // Create new subscription period
    const now = new Date();
    const newEnd = new Date(now.getTime() + currentSub.planSnapshot.durationDays * 24 * 60 * 60 * 1000);

    const renewed = await UserSubscriptionModel.create({
        user: currentSub.user,
        store: currentSub.store,
        subscription: currentSub.subscription,
        planSnapshot: currentSub.planSnapshot,
        paymentTransaction: payment._id,
        status: 'active',
        listingsUsed: 0,
        startDate: now,
        endDate: newEnd,
        autoRenew: true,
        stripeSubscriptionId: stripeSubId,
    });

    // Mark old subscription as expired
    await UserSubscriptionModel.updateOne({ _id: currentSub._id }, { status: 'expired' });

    await PaymentTransactionModel.updateOne(
        { _id: payment._id },
        { referenceId: renewed._id },
    );

    logger.info('Subscription renewed via Stripe invoice.paid', {
        oldSubscriptionId: currentSub._id?.toString(),
        newSubscriptionId: renewed._id?.toString(),
        stripeSubscriptionId: stripeSubId,
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const stripeSubId = subscription.id;

    const userSub = await UserSubscriptionModel.findOne({
        stripeSubscriptionId: stripeSubId,
        status: 'active',
    }).lean();

    if (!userSub) {
        logger.debug('No active subscription found for deleted Stripe subscription', {
            stripeSubscriptionId: stripeSubId,
        });
        return;
    }

    await UserSubscriptionModel.updateOne(
        { _id: userSub._id },
        { status: 'cancelled', cancelledAt: new Date(), autoRenew: false },
    );

    // Revert store type if no other active subscription
    const hasOtherActive = await UserSubscriptionModel.findOne({
        store: userSub.store,
        status: 'active',
        endDate: { $gt: new Date() },
        _id: { $ne: userSub._id },
    });

    if (!hasOtherActive) {
        await StoreModel.updateOne({ _id: userSub.store }, { storeType: 'regular' });
    }

    logger.info('Subscription cancelled via Stripe webhook', {
        subscriptionId: userSub._id?.toString(),
        stripeSubscriptionId: stripeSubId,
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    const stripeSubId = typeof invoiceData.subscription === 'string'
        ? invoiceData.subscription
        : invoiceData.subscription?.id;

    logger.warn('Stripe invoice payment failed', {
        invoiceId: invoice.id,
        stripeSubscriptionId: stripeSubId,
    });

    if (stripeSubId) {
        await PaymentTransactionModel.create({
            user: undefined as any,
            email: typeof invoiceData.customer_email === 'string' ? invoiceData.customer_email : '',
            paymentType: 'subscription',
            amount: (invoiceData.amount_due ?? 0) / CURRENCY_MINOR_UNIT_FACTOR,
            currency: CURRENCY,
            status: 'rejected',
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: stripeSubId,
            description: 'Payment failed for subscription renewal',
            metadata: { failureReason: 'invoice_payment_failed' },
        }).catch((err) => {
            logger.error('Failed to record rejected payment', {
                error: err instanceof Error ? err.message : String(err),
            });
        });
    }
}

export const stripeWebhookController = {
    handleWebhook: async (req: Request, res: Response) => {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            res.status(400).json({ error: 'Missing stripe-signature header' });
            return;
        }

        let event: Stripe.Event;
        try {
            event = stripeService.constructWebhookEvent(req.body as Buffer, signature);
        } catch (err) {
            logger.error('Stripe webhook signature verification failed', {
                error: err instanceof Error ? err.message : String(err),
            });
            res.status(400).json({ error: 'Invalid signature' });
            return;
        }

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                    break;
                case 'invoice.paid':
                    await handleInvoicePaid(event.data.object as Stripe.Invoice);
                    break;
                case 'customer.subscription.deleted':
                    await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;
                case 'invoice.payment_failed':
                    await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                    break;
                default:
                    logger.debug('Unhandled Stripe webhook event', { type: event.type });
            }
        } catch (error) {
            logger.error('Stripe webhook handler error', {
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error),
            });
        }

        res.status(200).json({ received: true });
    },
};
