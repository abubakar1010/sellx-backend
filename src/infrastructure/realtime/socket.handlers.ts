import type {
    ChatMembershipEvent,
    ChatMessageEvent,
    ChatMessagePayload,
    ChatRoomPayload,
    ClientToServerEvents,
    InterServerEvents,
    RealtimeAck,
    RealtimeAckHandler,
    RealtimeSocketData,
    ServerToClientEvents,
} from './socket.types';
import { z } from 'zod';
import { config } from '@/config';
import type { Server, Socket } from 'socket.io';
import { logger } from '../logger/winston.logger';
import { UserModel } from '@/modules/user/user.model';
import { getChatRoom, getUserRoom } from './socket.types';
import { chatService } from '@/modules/chat/chat.service';
import { ConversationModel } from '@/modules/chat/conversation.model';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/core/errors';
import { AttachmentType } from '@/modules/chat/messages.model';
import {
    ALLOWED_IMAGE_TYPES,
    MAX_FILE_SIZE,
    MAX_FILES,
    saveSocketAttachment,
} from '@/infrastructure/storage/multer.config';

type RealtimeServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;
type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;


const roomIdSchema = z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9:_-]+$/);

const socketAttachmentSchema = z.object({
    data: z.instanceof(Buffer).or(z.any()),
    name: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(128),
    size: z.number().int().positive(),
});

const chatMessageSchema = z.object({
    roomId: roomIdSchema,
    message: z.string().trim().min(1).max(config.realtime.chatMaxMessageLength).optional(),
    clientMessageId: z.string().trim().min(1).max(128).optional(),
    attachments: z.array(socketAttachmentSchema).max(MAX_FILES).optional(),
});

const ack = (handler: RealtimeAckHandler | undefined, payload: RealtimeAck): void => {
    if (handler) {
        handler(payload);
    }
};

const rateLimited = (socket: RealtimeSocket): boolean => {
    const now = Date.now();
    const state = socket.data.chatRateLimit;

    if (!state || now - state.windowStartedAtMs >= 60_000) {
        socket.data.chatRateLimit = {
            windowStartedAtMs: now,
            requestCount: 1,
        };
        return false;
    }

    state.requestCount += 1;
    return state.requestCount > config.realtime.messageRateLimitPerMinute;
};

const emitMembershipEvent = (
    socket: RealtimeSocket,
    roomId: string,
    event: 'chat:user-joined' | 'chat:user-left',
): void => {
    const payload: ChatMembershipEvent = {
        roomId,
        userId: socket.data.user.id,
        occurredAt: new Date().toISOString(),
    };
    socket.to(getChatRoom(roomId)).emit(event, payload);
};

const handleJoinRoom = async (
    socket: RealtimeSocket,
    payload: ChatRoomPayload,
    callback?: RealtimeAckHandler,
): Promise<void> => {
    const parsed = roomIdSchema.safeParse(payload.roomId);
    if (!parsed.success) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_ROOM_INVALID',
            message: 'Invalid chat room id.',
        });
        return;
    }

    const conversationId = parsed.data;

    try {
        const conversation = await ConversationModel.findById(conversationId).lean();
        if (!conversation) {
            ack(callback, {
                ok: false,
                code: 'SOCKET_CHAT_CONVERSATION_NOT_FOUND',
                message: 'Conversation not found.',
            });
            return;
        }

        const userId = socket.data.user.id;
        const isParticipant = conversation.participants.some((p) => p.userId.toString() === userId);

        if (!isParticipant) {
            ack(callback, {
                ok: false,
                code: 'SOCKET_CHAT_FORBIDDEN',
                message: 'You are not authorized to join this chat room.',
            });
            return;
        }

        const roomId = parsed.data;
        const chatRoom = getChatRoom(roomId);
        await socket.join(chatRoom);
        emitMembershipEvent(socket, roomId, 'chat:user-joined');
        ack(callback, { ok: true, data: { roomId, chatRoom } });
    } catch (error) {
        logger.warn('Failed to join chat room', {
            socketId: socket.id,
            userId: socket.data.user.id,
            conversationId,
            error: error instanceof Error ? error.message : String(error),
        });
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_JOIN_FAILED',
            message: 'Unable to join chat room.',
        });
    }
};

const handleLeaveRoom = async (
    socket: RealtimeSocket,
    payload: ChatRoomPayload,
    callback?: RealtimeAckHandler,
): Promise<void> => {
    const parsed = roomIdSchema.safeParse(payload.roomId);
    if (!parsed.success) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_ROOM_INVALID',
            message: 'Invalid chat room id.',
        });
        return;
    }

    const roomId = parsed.data;
    await socket.leave(getChatRoom(roomId));
    emitMembershipEvent(socket, roomId, 'chat:user-left');
    ack(callback, { ok: true, data: { roomId } });
};

const handleChatMessage = async (
    io: RealtimeServer,
    socket: RealtimeSocket,
    payload: ChatMessagePayload,
    callback?: RealtimeAckHandler,
): Promise<void> => {
    if (rateLimited(socket)) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_RATE_LIMIT',
            message: 'Chat message limit exceeded. Please slow down.',
        });
        socket.emit('system:error', {
            code: 'SOCKET_CHAT_RATE_LIMIT',
            message: 'Chat message limit exceeded. Please slow down.',
        });
        return;
    }

    const parsed = chatMessageSchema.safeParse(payload);
    if (!parsed.success) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_PAYLOAD_INVALID',
            message: 'Invalid chat payload.',
        });
        return;
    }

    const chatRoom = getChatRoom(parsed.data.roomId);
    if (!socket.rooms.has(chatRoom)) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_ROOM_NOT_JOINED',
            message: 'Join the room before sending messages.',
        });
        return;
    }

    const rawAttachments = parsed.data.attachments || [];
    if (rawAttachments.length > MAX_FILES) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_TOO_MANY_ATTACHMENTS',
            message: `Maximum ${MAX_FILES} attachments allowed per message.`,
        });
        return;
    }

    for (const att of rawAttachments) {
        if (att.size > MAX_FILE_SIZE) {
            ack(callback, {
                ok: false,
                code: 'SOCKET_CHAT_ATTACHMENT_TOO_LARGE',
                message: `Attachment "${att.name}" exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
            });
            return;
        }
        if (!ALLOWED_IMAGE_TYPES.has(att.mimeType)) {
            ack(callback, {
                ok: false,
                code: 'SOCKET_CHAT_ATTACHMENT_TYPE_NOT_ALLOWED',
                message: `Attachment type "${att.mimeType}" is not allowed.`,
            });
            return;
        }
    }

    const hasText = parsed.data.message && parsed.data.message.trim().length > 0;
    const hasAttachments = rawAttachments.length > 0;

    if (!hasText && !hasAttachments) {
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_EMPTY_MESSAGE',
            message: 'Message must contain text, at least one attachment, or both.',
        });
        return;
    }

    let savedAttachments: Array<{
        url: string;
        type: AttachmentType;
        mimeType: string;
        size: number;
        name?: string;
    }> = [];

    try {
        savedAttachments = rawAttachments.map((att) => {
            const { url } = saveSocketAttachment(att.data as Buffer, att.mimeType, att.name);
            return {
                url,
                type: att.mimeType.startsWith('image/')
                    ? AttachmentType.IMAGE
                    : AttachmentType.FILE,
                mimeType: att.mimeType,
                size: att.size,
                name: att.name,
            };
        });
    } catch (error) {
        logger.error('Failed to save socket attachment', {
            socketId: socket.id,
            userId: socket.data.user.id,
            error: error instanceof Error ? error.message : String(error),
        });
        ack(callback, {
            ok: false,
            code: 'SOCKET_CHAT_ATTACHMENT_SAVE_FAILED',
            message: 'Failed to save attachment.',
        });
        return;
    }

    try {
        await UserModel.findByIdAndUpdate(socket.data.user.id, { lastActiveAt: new Date() });

        const message = await chatService.sendMessage(
            socket.data.user.id,
            parsed.data.roomId,
            hasText ? parsed.data.message : undefined,
            savedAttachments.length > 0 ? savedAttachments : undefined,
        );

        const messageEvent: ChatMessageEvent = {
            roomId: parsed.data.roomId,
            messageId: message._id.toString(),
            message: message.text || '',
            text: message.text || '',
            attachments: message.attachments?.map((a: any) => ({
                url: a.url,
                type: a.type,
                mimeType: a.mimeType,
                size: a.size,
                name: a.name,
                width: a.width,
                height: a.height,
            })),
            sender: {
                id: socket.data.user.id,
                email: socket.data.user.email,
                name: socket.data.user.name || socket.data.user.email,
                avatarUrl: socket.data.user.avatarUrl,
            },
            sentAt: message.createdAt.toISOString(),
            createdAt: message.createdAt.toISOString(),
            clientMessageId: parsed.data.clientMessageId,
        };

        io.to(chatRoom).emit('chat:message', messageEvent);
        ack(callback, {
            ok: true,
            data: {
                messageId: messageEvent.messageId,
                roomId: messageEvent.roomId,
            },
        });
    } catch (error) {
        let errorMessage = 'Unable to send message.';
        let errorCode = 'SOCKET_CHAT_SEND_FAILED';

        if (error instanceof NotFoundError) {
            errorCode = 'SOCKET_CHAT_CONVERSATION_NOT_FOUND';
            errorMessage = error.message;
        } else if (error instanceof ForbiddenError) {
            errorCode = 'SOCKET_CHAT_FORBIDDEN';
            errorMessage = error.message;
        } else if (error instanceof BadRequestError) {
            errorCode = 'SOCKET_CHAT_BAD_REQUEST';
            errorMessage = error.message;
        }

        ack(callback, {
            ok: false,
            code: errorCode,
            message: errorMessage,
        });
    }
};

export const registerRealtimeHandlers = (io: RealtimeServer): void => {
    io.on('connection', (socket) => {
        const user = socket.data.user;
        const userRoom = getUserRoom(user.id);

        void UserModel.findByIdAndUpdate(user.id, { lastActiveAt: new Date() }).catch((error) => {
            logger.warn('Failed to update user last active time on connect', {
                userId: user.id,
                error: error instanceof Error ? error.message : String(error),
            });
        });

        void socket.join(userRoom);
        socket.emit('system:connected', {
            socketId: socket.id,
            connectedAt: new Date().toISOString(),
            user,
        });

        logger.info('Realtime client connected', {
            socketId: socket.id,
            userId: user.id,
        });

        socket.on('chat:join', (payload, callback) => {
            void handleJoinRoom(socket, payload, callback).catch((error) => {
                logger.warn('Failed to join chat room', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                ack(callback, {
                    ok: false,
                    code: 'SOCKET_CHAT_JOIN_FAILED',
                    message: 'Unable to join chat room.',
                });
            });
        });

        socket.on('chat:leave', (payload, callback) => {
            void handleLeaveRoom(socket, payload, callback).catch((error) => {
                logger.warn('Failed to leave chat room', {
                    socketId: socket.id,
                    userId: socket.data.user.id,
                    error: error instanceof Error ? error.message : String(error),
                });
                ack(callback, {
                    ok: false,
                    code: 'SOCKET_CHAT_LEAVE_FAILED',
                    message: 'Unable to leave chat room.',
                });
            });
        });

        socket.on('chat:message', async (payload, callback) => {
            await handleChatMessage(io, socket, payload, callback).catch((error) => {
                ack(callback, {
                    ok: false,
                    code: 'SOCKET_CHAT_SEND_FAILED',
                    message: 'Unable to send chat message.',
                });
            });
        });

        socket.on('disconnect', (reason) => {
            logger.info('Realtime client disconnected', {
                socketId: socket.id,
                userId: user.id,
                reason,
            });
        });
    });
};
