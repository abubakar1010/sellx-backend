import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { adminStoriesQuerySchema } from './stories.validation';
import { adminStoriesService } from './stories.service';

export const adminStoriesController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = adminStoriesQuerySchema.parse(req.query);
        const data = await adminStoriesService.list(query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Stories fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const data = await adminStoriesService.getStats();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story stats fetched successfully.',
            data,
        });
    }),
};
