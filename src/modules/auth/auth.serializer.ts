import type { AuthResponse } from './auth.interface';

export const serializeAuthResponse = (payload: AuthResponse): AuthResponse => {
    return {
        user: {
            id: payload.user.id,
            email: payload.user.email,
            phone: payload.user.phone,
            firstName: payload.user.firstName,
            lastName: payload.user.lastName,
            fullName: payload.user.fullName,
            role: payload.user.role,
            status: payload.user.status,
            registrationStrategy: payload.user.registrationStrategy,
            lastLoginStrategy: payload.user.lastLoginStrategy,
            isEmailVerified: payload.user.isEmailVerified,
            avatarUrl: payload.user.avatarUrl,
            onboardingStep: payload.user.onboardingStep,
            isOnboardingCompleted: payload.user.isOnboardingCompleted,
            notificationToken: payload.user.notificationToken,
            deviceType: payload.user.deviceType,
            activeProfileType: payload.user.activeProfileType,
            activeStoreId: payload.user.activeStoreId,
            storeId: payload.user.storeId,
            stores: payload.user.stores ?? [],
            totalProducts: payload.user.totalProducts ?? 0,
            soldItemsCount: payload.user.soldItemsCount ?? 0,
            avgRating: payload.user.avgRating ?? 0,
            totalReviewCount: payload.user.totalReviewCount ?? 0,
            ratingDistribution: payload.user.ratingDistribution,
            address: payload.user.address ?? null,
        },
        tokens: {
            accessToken: payload.tokens.accessToken,
            refreshToken: payload.tokens.refreshToken,
        },
        onboarding: {
            step: payload.onboarding.step,
            isCompleted: payload.onboarding.isCompleted,
            nextRoute: payload.onboarding.nextRoute,
        },
    };
};
