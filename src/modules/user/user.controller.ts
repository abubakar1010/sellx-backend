import type { RequestHandler } from 'express';

import { MESSAGES } from '@/core/constants/messages';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { parseOffsetPagination } from '@/shared/utils/pagination';
import { BadRequestError, UnauthorizedError } from '@/core/errors';

import { userService } from './user.service';
import { authService } from '@/modules/auth/auth.service';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { ONBOARDING_REDIRECTS, type OnboardingStep } from './user.constants';

const getUserId = (id?: string) => {
    if (!id) throw new UnauthorizedError('Authentication required');
    return id;
};

const getParamId = (id: unknown): string => {
    if (typeof id !== 'string') {
        throw new BadRequestError('Invalid user id');
    }
    return id;
};

const toUserId = (user: any): string => user.id ?? String(user._id ?? '');

const buildUserStats = (user: any) => ({
    totalProducts: user.totalProducts ?? 0,
    soldItemsCount: user.soldItemsCount ?? 0,
    avgRating: user.avgRating ?? 0,
    totalReviewCount: user.totalReviewCount ?? 0,
    ratingDistribution: user.ratingDistribution,
});

const buildAuthUserResponse = (user: any) => ({
    user: {
        id: toUserId(user),
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        status: user.status,
        registrationStrategy: user.registrationStrategy,
        lastLoginStrategy: user.lastLoginStrategy,
        isEmailVerified: user.isEmailVerified,
        avatarUrl: user.avatarUrl,
        onboardingStep: user.onboardingStep,
        isOnboardingCompleted: user.isOnboardingCompleted,
        notificationToken: user.notificationToken,
        deviceType: user.deviceType,
        address: user.address ?? null,
        ...buildUserStats(user),
    },
    onboarding: {
        step: user.onboardingStep,
        isCompleted: user.isOnboardingCompleted,
        nextRoute: ONBOARDING_REDIRECTS[user.onboardingStep as OnboardingStep] ?? '/dashboard',
    },
});

export const userController = {
    getPublicProfile: catchAsync(async (req, res) => {
        const user = await userService.getById(getParamId(req.params.id));
        const trustScore = user.totalReviewCount > 0 ? Math.round((user.avgRating / 5) * 100) : 0;

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'User profile fetched successfully',
            data: {
                id: toUserId(user),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                avgRating: user.avgRating ?? 0,
                totalReviewCount: user.totalReviewCount ?? 0,
                trustScore,
                respondsWithinMinutes: null,
                totalProducts: user.totalProducts ?? 0,
                soldItemsCount: user.soldItemsCount ?? 0,
            },
        });
    }),

    createUser: catchAsync(async (req, res) => {
        const user = await userService.createUser(req.body, { signal: req.signal });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.CREATED,
            message: MESSAGES.GENERAL.CREATED,
            data: buildAuthUserResponse(user),
        });
    }),

    listUsers: catchAsync(async (req, res) => {
        const pagination = parseOffsetPagination(req.query as Record<string, unknown>);

        const result = await userService.listUsers(req.query as any, pagination, {
            signal: req.signal,
        });

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.LIST_FETCHED,
            data: {
                rows: result.data.map(buildAuthUserResponse),
                meta: result.meta,
            },
        });
    }),

    getUser: catchAsync(async (req, res) => {
        const user = await userService.getById(getParamId(req.params.id));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.FETCHED,
            data: buildAuthUserResponse(user),
        });
    }),

    getMe: catchAsync(async (req, res) => {
        const user = await userService.getById(getUserId(req.user?.id));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.FETCHED,
            data: buildAuthUserResponse(user),
        });
    }),

    updateUser: catchAsync(async (req, res) => {
        const updated = await userService.updateById(getParamId(req.params.id), req.body);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.UPDATED,
            data: buildAuthUserResponse(updated),
        });
    }),

    updateMe: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const file = req.file;

        let payload = req.body;
        if (req.body?.data && typeof req.body.data === 'string') {
            try {
                payload = JSON.parse(req.body.data);
            } catch {
                throw new BadRequestError('Invalid JSON in data field');
            }
        }

        let avatarUrl: string | undefined;
        if (file) {
            avatarUrl = getFileUrl(file.filename, 'users');
        }

        const updateData: any = { ...payload };
        if (avatarUrl) {
            updateData.avatarUrl = avatarUrl;
        }

        const updated = await userService.updateProfile(userId, updateData);

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.UPDATED,
            data: buildAuthUserResponse(updated),
        });
    }),

    deleteUser: catchAsync(async (req, res) => {
        await userService.deleteById(getParamId(req.params.id));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.DELETED,
            data: null,
        });
    }),

    deleteMe: catchAsync(async (req, res) => {
        await userService.deleteMe(getUserId(req.user?.id));

        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: MESSAGES.USER.DELETED,
            data: null,
        });
    }),

    switchToProfile: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const result = await authService.switchContext(userId, 'user');
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Switched to profile successfully',
            data: result,
        });
    }),

    switchToStore: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const storeId = req.params.storeId as string | undefined;
        const result = await authService.switchContext(userId, 'store', storeId);
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Switched to store successfully',
            data: result,
        });
    }),
};