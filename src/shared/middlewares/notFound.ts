import type { RequestHandler } from 'express';

import { NotFoundError } from '@/core/errors';

export const notFound: RequestHandler = (req, _res, next): void => {
    next(
        new NotFoundError(
            `Route not found: ${req.method.toUpperCase()} ${req.originalUrl}`,
            'ROUTE_NOT_FOUND',
        ),
    );
};
