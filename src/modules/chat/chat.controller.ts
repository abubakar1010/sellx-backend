import { Request, Response } from 'express';
import { chatService } from './chat.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { AttachmentType } from './messages.model';
import {
    sendMessageBodySchema,
    conversationParamsSchema,
    getMessagesQuerySchema,
    getChatByUserIdSchema,
    createConversationBodySchema,
    getConversationsQuerySchema,
    productIdParamSchema,
    dealActionSchema,
    reportUserBodySchema,
    toggleBlockBodySchema,
} from './chat.validation';
import { storeIdParamSchema } from '@/modules/user/user.validation';

const getCurrentUserId = (req: Request): string => {
    return (req as any).user?.id;
};

const buildAttachmentsFromFiles = (files: Express.Multer.File[]): Array<{
    url: string;
    type: AttachmentType;
    mimeType: string;
    size: number;
    name?: string;
    width?: number;
    height?: number;
}> => {
    return files.map((file) => ({
        url: `/uploads/${file.filename}`,
        type: file.mimetype.startsWith('image/') ? AttachmentType.IMAGE : AttachmentType.FILE,
        mimeType: file.mimetype,
        size: file.size,
        name: file.originalname,
    }));
};

export const getConversationByProduct = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const params = productIdParamSchema.parse(req.params);
    const conversation = await chatService.getConversationByProduct(userId, params.productId, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: conversation ? 'Conversation found' : 'No conversation found',
        data: conversation,
    });
});

export const getConversationByStore = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const params = storeIdParamSchema.parse(req.params);
    const conversation = await chatService.getConversationByStore(userId, params.storeId, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: conversation ? 'Conversation found' : 'No conversation found',
        data: conversation,
    });
});

export const getChatByUserId = catchAsync(async (req: Request, res: Response) => {
    const validatedQuery = getChatByUserIdSchema.parse(req.query);
    const conversations = await chatService.getChatByUserId(validatedQuery.userId, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Chat retrieved successfully',
        data: conversations,
    });
});

export const getConversations = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedQuery = getConversationsQuerySchema.parse(req.query);
    const result = await chatService.getConversations(
        userId,
        validatedQuery.page,
        validatedQuery.limit,
        { signal: req.signal },
    );
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Conversations retrieved successfully',
        data: result,
    });
});

export const getConversationDetail = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const validatedQuery = getMessagesQuerySchema.parse(req.query);
    const result = await chatService.getConversationDetail(
        validatedParams.id,
        userId,
        validatedQuery.page,
        validatedQuery.limit,
        { signal: req.signal },
    );
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Conversation detail retrieved successfully',
        data: result,
    });
});

export const createConversation = catchAsync(async (req: Request, res: Response) => {
    const senderId = getCurrentUserId(req);
    const validatedBody = createConversationBodySchema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];
    const attachments = files.length > 0 ? buildAttachmentsFromFiles(files) : undefined;
    const message = await chatService.createConversation(senderId, validatedBody, attachments, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: 'Conversation created and message sent successfully',
        data: message,
    });
});

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
    const senderId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const validatedBody = sendMessageBodySchema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];
    const attachments = files.length > 0 ? buildAttachmentsFromFiles(files) : undefined;
    const message = await chatService.sendMessage(
        senderId,
        validatedParams.id,
        validatedBody.text,
        attachments,
        { signal: req.signal },
    );
    sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: 'Message sent successfully',
        data: message,
    });
});

export const markConversationAsRead = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const result = await chatService.markConversationAsRead(validatedParams.id, userId, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Conversation marked as read',
        data: result,
    });
});

export const updateDealStatus = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const validatedBody = dealActionSchema.parse(req.body);
    const result = await chatService.updateDealStatus(
        validatedParams.id,
        userId,
        validatedBody.action,
        { signal: req.signal },
    );
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: result.message,
        data: result,
    });
});

export const reportUser = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const validatedBody = reportUserBodySchema.parse(req.body);
    const result = await chatService.reportUser(validatedParams.id, userId, validatedBody, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: result.message,
        data: result,
    });
});

export const toggleBlockUser = catchAsync(async (req: Request, res: Response) => {
    const userId = getCurrentUserId(req);
    const validatedParams = conversationParamsSchema.parse(req.params);
    const validatedBody = toggleBlockBodySchema.parse(req.body);
    const result = await chatService.toggleBlockUser(validatedParams.id, userId, validatedBody, {
        signal: req.signal,
    });
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: result.message,
        data: result,
    });
});
