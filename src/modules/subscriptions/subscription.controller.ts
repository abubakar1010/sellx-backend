import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { subscriptionService } from './subscription.service';

export const subscriptionController = {
    listActive: catchAsync(async (_req: Request, res: Response) => {
        const data = await subscriptionService.getActive();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Active subscriptions fetched successfully.',
            data,
        });
    }),
};
