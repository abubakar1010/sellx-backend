import { Router } from 'express';

import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { authRateLimiter } from '@/shared/middlewares/rateLimiter';
import { authController } from './auth.controller';
import {
    loginBodySchema,
    oauthCallbackQuerySchema,
    oauthUrlQuerySchema,
    refreshTokenBodySchema,
    registerBodySchema,
    forgotPasswordBodySchema,
    verifyResetCodeBodySchema,
    resendOtpBodySchema,
    verifyEmailBodySchema,
    changePasswordBodySchema,
    deleteAccountBodySchema,
} from './auth.validation';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerBodySchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginBodySchema }), authController.login);
router.get('/google/url', validate({ query: oauthUrlQuerySchema }), authController.googleAuthUrl);
router.get(
    '/facebook/url',
    validate({ query: oauthUrlQuerySchema }),
    authController.facebookAuthUrl,
);
router.get(
    '/google/callback',
    validate({ query: oauthCallbackQuerySchema }),
    authController.googleCallback,
);
router.get(
    '/facebook/callback',
    validate({ query: oauthCallbackQuerySchema }),
    authController.facebookCallback,
);
router.post(
    '/refresh-token',
    authRateLimiter,
    validate({ body: refreshTokenBodySchema }),
    authController.refreshTokens,
);
router.post('/logout', validate({ body: refreshTokenBodySchema }), authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
    '/forgot-password',
    authRateLimiter,
    validate({ body: forgotPasswordBodySchema }),
    authController.forgotPassword,
);
router.post(
    '/verify-reset-code',
    authRateLimiter,
    validate({ body: verifyResetCodeBodySchema }),
    authController.verifyResetCode,
);
router.post('/resend-otp', authRateLimiter, validate({ body: resendOtpBodySchema }), authController.resendOtp);
router.post('/verify-email', authRateLimiter, validate({ body: verifyEmailBodySchema }), authController.verifyEmail);
router.post(
    '/change-password',
    authenticate,
    validate({ body: changePasswordBodySchema }),
    authController.changePassword,
);
router.post(
    '/delete-account',
    authenticate,
    validate({ body: deleteAccountBodySchema }),
    authController.deleteAccount,
);

export default router;