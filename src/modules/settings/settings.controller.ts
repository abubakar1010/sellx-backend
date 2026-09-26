import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { settingService } from './settings.service';
import { settingSlugEnum } from './settings.validation';

export const settingController = {
    getBySlug: catchAsync(async (req: Request, res: Response) => {
        const slug = settingSlugEnum.parse(req.params.slug);
        const data = await settingService.getBySlug(slug);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Setting fetched successfully.',
            data,
        });
    }),
};
