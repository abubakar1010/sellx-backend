export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
    DELETED: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const AUTH_STRATEGIES = {
    LOCAL: 'local',
    GOOGLE: 'google',
    FACEBOOK: 'facebook',
    APPLE: 'apple',
} as const;

export type AuthStrategy = (typeof AUTH_STRATEGIES)[keyof typeof AUTH_STRATEGIES];

export const USER_DEFAULTS = {
    STATUS: USER_STATUS.ACTIVE,
    REGISTRATION_STRATEGY: AUTH_STRATEGIES.LOCAL,
    IS_DELETED: false,
} as const;

// user.constants.ts (add these)

export const ONBOARDING_STEPS = {
    REGISTERED: 'REGISTERED', // Step 1 done: basic info submitted
    EMAIL_VERIFIED: 'EMAIL_VERIFIED', // Step 2 done: OTP verified
    PROFILE_SETUP: 'PROFILE_SETUP', // Step 3 done: avatar + address
    COMPLETED: 'COMPLETED', // Step 4 done: full setup finished
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export const ONBOARDING_FLOW: OnboardingStep[] = [
    ONBOARDING_STEPS.REGISTERED,
    ONBOARDING_STEPS.EMAIL_VERIFIED,
    ONBOARDING_STEPS.PROFILE_SETUP,
    ONBOARDING_STEPS.COMPLETED,
];

/** Maps step → frontend route to redirect to */
export const ONBOARDING_REDIRECTS: Record<OnboardingStep, string> = {
    [ONBOARDING_STEPS.REGISTERED]: '/onboarding/verify-email',
    [ONBOARDING_STEPS.EMAIL_VERIFIED]: '/onboarding/profile',
    [ONBOARDING_STEPS.PROFILE_SETUP]: '/onboarding/categories',
    [ONBOARDING_STEPS.COMPLETED]: '/',
};