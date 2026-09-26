import { AppError } from './AppError';

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists', errorCode: string = 'CONFLICT') {
        super(409, message, errorCode);
    }
}
