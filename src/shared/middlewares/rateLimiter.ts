import rateLimit from 'express-rate-limit';

import { config } from '@/config';
import { MESSAGES } from '@/core/constants/messages';

export const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.isProduction ? 120 : 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: MESSAGES.GENERAL.RATE_LIMIT,
        errorCode: 'RATE_LIMITED',
    },
});

/**
 * Strict limiter for credential and one-time-code endpoints.
 *
 * The global limiter has to be generous enough for listing browsing, which leaves
 * plenty of room for credential stuffing and OTP brute force. Login, password
 * reset and OTP verification get their own, much smaller budget.
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.isProduction ? 10 : 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Only failed attempts count, so a legitimate user is never locked out.
    skipSuccessfulRequests: true,
    message: {
        success: false,
        statusCode: 429,
        message: MESSAGES.GENERAL.RATE_LIMIT,
        errorCode: 'RATE_LIMITED',
    },
});
