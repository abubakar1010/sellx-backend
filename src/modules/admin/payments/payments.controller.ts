import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { listPaymentsQuerySchema } from '@/modules/payments/payment.validation';
import { paymentService } from '@/modules/payments/payment.service';

export const adminPaymentsController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const query = listPaymentsQuerySchema.parse(req.query);
        const data = await paymentService.list(query);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Payment transactions fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (_req: Request, res: Response) => {
        const data = await paymentService.getStats();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Payment stats fetched successfully.',
            data,
        });
    }),
};
