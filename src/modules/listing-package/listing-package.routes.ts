import { Router } from 'express';
import { z } from 'zod';
import { validate } from '@/shared/middlewares/validate';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { NotFoundError } from '@/core/errors';
import { ListingPackageModel } from './listing-package.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const listQuerySchema = z.object({
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
});

const router = Router();

router.get(
    '/',
    validate({ query: listQuerySchema }),
    catchAsync(async (req, res) => {
        const { category } = listQuerySchema.parse(req.query);
        const filter: Record<string, unknown> = { isActive: true };
        if (category) filter.category = category;

        const packages = await ListingPackageModel.find(filter)
            .populate('category', 'title slug thumbnail')
            .sort({ price: 1 })
            .lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing packages fetched successfully.',
            data: packages,
        });
    }),
);

router.get(
    '/:id',
    validate({ params: objectIdParamSchema }),
    catchAsync(async (req, res) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const pkg = await ListingPackageModel.findOne({ _id: id, isActive: true })
            .populate('category', 'title slug thumbnail')
            .lean();
        if (!pkg) throw new NotFoundError('Listing package not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing package fetched successfully.',
            data: pkg,
        });
    }),
);

export default router;
