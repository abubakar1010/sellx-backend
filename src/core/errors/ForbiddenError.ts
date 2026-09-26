import { AppError } from './AppError';

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden', errorCode: string = 'FORBIDDEN') {
        super(403, message, errorCode);
    }
}
