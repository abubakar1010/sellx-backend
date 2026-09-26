import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { BoostPlanModel } from '@/modules/products/products.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { NotFoundError, BadRequestError } from '@/core/errors';

const createBoostPlanBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    price: z.number().min(0),
    durationHours: z.number().int().min(1),
    description: z.string().trim().max(500).optional(),
});

const updateBoostPlanBodySchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    price: z.number().min(0).optional(),
    durationHours: z.number().int().min(1).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
});

export const adminBoostPlansController = {
    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await BoostPlanModel.find().sort({ price: 1 }).lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Boost plans fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const doc = await BoostPlanModel.findById(id).lean();
        if (!doc) throw new NotFoundError('Boost plan not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Boost plan fetched successfully.',
            data: doc,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createBoostPlanBodySchema.parse(req.body);

        const existing = await BoostPlanModel.findOne({ name: body.name });
        if (existing) throw new BadRequestError('Boost plan with this name already exists');

        const data = await BoostPlanModel.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: data._id?.toString() ?? data.id,
            targetType: 'boost_plan',
            message: `Boost plan "${data.name}" created.`,
            metadata: { boostPlanId: data._id?.toString() ?? data.id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Boost plan created successfully.',
            data,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateBoostPlanBodySchema.parse(req.body);

        const updated = await BoostPlanModel.findByIdAndUpdate(id, { $set: body }, { new: true });
        if (!updated) throw new NotFoundError('Boost plan not found');

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'boost_plan',
            message: `Boost plan "${updated.name}" updated.`,
            metadata: { boostPlanId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Boost plan updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const existing = await BoostPlanModel.findById(id);
        if (!existing) throw new NotFoundError('Boost plan not found');
        await BoostPlanModel.deleteOne({ _id: id });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'boost_plan',
            message: `Boost plan "${existing.name}" deleted.`,
            metadata: { boostPlanId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Boost plan deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const plan = await BoostPlanModel.findById(id);
        if (!plan) throw new NotFoundError('Boost plan not found');

        plan.isActive = !plan.isActive;
        await plan.save();

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'boost_plan',
            message: `Boost plan "${plan.name}" ${plan.isActive ? 'activated' : 'deactivated'}.`,
            metadata: { boostPlanId: id, isActive: plan.isActive },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Boost plan ${plan.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: plan,
        });
    }),
};
