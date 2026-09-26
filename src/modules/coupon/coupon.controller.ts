import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { couponService } from './coupon.service';
import { validateCouponQuerySchema } from './coupon.validation';

export const couponController = {
    validate: catchAsync(async (req: Request, res: Response) => {
        const query = validateCouponQuerySchema.parse(req.query);
        const data = await couponService.validate(query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Coupon is valid.',
            data,
        });
    }),
};
