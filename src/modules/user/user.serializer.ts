import type { IUserDocument } from './user.interface';
import type { SerializerFn } from '@/core/types/serializer.types';
import { AUTH_STRATEGIES } from './user.constants';

export interface UserResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    bio?: string;
    role: string;
    status: string;
    registrationStrategy: string;
    lastLoginStrategy?: string;
    isEmailVerified: boolean;
    avatarUrl?: string;
    onboardingStep: string;
    isOnboardingCompleted: boolean;
    totalProducts: number;
    soldItemsCount: number;
    avgRating: number;
    totalReviewCount: number;
    ratingDistribution?: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
    ratingDistributionFormatted?: {
        five: number;
        four: number;
        three: number;
        two: number;
        one: number;
    };
    address: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const resolveId = (user: IUserDocument): string => user.id ?? String((user as any)._id ?? '');

export const serializeUser: SerializerFn<IUserDocument, UserResponseDto> = (user): UserResponseDto => ({
    id: resolveId(user),
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    bio: user.bio,
    role: user.role,
    status: user.status,
    registrationStrategy: user.registrationStrategy ?? AUTH_STRATEGIES.LOCAL,
    lastLoginStrategy: user.lastLoginStrategy,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatarUrl,
    onboardingStep: user.onboardingStep,
    isOnboardingCompleted: user.isOnboardingCompleted,
    totalProducts: user.totalProducts ?? 0,
    soldItemsCount: user.soldItemsCount ?? 0,
    avgRating: user.avgRating ?? 0,
    totalReviewCount: user.totalReviewCount ?? 0,
    ratingDistribution: user.ratingDistribution,
    ratingDistributionFormatted: user.ratingDistributionFormatted,
    address: user.address ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const serializeUsers = (users: IUserDocument[]) => users.map(serializeUser);