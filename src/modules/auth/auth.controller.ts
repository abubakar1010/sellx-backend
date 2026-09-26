import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

import { authService } from './auth.service';
import { UnauthorizedError } from '@/core/errors';
import { userService } from '../user/user.service';
import { storeService } from '../stores/store.service';
import { MESSAGES } from '@/core/constants/messages';
import { catchAsync } from '@/shared/utils/catchAsync';
import { serializeUser } from '../user/user.serializer';
import { serializeStoresBasic } from '../stores/store.serializer';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { serializeAuthResponse } from './auth.serializer';
import { sendResponse } from '@/shared/utils/sendResponse';
import { getFacebookAuthUrl, getGoogleAuthUrl } from './strategies';

const getCurrentUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required.');
    return userId;
};

const register: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.register(req.body, { signal: req.signal });
    sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.AUTH.REGISTER_SUCCESS,
        data: {
            userId: result.userId,
            email: result.email,
            name: result.name,
            onboarding: result.onboarding,
        },
    });
});

const login: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.login(req.body, { signal: req.signal });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.LOGIN_SUCCESS,
        data: serializeAuthResponse(result),
    });
});

const refreshTokens: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.refreshTokens(req.body, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.TOKEN_REFRESHED,
        data: serializeAuthResponse(result),
    });
});

const logout: RequestHandler = catchAsync(async (req, res) => {
    await authService.logout(req.body.refreshToken, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.LOGOUT_SUCCESS,
        data: null,
    });
});

const me: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const user = await userService.getById(userId, { signal: req.signal });
    const store = await storeService.getUserStore(userId);
    const serializedStores = store ? serializeStoresBasic([store] as any) : [];

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.FETCHED,
        data: {
            ...serializeUser(user),
            location: user.location
                ? { type: 'Point' as const, coordinates: user.location.coordinates }
                : null,
            stores: serializedStores,
            notificationToken: user.notificationToken,
            deviceType: user.deviceType,
            activeProfileType: (user as any).activeProfileType ?? 'user',
            activeStoreId: user.activeStoreId?.toString(),
        },
    });
});

const googleAuthUrl: RequestHandler = catchAsync(async (req, res) => {
    const state =
        typeof req.query.state === 'string' && req.query.state.trim()
            ? req.query.state.trim()
            : randomUUID();
    const url = getGoogleAuthUrl({ state });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Google auth url generated successfully.',
        data: { url, state },
    });
});

const facebookAuthUrl: RequestHandler = catchAsync(async (req, res) => {
    const state =
        typeof req.query.state === 'string' && req.query.state.trim()
            ? req.query.state.trim()
            : randomUUID();
    const url = getFacebookAuthUrl({ state });

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Facebook auth url generated successfully.',
        data: { url, state },
    });
});

const googleCallback: RequestHandler = catchAsync(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const result = await authService.loginWithGoogle({ code }, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.SOCIAL_LOGIN_SUCCESS,
        data: serializeAuthResponse(result),
    });
});

const facebookCallback: RequestHandler = catchAsync(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const result = await authService.loginWithFacebook({ code }, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.SOCIAL_LOGIN_SUCCESS,
        data: serializeAuthResponse(result),
    });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
    await authService.forgotPassword(req.body, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Reset code sent to your email.',
        data: null,
    });
});

const verifyResetCode: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.verifyResetCode(req.body, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Code verified. You can now change your password.',
        data: result,
    });
});

const resendOtp: RequestHandler = catchAsync(async (req, res) => {
    await authService.resendOtp(req.body, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Verification code sent successfully.',
        data: null,
    });
});

const verifyEmail: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.verifyEmail(req.body, { signal: req.signal });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.EMAIL_VERIFIED,
        data: {
            user: result.user,
            tokens: result.tokens,
            onboarding: result.onboarding,
        },
    });
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    await authService.changePassword(userId, req.body, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.PASSWORD_CHANGED,
        data: null,
    });
});

const deleteAccount: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    await authService.deleteAccount(userId, req.body.password, { signal: req.signal });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Account deleted successfully',
        data: null,
    });
});

export const authController = {
    register,
    login,
    refreshTokens,
    logout,
    me,
    googleAuthUrl,
    facebookAuthUrl,
    googleCallback,
    facebookCallback,
    forgotPassword,
    verifyResetCode,
    resendOtp,
    verifyEmail,
    changePassword,
    deleteAccount,
};