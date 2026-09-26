import { logger } from '@infra/logger/winston.logger';
import { getRealtimeServer } from './socket.server';
import { getChatRoom, getUserRoom, type RealtimeNotificationPayload } from './socket.types';
import type { ChatMessageEvent } from './socket.types';

interface NotificationEventPayload {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    readAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
}

export const emitNotificationCreated = (
    userId: string,
    notification: NotificationEventPayload,
): boolean => {
    const io = getRealtimeServer();
    if (!io) {
        return false;
    }

    const payload: RealtimeNotificationPayload = {
        userId,
        ...notification,
    };
    io.to(getUserRoom(userId)).emit('notification:new', payload);
    return true;
};

export const emitChatSystemMessage = (roomId: string, message: string): boolean => {
    const io = getRealtimeServer();
    if (!io) {
        return false;
    }

    io.to(getChatRoom(roomId)).emit('chat:message', {
        roomId,
        messageId: `system-${Date.now()}`,
        message,
        text: message,
        sender: {
            id: 'system',
            email: 'system@local',
            name: 'System',
        },
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    });
    return true;
};

export const emitChatMessage = (
    roomId: string,
    event: ChatMessageEvent,
): boolean => {
    const io = getRealtimeServer();
    if (!io) {
        logger.warn('Socket.IO server not available for emitting chat message', { roomId });
        return false;
    }

    const chatRoom = getChatRoom(roomId);
    io.to(chatRoom).emit('chat:message', event);
    return true;
};

export const emitDealStatusUpdate = (
    roomId: string,
    data: {
        conversationId: string;
        userId: string;
        dealStatus: string;
        requestedBy?: string;
        quantity?: number;
        productQuantity?: number;
    },
): boolean => {
    const io = getRealtimeServer();
    if (!io) {
        logger.warn('Socket.IO server not available for emitting deal status update', { roomId });
        return false;
    }

    const chatRoom = getChatRoom(roomId);
    io.to(chatRoom).emit('deal:status_update', data);
    return true;
};

export const logSocketDispatchFailure = (event: string, details?: Record<string, unknown>): void => {
    logger.warn(`Realtime dispatch skipped for "${event}" because Socket.IO server is not ready.`, {
        ...details,
    });
};
