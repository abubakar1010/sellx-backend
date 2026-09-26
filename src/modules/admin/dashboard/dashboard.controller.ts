import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
    getSummary: catchAsync(async (req: Request, res: Response) => {
        const data = await dashboardService.getSummary(req.query as any);
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Dashboard summary fetched successfully.',
            data,
        });
    }),
};
