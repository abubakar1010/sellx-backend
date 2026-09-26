import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '../../core/interfaces/repository.interface';
import { BaseMongooseRepository } from '../../infrastructure/database/base.repository';
import { TOKEN_TYPES, type TokenType } from './token.constants';
import type { ITokenDocument } from './token.interface';
import { TokenModel } from './token.model';

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        const error = new Error('Operation aborted.');
        error.name = 'AbortError';
        throw error;
    }

    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => {
            const error = new Error('Operation aborted.');
            error.name = 'AbortError';
            reject(error);
        };
        signal.addEventListener('abort', abortHandler, { once: true });
        promise
            .then(resolve)
            .catch(reject)
            .finally(() => signal.removeEventListener('abort', abortHandler));
    });
};

export class TokenRepository extends BaseMongooseRepository<ITokenDocument> {
    constructor() {
        super(TokenModel as never);
    }

    async findActiveToken(
        userId: string,
        type: TokenType,
        tokenHash: string,
        options?: RepositoryQueryOptions,
    ): Promise<ITokenDocument | null> {
        const now = new Date();
        const operation = this.model
            .findOne({
                userId,
                type,
                tokenHash,
                blacklisted: false,
                expiresAt: { $gt: now },
            })
            .lean<ITokenDocument>();

        return withAbort(operation as Promise<ITokenDocument | null>, options?.signal);
    }

    async revokeToken(
        userId: string,
        type: TokenType,
        tokenHash: string,
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        const operation = this.model.updateOne(
            { userId, type, tokenHash },
            { $set: { blacklisted: true } },
        );
        await withAbort(operation, options?.signal);
    }

    async revokeAllByUser(
        userId: string,
        type: TokenType = TOKEN_TYPES.REFRESH,
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        const operation = this.model.updateMany(
            { userId, type, blacklisted: false },
            { $set: { blacklisted: true } },
        );
        await withAbort(operation, options?.signal);
    }

    async findActiveTokenByTokenHash(
        tokenHash: string,
        type: TokenType,
        options?: RepositoryQueryOptions,
    ): Promise<ITokenDocument | null> {
        const now = new Date();
        const operation = this.model
            .findOne({
                type,
                tokenHash,
                blacklisted: false,
                expiresAt: { $gt: now },
            })
            .lean<ITokenDocument>();

        return withAbort(operation as Promise<ITokenDocument | null>, options?.signal);
    }
}

export const tokenRepository = new TokenRepository();
