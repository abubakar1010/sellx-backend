import type { RequestHandler } from 'express';
import { BadRequestError } from '@/core/errors';

export const parseFormData: RequestHandler = (req, _res, next) => {
    if (req.body?.data && typeof req.body.data === 'string') {
        try {
            req.body = JSON.parse(req.body.data);
        } catch {
            next(new BadRequestError('Invalid JSON in data field'));
            return;
        }
    }
    next();
};
