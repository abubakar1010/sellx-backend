import { AppError } from './AppError';

export class BadRequestError extends AppError {
    constructor(
        message: string = 'Bad request',
        errorCode: string = 'BAD_REQUEST',
        details?: Record<string, unknown>,
    ) {
        super(400, message, errorCode, true, details);
    }
}
