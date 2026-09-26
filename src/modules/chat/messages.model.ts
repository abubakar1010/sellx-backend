import mongoose, { Schema, Document } from 'mongoose';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import { paginatePlugin } from '@/infrastructure/database/plugins/paginate.plugin';

// ─── Enums ─────────────────────────────────────────────────────────────────────

export enum AttachmentType {
    IMAGE = 'image',
    FILE = 'file',
}

// ─── Attachment Subdocument ────────────────────────────────────────────────────

export interface IAttachment {
    url: string;
    type: AttachmentType;
    mimeType: string; // e.g. 'image/jpeg', 'application/pdf'
    size: number; // bytes
    name?: string; // original filename — useful for FILE type
    width?: number; // px — IMAGE only
    height?: number; // px — IMAGE only
}

const attachmentSchema = new Schema<IAttachment>(
    {
        url: { type: String, required: true },
        type: { type: String, enum: Object.values(AttachmentType), required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true, min: 0 },
        name: { type: String },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
    },
    { _id: false },
);

// ─── Message Interface ─────────────────────────────────────────────────────────

export interface IMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    text?: string; // optional — absent when attachments-only
    attachments: IAttachment[]; // empty when text-only; mixed when both
    readAt?: Date;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const messageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        text: {
            type: String,
            maxlength: 2000,
            trim: true,
        },
        attachments: {
            type: [attachmentSchema],
            default: [],
            validate: {
                validator: (arr: IAttachment[]) => arr.length <= 10,
                message: 'A message cannot have more than 10 attachments.',
            },
        },
        readAt: { type: Date },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Core pagination: messages in a thread, newest first
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Unread count: messages in a thread with no readAt
messageSchema.index({ conversationId: 1, readAt: 1 }, { sparse: true });

// ─── Pre-validate: must have text or at least one attachment ──────────────────

messageSchema.pre('validate', async function () {
    const hasText = typeof this.text === 'string' && this.text.trim().length > 0;
    const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;

    if (!hasText && !hasAttachments) {
        throw new Error('A message must contain text, at least one attachment, or both.');
    }
});

// ─── Pre-find: automatically exclude soft-deleted messages ────────────────────

messageSchema.pre(/^find/, function () {
    const filter = (this as any).getFilter() as { includeDeleted?: boolean };
    if (!filter.includeDeleted) {
        (this as any).where({ isDeleted: false });
    }
});

// ─── Virtuals ──────────────────────────────────────────────────────────────────

messageSchema.virtual('sender', {
    ref: 'User',
    localField: 'senderId',
    foreignField: '_id',
    justOne: true,
});

messageSchema.virtual('conversation', {
    ref: 'Conversation',
    localField: 'conversationId',
    foreignField: '_id',
    justOne: true,
});

// Convenience flag — true when the message carries any attachments
messageSchema.virtual('hasAttachments').get(function (this: IMessage) {
    return this.attachments.length > 0;
});

// Convenience flag — true when the message carries text
messageSchema.virtual('hasText').get(function (this: IMessage) {
    return typeof this.text === 'string' && this.text.trim().length > 0;
});

messageSchema.plugin(paginatePlugin);
messageSchema.plugin(toJSONPlugin);

export const MessageModel = mongoose.model<IMessage>('Message', messageSchema, 'messages');

// ─── Conversation last-message preview helper ──────────────────────────────────
//
// Call this from your service layer after saving a new message to keep
// ConversationModel.lastMessage in sync.
//
// Usage:
//   import { buildLastMessagePreview } from './message.model';
//   const preview = buildLastMessagePreview(savedMessage);
//   await ConversationModel.findByIdAndUpdate(conversationId, {
//     lastMessage:   preview,
//     lastMessageAt: savedMessage.createdAt,
//     lastSenderId:  savedMessage.senderId,
//   });

export function buildLastMessagePreview(message: IMessage): string {
    if (message.text && message.attachments.length > 0) {
        return `${message.text.slice(0, 80)} (+${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''})`;
    }
    if (message.text) {
        return message.text.slice(0, 100);
    }
    const count = message.attachments.length;
    return `📎 ${count} attachment${count > 1 ? 's' : ''}`;
}
