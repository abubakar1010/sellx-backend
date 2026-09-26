import mongoose, { Schema, Document, Model } from 'mongoose';
import { toJSONPlugin } from '@/infrastructure/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

export enum ReportReason {
    SPAM = 'spam',
    HARASSMENT = 'harassment',
    FRAUD = 'fraud',
    INAPPROPRIATE = 'inappropriate',
    SCAM = 'scam',
    OTHER = 'other',
}

export interface IChatReport extends Document {
    reporterId: mongoose.Types.ObjectId;
    reportedUserId: mongoose.Types.ObjectId;
    reportedStoreId?: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    reason: ReportReason;
    details?: string;
    messageId?: mongoose.Types.ObjectId;
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    createdAt: Date;
    updatedAt: Date;
}

const chatReportSchema = new Schema<IChatReport>(
    {
        reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reportedStoreId: { type: Schema.Types.ObjectId, ref: 'Store' },
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        reason: { type: String, enum: Object.values(ReportReason), required: true },
        details: { type: String, maxlength: 1000 },
        messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
        status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

chatReportSchema.index({ reporterId: 1, createdAt: -1 });
chatReportSchema.index({ reportedUserId: 1, createdAt: -1 });
chatReportSchema.index({ conversationId: 1, createdAt: -1 });
chatReportSchema.index({ status: 1, createdAt: -1 });

chatReportSchema.plugin(paginatePlugin);
chatReportSchema.plugin(toJSONPlugin);

export const ChatReportModel = mongoose.model<IChatReport, PaginateModel<IChatReport>>(
    'ChatReport',
    chatReportSchema,
    'chat_reports',
);

export interface IChatBlock extends Document {
    blockerId: mongoose.Types.ObjectId;
    blockedUserId: mongoose.Types.ObjectId;
    blockedStoreId?: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    reason?: string;
    createdAt: Date;
}

const chatBlockSchema = new Schema<IChatBlock>(
    {
        blockerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        blockedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        blockedStoreId: { type: Schema.Types.ObjectId, ref: 'Store' },
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        reason: { type: String, maxlength: 500 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

chatBlockSchema.index({ blockerId: 1, blockedUserId: 1 }, { unique: true });
chatBlockSchema.index({ blockerId: 1, createdAt: -1 });
chatBlockSchema.index({ blockedUserId: 1 });

chatBlockSchema.plugin(paginatePlugin);
chatBlockSchema.plugin(toJSONPlugin);

export const ChatBlockModel = mongoose.model<IChatBlock, PaginateModel<IChatBlock>>(
    'ChatBlock',
    chatBlockSchema,
    'chat_blocks',
);
