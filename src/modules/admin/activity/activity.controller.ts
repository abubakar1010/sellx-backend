import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { activityService } from './activity.service';

export const activityController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const data = await activityService.getActivities(req.query as any);
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Activities fetched successfully.',
            data,
        });
    }),
};
