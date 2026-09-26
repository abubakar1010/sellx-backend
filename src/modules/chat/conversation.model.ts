import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Enums ─────────────────────────────────────────────────────────────────────

export enum ParticipantRole {
    BUYER = 'buyer',
    SELLER = 'seller',
}

export enum DealStatus {
    NONE = 'none',
    PENDING_APPROVAL = 'pending_approval',
    DEAL_AGREED = 'deal_agreed',
    SOLD = 'sold',
}

// ─── Participant Subdocument ───────────────────────────────────────────────────

export interface IParticipant {
    userId: mongoose.Types.ObjectId;
    role: ParticipantRole;
    storeId?: mongoose.Types.ObjectId; // only for role === 'seller'
    unreadCount: number;
    lastSeenAt?: Date;
    dealStatus: DealStatus;
    dealRequestedAt?: Date;
    dealAgreedAt?: Date;
}

const participantSchema = new Schema<IParticipant>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: Object.values(ParticipantRole), required: true },
        storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
        unreadCount: { type: Number, default: 0, min: 0 },
        lastSeenAt: { type: Date },
        dealStatus: { type: String, enum: Object.values(DealStatus), default: DealStatus.NONE },
        dealRequestedAt: { type: Date },
        dealAgreedAt: { type: Date },
    },
    { _id: false },
);

// ─── Conversation Interface ────────────────────────────────────────────────────

export interface IConversation extends Document {
    participants: IParticipant[];
    buyerId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    lastMessage?: string;
    lastMessageAt?: Date;
    lastSenderId?: mongoose.Types.ObjectId;
    isActive: boolean;
    dealConfirmedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Static Methods Interface ──────────────────────────────────────────────────

export interface IConversationModel extends Model<IConversation>, PaginateModel<IConversation> {
    findByParticipant(
        userId: mongoose.Types.ObjectId,
    ): mongoose.Query<IConversation[], IConversation>;

    findOrCreate(params: {
        buyerId: mongoose.Types.ObjectId;
        sellerId: mongoose.Types.ObjectId;
        storeId?: mongoose.Types.ObjectId;
        productId?: mongoose.Types.ObjectId;
    }): Promise<IConversation>;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const conversationSchema = new Schema<IConversation, IConversationModel>(
    {
        participants: {
            type: [participantSchema],
            validate: {
                validator: (arr: IParticipant[]) => arr.length === 2,
                message: 'A conversation must have exactly 2 participants.',
            },
        },
        buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
        sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        lastMessage: { type: String, maxlength: 500 },
        lastMessageAt: { type: Date },
        lastSenderId: { type: Schema.Types.ObjectId, ref: 'User' },
        isActive: { type: Boolean, default: true },
        dealConfirmedCount: { type: Number, default: 0, min: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Core list query: all conversations for a user, sorted by latest activity
conversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

// Role-filtered queries: seller inbox vs buyer inbox
conversationSchema.index({ 'participants.userId': 1, 'participants.role': 1 });

// Prevent duplicate conversations for the same product between the same buyer-seller pair
conversationSchema.index(
    { productId: 1, buyerId: 1, sellerId: 1 },
    { unique: true, sparse: true },
);

// Store conversations lookup (buyer-seller-store). Uniqueness enforced by findOrCreate logic.
conversationSchema.index({ buyerId: 1, sellerId: 1, 'participants.storeId': 1 });

// Active filter + recency
conversationSchema.index({ isActive: 1, updatedAt: -1 });

// ─── Statics ───────────────────────────────────────────────────────────────────

conversationSchema.statics.findByParticipant = function (userId: mongoose.Types.ObjectId) {
    return this.find({
        'participants.userId': userId,
        isActive: true,
    }).sort({ updatedAt: -1 });
};

conversationSchema.statics.findOrCreate = async function ({
    buyerId,
    sellerId,
    storeId,
    productId,
}: {
    buyerId: mongoose.Types.ObjectId;
    sellerId: mongoose.Types.ObjectId;
    storeId?: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
}): Promise<IConversation> {
    const filter: Record<string, unknown> = {
        buyerId,
        sellerId,
    };

    if (productId) {
        filter.productId = productId;
    } else if (storeId) {
        filter.productId = { $exists: false };
        filter['participants.storeId'] = storeId;
    }

    const existing = await (this as IConversationModel).findOne(filter as any);
    if (existing) return existing;

    try {
        return await this.create({
            participants: [
                { userId: buyerId, role: ParticipantRole.BUYER, dealStatus: DealStatus.NONE },
                {
                    userId: sellerId,
                    role: ParticipantRole.SELLER,
                    storeId,
                    dealStatus: DealStatus.NONE,
                },
            ],
            buyerId,
            sellerId,
            productId,
            dealConfirmedCount: 0,
        });
    } catch (err: unknown) {
        // Handle race condition: another request created the conversation between our find and create
        if (err instanceof Error && 'code' in err && (err as any).code === 11000) {
            const conflict = await (this as IConversationModel).findOne(filter as any);
            if (conflict) return conflict;
        }
        throw err;
    }
};

// ─── Virtuals ──────────────────────────────────────────────────────────────────

conversationSchema.virtual('product', {
    ref: 'Product',
    localField: 'productId',
    foreignField: '_id',
    justOne: true,
});

conversationSchema.plugin(paginatePlugin);

export const ConversationModel = mongoose.model<IConversation, IConversationModel>(
    'Conversation',
    conversationSchema,
    'conversations',
);
