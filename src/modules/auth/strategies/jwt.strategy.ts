import jwt from 'jsonwebtoken';

import { config } from '@/config';
import { UnauthorizedError } from '@/core/errors';
import { AUTH_JWT_TYPES } from '../auth.constants';

export interface AuthJwtPayload extends jwt.JwtPayload {
    sub: string;
    email: string;
    role: string;
    status: string;
    isDeleted?: boolean;
    registrationStrategy?: string;
    type: string;
    jti: string;
}

export const extractBearerToken = (authorization?: string): string | null => {
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
};

const ensurePayload = (payload: AuthJwtPayload): AuthJwtPayload => {
    if (!payload.sub || !payload.email || !payload.role || !payload.status || !payload.type) {
        throw new UnauthorizedError('Invalid token payload.', 'AUTH_TOKEN_INVALID');
    }
    return payload;
};

export const verifyAccessToken = (token: string): AuthJwtPayload => {
    try {
        const payload = jwt.verify(token, config.jwt.accessSecret) as AuthJwtPayload;
        const validated = ensurePayload(payload);
        if (validated.type !== AUTH_JWT_TYPES.ACCESS) {
            throw new UnauthorizedError('Invalid access token type.', 'AUTH_TOKEN_INVALID');
        }
        if (validated.isDeleted === true) {
            throw new UnauthorizedError('This account has been deleted.', 'AUTH_ACCOUNT_DELETED');
        }
        return validated;
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError('Invalid or expired access token.', 'AUTH_TOKEN_INVALID');
    }
};

export const verifyRefreshToken = (token: string): AuthJwtPayload => {
    try {
        const payload = jwt.verify(token, config.jwt.refreshSecret) as AuthJwtPayload;
        const validated = ensurePayload(payload);
        if (validated.type !== AUTH_JWT_TYPES.REFRESH) {
            throw new UnauthorizedError('Invalid refresh token type.', 'AUTH_TOKEN_INVALID');
        }
        if (validated.isDeleted === true) {
            throw new UnauthorizedError('This account has been deleted.', 'AUTH_ACCOUNT_DELETED');
        }
        return validated;
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError('Invalid or expired refresh token.', 'AUTH_TOKEN_INVALID');
    }
};
