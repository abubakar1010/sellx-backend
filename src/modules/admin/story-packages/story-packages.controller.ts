import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { StoryPackageModel } from '@/modules/stories/story.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { NotFoundError } from '@/core/errors';
import { CURRENCY, CURRENCY_ERROR } from '@/core/constants/currency';

const createBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
    durationHours: z.number().int().min(1),
    price: z.number().min(0),
    maxStories: z.number().int().min(1).default(1),
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).default(CURRENCY),
    validityDays: z.number().int().min(1).default(30),
});

const updateBodySchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    durationHours: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    maxStories: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).optional(),
    validityDays: z.number().int().min(1).optional(),
});

export const adminStoryPackagesController = {
    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await StoryPackageModel.find().sort({ price: 1 }).lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story packages fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const doc = await StoryPackageModel.findById(id).lean();
        if (!doc) throw new NotFoundError('Story package not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story package fetched successfully.',
            data: doc,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createBodySchema.parse(req.body);

        const data = await StoryPackageModel.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: data._id?.toString() ?? data.id,
            targetType: 'story_package',
            message: `Story package "${body.name}" created.`,
            metadata: { storyPackageId: data._id?.toString() ?? data.id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Story package created successfully.',
            data,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateBodySchema.parse(req.body);

        const updated = await StoryPackageModel.findByIdAndUpdate(id, { $set: body }, { new: true });
        if (!updated) throw new NotFoundError('Story package not found');

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'story_package',
            message: `Story package "${updated.name}" updated.`,
            metadata: { storyPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story package updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const existing = await StoryPackageModel.findById(id);
        if (!existing) throw new NotFoundError('Story package not found');
        await StoryPackageModel.deleteOne({ _id: id });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'story_package',
            message: `Story package "${existing.name}" deleted.`,
            metadata: { storyPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Story package deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const pkg = await StoryPackageModel.findById(id);
        if (!pkg) throw new NotFoundError('Story package not found');

        pkg.isActive = !pkg.isActive;
        await pkg.save();

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'story_package',
            message: `Story package "${pkg.name}" ${pkg.isActive ? 'activated' : 'deactivated'}.`,
            metadata: { storyPackageId: id, isActive: pkg.isActive },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Story package ${pkg.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: pkg,
        });
    }),
};
