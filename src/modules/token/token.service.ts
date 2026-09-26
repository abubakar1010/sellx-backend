import crypto from 'node:crypto';

import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '../../core/interfaces/repository.interface';
import type { CreateTokenInput, ITokenDocument } from './token.interface';
import { tokenRepository, type TokenRepository } from './token.repository';

const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export class TokenService {
    constructor(private readonly repository: TokenRepository = tokenRepository) {}

    async createToken(
        input: CreateTokenInput,
        options?: RepositoryWriteOptions,
    ): Promise<ITokenDocument> {
        return this.repository.create(
            {
                userId: input.userId,
                tokenHash: hashToken(input.token),
                type: input.type,
                expiresAt: input.expiresAt,
                blacklisted: false,
            } as Partial<ITokenDocument>,
            options,
        );
    }

    async validateToken(
        userId: string,
        token: string,
        type: CreateTokenInput['type'],
        options?: RepositoryQueryOptions,
    ): Promise<boolean> {
        const tokenHash = hashToken(token);
        const stored = await this.repository.findActiveToken(userId, type, tokenHash, options);
        return Boolean(stored);
    }

    async validateTokenByTokenHash(
        token: string,
        type: CreateTokenInput['type'],
        options?: RepositoryQueryOptions,
    ): Promise<ITokenDocument | null> {
        const tokenHash = hashToken(token);
        return this.repository.findActiveTokenByTokenHash(tokenHash, type, options);
    }

    async revokeToken(
        userId: string,
        token: string,
        type: CreateTokenInput['type'],
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        const tokenHash = hashToken(token);
        await this.repository.revokeToken(userId, type, tokenHash, options);
    }

    async revokeAllRefreshTokens(userId: string, options?: RepositoryWriteOptions): Promise<void> {
        await this.repository.revokeAllByUser(userId, undefined, options);
    }

    async revokeAllByUser(
        userId: string,
        type: CreateTokenInput['type'],
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        await this.repository.revokeAllByUser(userId, type, options);
    }
}

export const tokenService = new TokenService();
