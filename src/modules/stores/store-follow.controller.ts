import { catchAsync } from '@shared/utils/catchAsync';
import { sendResponse } from '@shared/utils/sendResponse';
import { HTTP_STATUS } from '@core/constants/httpStatus';
import { storeFollowService } from './store-follow.service';
import type { Request, Response } from 'express';

export const storeFollowController = {
    toggle: catchAsync(async (req: Request, res: Response) => {
        const storeId = req.params.id as string;
        const isFollowing = await storeFollowService.toggleFollow(req.user!.id, storeId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: isFollowing ? 'Store followed successfully' : 'Store unfollowed successfully',
            data: { isFollowing },
        });
    }),

    check: catchAsync(async (req: Request, res: Response) => {
        const storeId = req.params.id as string;
        const isFollowing = await storeFollowService.isFollowing(req.user!.id, storeId);

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Follow status fetched',
            data: { isFollowing },
        });
    }),
};