import { ConflictError, NotFoundError } from '../../../../src/core/errors';
import { ROLES } from '../../../../src/core/constants/roles';
import * as hashUtils from '../../../../src/shared/utils/hash';
import {
    AUTH_STRATEGIES,
    ONBOARDING_STEPS,
    USER_DEFAULTS,
    USER_STATUS,
} from '../../../../src/modules/user/user.constants';
import type { UserRepository } from '../../../../src/modules/user/user.repository';
import { UserService } from '../../../../src/modules/user/user.service';
import { buildUser } from '../../../factories/user.factory';

const createRepositoryMock = (): jest.Mocked<Partial<UserRepository>> => {
    return {
        existsByEmail: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        updateById: jest.fn(),
        softDeleteById: jest.fn(),
        paginateOffset: jest.fn(),
    };
};

describe('UserService', () => {
    it('creates a user with hashed password and default role', async () => {
        const repository = createRepositoryMock();
        (repository.existsByEmail as jest.Mock).mockResolvedValue(false);
        (repository.create as jest.Mock).mockImplementation(
            async (payload: Parameters<UserRepository['create']>[0]) => buildUser(payload),
        );
        jest.spyOn(hashUtils, 'hashValue').mockResolvedValue('hashed-value');

        const service = new UserService(repository as UserRepository);
        const user = await service.createUser({
            firstName: 'Alice',
            lastName: 'Example',
            email: 'alice@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        // `USER_DEFAULTS.STATUS` is ACTIVE, and `isDeleted`/`deletedAt` are left to the model's
        // own defaults rather than written on create.
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'alice@example.com',
                password: 'hashed-value',
                role: ROLES.USER,
                status: USER_DEFAULTS.STATUS,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                isEmailVerified: false,
                onboardingStep: ONBOARDING_STEPS.REGISTERED,
                isOnboardingCompleted: false,
            }),
            undefined,
        );
        expect(user.email).toBe('alice@example.com');
    });

    it('throws ConflictError when email already exists', async () => {
        const repository = createRepositoryMock();
        (repository.existsByEmail as jest.Mock).mockResolvedValue(true);
        const service = new UserService(repository as UserRepository);

        await expect(
            service.createUser({
                firstName: 'Alice',
                lastName: 'Example',
                email: 'alice@example.com',
                phone: '+1234567890',
                password: 'Password@123',
                agreeTermsAndConditions: true,
            }),
        ).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when user is missing', async () => {
        const repository = createRepositoryMock();
        (repository.findById as jest.Mock).mockResolvedValue(null);
        const service = new UserService(repository as UserRepository);

        await expect(service.getById('507f1f77bcf86cd799439011')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
