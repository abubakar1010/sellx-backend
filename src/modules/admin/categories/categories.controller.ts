import type { Request, Response } from 'express';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { adminCategoriesService } from './categories.service';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import {
    createCategoryBodySchema,
    updateCategoryBodySchema,
} from '@/modules/categories/category.validation';

export const adminCategoriesController = {
    list: catchAsync(async (req: Request, res: Response) => {
        const data = await adminCategoriesService.list();
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Categories fetched successfully.',
            data,
        });
    }),

    stats: catchAsync(async (req: Request, res: Response) => {
        const data = await adminCategoriesService.getStats();
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Category stats fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const data = await adminCategoriesService.getById(id);
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Category fetched successfully.',
            data,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const file = req.file;
        if (file) {
            req.body.thumbnail = getFileUrl(file.filename, 'categories');
        }
        const body = createCategoryBodySchema.parse(req.body);
        const category = await adminCategoriesService.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: (category as any)._id?.toString() ?? (category as any).id,
            targetType: 'category',
            message: `Category "${body.title}" was created.`,
            metadata: { title: body.title },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Category created successfully.',
            data: category,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const file = req.file;
        if (file) {
            req.body.thumbnail = getFileUrl(file.filename, 'categories');
        }
        const body = updateCategoryBodySchema.parse(req.body);
        const updated = await adminCategoriesService.update(id, body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'category',
            message: `Category "${updated.title}" was updated.`,
            metadata: { title: updated.title, changes: body },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Category updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await adminCategoriesService.delete(id);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'category',
            message: `Category was deleted.`,
            metadata: { categoryId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Category deleted successfully.',
            data: null,
        });
    }),
};
