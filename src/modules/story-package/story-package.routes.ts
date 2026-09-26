import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { NotFoundError } from '@/core/errors';
import { StoryPackageModel } from '@/modules/stories/story.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.get(
    '/',
    catchAsync(async (_req, res) => {
        const packages = await StoryPackageModel.find({ isActive: true })
            .sort({ price: 1 })
            .lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story packages fetched successfully.',
            data: packages,
        });
    }),
);

router.get(
    '/:id',
    validate({ params: objectIdParamSchema }),
    catchAsync(async (req, res) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const pkg = await StoryPackageModel.findOne({ _id: id, isActive: true }).lean();
        if (!pkg) throw new NotFoundError('Story package not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story package fetched successfully.',
            data: pkg,
        });
    }),
);

export default router;
