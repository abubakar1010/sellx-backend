import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';

import { app } from '../../../src/app';
import { config } from '../../../src/config';
import { ROLES } from '../../../src/core/constants/roles';
import { USER_STATUS } from '../../../src/modules/user/user.constants';
import {
    closeRealtimeServer,
    emitNotificationCreated,
    setupRealtimeServer,
    type RealtimeAck,
    type RealtimeNotificationPayload,
} from '../../../src/infrastructure/realtime';
import type { ChatMessageEvent } from '../../../src/infrastructure/realtime/socket.types';
import { buildAccessToken } from '../../helpers/auth.helper';

const EVENT_TIMEOUT_MS = 5_000;

const waitForEvent = <T>(socket: ClientSocket, eventName: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timed out waiting for event "${eventName}"`));
        }, EVENT_TIMEOUT_MS);

        socket.once(eventName, (payload: T) => {
            clearTimeout(timeout);
            resolve(payload);
        });
    });
};

const waitForConnectError = (socket: ClientSocket): Promise<Error> => {
    return new Promise<Error>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for connect_error'));
        }, EVENT_TIMEOUT_MS);

        socket.once('connect_error', (error: Error) => {
            clearTimeout(timeout);
            resolve(error);
        });
    });
};

describe('Realtime socket', () => {
    let httpServer: HttpServer;
    let baseUrl = '';
    const clients = new Set<ClientSocket>();

    const createSocketClient = (token?: string): ClientSocket => {
        const client = createClient(baseUrl, {
            path: config.realtime.path,
            transports: ['websocket'],
            timeout: EVENT_TIMEOUT_MS,
            forceNew: true,
            reconnection: false,
            auth: token ? { token } : undefined,
        });
        clients.add(client);
        return client;
    };

    beforeAll(async () => {
        httpServer = createServer(app);
        await setupRealtimeServer(httpServer);

        await new Promise<void>((resolve) => {
            httpServer.listen(0, '127.0.0.1', () => resolve());
        });

        const address = httpServer.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterEach(() => {
        for (const client of clients) {
            if (client.connected) {
                client.disconnect();
            }
            client.close();
        }
        clients.clear();
    });

    afterAll(async () => {
        await closeRealtimeServer();
        if (!httpServer.listening) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            httpServer.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    });

    it('rejects socket connection without access token', async () => {
        const client = createSocketClient();
        const error = await waitForConnectError(client);

        expect(error.message).toContain('Access token is missing');
    });

    it('accepts authenticated connection and emits system:connected', async () => {
        const accessToken = buildAccessToken({
            sub: '507f1f77bcf86cd799439011',
            email: 'socket.user@example.com',
            role: ROLES.USER,
            status: USER_STATUS.ACTIVE,
        });
        const client = createSocketClient(accessToken);
        const payload = await waitForEvent<{
            socketId: string;
            connectedAt: string;
            user: { id: string; email: string };
        }>(client, 'system:connected');

        expect(payload.socketId).toBeTruthy();
        expect(payload.connectedAt).toEqual(expect.any(String));
        expect(payload.user).toEqual(
            expect.objectContaining({
                id: '507f1f77bcf86cd799439011',
                email: 'socket.user@example.com',
            }),
        );
    });

    it('supports chat room messaging and notification push', async () => {
        const userId = '507f1f77bcf86cd799439022';
        const accessToken = buildAccessToken({
            sub: userId,
            email: 'chat.user@example.com',
            role: ROLES.USER,
            status: USER_STATUS.ACTIVE,
        });
        const client = createSocketClient(accessToken);

        await waitForEvent(client, 'system:connected');

        const joinAck = await new Promise<RealtimeAck>((resolve) => {
            client.emit('chat:join', { roomId: 'general-room' }, resolve);
        });
        expect(joinAck.ok).toBe(true);

        const chatMessagePromise = waitForEvent<ChatMessageEvent>(client, 'chat:message');
        const sendAckPromise = new Promise<RealtimeAck>((resolve) => {
            client.emit(
                'chat:message',
                {
                    roomId: 'general-room',
                    message: 'Hello room',
                    clientMessageId: 'client-message-1',
                },
                resolve,
            );
        });

        const [chatMessage, sendAck] = await Promise.all([chatMessagePromise, sendAckPromise]);
        expect(sendAck.ok).toBe(true);
        expect(chatMessage.roomId).toBe('general-room');
        expect(chatMessage.message).toBe('Hello room');
        expect(chatMessage.sender.id).toBe(userId);

        const notificationPromise = waitForEvent<RealtimeNotificationPayload>(client, 'notification:new');
        const dispatched = emitNotificationCreated(userId, {
            id: 'notification-1',
            title: 'New message',
            message: 'You have a realtime update',
            type: 'info',
            isRead: false,
            createdAt: new Date(),
        });
        expect(dispatched).toBe(true);

        const notification = await notificationPromise;
        expect(notification.userId).toBe(userId);
        expect(notification.id).toBe('notification-1');
        expect(notification.title).toBe('New message');
    });
});
