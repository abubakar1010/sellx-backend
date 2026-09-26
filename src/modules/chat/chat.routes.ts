import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { validate } from '@/shared/middlewares/validate';
import { parseFormData } from '@/shared/middlewares/parseFormData';
import { multerUpload } from '@/infrastructure/storage/multer.config';
import {
    getChatByUserId,
    getConversations,
    getConversationDetail,
    createConversation,
    sendMessage,
    markConversationAsRead,
    getConversationByProduct,
    getConversationByStore,
    updateDealStatus,
    reportUser,
    toggleBlockUser,
} from './chat.controller';
import {
    conversationParamsSchema,
    getMessagesQuerySchema,
    getChatByUserIdSchema,
    sendMessageBodySchema,
    createConversationBodySchema,
    getConversationsQuerySchema,
    productIdParamSchema,
    dealActionSchema,
    reportUserBodySchema,
    toggleBlockBodySchema,
} from './chat.validation';
import { storeIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.use(authenticate);

router.get('/user', validate({ query: getChatByUserIdSchema }), getChatByUserId);

router.get('/', validate({ query: getConversationsQuerySchema }), getConversations);

router.post(
    '/',
    multerUpload.array('images', 10),
    parseFormData,
    validate({ body: createConversationBodySchema }),
    createConversation,
);

router.get(
    '/by-product/:productId',
    validate({ params: productIdParamSchema }),
    getConversationByProduct,
);

router.get(
    '/by-store/:storeId',
    validate({ params: storeIdParamSchema }),
    getConversationByStore,
);

router.get(
    '/:id',
    validate({ params: conversationParamsSchema, query: getMessagesQuerySchema }),
    getConversationDetail,
);

router.post(
    '/:id/messages',
    multerUpload.array('images', 10),
    parseFormData,
    validate({ params: conversationParamsSchema, body: sendMessageBodySchema }),
    sendMessage,
);

router.post(
    '/:id/mark-read',
    validate({ params: conversationParamsSchema }),
    markConversationAsRead,
);

router.post(
    '/:id/deal',
    validate({ params: conversationParamsSchema, body: dealActionSchema }),
    updateDealStatus,
);

router.post(
    '/:id/report',
    validate({ params: conversationParamsSchema, body: reportUserBodySchema }),
    reportUser,
);

router.post(
    '/:id/block',
    validate({ params: conversationParamsSchema, body: toggleBlockBodySchema }),
    toggleBlockUser,
);

export default router;
