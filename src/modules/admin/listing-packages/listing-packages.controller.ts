import type { Request, Response } from 'express';
import { z } from 'zod';

import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { ListingPackageModel } from '@/modules/listing-package/listing-package.model';
import { CategoryModel } from '@/modules/categories/category.model';
import { objectIdParamSchema } from '@/modules/user/user.validation';
import { addActivityJob } from '@/jobs/producers/activity.producer';
import { NotFoundError, BadRequestError } from '@/core/errors';
import { CURRENCY, CURRENCY_ERROR } from '@/core/constants/currency';

const createBodySchema = z.object({
    name: z.string().trim().min(1).max(100),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
    durationHours: z.number().int().min(1),
    price: z.number().min(0),
    maxListings: z.number().int().min(1).default(1),
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).default(CURRENCY),
    validityDays: z.number().int().min(1).default(30),
});

const updateBodySchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
    durationHours: z.number().int().min(1).optional(),
    price: z.number().min(0).optional(),
    maxListings: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
    currency: z.literal(CURRENCY, { error: CURRENCY_ERROR }).optional(),
    validityDays: z.number().int().min(1).optional(),
});

export const adminListingPackagesController = {
    list: catchAsync(async (_req: Request, res: Response) => {
        const data = await ListingPackageModel.find()
            .populate('category', 'title slug thumbnail')
            .sort({ price: 1 })
            .lean();

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing packages fetched successfully.',
            data,
        });
    }),

    getById: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const doc = await ListingPackageModel.findById(id)
            .populate('category', 'title slug thumbnail')
            .lean();
        if (!doc) throw new NotFoundError('Listing package not found');

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing package fetched successfully.',
            data: doc,
        });
    }),

    create: catchAsync(async (req: Request, res: Response) => {
        const body = createBodySchema.parse(req.body);

        const category = await CategoryModel.findById(body.category).lean();
        if (!category) throw new BadRequestError('Category not found');

        const data = await ListingPackageModel.create(body);

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: data._id?.toString() ?? data.id,
            targetType: 'listing_package',
            message: `Listing package "${body.name}" created for category "${category.title}".`,
            metadata: { listingPackageId: data._id?.toString() ?? data.id, categoryId: body.category },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: 'Listing package created successfully.',
            data,
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const body = updateBodySchema.parse(req.body);

        if (body.category) {
            const category = await CategoryModel.findById(body.category).lean();
            if (!category) throw new BadRequestError('Category not found');
        }

        const updated = await ListingPackageModel.findByIdAndUpdate(id, { $set: body }, { new: true });
        if (!updated) throw new NotFoundError('Listing package not found');

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'listing_package',
            message: `Listing package "${updated.name}" updated.`,
            metadata: { listingPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing package updated successfully.',
            data: updated,
        });
    }),

    delete: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const existing = await ListingPackageModel.findById(id);
        if (!existing) throw new NotFoundError('Listing package not found');
        await ListingPackageModel.deleteOne({ _id: id });

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'listing_package',
            message: `Listing package "${existing.name}" deleted.`,
            metadata: { listingPackageId: id },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Listing package deleted successfully.',
            data: null,
        });
    }),

    toggleStatus: catchAsync(async (req: Request, res: Response) => {
        const { id } = objectIdParamSchema.parse(req.params);
        const pkg = await ListingPackageModel.findById(id);
        if (!pkg) throw new NotFoundError('Listing package not found');

        pkg.isActive = !pkg.isActive;
        await pkg.save();

        addActivityJob({
            activityType: 'admin_action',
            actorId: req.user?.id,
            actorType: 'admin',
            targetId: id,
            targetType: 'listing_package',
            message: `Listing package "${pkg.name}" ${pkg.isActive ? 'activated' : 'deactivated'}.`,
            metadata: { listingPackageId: id, isActive: pkg.isActive },
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: `Listing package ${pkg.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: pkg,
        });
    }),
};
