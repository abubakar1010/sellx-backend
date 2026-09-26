import { AppError } from './AppError';

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too many requests', errorCode: string = 'TOO_MANY_REQUESTS') {
        super(429, message, errorCode);
    }
}
