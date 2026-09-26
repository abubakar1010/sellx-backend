import { ROLES } from '../../src/core/constants/roles';
import { AUTH_STRATEGIES, USER_STATUS } from '../../src/modules/user/user.constants';
import type { IUserDocument } from '../../src/modules/user/user.interface';

interface UserOverrides extends Partial<IUserDocument> {
    id?: string;
}

export const buildUser = (overrides: UserOverrides = {}): IUserDocument => {
    const now = new Date();
    return {
        id: overrides.id ?? '507f1f77bcf86cd799439011',
        firstName: overrides.firstName ?? 'Test',
        lastName: overrides.lastName ?? 'User',
        fullName: overrides.fullName ?? 'Test User',
        email: overrides.email ?? 'test.user@example.com',
        phone: overrides.phone ?? '+1234567890',
        password: overrides.password ?? 'hashed-password',
        bio: overrides.bio,
        role: overrides.role ?? ROLES.USER,
        status: overrides.status ?? USER_STATUS.ACTIVE,
        registrationStrategy: overrides.registrationStrategy ?? AUTH_STRATEGIES.LOCAL,
        lastLoginStrategy: overrides.lastLoginStrategy,
        isEmailVerified: overrides.isEmailVerified ?? true,
        isDeleted: overrides.isDeleted ?? false,
        deletedAt: overrides.deletedAt ?? null,
        avatarUrl: overrides.avatarUrl,
        onboardingStep: overrides.onboardingStep ?? 'REGISTERED',
        isOnboardingCompleted: overrides.isOnboardingCompleted ?? false,
        agreeTermsAndConditions: overrides.agreeTermsAndConditions ?? true,
        termsAcceptedAt: overrides.termsAcceptedAt ?? now,
        totalProducts: overrides.totalProducts ?? 0,
        avgRating: overrides.avgRating ?? 0,
        soldItemsCount: overrides.soldItemsCount ?? 0,
        failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
        lockUntil: overrides.lockUntil,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    } as unknown as IUserDocument;
};
