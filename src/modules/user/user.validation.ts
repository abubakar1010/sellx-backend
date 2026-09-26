// auth.validation.ts
import { z } from 'zod';
import { ALL_ROLES } from '@/core/constants/roles';
import { AUTH_STRATEGIES, USER_STATUS, ONBOARDING_STEPS } from './user.constants';

/* ------------------------------- Helpers --------------------------------- */

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .max(72, 'Password must be at most 72 characters long.')
    .superRefine((val, ctx) => {
        if (!/[a-z]/.test(val)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Password must include at least one lowercase letter.',
            });
        }
        if (!/[A-Z]/.test(val)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Password must include at least one uppercase letter.',
            });
        }
        if (!/\d/.test(val)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Password must include at least one number.',
            });
        }
        if (!/[^A-Za-z0-9]/.test(val)) {
            ctx.addIssue({
                code: 'custom',
                message: 'Password must include at least one special character.',
            });
        }
    });

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectId = z.string().regex(objectIdRegex, 'Invalid ID format');

const coordinatesSchema = z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .describe('[longitude, latitude]');

const locationSchema = z.object({
    type: z.literal('Point').default('Point'),
    coordinates: coordinatesSchema,
});

export const updateUserSchema = z.object({
    status: z.enum(USER_STATUS),
});

/* ========================================================================== */
/*                       STEP 1 — Registration (basic)                        */
/* ========================================================================== */

/** POST /auth/register
 *  Required: firstName, lastName, email, password, agreeTermsAndConditions
 */
export const registerBodySchema = z.object({
    firstName: z.string().trim().min(2).max(120),
    lastName: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    phone: z.string().trim().regex(phoneRegex, 'Invalid phone number').optional(),
    password: passwordSchema,
    agreeTermsAndConditions: z.boolean({
        error: 'You must need to agree with our terms and conditions',
    }),
});

/* ========================================================================== */
/*                        STEP 2 — Email OTP Verification                      */
/* ========================================================================== */

/** POST /auth/verify-email */
export const verifyEmailBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(6).regex(/^\d+$/, 'OTP must be a 6-digit number'),
});

/** POST /auth/resend-otp */
export const resendOtpBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

/* ========================================================================== */
/*               STEP 3 — Profile Setup (avatar + addresses)                   */
/* ========================================================================== */

/** POST /onboarding/profile
 *  Avatar is uploaded as multipart; the URL is provided by your upload service.
 */
export const completeProfileBodySchema = z.object({
    avatarUrl: z.url().trim(),
    phone: z.string().trim().regex(phoneRegex, 'Invalid phone number').optional(),
    address: z.string().trim().optional(),
});

/* ========================================================================== */
/*                  STEP 4 — Select Interested Categories                      */
/* ========================================================================== */

/** POST /onboarding/categories */
export const selectCategoriesBodySchema = z.object({
    categories: z
        .array(objectId)
        .min(1, 'Please select at least one category')
        .max(20, 'You can select up to 20 categories')
        .refine((arr) => new Set(arr).size === arr.length, {
            message: 'Duplicate categories are not allowed',
        }),
});

/* ========================================================================== */
/*                         STEP 5 — Finish Onboarding                          */
/* ========================================================================== */

/** POST /onboarding/finish — usually no body required */
export const finishOnboardingBodySchema = z.object({}).optional();

/* ========================================================================== */
/*                              Onboarding Status                              */
/* ========================================================================== */

/** Server returns this so frontend knows where to redirect */
export const onboardingStatusSchema = z.object({
    onboardingStep: z.enum(ONBOARDING_STEPS),
    isOnboardingCompleted: z.boolean(),
    nextRoute: z.string(), // e.g. '/onboarding/profile'
});

/** Optional helper if frontend wants to directly request its “resume” point */
export const resumeOnboardingQuerySchema = z.object({
    redirect: z.coerce.boolean().optional().default(true),
});

/* ========================================================================== */
/*                                 Auth (Login)                                */
/* ========================================================================== */

/** POST /auth/login
 *  Login response should include onboardingStep & nextRoute so the frontend
 *  knows where to land.
 */
export const loginBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
    notificationToken: z.string().trim().optional(),
    deviceType: z.enum(['ios', 'android', 'web']).optional(),
});

export const refreshTokenBodySchema = z.object({
    refreshToken: z.string().min(1),
});

/* ============================ OAuth =============================== */

export const oauthUrlQuerySchema = z.object({
    state: z.string().trim().min(1).max(256).optional(),
});

export const oauthCallbackQuerySchema = z.object({
    code: z.string().trim().min(1),
    state: z.string().trim().min(1).max(256).optional(),
});

/* ====================== Password reset flow ======================= */

export const forgotPasswordBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordBodySchema = z.object({
    token: z.string().trim().min(1),
    password: passwordSchema,
});

export const changePasswordBodySchema = z
    .object({
        currentPassword: z.string().min(1),
        newPassword: passwordSchema,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        message: 'New password must be different from current password',
        path: ['newPassword'],
    });

/* ========================================================================== */
/*                            Profile / User updates                          */
/* ========================================================================== */

export const updateProfileBodySchema = z
    .object({
        firstName: z.string().trim().min(2).max(120).optional(),
        lastName: z.string().trim().min(2).max(120).optional(),
        email: z.email().trim().toLowerCase().optional(),
        phone: z.string().trim().regex(phoneRegex).optional(),
        bio: z.string().trim().max(500).optional(),
        avatarUrl: z.string().trim().url().optional(),
        notificationToken: z.string().trim().optional(),
        deviceType: z.enum(['ios', 'android', 'web']).optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
        message: 'At least one field is required',
    });

export const updateInterestedCategoriesBodySchema = selectCategoriesBodySchema;

/* ========================================================================== */
/*                                  Params                                     */
/* ========================================================================== */

export const objectIdParamSchema = z.object({
    id: objectId,
});

export const storeIdParamSchema = z.object({
    storeId: objectId,
});

// --- Query Parameters Schemas ---

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export const searchParamsSchema = z.object({
    search: z.string().optional(),
    sort: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING']).optional(),
    registrationStrategy: z.enum(['EMAIL_PASSWORD', 'GOOGLE', 'FACEBOOK', 'APPLE']).optional(),
    isDeleted: z.string().optional(), // boolean as query param "true"/"false"
    isEmailVerified: z.string().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    maxDistance: z.coerce.number().optional(), // meters
});

export const listUsersQuerySchema = paginationSchema.merge(searchParamsSchema);

/* ========================================================================== */
/*                                Inferred Types                              */
/* ========================================================================== */

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;
export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type SelectCategoriesBody = z.infer<typeof selectCategoriesBodySchema>;
export type FinishOnboardingBody = z.infer<typeof finishOnboardingBodySchema>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type OAuthUrlQuery = z.infer<typeof oauthUrlQuerySchema>;
export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ObjectIdParam = z.infer<typeof objectIdParamSchema>;
