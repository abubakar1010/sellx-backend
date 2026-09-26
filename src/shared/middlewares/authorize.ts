import type { RequestHandler } from 'express';

import { ForbiddenError, UnauthorizedError } from '@/core/errors';

export const authorize = (...allowedRoles: string[]): RequestHandler => {
    return (req, _res, next): void => {
        if (!req.user) {
            next(new UnauthorizedError('Authentication required.', 'AUTH_REQUIRED'));
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            next(
                new ForbiddenError(
                    'You are not allowed to access this resource.',
                    'AUTH_FORBIDDEN',
                ),
            );
            return;
        }

        next();
    };
};
