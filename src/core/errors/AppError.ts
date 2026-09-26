/**
 * Base application error.
 * All custom errors extend this.
 *
 * - `statusCode`: HTTP status code to respond with
 * - `errorCode`: machine-readable code for clients (e.g. AUTH_INVALID_CREDENTIALS)
 * - `isOperational`: true = expected error (bad input, auth fail)
 *                     false = programmer error (bug, crash — triggers alert)
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, unknown>;

    constructor(
        statusCode: number,
        message: string,
        errorCode: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        details?: Record<string, unknown>,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.details = details;

        // Maintain proper prototype chain
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
