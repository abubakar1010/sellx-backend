import type { RequestHandler } from 'express';

import { requestContext as context } from '@/infrastructure/context/request.context';

export const requestContext: RequestHandler = (req, _res, next) => {
    const requestId = req.requestId ?? 'unknown';
    const contextValue: {
        requestId: string;
        startedAt: number;
        userId?: string;
    } = {
        requestId,
        startedAt: Date.now(),
    };

    if (req.user?.id) {
        contextValue.userId = req.user.id;
    }

    context.run(contextValue, () => next());
};
