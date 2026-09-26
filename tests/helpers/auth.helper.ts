import jwt from 'jsonwebtoken';

import { config } from '../../src/config';
import { ROLES } from '../../src/core/constants/roles';
import { AUTH_STRATEGIES, USER_STATUS } from '../../src/modules/user/user.constants';

interface TokenPayloadInput {
    sub?: string;
    email?: string;
    role?: string;
    status?: string;
    isDeleted?: boolean;
    registrationStrategy?: string;
}

export const buildAccessToken = (payload: TokenPayloadInput = {}): string => {
    return jwt.sign(
        {
            sub: payload.sub ?? '507f1f77bcf86cd799439011',
            email: payload.email ?? 'test.user@example.com',
            role: payload.role ?? ROLES.USER,
            status: payload.status ?? USER_STATUS.ACTIVE,
            isDeleted: payload.isDeleted ?? false,
            registrationStrategy: payload.registrationStrategy ?? AUTH_STRATEGIES.LOCAL,
            type: 'access',
            jti: 'test-access-jti',
        },
        config.jwt.accessSecret,
        { expiresIn: '15m' },
    );
};

export const buildRefreshToken = (payload: TokenPayloadInput = {}): string => {
    return jwt.sign(
        {
            sub: payload.sub ?? '507f1f77bcf86cd799439011',
            email: payload.email ?? 'test.user@example.com',
            role: payload.role ?? ROLES.USER,
            status: payload.status ?? USER_STATUS.ACTIVE,
            isDeleted: payload.isDeleted ?? false,
            registrationStrategy: payload.registrationStrategy ?? AUTH_STRATEGIES.LOCAL,
            type: 'refresh',
            jti: 'test-refresh-jti',
        },
        config.jwt.refreshSecret,
        { expiresIn: '7d' },
    );
};
