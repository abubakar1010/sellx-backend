export interface ApiSuccessResponse<T = unknown> {
    success: true;
    statusCode: number;
    message: string;
    data: T;
    meta?: Record<string, unknown>;
    requestId?: string;
}

export interface ApiErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    errorCode: string;
    errors?: ValidationErrorDetail[];
    stack?: string;
    requestId?: string;
}

export interface ValidationErrorDetail {
    field: string;
    message: string;
}
