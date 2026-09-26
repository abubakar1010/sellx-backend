import { TOKEN_TYPES } from '../../src/modules/token/token.constants';
import type { ITokenDocument } from '../../src/modules/token/token.interface';

type TokenOverrides = Partial<ITokenDocument> & { id?: string };

export const buildToken = (overrides: TokenOverrides = {}): ITokenDocument => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    return {
        id: overrides.id ?? '507f191e810c19729de860ea',
        userId: overrides.userId ?? '507f1f77bcf86cd799439011',
        tokenHash: overrides.tokenHash ?? 'token-hash',
        type: overrides.type ?? TOKEN_TYPES.REFRESH,
        expiresAt: overrides.expiresAt ?? expiresAt,
        blacklisted: overrides.blacklisted ?? false,
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    } as ITokenDocument;
};
