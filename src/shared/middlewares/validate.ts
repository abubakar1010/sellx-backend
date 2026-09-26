import type { RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';

import { BadRequestError } from '@/core/errors';
import { formatZodError } from '@/shared/utils/zodErrors';

interface ValidationSchema {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

export const validate = (schema: ValidationSchema): RequestHandler => {
    return (req, _res, next): void => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body) as typeof req.body;
            }

            if (schema.params) {
                req.params = schema.params.parse(req.params) as typeof req.params;
            }

            if (schema.query) {
                const parsedQuery = schema.query.parse(req.query) as Record<string, unknown>;
                const requestQuery = req.query as Record<string, unknown>;

                for (const key of Object.keys(requestQuery)) {
                    delete requestQuery[key];
                }
                Object.assign(requestQuery, parsedQuery);
            }

            next();
        } catch (error) {
            if (error && typeof error === 'object' && 'issues' in error) {
                const { message, errors } = formatZodError(error as ZodError);
                next(new BadRequestError(message, 'VALIDATION_ERROR', { errors }));
                return;
            }

            next(error);
        }
    };
};
