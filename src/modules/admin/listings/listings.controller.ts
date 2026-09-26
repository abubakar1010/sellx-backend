import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { adminListingsService } from './listings.service';
import { updateListingStatusBodySchema } from './listings.validation';
import { serializeProduct } from '@/modules/products/product.serializer';

export const adminListingsController = {
    overview: catchAsync(async (req: Request, res: Response) => {
        const data = await adminListingsService.getOverview();
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing overview fetched successfully.',
            data,
        });
    }),

    list: catchAsync(async (req: Request, res: Response) => {
        const data = await adminListingsService.list(req.query as any);
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listings fetched successfully.',
            data,
        });
    }),

    deleteProduct: catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await adminListingsService.deleteProduct(id);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Product deleted successfully.',
            data: null,
        });
    }),

    updateStatus: catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const body = updateListingStatusBodySchema.parse(req.body);
        const updated = await adminListingsService.updateStatus(id, body.status, body.rejectionReason);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Listing ${body.status === 'active' ? 'approved' : 'rejected'} successfully.`,
            data: serializeProduct(updated as any, { revealSeller: true }),
        });
    }),
};
