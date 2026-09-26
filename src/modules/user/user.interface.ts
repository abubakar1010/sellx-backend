// user.interface.ts
import type { Document, Types } from 'mongoose';

import type { Role } from '@/core/constants/roles';
import type { AuthStrategy, UserStatus } from './user.constants';

/* -------------------------------------------------------------------------- */
/*                              Enums & Sub-types                             */
/* -------------------------------------------------------------------------- */

export enum ONBOARDING_STEPS {
    REGISTERED = 'REGISTERED',
    EMAIL_VERIFIED = 'EMAIL_VERIFIED',
    PROFILE_SETUP = 'PROFILE_SETUP',
    COMPLETED = 'COMPLETED',
}

export const ONBOARDING_FLOW: ONBOARDING_STEPS[] = [
    ONBOARDING_STEPS.REGISTERED,
    ONBOARDING_STEPS.EMAIL_VERIFIED,
    ONBOARDING_STEPS.PROFILE_SETUP,
    ONBOARDING_STEPS.COMPLETED,
];

export const ONBOARDING_REDIRECTS: Record<ONBOARDING_STEPS, string> = {
    [ONBOARDING_STEPS.REGISTERED]: '/onboarding/verify-email',
    [ONBOARDING_STEPS.EMAIL_VERIFIED]: '/onboarding/profile',
    [ONBOARDING_STEPS.PROFILE_SETUP]: '/onboarding/categories',
    [ONBOARDING_STEPS.COMPLETED]: '/dashboard',
};

export interface ILocation {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

export interface IUserRatingDistribution {
    5: number; // Percentage of 5-star reviews
    4: number; // Percentage of 4-star reviews
    3: number; // Percentage of 3-star reviews
    2: number; // Percentage of 2-star reviews
    1: number; // Percentage of 1-star reviews
}

// Optional: If you need a type for updating (where values might be partial)
export type IUserRatingDistributionUpdate = Partial<IUserRatingDistribution>;

/* -------------------------------------------------------------------------- */
/*                              Core User Interface                           */
/* -------------------------------------------------------------------------- */

export interface IUser {
    // --- Identity ---
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio?: string;
    password: string;
    avatarUrl?: string;

    // --- Auth & Access ---
    role: Role;
    status: UserStatus;
    registrationStrategy: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockUntil?: Date | null;

    // --- Email Verification ---
    isEmailVerified: boolean;

    // --- Onboarding ---
    onboardingStep: ONBOARDING_STEPS;
    isOnboardingCompleted: boolean;
    agreeTermsAndConditions: boolean;
    termsAcceptedAt?: Date;

    // --- Categories ---
    interestedCategories: Types.ObjectId[];

    // --- Location & Address ---
    location?: ILocation;
    address?: string | null;

    // --- Marketplace Stats ---
    totalProducts: number;
    avgRating: number;
    totalReviewCount: number;
    ratingDistribution: IUserRatingDistribution;
    soldItemsCount: number;

    // --- Notifications ---
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';

    // --- Profile Switching ---
    activeProfileType: 'user' | 'store';
    activeStoreId?: string;

    // --- Soft Delete ---
    isDeleted: boolean;
    deletedAt?: Date | null;

    // --- Timestamps ---
    createdAt?: Date;
    updatedAt?: Date;
}

/* -------------------------------------------------------------------------- */
/*                             Mongoose Document                              */
/* -------------------------------------------------------------------------- */

export interface IUserDocument extends IUser, Document {
    id: string;
    fullName: string;
    isLocked: boolean;
    ratingDistributionFormatted: {
        five: number;
        four: number;
        three: number;
        two: number;
        one: number;
    };
}

/* -------------------------------------------------------------------------- */
/*                              Input DTOs                                    */
/* -------------------------------------------------------------------------- */

/** Step 1: Registration */
export interface CreateUserInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    agreeTermsAndConditions: boolean;
    // Auto-set by the server
    registrationStrategy?: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    lastLoginAt?: Date;
    termsAcceptedAt?: Date;
}

/** Step 2: Email Verification */
export interface VerifyEmailInput {
    email: string;
    otp: string;
}

/** Step 3: Profile Setup (avatar + phone + address) */
export interface CompleteProfileInput {
    avatarUrl: string;
    phone?: string;
    address?: string;
}

/** Step 4: Category Selection */
export interface SelectCategoriesInput {
    categories: Types.ObjectId[] | string[];
}

/** Admin: Update any user */
export interface UpdateUserInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    status?: UserStatus;
    role?: Role;
    avatarUrl?: string;
    isEmailVerified?: boolean;
    location?: ILocation;
    address?: string;
    interestedCategories?: Types.ObjectId[] | string[];
    onboardingStep?: ONBOARDING_STEPS;
    isOnboardingCompleted?: boolean;
    failedLoginAttempts?: number;
    lockUntil?: Date | null;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    activeProfileType?: 'user' | 'store';
    activeStoreId?: string;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
}

export interface UpdatePassword {
    password?: string;
}

/** Self: Update own profile (after onboarding) */
export interface UpdateProfileInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    bio?: string;
    avatarUrl?: string;
}

/** Self: Update interested categories */
export interface UpdateCategoriesInput {
    categories: Types.ObjectId[] | string[];
}

/* -------------------------------------------------------------------------- */
/*                              Query DTOs                                    */
/* -------------------------------------------------------------------------- */

export interface ListUsersQuery {
    page?: number;
    limit?: number;
    sort?: string;
    role?: Role;
    status?: UserStatus;
    registrationStrategy?: AuthStrategy;
    onboardingStep?: ONBOARDING_STEPS;
    isOnboardingCompleted?: boolean;
    search?: string;
    isDeleted?: boolean;
    isEmailVerified?: boolean;
    // Geospatial
    latitude?: number;
    longitude?: number;
    maxDistance?: number; // meters
}

/* -------------------------------------------------------------------------- */
/*                           Response / Safe Types                            */
/* -------------------------------------------------------------------------- */

/** Password-stripped user for API responses */
export interface IUserSafe extends Omit<IUser, 'password'> {
    id: string;
    fullName: string;
    isLocked: boolean;
}

/** Auth response with tokens */
export interface IUserWithTokens {
    user: IUserSafe;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}

/** Onboarding status returned after login / each step */
export interface IOnboardingStatus {
    onboardingStep: ONBOARDING_STEPS;
    isOnboardingCompleted: boolean;
    nextRoute: string;
}

/** Full login response */
export interface ILoginResponse extends IUserWithTokens {
    onboarding: IOnboardingStatus;
}
