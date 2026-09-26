import mongoose from 'mongoose';
import { ConversationModel, ParticipantRole, DealStatus } from './conversation.model';
import { MessageModel, buildLastMessagePreview, AttachmentType } from './messages.model';
import { ChatReportModel, ChatBlockModel, ReportReason } from './chat-report.model';
import { Product } from '@/modules/products/products.model';
import { StoreModel } from '@/modules/stores/store.model';
import { UserModel } from '@/modules/user/user.model';
import { NotFoundError, ForbiddenError, BadRequestError } from '@/core/errors';
import { emitChatMessage, emitNotificationCreated, emitDealStatusUpdate } from '@/infrastructure/realtime/socket.gateway';

class ChatService {
    private async getConversationStatus(userId: string, conversationId: string) {
        const convId = new mongoose.Types.ObjectId(conversationId);
        const userIdObj = new mongoose.Types.ObjectId(userId);

        const [myBlock, blockedByOther, myReport] = await Promise.all([
            ChatBlockModel.findOne({ blockerId: userIdObj, conversationId: convId }).lean(),
            ChatBlockModel.findOne({ blockedUserId: userIdObj, conversationId: convId }).lean(),
            ChatReportModel.findOne({ reporterId: userIdObj, conversationId: convId, status: 'pending' }).lean(),
        ]);

        return {
            isBlockedByMe: !!myBlock,
            isBlockedByOther: !!blockedByOther,
            isReportedByMe: !!myReport,
        };
    }

    async getConversations(
        userId: string,
        page = 1,
        limit = 20,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const userIdObj = new mongoose.Types.ObjectId(userId);

        const filter = { 'participants.userId': userIdObj, isActive: true };

        const totalCount = await ConversationModel.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / limit);

        const conversations = (await ConversationModel.find(filter)
            .populate({ path: 'participants.userId', select: 'name avatarUrl lastActiveAt' })
            .populate({ path: 'product', select: 'title media price currency status' })
            .populate({ path: 'lastSenderId', select: 'name avatarUrl' })
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean({ virtuals: true })) as any[];

        const enriched = conversations.map((conv: any) => {
            const opposite = conv.participants.find(
                (p: any) => p.userId?._id?.toString() !== userId,
            );
            const self = conv.participants.find((p: any) => p.userId?._id?.toString() === userId);
            const thumbnail = conv.product?.media?.length > 0 ? conv.product.media[0].url : null;

            return {
                ...conv,
                oppositeParticipant: opposite
                    ? {
                          id: opposite.userId._id,
                          name: opposite.userId.name,
                          avatarUrl: opposite.userId.avatarUrl,
                          role: opposite.role,
                          lastSeenAt: opposite.lastSeenAt,
                      }
                    : null,
                unreadCount: self?.unreadCount ?? 0,
                thumbnail,
                dealInfo: conv.productId
                    ? {
                          myDealStatus: self?.dealStatus,
                          otherDealStatus: opposite?.dealStatus,
                          dealConfirmedCount: conv.dealConfirmedCount,
                          productQuantity: conv.product?.quantity,
                          dealRequestedAt: self?.dealRequestedAt,
                          dealAgreedAt: self?.dealAgreedAt,
                      }
                    : null,
                status: {
                    isBlockedByMe: false,
                    isBlockedByOther: false,
                    isReportedByMe: false,
                },
            };
        });

        const statuses = await Promise.all(
            enriched.map(async (conv) => this.getConversationStatus(userId, conv._id.toString())),
        );
        enriched.forEach((conv, i) => {
            conv.status = statuses[i];
        });

        return {
            conversations: enriched,
            meta: {
                pagination: {
                    currentPage: page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        };
    }

    async getChatByUserId(userId: string, options?: { signal?: AbortSignal }): Promise<any> {
        const userIdObj = new mongoose.Types.ObjectId(userId);

        const conversations = (await ConversationModel.find({
            'participants.userId': userIdObj,
            isActive: true,
        })
            .populate({ path: 'participants.userId', select: 'name avatarUrl lastActiveAt' })
            .populate({ path: 'product', select: 'title media price currency status' })
            .populate({ path: 'lastSenderId', select: 'name avatarUrl' })
            .sort({ updatedAt: -1 })
            .lean({ virtuals: true })) as any[];

        return conversations.map((conv: any) => {
            const opposite = conv.participants.find(
                (p: any) => p.userId?._id?.toString() !== userId,
            );
            const self = conv.participants.find((p: any) => p.userId?._id?.toString() === userId);
            const thumbnail = conv.product?.media?.length > 0 ? conv.product.media[0].url : null;

            return {
                ...conv,
                oppositeParticipant: opposite
                    ? {
                          id: opposite.userId._id,
                          name: opposite.userId.name,
                          avatarUrl: opposite.userId.avatarUrl,
                          role: opposite.role,
                          lastSeenAt: opposite.lastSeenAt,
                      }
                    : null,
                unreadCount: self?.unreadCount ?? 0,
                thumbnail,
                dealInfo: conv.productId
                    ? {
                          myDealStatus: self?.dealStatus,
                          otherDealStatus: opposite?.dealStatus,
                          dealConfirmedCount: conv.dealConfirmedCount,
                          productQuantity: conv.product?.quantity,
                          dealRequestedAt: self?.dealRequestedAt,
                          dealAgreedAt: self?.dealAgreedAt,
                      }
                    : null,
                status: {
                    isBlockedByMe: false,
                    isBlockedByOther: false,
                    isReportedByMe: false,
                },
            };
        });
    }

    async getConversationByProduct(
        userId: string,
        productId: string,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const userIdObj = new mongoose.Types.ObjectId(userId);
        const productIdObj = new mongoose.Types.ObjectId(productId);

        const conversation = await ConversationModel.findOne({
            productId: productIdObj,
            'participants.userId': userIdObj,
            isActive: true,
        })
            .populate({ path: 'participants.userId', select: 'name avatarUrl lastActiveAt' })
            .populate({ path: 'product', select: 'title media price currency status' })
            .populate({ path: 'lastSenderId', select: 'name avatarUrl' })
            .lean({ virtuals: true }) as any;

        if (!conversation) return null;

        const opposite = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() !== userId,
        );
        const self = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() === userId,
        );
        const thumbnail =
            conversation.product?.media?.length > 0 ? conversation.product.media[0].url : null;

        return {
            ...conversation,
            oppositeParticipant: opposite
                ? {
                      id: opposite.userId._id,
                      name: opposite.userId.name,
                      avatarUrl: opposite.userId.avatarUrl,
                      role: opposite.role,
                      lastSeenAt: opposite.lastSeenAt,
                  }
                : null,
            unreadCount: self?.unreadCount ?? 0,
            thumbnail,
            dealInfo: {
                myDealStatus: self?.dealStatus,
                otherDealStatus: opposite?.dealStatus,
                dealConfirmedCount: conversation.dealConfirmedCount,
                productQuantity: conversation.product?.quantity,
                dealRequestedAt: self?.dealRequestedAt,
                dealAgreedAt: self?.dealAgreedAt,
            },
            status: {
                isBlockedByMe: false,
                isBlockedByOther: false,
                isReportedByMe: false,
            },
        };
    }

    async getConversationByStore(
        userId: string,
        storeId: string,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const userIdObj = new mongoose.Types.ObjectId(userId);
        const storeIdObj = new mongoose.Types.ObjectId(storeId);

        const conversation = await ConversationModel.findOne({
            productId: { $exists: false },
            'participants.userId': userIdObj,
            'participants.storeId': storeIdObj,
            isActive: true,
        })
            .populate({ path: 'participants.userId', select: 'name avatarUrl lastActiveAt' })
            .populate({ path: 'lastSenderId', select: 'name avatarUrl' })
            .lean({ virtuals: true }) as any;

        if (!conversation) return null;

        const opposite = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() !== userId,
        );
        const self = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() === userId,
        );

        return {
            ...conversation,
            oppositeParticipant: opposite
                ? {
                      id: opposite.userId._id,
                      name: opposite.userId.name,
                      avatarUrl: opposite.userId.avatarUrl,
                      role: opposite.role,
                      lastSeenAt: opposite.lastSeenAt,
                  }
                : null,
            unreadCount: self?.unreadCount ?? 0,
            status: {
                isBlockedByMe: false,
                isBlockedByOther: false,
                isReportedByMe: false,
            },
        };
    }

    async getConversationDetail(
        conversationId: string,
        userId: string,
        page = 1,
        limit = 20,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const conversation = (await ConversationModel.findById(conversationId)
            .populate({ path: 'participants.userId', select: 'name avatarUrl lastActiveAt' })
            .populate({ path: 'product', select: 'title media price currency status' })
            .populate({ path: 'lastSenderId', select: 'name avatarUrl' })
            .lean({ virtuals: true })) as any;

        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p: any) => p.userId?._id?.toString() === userId,
        );
        if (!isParticipant) {
            throw new ForbiddenError('You are not authorized to view this conversation');
        }

        const messages = (await MessageModel.find({
            conversationId: conversation._id,
        })
            .populate({ path: 'sender', select: 'name avatarUrl' })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()) as any[];

        const unreadMessages = messages.filter(
            (msg: any) => msg.senderId?._id?.toString() !== userId && !msg.readAt,
        );

        if (unreadMessages.length > 0) {
            await MessageModel.updateMany(
                {
                    _id: { $in: unreadMessages.map((msg: any) => msg._id) },
                },
                { readAt: new Date() },
            );
        }

        const totalCount = await MessageModel.countDocuments({ conversationId: conversation._id });
        const totalPages = Math.ceil(totalCount / limit);

        const opposite = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() !== userId,
        );
        const self = conversation.participants.find(
            (p: any) => p.userId?._id?.toString() === userId,
        );
        const thumbnail =
            conversation.product?.media?.length > 0 ? conversation.product.media[0].url : null;

        const status = await this.getConversationStatus(userId, conversation._id.toString());

        return {
            conversation: {
                ...conversation,
                oppositeParticipant: opposite
                    ? {
                          id: opposite.userId._id,
                          name: opposite.userId.name,
                          avatarUrl: opposite.userId.avatarUrl,
                          role: opposite.role,
                          lastSeenAt: opposite.lastSeenAt,
                      }
                    : null,
                unreadCount: self?.unreadCount ?? 0,
                thumbnail,
                dealInfo: conversation.productId
                    ? {
                          myDealStatus: self?.dealStatus,
                          otherDealStatus: opposite?.dealStatus,
                          dealConfirmedCount: conversation.dealConfirmedCount,
                          productQuantity: conversation.product?.quantity,
                          dealRequestedAt: self?.dealRequestedAt,
                          dealAgreedAt: self?.dealAgreedAt,
                      }
                    : null,
                status,
            },
            messages,
            meta: {
                pagination: {
                    currentPage: page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
        };
    }

    async createConversation(
        senderId: string,
        body: { productId?: string; storeId?: string; text?: string },
        attachments?: Array<{
            url: string;
            type: AttachmentType;
            mimeType: string;
            size: number;
            name?: string;
            width?: number;
            height?: number;
        }>,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const { productId, storeId } = body;
        const text = body.text?.trim() || '';

        const hasText = text.length > 0;
        const hasAttachments = attachments && attachments.length > 0;
        if (!hasText && !hasAttachments) {
            throw new BadRequestError(
                'Message must contain text, at least one attachment, or both',
            );
        }

        let sellerId: string;
        let resolvedStoreId: string | undefined;

        if (productId) {
            const product = await Product.findById(productId).lean();
            if (!product) {
                throw new NotFoundError('Product not found');
            }
            sellerId = product.user.toString();
            resolvedStoreId = product.store?.toString();
        } else if (storeId) {
            const store = await StoreModel.findById(storeId).lean();
            if (!store) {
                throw new NotFoundError('Store not found');
            }
            sellerId = store.user.toString();
            resolvedStoreId = storeId;
        } else {
            throw new BadRequestError('Either productId or storeId is required');
        }

        const existingBlock = await ChatBlockModel.findOne({
            $or: [
                { blockerId: new mongoose.Types.ObjectId(senderId), blockedUserId: new mongoose.Types.ObjectId(sellerId) },
                { blockerId: new mongoose.Types.ObjectId(sellerId), blockedUserId: new mongoose.Types.ObjectId(senderId) },
            ],
        });
        if (existingBlock) {
            throw new ForbiddenError('You cannot start a conversation with this user');
        }

        const conversation = await ConversationModel.findOrCreate({
            buyerId: new mongoose.Types.ObjectId(senderId),
            sellerId: new mongoose.Types.ObjectId(sellerId),
            storeId: resolvedStoreId ? new mongoose.Types.ObjectId(resolvedStoreId) : undefined,
            productId: productId ? new mongoose.Types.ObjectId(productId) : undefined,
        });

        const message = await MessageModel.create({
            conversationId: conversation._id,
            senderId: new mongoose.Types.ObjectId(senderId),
            text: hasText ? text : undefined,
            attachments: hasAttachments ? attachments : [],
        });

        const preview = buildLastMessagePreview(message);
        await ConversationModel.updateOne(
            { _id: conversation._id },
            {
                lastMessage: preview,
                lastMessageAt: new Date(),
                lastSenderId: new mongoose.Types.ObjectId(senderId),
            },
        );

        await message.populate({ path: 'sender', select: 'name avatarUrl' });

        this.emitMessageToRoom(conversation._id.toString(), message, senderId);

        emitNotificationCreated(sellerId, {
            id: conversation._id.toString(),
            title: 'New message',
            message: message.text || 'Sent you a message',
            type: 'chat',
            isRead: false,
            metadata: { conversationId: conversation._id.toString(), type: 'chat' },
            createdAt: new Date(),
        });

        return message;
    }

    async sendMessage(
        senderId: string,
        conversationId: string,
        text?: string,
        attachments?: Array<{
            url: string;
            type: AttachmentType;
            mimeType: string;
            size: number;
            name?: string;
            width?: number;
            height?: number;
        }>,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const hasText = text && text.trim().length > 0;
        const hasAttachments = attachments && attachments.length > 0;
        if (!hasText && !hasAttachments) {
            throw new BadRequestError(
                'Message must contain text, at least one attachment, or both',
            );
        }

        const conversation = await ConversationModel.findById(conversationId).lean();
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        if (!conversation.isActive) {
            throw new ForbiddenError('This conversation is no longer active');
        }

        const isParticipant = conversation.participants.some(
            (p) => p.userId.toString() === senderId,
        );
        if (!isParticipant) {
            throw new ForbiddenError(
                'You are not authorized to send messages in this conversation',
            );
        }

        const message = await MessageModel.create({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: new mongoose.Types.ObjectId(senderId),
            text: hasText ? text!.trim() : undefined,
            attachments: hasAttachments ? attachments : [],
        });

        const preview = buildLastMessagePreview(message);
        await ConversationModel.updateOne(
            { _id: conversation._id },
            {
                lastMessage: preview,
                lastMessageAt: new Date(),
                lastSenderId: new mongoose.Types.ObjectId(senderId),
            },
        );

        await message.populate({ path: 'sender', select: 'name avatarUrl' });

        this.emitMessageToRoom(conversationId, message, senderId);

        return message;
    }

    private async emitMessageToRoom(
        conversationId: string,
        message: any,
        senderId: string,
    ): Promise<void> {
        const sender = message.sender || { _id: senderId, name: '', avatarUrl: '' };
        emitChatMessage(conversationId, {
            roomId: conversationId,
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
                id: senderId,
                email: sender.email || '',
                name: sender.name || sender.email || '',
                avatarUrl: sender.avatarUrl,
            },
            sentAt: message.createdAt?.toISOString?.() || new Date().toISOString(),
            createdAt: message.createdAt?.toISOString?.() || new Date().toISOString(),
        });
    }

    async markConversationAsRead(
        conversationId: string,
        userId: string,
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        const isParticipant = conversation.participants.some((p) => p.userId.toString() === userId);
        if (!isParticipant) {
            throw new ForbiddenError('You are not authorized to mark this conversation as read');
        }

        await MessageModel.updateMany(
            {
                conversationId: conversation._id,
                senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                readAt: { $exists: false },
            },
            { readAt: new Date() },
        );

        const participant = conversation.participants.find((p) => p.userId.toString() === userId);
        if (participant) {
            participant.lastSeenAt = new Date();
            participant.unreadCount = 0;
            await conversation.save();
        }

        return { success: true };
    }

    async updateDealStatus(
        conversationId: string,
        userId: string,
        action: 'request' | 'approve' | 'mark_sold',
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        if (!conversation.productId) {
            throw new BadRequestError('Deal operations are only available for product-based conversations');
        }

        const participant = conversation.participants.find(
            (p) => p.userId.toString() === userId,
        );
        if (!participant) {
            throw new ForbiddenError('You are not a participant in this conversation');
        }

        const otherParticipant = conversation.participants.find(
            (p) => p.userId.toString() !== userId,
        );

        if (action === 'request') {
            if (participant.dealStatus === DealStatus.DEAL_AGREED || participant.dealStatus === DealStatus.SOLD) {
                throw new BadRequestError('Deal status cannot be changed');
            }
            if (participant.dealStatus === DealStatus.PENDING_APPROVAL) {
                throw new BadRequestError('Deal agreement request is already pending');
            }

            if (otherParticipant?.dealStatus === DealStatus.PENDING_APPROVAL) {
                participant.dealStatus = DealStatus.DEAL_AGREED;
                participant.dealAgreedAt = new Date();

                const product = await Product.findById(conversation.productId).lean();
                if (!product) {
                    throw new NotFoundError('Product not found');
                }

                const dealConfirmedCount = conversation.dealConfirmedCount + 1;
                conversation.dealConfirmedCount = dealConfirmedCount;

                const availableQuantity = product.quantity ?? 0;
                const isSoldOut = dealConfirmedCount >= availableQuantity;

                if (isSoldOut) {
                    const sellerParticipant = conversation.participants.find(
                        (p) => p.role === ParticipantRole.SELLER,
                    );
                    if (sellerParticipant) {
                        sellerParticipant.dealStatus = DealStatus.SOLD;
                    }
                    const buyerParticipants = conversation.participants.filter(
                        (p) => p.role === ParticipantRole.BUYER,
                    );
                    for (const buyer of buyerParticipants) {
                        if (buyer.dealStatus === DealStatus.DEAL_AGREED) {
                            buyer.dealStatus = DealStatus.SOLD;
                        }
                    }
                }

                await conversation.save();

                emitDealStatusUpdate(conversationId.toString(), {
                    conversationId: conversationId.toString(),
                    userId: userId,
                    dealStatus: participant.dealStatus,
                    quantity: dealConfirmedCount,
                    productQuantity: product.quantity,
                });

                emitNotificationCreated(otherParticipant.userId.toString(), {
                    id: conversationId.toString(),
                    title: 'Deal Confirmed',
                    message: 'Both parties have agreed to the deal',
                    type: 'deal_confirmed',
                    isRead: false,
                    metadata: {
                        conversationId: conversationId.toString(),
                        type: 'deal_confirmed',
                        confirmedBy: userId,
                        isSoldOut,
                    },
                    createdAt: new Date(),
                });

                return {
                    conversationId: conversation._id.toString(),
                    dealStatus: participant.dealStatus,
                    dealConfirmedCount,
                    isSoldOut,
                    message: 'Deal confirmed by both parties',
                };
            } else {
                participant.dealStatus = DealStatus.PENDING_APPROVAL;
                participant.dealRequestedAt = new Date();
                await conversation.save();

                emitDealStatusUpdate(conversationId.toString(), {
                    conversationId: conversationId.toString(),
                    userId: otherParticipant?.userId.toString() || '',
                    dealStatus: participant.dealStatus,
                    requestedBy: userId,
                });

                emitNotificationCreated(otherParticipant?.userId.toString() || '', {
                    id: conversationId.toString(),
                    title: 'Deal Agreement Request',
                    message: participant.role === ParticipantRole.BUYER
                        ? 'Buyer wants to confirm the deal'
                        : 'Seller wants to confirm the deal',
                    type: 'deal_request',
                    isRead: false,
                    metadata: {
                        conversationId: conversationId.toString(),
                        type: 'deal_request',
                        requestedBy: userId,
                    },
                    createdAt: new Date(),
                });

                return {
                    conversationId: conversation._id.toString(),
                    dealStatus: participant.dealStatus,
                    message: 'Deal agreement request sent',
                };
            }
        }

        if (action === 'approve') {
            if (otherParticipant?.dealStatus !== DealStatus.PENDING_APPROVAL) {
                throw new BadRequestError('No pending deal agreement request to approve');
            }
            if (participant.dealStatus === DealStatus.DEAL_AGREED || participant.dealStatus === DealStatus.SOLD) {
                throw new BadRequestError('Deal status cannot be changed');
            }

            participant.dealStatus = DealStatus.DEAL_AGREED;
            participant.dealAgreedAt = new Date();

            const product = await Product.findById(conversation.productId).lean();
            if (!product) {
                throw new NotFoundError('Product not found');
            }

            const dealConfirmedCount = conversation.dealConfirmedCount + 1;
            conversation.dealConfirmedCount = dealConfirmedCount;

            const availableQuantity = product.quantity ?? 0;
            const isSoldOut = dealConfirmedCount >= availableQuantity;

            if (isSoldOut) {
                const sellerParticipant = conversation.participants.find(
                    (p) => p.role === ParticipantRole.SELLER,
                );
                if (sellerParticipant) {
                    sellerParticipant.dealStatus = DealStatus.SOLD;
                }
                const buyerParticipants = conversation.participants.filter(
                    (p) => p.role === ParticipantRole.BUYER,
                );
                for (const buyer of buyerParticipants) {
                    if (buyer.dealStatus === DealStatus.DEAL_AGREED) {
                        buyer.dealStatus = DealStatus.SOLD;
                    }
                }
            }

            await conversation.save();

            emitDealStatusUpdate(conversationId.toString(), {
                conversationId: conversationId.toString(),
                userId: userId,
                dealStatus: participant.dealStatus,
                quantity: dealConfirmedCount,
                productQuantity: product.quantity,
            });

            emitNotificationCreated(otherParticipant.userId.toString(), {
                id: conversationId.toString(),
                title: 'Deal Confirmed',
                message: 'Both parties have agreed to the deal',
                type: 'deal_confirmed',
                isRead: false,
                metadata: {
                    conversationId: conversationId.toString(),
                    type: 'deal_confirmed',
                    approvedBy: userId,
                    isSoldOut,
                },
                createdAt: new Date(),
            });

            return {
                conversationId: conversation._id.toString(),
                dealStatus: participant.dealStatus,
                dealConfirmedCount,
                isSoldOut,
                message: 'Deal agreement confirmed',
            };
        }

        if (action === 'mark_sold') {
            if (participant.role !== ParticipantRole.SELLER) {
                throw new ForbiddenError('Only the seller can mark the product as sold');
            }
            if (participant.dealStatus !== DealStatus.DEAL_AGREED) {
                throw new BadRequestError('Deal must be agreed by both parties before marking as sold');
            }

            participant.dealStatus = DealStatus.SOLD;

            const product = await Product.findById(conversation.productId).lean();
            if (!product) {
                throw new NotFoundError('Product not found');
            }

            const dealConfirmedCount = conversation.dealConfirmedCount + 1;
            conversation.dealConfirmedCount = dealConfirmedCount;

            const availableQuantity = product.quantity ?? 0;
            const isSoldOut = dealConfirmedCount >= availableQuantity;

            if (isSoldOut) {
                const buyerParticipants = conversation.participants.filter(
                    (p) => p.role === ParticipantRole.BUYER,
                );
                for (const buyer of buyerParticipants) {
                    if (buyer.dealStatus === DealStatus.DEAL_AGREED) {
                        buyer.dealStatus = DealStatus.SOLD;
                    }
                }
            }

            await conversation.save();

            const buyerParticipant = conversation.participants.find(
                (p) => p.role === ParticipantRole.BUYER,
            );

            if (buyerParticipant) {
                emitDealStatusUpdate(conversationId.toString(), {
                    conversationId: conversationId.toString(),
                    userId: buyerParticipant.userId.toString(),
                    dealStatus: DealStatus.SOLD,
                    quantity: dealConfirmedCount,
                    productQuantity: product.quantity,
                });

                emitNotificationCreated(buyerParticipant.userId.toString(), {
                    id: conversationId.toString(),
                    title: 'Product Sold',
                    message: 'Seller has marked the product as sold',
                    type: 'deal_sold',
                    isRead: false,
                    metadata: {
                        conversationId: conversationId.toString(),
                        type: 'deal_sold',
                        markedBy: userId,
                        isSoldOut,
                    },
                    createdAt: new Date(),
                });
            }

            return {
                conversationId: conversation._id.toString(),
                dealStatus: DealStatus.SOLD,
                dealConfirmedCount,
                isSoldOut,
                message: 'Product marked as sold',
            };
        }

        throw new BadRequestError('Invalid deal action');
    }

    async reportUser(
        conversationId: string,
        userId: string,
        payload: {
            reportedUserId: string;
            reportedStoreId?: string;
            reason: string;
            details?: string;
            messageId?: string;
        },
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p) => p.userId.toString() === userId,
        );
        if (!isParticipant) {
            throw new ForbiddenError('You are not a participant in this conversation');
        }

        const existingReport = await ChatReportModel.findOne({
            reporterId: new mongoose.Types.ObjectId(userId),
            reportedUserId: new mongoose.Types.ObjectId(payload.reportedUserId),
            conversationId: new mongoose.Types.ObjectId(conversationId),
            status: 'pending',
        });

        if (existingReport) {
            existingReport.status = 'dismissed';
            await existingReport.save();

            await ChatBlockModel.deleteOne({
                blockerId: new mongoose.Types.ObjectId(userId),
                blockedUserId: new mongoose.Types.ObjectId(payload.reportedUserId),
                conversationId: new mongoose.Types.ObjectId(conversationId),
            });

            conversation.isActive = true;
            await conversation.save();

            return {
                id: existingReport._id.toString(),
                status: 'dismissed',
                blocked: false,
                message: 'Report withdrawn and user unblocked',
            };
        }

        const report = await ChatReportModel.create({
            reporterId: new mongoose.Types.ObjectId(userId),
            reportedUserId: new mongoose.Types.ObjectId(payload.reportedUserId),
            reportedStoreId: payload.reportedStoreId
                ? new mongoose.Types.ObjectId(payload.reportedStoreId)
                : undefined,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            reason: payload.reason as any,
            details: payload.details,
            messageId: payload.messageId ? new mongoose.Types.ObjectId(payload.messageId) : undefined,
            status: 'pending',
        } as any);

        const existingBlock = await ChatBlockModel.findOne({
            blockerId: new mongoose.Types.ObjectId(userId),
            blockedUserId: new mongoose.Types.ObjectId(payload.reportedUserId),
            conversationId: new mongoose.Types.ObjectId(conversationId),
        });

        if (!existingBlock) {
            await ChatBlockModel.create({
                blockerId: new mongoose.Types.ObjectId(userId),
                blockedUserId: new mongoose.Types.ObjectId(payload.reportedUserId),
                blockedStoreId: payload.reportedStoreId
                    ? new mongoose.Types.ObjectId(payload.reportedStoreId)
                    : undefined,
                conversationId: new mongoose.Types.ObjectId(conversationId),
                reason: `Auto-blocked due to report: ${payload.reason}`,
            });
        }

        conversation.isActive = false;
        await conversation.save();

        return {
            id: (report as any)._id.toString(),
            status: (report as any).status,
            blocked: true,
            message: 'User reported and blocked successfully',
        };
    }

    async toggleBlockUser(
        conversationId: string,
        userId: string,
        payload: {
            blockedUserId: string;
            blockedStoreId?: string;
            reason?: string;
        },
        options?: { signal?: AbortSignal },
    ): Promise<any> {
        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) {
            throw new NotFoundError('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p) => p.userId.toString() === userId,
        );
        if (!isParticipant) {
            throw new ForbiddenError('You are not a participant in this conversation');
        }

        const existingBlock = await ChatBlockModel.findOne({
            blockerId: new mongoose.Types.ObjectId(userId),
            blockedUserId: new mongoose.Types.ObjectId(payload.blockedUserId),
        });

        if (existingBlock) {
            await existingBlock.deleteOne();
            conversation.isActive = true;
            await conversation.save();
            return {
                blocked: false,
                message: 'User unblocked successfully',
            };
        }

        const block = await ChatBlockModel.create({
            blockerId: new mongoose.Types.ObjectId(userId),
            blockedUserId: new mongoose.Types.ObjectId(payload.blockedUserId),
            blockedStoreId: payload.blockedStoreId
                ? new mongoose.Types.ObjectId(payload.blockedStoreId)
                : undefined,
            conversationId: new mongoose.Types.ObjectId(conversationId),
            reason: payload.reason,
        });

        conversation.isActive = false;
        await conversation.save();

        return {
            blocked: true,
            id: block._id.toString(),
            message: 'User blocked successfully',
        };
    }
}

export const chatService = new ChatService();
