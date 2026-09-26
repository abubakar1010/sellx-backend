import { UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { storyPurchaseService } from './story-purchase.service';
import {
    serializeStoryPurchase,
    serializeStoryPurchases,
} from './story-purchase.serializer';
import {
    createStoryPurchaseBodySchema,
    listStoryPurchasesQuerySchema,
} from './story-purchase.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const storyPurchaseController = {
    purchase: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { packageId } = createStoryPurchaseBodySchema.parse(req.body);
        const storeId = (req as any).activeStoreId as string | undefined;

        const result = await storyPurchaseService.purchasePackage(
            userId,
            req.user!.email,
            packageId,
            storeId,
        );

        if (result.requiresPayment) {
            sendResponse(res, {
                statusCode: HTTP_STATUS.OK,
                message: 'Checkout session created. Complete payment to activate your package.',
                data: { checkoutUrl: result.checkoutUrl },
            });
            return;
        }

        addActivityJob({
            activityType: 'payment_received',
            actorId: userId,
            actorType: 'user',
            targetId: result.purchase._id?.toString() ?? result.purchase.id,
            targetType: 'story_purchase',
            message: `${req.user?.firstName ?? 'A user'} purchased story package "${result.purchase.packageSnapshot.name}".`,
            metadata: {
                packageId,
                price: result.purchase.packageSnapshot.price,
                currency: result.purchase.packageSnapshot.currency,
            },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Story package purchased successfully.',
            data: serializeStoryPurchase(result.purchase),
        });
    }),

    list: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = listStoryPurchasesQuerySchema.parse(req.query);
        const result = await storyPurchaseService.listMyPurchases(userId, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story purchases fetched successfully.',
            data: {
                items: serializeStoryPurchases(result.items),
                pagination: result.pagination,
            },
        });
    }),

    getActive: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const purchases = await storyPurchaseService.getActivePurchases(userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Active story purchases fetched successfully.',
            data: serializeStoryPurchases(purchases),
        });
    }),

    getById: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { id } = objectIdParamSchema.parse(req.params);
        const purchase = await storyPurchaseService.getPurchaseById(id, userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story purchase fetched successfully.',
            data: serializeStoryPurchase(purchase),
        });
    }),
};
