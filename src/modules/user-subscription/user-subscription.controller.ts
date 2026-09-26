import { UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { userSubscriptionService } from './user-subscription.service';
import {
    serializeUserSubscription,
    serializeUserSubscriptions,
} from './user-subscription.serializer';
import {
    createUserSubscriptionBodySchema,
    listUserSubscriptionsQuerySchema,
    cancelUserSubscriptionBodySchema,
} from './user-subscription.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const userSubscriptionController = {
    subscribe: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { subscriptionId, storeId } = createUserSubscriptionBodySchema.parse(req.body);

        const result = await userSubscriptionService.subscribe(
            userId,
            req.user!.email,
            subscriptionId,
            storeId,
        );

        if (result.requiresPayment) {
            sendResponse(res, {
                statusCode: HTTP_STATUS.OK,
                message: 'Checkout session created. Complete payment to activate your subscription.',
                data: { checkoutUrl: result.checkoutUrl },
            });
            return;
        }

        addActivityJob({
            activityType: 'payment_received',
            actorId: userId,
            actorType: 'user',
            targetId: result.subscription._id?.toString() ?? result.subscription.id,
            targetType: 'user_subscription',
            message: `${req.user?.firstName ?? 'A user'} subscribed to "${result.subscription.planSnapshot.name}" (${result.subscription.planSnapshot.billingType}).`,
            metadata: {
                subscriptionId,
                price: result.subscription.planSnapshot.price,
                currency: result.subscription.planSnapshot.currency,
                billingType: result.subscription.planSnapshot.billingType,
            },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Subscription purchased successfully.',
            data: serializeUserSubscription(result.subscription),
        });
    }),

    getMy: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const storeId = (req.query.storeId as string) || undefined;
        const subscription = await userSubscriptionService.getMyActive(userId, storeId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: subscription
                ? 'Active subscription fetched successfully.'
                : 'No active subscription found.',
            data: subscription ? serializeUserSubscription(subscription) : null,
        });
    }),

    list: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = listUserSubscriptionsQuerySchema.parse(req.query);
        const result = await userSubscriptionService.listMy(userId, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscriptions fetched successfully.',
            data: {
                items: serializeUserSubscriptions(result.items),
                pagination: result.pagination,
            },
        });
    }),

    getById: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { id } = objectIdParamSchema.parse(req.params);
        const subscription = await userSubscriptionService.getById(id, userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Subscription fetched successfully.',
            data: serializeUserSubscription(subscription),
        });
    }),

    cancel: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { id } = objectIdParamSchema.parse(req.params);
        const { immediate } = cancelUserSubscriptionBodySchema.parse(req.body);

        const subscription = await userSubscriptionService.cancel(id, userId, immediate);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: immediate
                ? 'Subscription cancelled immediately.'
                : 'Auto-renewal disabled. Subscription will expire at end of current period.',
            data: serializeUserSubscription(subscription),
        });
    }),

    renew: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { id } = objectIdParamSchema.parse(req.params);

        const result = await userSubscriptionService.renew(id, userId, req.user!.email);

        if (result.requiresPayment) {
            sendResponse(res, {
                statusCode: HTTP_STATUS.OK,
                message: 'Checkout session created. Complete payment to renew your subscription.',
                data: { checkoutUrl: result.checkoutUrl },
            });
            return;
        }

        addActivityJob({
            activityType: 'payment_received',
            actorId: userId,
            actorType: 'user',
            targetId: result.subscription._id?.toString() ?? result.subscription.id,
            targetType: 'user_subscription',
            message: `${req.user?.firstName ?? 'A user'} renewed subscription "${result.subscription.planSnapshot.name}".`,
            metadata: {
                price: result.subscription.planSnapshot.price,
                currency: result.subscription.planSnapshot.currency,
                billingType: result.subscription.planSnapshot.billingType,
                renewal: true,
            },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Subscription renewed successfully.',
            data: serializeUserSubscription(result.subscription),
        });
    }),
};
