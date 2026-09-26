import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', errorCode: string = 'UNAUTHORIZED') {
        super(401, message, errorCode);
    }
}
