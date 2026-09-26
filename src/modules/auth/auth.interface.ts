import type { AuthStrategy, UserStatus, OnboardingStep } from '../user/user.constants';

export interface StoreBasic {
    id: string;
    name: string;
    logo?: string;
    category: {
        id: string;
        title: string;
        slug: string;
    };
    isActive: boolean;
    isVerified: boolean;
}

export interface AuthUser {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: string;
    status: UserStatus;
    registrationStrategy: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    isEmailVerified: boolean;
    avatarUrl?: string;
    onboardingStep: OnboardingStep;
    isOnboardingCompleted: boolean;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
    activeProfileType: 'user' | 'store';
    activeStoreId?: string;
    storeId: string | null;
    stores: StoreBasic[];
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
    address: string | null;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    user: AuthUser;
    tokens: TokenPair;
    onboarding: {
        step: OnboardingStep;
        isCompleted: boolean;
        nextRoute: string;
    };
}

export interface RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    agreeTermsAndConditions: boolean;
}

export interface LoginInput {
    email?: string;
    password?: string;
    provider?: 'google' | 'apple';
    token?: string;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
}

export interface RefreshInput {
    refreshToken: string;
}

export interface ForgotPasswordInput {
    email: string;
}

export interface VerifyResetCodeInput {
    email: string;
    otp: string;
}

export interface VerifyResetCodeResponse {
    user: AuthUser;
    tokens: TokenPair;
}

export interface ResendOtpInput {
    email: string;
}

export interface VerifyEmailInput {
    email: string;
    otp: string;
}

export interface ChangePasswordInput {
    currentPassword?: string;
    newPassword: string;
    isReset?: boolean;
}

export interface OAuthCallbackInput {
    code: string;
}