import crypto from 'node:crypto';

import { TOKEN_TYPES } from '../../../../src/modules/token/token.constants';
import type { TokenRepository } from '../../../../src/modules/token/token.repository';
import { TokenService } from '../../../../src/modules/token/token.service';

const hash = (value: string): string => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

const createRepositoryMock = (): jest.Mocked<Partial<TokenRepository>> => {
    return {
        create: jest.fn(),
        findActiveToken: jest.fn(),
        revokeToken: jest.fn(),
        revokeAllByUser: jest.fn(),
    };
};

describe('TokenService', () => {
    it('stores hashed token on create', async () => {
        const repository = createRepositoryMock();
        (repository.create as jest.Mock).mockResolvedValue({ id: 'token-id' });
        const service = new TokenService(repository as TokenRepository);

        await service.createToken({
            userId: '507f1f77bcf86cd799439011',
            token: 'raw-token',
            type: TOKEN_TYPES.REFRESH,
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: '507f1f77bcf86cd799439011',
                tokenHash: hash('raw-token'),
                type: TOKEN_TYPES.REFRESH,
            }),
            undefined,
        );
    });

    it('returns true when token exists and is active', async () => {
        const repository = createRepositoryMock();
        (repository.findActiveToken as jest.Mock).mockResolvedValue({ id: 'token-id' });
        const service = new TokenService(repository as TokenRepository);

        const valid = await service.validateToken(
            '507f1f77bcf86cd799439011',
            'raw-token',
            TOKEN_TYPES.REFRESH,
        );

        expect(valid).toBe(true);
        expect(repository.findActiveToken).toHaveBeenCalledWith(
            '507f1f77bcf86cd799439011',
            TOKEN_TYPES.REFRESH,
            hash('raw-token'),
            undefined,
        );
    });

    it('revokes hashed token', async () => {
        const repository = createRepositoryMock();
        (repository.revokeToken as jest.Mock).mockResolvedValue(undefined);
        const service = new TokenService(repository as TokenRepository);

        await service.revokeToken('507f1f77bcf86cd799439011', 'raw-token', TOKEN_TYPES.REFRESH);

        expect(repository.revokeToken).toHaveBeenCalledWith(
            '507f1f77bcf86cd799439011',
            TOKEN_TYPES.REFRESH,
            hash('raw-token'),
            undefined,
        );
    });
});
