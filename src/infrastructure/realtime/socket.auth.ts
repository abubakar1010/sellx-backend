import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

import { config } from '@/config';
import type {
    ClientToServerEvents,
    InterServerEvents,
    RealtimeSocketData,
    ServerToClientEvents,
} from './socket.types';

type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;
type SocketHandshakeError = Error & { data?: { code: string } };

const accessTokenPayloadSchema = z.object({
    sub: z.string().min(1),
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.string().min(1),
    status: z.string().min(1),
    isDeleted: z.boolean().optional().default(false),
    type: z.literal('access'),
});

const asString = (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
        return value[0];
    }
    return undefined;
};

const createHandshakeError = (message: string, code: string): SocketHandshakeError => {
    const error = new Error(message) as SocketHandshakeError;
    error.data = { code };
    return error;
};

const extractBearerToken = (authorization?: string): string | null => {
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
};

const verifySocketAccessToken = (token: string): z.infer<typeof accessTokenPayloadSchema> => {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    const parsed = accessTokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
        throw new Error('Invalid access token payload');
    }
    return parsed.data;
};

const resolveSocketToken = (socket: RealtimeSocket): string | null => {
    const authorizationHeader = asString(socket.handshake.headers.authorization);
    const bearerToken = extractBearerToken(authorizationHeader);
    if (bearerToken) {
        return bearerToken;
    }

    const auth = socket.handshake.auth as { token?: unknown; accessToken?: unknown } | undefined;
    const authToken = asString(auth?.token) ?? asString(auth?.accessToken);
    if (authToken) {
        return authToken;
    }

    return asString(socket.handshake.query.token) ?? null;
};

export const authenticateSocket = (socket: RealtimeSocket, next: (error?: Error) => void): void => {
    try {
        const token = resolveSocketToken(socket);
        if (!token) {
            next(
                createHandshakeError(
                    'Access token is missing for realtime connection.',
                    'SOCKET_AUTH_TOKEN_MISSING',
                ),
            );
            return;
        }

        const payload = verifySocketAccessToken(token);
        if (payload.isDeleted) {
            next(
                createHandshakeError(
                    'Deleted users cannot connect to realtime channel.',
                    'SOCKET_AUTH_USER_DELETED',
                ),
            );
            return;
        }

        if (payload.status !== 'active') {
            next(
                createHandshakeError(
                    'Only active users can connect to realtime channel.',
                    'SOCKET_AUTH_USER_INACTIVE',
                ),
            );
            return;
        }

        socket.data.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            status: payload.status,
            name: payload.firstName && payload.lastName
                ? `${payload.firstName} ${payload.lastName}`
                : payload.email,
            avatarUrl: (payload as any).avatarUrl,
        };
        next();
    } catch {
        next(createHandshakeError('Invalid or expired access token.', 'SOCKET_AUTH_TOKEN_INVALID'));
    }
};
