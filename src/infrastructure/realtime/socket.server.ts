import { Server } from 'socket.io';
import type { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';

import { config } from '@/config';
import { authenticateSocket } from './socket.auth';
import { logger } from '@infra/logger/winston.logger';
import { getRedisClient } from '../cache/redis.client';
import { registerRealtimeHandlers } from './socket.handlers';
import type {
    ClientToServerEvents,
    InterServerEvents,
    RealtimeSocketData,
    ServerToClientEvents,
} from './socket.types';
import { createAdapter } from '@socket.io/redis-adapter';

type RealtimeServer = IOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;
type RedisClient = ReturnType<typeof getRedisClient>;

let io: RealtimeServer | null = null;
let adapterPubClient: RedisClient | null = null;
let adapterSubClient: RedisClient | null = null;

const createRealtimeServer = (httpServer: HttpServer): RealtimeServer => {
    return new Server<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        RealtimeSocketData
    >(httpServer, {
        path: config.realtime.path,
        serveClient: false,
        transports: ['websocket', 'polling'],
        connectTimeout: config.realtime.connectTimeoutMs,
        maxHttpBufferSize: config.realtime.maxPayloadBytes,
        pingInterval: config.realtime.pingIntervalMs,
        pingTimeout: config.realtime.pingTimeoutMs,
        cors: {
            origin: config.app.corsOrigins,
            credentials: true,
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 120_000,
            skipMiddlewares: true,
        },
    });
};

const connectRedisAdapter = async (server: RealtimeServer): Promise<void> => {
    if (config.isTest || !config.realtime.useRedisAdapter) {
        return;
    }

    const baseClient = getRedisClient();
    adapterPubClient = baseClient.duplicate();
    adapterSubClient = baseClient.duplicate();

    await Promise.all([
        adapterPubClient.isOpen ? Promise.resolve() : adapterPubClient.connect(),
        adapterSubClient.isOpen ? Promise.resolve() : adapterSubClient.connect(),
    ]);

    server.adapter(createAdapter(adapterPubClient, adapterSubClient));
    logger.info('Socket.IO Redis adapter enabled');
};

export const setupRealtimeServer = async (httpServer: HttpServer): Promise<RealtimeServer> => {
    if (io) {
        return io;
    }

    io = createRealtimeServer(httpServer);
    io.use(authenticateSocket);
    registerRealtimeHandlers(io);

    io.engine.on('connection_error', (error) => {
        logger.warn('Realtime connection error', {
            code: error.code,
            message: error.message,
        });
    });

    await connectRedisAdapter(io);
    return io;
};

export const getRealtimeServer = (): RealtimeServer | null => {
    return io;
};

export const closeRealtimeServer = async (): Promise<void> => {
    const server = io;
    io = null;

    if (server) {
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    }

    const clientsToClose = [adapterPubClient, adapterSubClient].filter(
        (client): client is RedisClient => client !== null,
    );
    adapterPubClient = null;
    adapterSubClient = null;

    await Promise.allSettled(
        clientsToClose.map(async (client) => {
            if (client.isOpen) {
                await client.quit();
            }
        }),
    );
};
