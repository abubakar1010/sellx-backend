import { app } from '@/app';
import { config } from '@config/index';
import { closeQueueWorkers } from '@jobs/consumers';
import { createServer, type Server } from 'node:http';
import { logger } from '@infra/logger/winston.logger';
import { registerDependencies } from '@infra/container/register';
import { closeBullConnection } from '@infra/queue/bull.connection';
import { closePushNotificationQueue } from '@infra/queue/push-notification.queue';
import { closeQueues } from '@jobs/queues';
import { startSchedulers, stopSchedulers } from '@jobs/schedulers';
import { registerEventListeners } from '@infra/events/event.registry';
import { connectRedis, disconnectRedis } from '@infra/cache/redis.client';
import { closeRealtimeServer, setupRealtimeServer } from '@infra/realtime';
import { connectDatabase, disconnectDatabase } from '@infra/database/mongoose.connection';
import { initializeFirebase } from '@infra/push-notification';
import { ConversationModel } from '@modules/chat/conversation.model';
import { SavedSearchModel } from '@modules/saved-search/saved-search.model';

let server: Server | null = null;
let shuttingDown = false;

const startServer = async (): Promise<void> => {
    const startupController = new AbortController();
    try {
        registerDependencies();
        registerEventListeners();
        startSchedulers();
        await Promise.all([connectDatabase(startupController.signal), connectRedis()]);
        initializeFirebase();

        // Sync indexes for models with changed index definitions
        await ConversationModel.syncIndexes();
        await SavedSearchModel.syncIndexes();
        logger.info('Model indexes synced');

        const httpServer = createServer(app);
        await setupRealtimeServer(httpServer);
        server = httpServer.listen(config.app.port, () => {
            logger.info('Server started', {
                port: config.app.port,
                environment: config.env,
                realtimePath: config.realtime.path,
            });
        });
    } catch (error) {
        startupController.abort();
        await closeRealtimeServer();
        logger.error('Failed to start server', {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exitCode = 1;
    }
};

const gracefulShutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    logger.warn(`Received ${signal}, shutting down gracefully`);

    const forceShutdownTimer = setTimeout(() => {
        logger.error('Graceful shutdown timeout reached, forcing exit.');
        process.exit(1);
    }, config.app.shutdownTimeoutMs);

    forceShutdownTimer.unref();

    try {
        await closeRealtimeServer();

        if (server) {
            await new Promise<void>((resolve, reject) => {
                server?.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        }

        stopSchedulers();
        // Queues have to settle before the connection they share is closed, or their in-flight
        // commands reject unhandled.
        await Promise.allSettled([closeQueues(), closePushNotificationQueue()]);
        await Promise.allSettled([
            closeQueueWorkers(),
            closeBullConnection(),
            disconnectDatabase(),
            disconnectRedis(),
        ]);
        logger.info('Shutdown completed.');
        clearTimeout(forceShutdownTimer);
        process.exit(0);
    } catch (error) {
        logger.error('Shutdown failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        clearTimeout(forceShutdownTimer);
        process.exit(1);
    }
};

process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
});

void startServer();
