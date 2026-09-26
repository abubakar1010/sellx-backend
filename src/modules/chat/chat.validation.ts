import { z } from 'zod';
import { paginationSchema } from '@/modules/user/user.validation';

export const sendMessageBodySchema = z.object({
    text: z.string().max(2000).optional(),
});

export const conversationParamsSchema = z.object({
    id: z.string().min(1, 'Conversation ID is required'),
});

export const getMessagesQuerySchema = paginationSchema.extend({
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getChatByUserIdSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
});

export const createConversationBodySchema = z
    .object({
        productId: z.string().optional(),
        storeId: z.string().optional(),
        text: z.string().max(2000).optional(),
    })
    .refine((data) => data.productId || data.storeId, {
        message: 'Either productId or storeId is required',
    });

export const getConversationsQuerySchema = paginationSchema.extend({
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const storeParamsSchema = z.object({
    storeId: z.string().min(1, 'Store ID is required'),
});

export const productIdParamSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
});

export const dealActionSchema = z.object({
    action: z.enum(['request', 'approve', 'mark_sold']),
});

export const reportUserBodySchema = z.object({
    reportedUserId: z.string().min(1, 'Reported user ID is required'),
    reportedStoreId: z.string().optional(),
    reason: z.enum(['spam', 'harassment', 'fraud', 'inappropriate', 'scam', 'other']),
    details: z.string().max(1000).optional(),
    messageId: z.string().optional(),
});

export const toggleBlockBodySchema = z.object({
    blockedUserId: z.string().min(1, 'Blocked user ID is required'),
    blockedStoreId: z.string().optional(),
    reason: z.string().max(500).optional(),
});
