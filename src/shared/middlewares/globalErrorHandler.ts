import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { AppError, BadRequestError } from '@/core/errors';
import { logger } from '@/infrastructure/logger/winston.logger';
import { formatZodError } from '@/shared/utils/zodErrors';
import type { ApiErrorResponse } from '@/core/types/response.types';

const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong on our side. Please try again later.';

const normalizeError = (error: unknown): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof ZodError) {
        const { message, errors } = formatZodError(error);
        return new BadRequestError(message, 'VALIDATION_ERROR', { errors });
    }

    if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map((item) => ({
            field: item.path,
            message: item.message,
        }));
        return new BadRequestError(
            errors[0]?.message ?? 'Please check the information you entered.',
            'VALIDATION_ERROR',
            { errors },
        );
    }

    if (error instanceof mongoose.Error.CastError) {
        return new BadRequestError('Invalid identifier format.', 'INVALID_ID', {
            field: error.path,
        });
    }

    if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return new AppError(
                HTTP_STATUS.BAD_REQUEST,
                'File too large. Maximum size is 5MB.',
                'FILE_TOO_LARGE',
            );
        }
        return new AppError(HTTP_STATUS.BAD_REQUEST, error.message, 'INVALID_FILE');
    }

    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return new AppError(
                HTTP_STATUS.REQUEST_TIMEOUT,
                'Request processing timed out.',
                'REQUEST_TIMEOUT',
            );
        }
        return new AppError(500, error.message, 'INTERNAL_ERROR', false);
    }

    const message = typeof error === 'string' ? error : 'An unexpected error occurred.';
    return new AppError(500, message, 'INTERNAL_ERROR', false);
};

export const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const normalized = normalizeError(error);
    // Unexpected errors carry internal details (driver errors, bugs) that mean nothing to the
    // client, so only the log gets the real message; the requestId links the two.
    const payload: ApiErrorResponse = {
        success: false,
        statusCode: normalized.statusCode,
        message: normalized.isOperational ? normalized.message : UNEXPECTED_ERROR_MESSAGE,
        errorCode: normalized.errorCode,
    };

    if (req.requestId) {
        payload.requestId = req.requestId;
    }

    if (normalized.details?.errors) {
        payload.errors = normalized.details.errors as ApiErrorResponse['errors'];
    }

    const logPayload = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: normalized.statusCode,
        errorCode: normalized.errorCode,
        message: normalized.message,
        details: normalized.details,
        stack: !normalized.isOperational && error instanceof Error ? error.stack : undefined,
    };

    if (normalized.statusCode >= 500 || !normalized.isOperational) {
        logger.error('Request failed', logPayload);
    } else {
        logger.warn('Request failed', logPayload);
    }

    res.status(normalized.statusCode).json(payload);
};
