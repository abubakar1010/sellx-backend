import { UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { listingPurchaseService } from './listing-purchase.service';
import {
    serializeListingPurchase,
    serializeListingPurchases,
} from './listing-purchase.serializer';
import {
    createListingPurchaseBodySchema,
    listListingPurchasesQuerySchema,
} from './listing-purchase.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const listingPurchaseController = {
    purchase: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { packageId } = createListingPurchaseBodySchema.parse(req.body);
        const storeId = (req as any).activeStoreId as string | undefined;

        const result = await listingPurchaseService.purchasePackage(
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
            targetType: 'listing_purchase',
            message: `${req.user?.firstName ?? 'A user'} purchased listing package "${result.purchase.packageSnapshot.name}" for "${result.purchase.packageSnapshot.categoryName}".`,
            metadata: {
                packageId,
                price: result.purchase.packageSnapshot.price,
                currency: result.purchase.packageSnapshot.currency,
                category: result.purchase.packageSnapshot.categoryName,
            },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Listing package purchased successfully.',
            data: serializeListingPurchase(result.purchase),
        });
    }),

    list: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = listListingPurchasesQuerySchema.parse(req.query);
        const result = await listingPurchaseService.listMyPurchases(userId, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing purchases fetched successfully.',
            data: {
                items: serializeListingPurchases(result.items),
                pagination: result.pagination,
            },
        });
    }),

    getActive: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const purchases = await listingPurchaseService.getActivePurchases(userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Active listing purchases fetched successfully.',
            data: serializeListingPurchases(purchases),
        });
    }),

    getById: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const { id } = objectIdParamSchema.parse(req.params);
        const purchase = await listingPurchaseService.getPurchaseById(id, userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing purchase fetched successfully.',
            data: serializeListingPurchase(purchase),
        });
    }),
};
