import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
    const incomingId = req.header('x-request-id');
    const id = incomingId && incomingId.trim() !== '' ? incomingId : randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
};
