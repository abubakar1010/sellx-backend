import type { Role } from '@core/constants/roles';

export interface RealtimeSocketUser {
    id: string;
    email: string;
    role: Role | string;
    status: string;
    name?: string;
    avatarUrl?: string;
}

export interface RealtimeAck {
    ok: boolean;
    code?: string;
    message?: string;
    data?: Record<string, unknown>;
}

export type RealtimeAckHandler = (payload: RealtimeAck) => void;

export interface ChatRoomPayload {
    roomId: string;
}

export interface SocketAttachmentPayload {
    data: Buffer;
    name: string;
    mimeType: string;
    size: number;
}

export interface ChatMessagePayload {
    roomId: string;
    message: string;
    clientMessageId?: string;
    attachments?: SocketAttachmentPayload[];
}

export interface ChatMessageEvent {
    roomId: string;
    messageId: string;
    message: string;
    text?: string;
    attachments?: Array<{
        url: string;
        type: string;
        mimeType: string;
        size: number;
        name?: string;
        width?: number;
        height?: number;
    }>;
    sender: {
        id: string;
        email: string;
        name?: string;
        avatarUrl?: string;
    };
    sentAt: string;
    clientMessageId?: string;
    createdAt: string;
}

export interface ChatMembershipEvent {
    roomId: string;
    userId: string;
    occurredAt: string;
}

export interface RealtimeNotificationPayload {
    userId: string;
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    readAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
}

export interface DealStatusUpdatePayload {
    conversationId: string;
    userId: string;
    dealStatus: string;
    requestedBy?: string;
    quantity?: number;
    productQuantity?: number;
}

export interface ServerToClientEvents {
    'system:connected': (payload: {
        socketId: string;
        connectedAt: string;
        user: RealtimeSocketUser;
    }) => void;
    'system:error': (payload: { code: string; message: string }) => void;
    'notification:new': (payload: RealtimeNotificationPayload) => void;
    'chat:message': (payload: ChatMessageEvent) => void;
    'chat:user-joined': (payload: ChatMembershipEvent) => void;
    'chat:user-left': (payload: ChatMembershipEvent) => void;
    'deal:status_update': (payload: DealStatusUpdatePayload) => void;
}

export interface ClientToServerEvents {
    'chat:join': (payload: ChatRoomPayload, ack?: RealtimeAckHandler) => void;
    'chat:leave': (payload: ChatRoomPayload, ack?: RealtimeAckHandler) => void;
    'chat:message': (payload: ChatMessagePayload, ack?: RealtimeAckHandler) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface RealtimeSocketData {
    user: RealtimeSocketUser;
    chatRateLimit?: {
        windowStartedAtMs: number;
        requestCount: number;
    };
}

const USER_ROOM_PREFIX = 'user';
const CHAT_ROOM_PREFIX = 'chat';

export const getUserRoom = (userId: string): string => `${USER_ROOM_PREFIX}:${userId}`;
export const getChatRoom = (roomId: string): string => `${CHAT_ROOM_PREFIX}:${roomId}`;
