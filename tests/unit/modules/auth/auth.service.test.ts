import jwt from 'jsonwebtoken';

import { config } from '../../../../src/config';
import { UnauthorizedError } from '../../../../src/core/errors';
import { ROLES } from '../../../../src/core/constants/roles';
import type { TokenService } from '../../../../src/modules/token/token.service';
import { TOKEN_TYPES } from '../../../../src/modules/token/token.constants';
import type { UserRepository } from '../../../../src/modules/user/user.repository';
import type { UserService } from '../../../../src/modules/user/user.service';
import { AUTH_STRATEGIES, USER_STATUS } from '../../../../src/modules/user/user.constants';
import { AuthService } from '../../../../src/modules/auth/auth.service';
import { notificationPreferenceService } from '../../../../src/modules/notification/preference/notification-preference.service';
import { storeService } from '../../../../src/modules/stores/store.service';
import * as hashUtils from '../../../../src/shared/utils/hash';
import { buildUser } from '../../../factories/user.factory';

const createUserRepositoryMock = (): jest.Mocked<Partial<UserRepository>> => {
    return {
        findByEmail: jest.fn(),
        findByEmailIncludingDeleted: jest.fn(),
        findById: jest.fn(),
        updateById: jest.fn(),
    };
};

const createTokenServiceMock = (): jest.Mocked<Partial<TokenService>> => {
    return {
        createToken: jest.fn(),
        validateToken: jest.fn(),
        revokeToken: jest.fn(),
    };
};

const createUserDomainServiceMock = (): jest.Mocked<Partial<UserService>> => {
    return {
        createUser: jest.fn(),
    };
};

describe('AuthService', () => {
    it('registers a user and sends verification OTP', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();

        const testUser = buildUser({ email: 'alice@example.com', role: ROLES.USER });
        (userRepository.findByEmailIncludingDeleted as jest.Mock).mockResolvedValue(null);
        (userDomainService.createUser as jest.Mock).mockResolvedValue(testUser);
        (tokenService.createToken as jest.Mock).mockResolvedValue({} as never);
        // Writes default notification rows through Mongoose, which is not connected under jest.
        jest.spyOn(notificationPreferenceService, 'createDefaultPreferences').mockResolvedValue(
            undefined as never,
        );

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        const result = await service.register({
            firstName: 'Alice',
            lastName: 'Example',
            email: 'alice@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        expect(result.email).toBe('alice@example.com');
        expect(tokenService.createToken).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: testUser.id,
                type: TOKEN_TYPES.VERIFY_EMAIL,
            }),
            undefined,
        );
    });

    it('throws UnauthorizedError for invalid credentials', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();

        (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        await expect(
            service.login({
                email: 'alice@example.com',
                password: 'Password@123',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError when account is blocked', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();

        (userRepository.findByEmail as jest.Mock).mockResolvedValue(
            buildUser({
                status: USER_STATUS.BLOCKED,
                password: 'hashed',
            }),
        );
        jest.spyOn(hashUtils, 'compareHash').mockResolvedValue(true);

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        await expect(
            service.login({
                email: 'alice@example.com',
                password: 'Password@123',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('refreshes tokens when refresh token is valid and persisted', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();
        const user = buildUser();

        (tokenService.validateToken as jest.Mock).mockResolvedValue(true);
        (tokenService.revokeToken as jest.Mock).mockResolvedValue(undefined);
        (tokenService.createToken as jest.Mock).mockResolvedValue({} as never);
        (userRepository.findById as jest.Mock).mockResolvedValue(user);
        // `buildAuthResponse` loads the user's store. Without this the query buffers against a
        // Mongoose connection that never opens, the test times out, and the unhandled ioredis
        // error that follows takes the whole jest process down with it.
        jest.spyOn(storeService, 'getUserStore').mockResolvedValue(null as never);

        const refreshToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: user.registrationStrategy,
                type: 'refresh',
                jti: 'test-jti',
            },
            config.jwt.refreshSecret,
            { expiresIn: '7d' },
        );

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        const result = await service.refreshTokens({ refreshToken });

        expect(result.tokens.accessToken).toBeTruthy();
        expect(result.tokens.refreshToken).toBeTruthy();
        expect(tokenService.revokeToken).toHaveBeenCalled();
    });

    it('throws UnauthorizedError when account is deleted', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();

        (userRepository.findByEmail as jest.Mock).mockResolvedValue(
            buildUser({
                password: 'hashed',
                isDeleted: true,
            }),
        );
        jest.spyOn(hashUtils, 'compareHash').mockResolvedValue(true);

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        await expect(
            service.login({
                email: 'alice@example.com',
                password: 'Password@123',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws UnauthorizedError when local login is used for social account', async () => {
        const userRepository = createUserRepositoryMock();
        const tokenService = createTokenServiceMock();
        const userDomainService = createUserDomainServiceMock();

        (userRepository.findByEmail as jest.Mock).mockResolvedValue(
            buildUser({
                password: 'hashed',
                registrationStrategy: AUTH_STRATEGIES.GOOGLE,
            }),
        );
        jest.spyOn(hashUtils, 'compareHash').mockResolvedValue(true);

        const service = new AuthService(
            userRepository as UserRepository,
            tokenService as TokenService,
            userDomainService as UserService,
        );

        await expect(
            service.login({
                email: 'alice@example.com',
                password: 'Password@123',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedError);
    });
});
