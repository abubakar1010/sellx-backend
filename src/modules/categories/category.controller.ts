import { MESSAGES } from '@/core/constants/messages';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { BadRequestError } from '@/core/errors';

import { categoryService } from './category.service';
import { listCategoriesQuerySchema, updateCategoryBodySchema } from './category.validation';
import { serializeCategories } from './category.serializer';
import { addActivityJob } from '@/jobs/producers/activity.producer';

const getParamId = (id: unknown): string => {
    if (typeof id !== 'string') {
        throw new BadRequestError('Invalid category id');
    }
    return id;
};

export const categoryController = {
    // --- Public Access ---
    listPublicCategories: catchAsync(async (req, res) => {
        const query = listCategoriesQuerySchema.parse(req.query);
        const result = await categoryService.listCategories(query, {
            signal: req.signal,
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.CATEGORY.LIST_FETCHED,
            data: { rows: serializeCategories(result.data), meta: result.meta },
        });
    }),

    // --- Admin Access ---
    listAdminCategories: catchAsync(async (req, res) => {
        const query = listCategoriesQuerySchema.parse(req.query);
        const result = await categoryService.listCategories(query, {
            signal: req.signal,
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.CATEGORY.LIST_FETCHED,
            data: { rows: serializeCategories(result.data), meta: result.meta },
        });
    }),

    createCategory: catchAsync(async (req, res) => {
        const category = await categoryService.createCategory(req.body, { signal: req.signal });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: (category as any)._id?.toString() ?? (category as any).id,
            targetType: 'category',
            message: `Category "${req.body.title}" was created.`,
            metadata: { title: req.body.title },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: MESSAGES.CATEGORY.CREATED,
            data: category,
        });
    }),

    updateCategory: catchAsync(async (req, res) => {
        const categoryId = getParamId(req.params.id);
        const body = updateCategoryBodySchema.parse(req.body);
        const updated = await categoryService.updateCategory(categoryId, body, {
            signal: req.signal,
        });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: categoryId,
            targetType: 'category',
            message: `Category "${updated.title}" was updated.`,
            metadata: { title: updated.title, changes: body },
        });

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.CATEGORY.UPDATED,
            data: updated,
        });
    }),
};
