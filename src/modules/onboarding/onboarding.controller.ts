import { UnauthorizedError } from '@/core/errors';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { onboardingService } from './onboarding.service';
import { ONBOARDING_REDIRECTS, type OnboardingStep } from '../user/user.constants';

const getUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required');
    return userId;
};

const toUserId = (user: any): string => user.id ?? String(user._id ?? '');

const buildUserStats = (user: any) => ({
    totalProducts: user.totalProducts ?? 0,
    soldItemsCount: user.soldItemsCount ?? 0,
    avgRating: user.avgRating ?? 0,
    totalReviewCount: user.totalReviewCount ?? 0,
    ratingDistribution: user.ratingDistribution,
});

const buildOnboardingResponse = (user: any) => ({
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
        address: user.address ?? null,
        ...buildUserStats(user),
    },
    onboarding: {
        step: user.onboardingStep,
        isCompleted: user.isOnboardingCompleted,
        nextRoute: ONBOARDING_REDIRECTS[user.onboardingStep as OnboardingStep] ?? '/dashboard',
    },
});

export const onboardingController = {
    completeProfile: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const file = req.file;

        const payload = req.body;

        let avatarUrl: string | undefined;
        if (file) {
            avatarUrl = `/uploads/users/${file.filename}`;
        }

        const updated = await onboardingService.completeProfile(userId, payload, avatarUrl);
        if (!updated) throw new Error('Failed to update profile');

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Profile completed successfully',
            data: buildOnboardingResponse(updated),
        });
    }),

    selectCategories: catchAsync(async (req, res) => {
        const userId = getUserId(req.user?.id);
        const updated = await onboardingService.selectCategories(userId, req.body);
        if (!updated) throw new Error('Failed to update categories');

        sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'Categories selected successfully',
            data: buildOnboardingResponse(updated),
        });
    }),
};