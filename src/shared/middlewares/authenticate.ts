import type { RequestHandler } from 'express';

import { UnauthorizedError } from '@/core/errors';
import { requestContext } from '@/infrastructure/context/request.context';
import { extractBearerToken, verifyAccessToken } from '@/modules/auth/strategies';

// Extend the Express Request user type if needed
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                fullName: string;
                role: string;
                status: string;
                registrationStrategy: string;
                isEmailVerified: boolean;
                onboardingStep: string;
                isOnboardingCompleted: boolean;
                isDeleted: boolean;
            };
        }
    }
}

export const authenticate: RequestHandler = (req, _res, next): void => {
    try {
        const token = extractBearerToken(req.header('authorization'));
        if (!token) {
            throw new UnauthorizedError('Access token is missing.', 'AUTH_TOKEN_MISSING');
        }

        const payload = verifyAccessToken(token);

        // ✅ Now includes all fields that the token payload carries
        req.user = {
            id: payload.sub,
            email: payload.email,
            firstName: payload.firstName ?? '',
            lastName: payload.lastName ?? '',
            fullName: `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim(),
            role: payload.role,
            status: payload.status ?? 'active',
            registrationStrategy: payload.registrationStrategy ?? 'local',
            isEmailVerified: payload.isEmailVerified ?? false,
            onboardingStep: payload.onboardingStep ?? 'REGISTERED',
            isOnboardingCompleted: payload.isOnboardingCompleted ?? false,
            isDeleted: payload.isDeleted ?? false,
        };

        requestContext.setUserId(payload.sub);
        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
            return;
        }
        next(new UnauthorizedError('Invalid or expired access token.', 'AUTH_TOKEN_INVALID'));
    }
};

export const optionalAuth: RequestHandler = (req, _res, next): void => {
    try {
        const token = extractBearerToken(req.header('authorization'));
        if (!token) return next();

        const payload = verifyAccessToken(token);

        req.user = {
            id: payload.sub,
            email: payload.email,
            firstName: payload.firstName ?? '',
            lastName: payload.lastName ?? '',
            fullName: `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim(),
            role: payload.role,
            status: payload.status ?? 'active',
            registrationStrategy: payload.registrationStrategy ?? 'local',
            isEmailVerified: payload.isEmailVerified ?? false,
            onboardingStep: payload.onboardingStep ?? 'REGISTERED',
            isOnboardingCompleted: payload.isOnboardingCompleted ?? false,
            isDeleted: payload.isDeleted ?? false,
        };

        requestContext.setUserId(payload.sub);
    } catch {
        // Silently ignore — user stays unauthenticated
    }
    next();
};
