import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const catchAsync = (handler: AsyncRequestHandler): RequestHandler => {
    return (req, res, next): void => {
        void handler(req, res, next).catch((err) => {
            if (err instanceof Error) return next(err);
            const message = typeof err === 'string' ? err : err?.message ?? String(err);
            next(new Error(message));
        });
    };
};
