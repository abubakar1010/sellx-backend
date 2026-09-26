import mongoose, { Schema } from 'mongoose';

import { paginatePlugin } from '../../infrastructure/database/plugins/paginate.plugin';
import { toJSONPlugin } from '../../infrastructure/database/plugins/toJSON.plugin';
import type { ITokenDocument } from './token.interface';
import { TOKEN_TYPES } from './token.constants';

const tokenSchema = new Schema<ITokenDocument>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(TOKEN_TYPES),
            required: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        blacklisted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

tokenSchema.plugin(toJSONPlugin);
tokenSchema.plugin(paginatePlugin);
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ userId: 1, type: 1, tokenHash: 1 }, { unique: true });

export const TokenModel = mongoose.model<ITokenDocument>('Token', tokenSchema, 'tokens');
