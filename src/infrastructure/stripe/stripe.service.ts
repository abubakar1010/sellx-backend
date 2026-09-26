import Stripe from 'stripe';

import { config } from '@config/index';
import { BadRequestError } from '@/core/errors';
import { CURRENCY, CURRENCY_MINOR_UNIT_FACTOR } from '@/core/constants/currency';
import { logger } from '@infra/logger/winston.logger';

let stripeClient: Stripe | null = null;

const getStripe = (): Stripe => {
    if (!config.stripe.secretKey) {
        throw new BadRequestError('Stripe is not configured');
    }
    if (!stripeClient) {
        stripeClient = new Stripe(config.stripe.secretKey);
    }
    return stripeClient;
};

export interface CheckoutSessionParams {
    /** Amount in kroner (major units); converted to øre before it reaches Stripe. */
    unitAmount: number;
    productName: string;
    customerEmail: string;
    metadata: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
}

export interface SubscriptionCheckoutParams {
    /** Amount in kroner (major units); converted to øre before it reaches Stripe. */
    unitAmount: number;
    productName: string;
    recurringInterval: 'week' | 'month';
    customerEmail: string;
    metadata: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
}

export const stripeService = {
    async createCheckoutSession(params: CheckoutSessionParams) {
        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: params.customerEmail,
            line_items: [
                {
                    price_data: {
                        currency: CURRENCY.toLowerCase(),
                        product_data: { name: params.productName },
                        unit_amount: Math.round(params.unitAmount * CURRENCY_MINOR_UNIT_FACTOR),
                    },
                    quantity: 1,
                },
            ],
            metadata: params.metadata,
            success_url: params.successUrl ?? `${config.stripe.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: params.cancelUrl ?? config.stripe.cancelUrl,
        });

        logger.info('Stripe checkout session created', {
            sessionId: session.id,
            paymentType: params.metadata.paymentType,
        });

        return { sessionId: session.id, url: session.url! };
    },

    async createSubscriptionCheckoutSession(params: SubscriptionCheckoutParams) {
        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: params.customerEmail,
            line_items: [
                {
                    price_data: {
                        currency: CURRENCY.toLowerCase(),
                        product_data: { name: params.productName },
                        unit_amount: Math.round(params.unitAmount * CURRENCY_MINOR_UNIT_FACTOR),
                        recurring: { interval: params.recurringInterval },
                    },
                    quantity: 1,
                },
            ],
            metadata: params.metadata,
            subscription_data: { metadata: params.metadata },
            success_url: params.successUrl ?? `${config.stripe.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: params.cancelUrl ?? config.stripe.cancelUrl,
        });

        logger.info('Stripe subscription checkout session created', {
            sessionId: session.id,
            interval: params.recurringInterval,
        });

        return { sessionId: session.id, url: session.url! };
    },

    async cancelSubscription(stripeSubscriptionId: string, immediately: boolean) {
        const stripe = getStripe();

        if (immediately) {
            await stripe.subscriptions.cancel(stripeSubscriptionId);
            logger.info('Stripe subscription cancelled immediately', { stripeSubscriptionId });
        } else {
            await stripe.subscriptions.update(stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            logger.info('Stripe subscription set to cancel at period end', { stripeSubscriptionId });
        }
    },

    constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
        if (!config.stripe.webhookSecret) {
            throw new BadRequestError('Stripe webhook secret is not configured');
        }
        const stripe = getStripe();
        return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
    },
};
