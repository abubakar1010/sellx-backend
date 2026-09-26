import type { Document } from 'mongoose';

import type { TokenType } from './token.constants';

export interface IToken {
    userId: string;
    tokenHash: string;
    type: TokenType;
    expiresAt: Date;
    blacklisted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITokenDocument extends IToken, Document {
    id: string;
}

export interface CreateTokenInput {
    userId: string;
    token: string;
    type: TokenType;
    expiresAt: Date;
}
