import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { settingService } from '@/modules/settings/settings.service';
import { upsertSettingBodySchema } from '@/modules/settings/settings.validation';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { settingSlugEnum } from '@/modules/settings/settings.validation';

export const adminSettingsController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const slug = req.query.slug ? settingSlugEnum.parse(req.query.slug) : undefined;
        const data = await settingService.list(slug);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Settings fetched successfully.',
            data,
        });
    }),

    upsert: catchAsync(async (req: Request, res: Response) => {
        const body = upsertSettingBodySchema.parse(req.body);
        const data = await settingService.upsert(body);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Setting saved successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const data = await settingService.getById(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Setting fetched successfully.',
            data,
        });
    }),
};
