import { BadRequestError, UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { adService } from './ads.service';
import {
    createAdCampaignBodySchema,
    updateAdCampaignBodySchema,
    listAdsQuerySchema,
    publicAdsQuerySchema,
} from './ads.validation';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

export const adController = {
    listPackages: catchAsync(async (req, res) => {
        const packages = await adService.listPackages();

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad packages fetched successfully',
            data: packages,
        });
    }),

    create: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const file = req.file;
        let payload = req.body;
        if (req.body?.data && typeof req.body.data === 'string') {
            try {
                payload = JSON.parse(req.body.data);
            } catch {
                throw new BadRequestError('Invalid JSON in data field');
            }
        }
        if (file) {
            payload.thumbnail = getFileUrl(file.filename, 'ads');
        }
        const body = createAdCampaignBodySchema.parse(payload);
        const ad = await adService.createAdCampaign(userId, body);

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Ad campaign created successfully',
            data: ad,
        });
    }),

    listMy: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const query = listAdsQuerySchema.parse(req.query);
        const result = await adService.listMyAds(userId, query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad campaigns fetched successfully',
            data: { rows: result.data, meta: result.meta },
        });
    }),

    update: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const adId = req.params.id as string;
        if (!adId) throw new BadRequestError('Ad ID is required');

        const file = req.file;
        let payload = req.body;
        if (req.body?.data && typeof req.body.data === 'string') {
            try {
                payload = JSON.parse(req.body.data);
            } catch {
                throw new BadRequestError('Invalid JSON in data field');
            }
        }
        if (file) {
            payload.thumbnail = getFileUrl(file.filename, 'ads');
        }
        const body = updateAdCampaignBodySchema.parse(payload);
        const updated = await adService.updateAdCampaign(adId, userId, body);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad campaign updated successfully',
            data: updated,
        });
    }),

    delete: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const adId = req.params.id as string;
        if (!adId) throw new BadRequestError('Ad ID is required');

        await adService.deleteAdCampaign(adId, userId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad campaign deleted successfully',
            data: null,
        });
    }),

    listPublic: catchAsync(async (req, res) => {
        const query = publicAdsQuerySchema.parse(req.query);
        const result = await adService.listPublicAds(query);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Ad campaigns fetched successfully',
            data: { rows: result.data, meta: result.meta },
        });
    }),
};
