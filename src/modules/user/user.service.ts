import {
    CreateUserInput,
    IUserDocument,
    UpdateProfileInput,
    UpdateUserInput,
    ONBOARDING_STEPS,
} from './user.interface';

import { USER_DEFAULTS, USER_STATUS } from './user.constants';
import { ROLES } from '@/core/constants/roles';
import { hashValue } from '@/shared/utils/hash';

import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';

import { MESSAGES } from '@/core/constants/messages';
import { ConflictError, NotFoundError } from '@/core/errors';
import { userRepository, type UserRepository } from './user.repository';

import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';

import { eventBus } from '@/infrastructure/events/event-bus';
import { addActivityJob } from '@/jobs/producers/activity.producer';

interface UserListFilters {
    role?: string;
    status?: string;
    registrationStrategy?: string;
    search?: string;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class UserService {
    constructor(private readonly repository: UserRepository = userRepository) {}

    async createUser(
        payload: CreateUserInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const emailTaken = await this.repository.existsByEmail(payload.email, options);
        if (emailTaken) {
            throw new ConflictError(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS, 'USER_EMAIL_EXISTS');
        }

        const hashedPassword = await hashValue(payload.password);

        const user = await this.repository.create(
            {
                firstName: payload.firstName,
                lastName: payload.lastName,
                email: payload.email.toLowerCase(),
                phone: payload.phone,
                password: hashedPassword,
                role: ROLES.USER,
                status: USER_STATUS.ACTIVE,
                registrationStrategy:
                    payload.registrationStrategy ?? USER_DEFAULTS.REGISTRATION_STRATEGY,
                isEmailVerified: false,
                onboardingStep: ONBOARDING_STEPS.REGISTERED,
                isOnboardingCompleted: false,
                agreeTermsAndConditions: payload.agreeTermsAndConditions,
                termsAcceptedAt: payload.termsAcceptedAt ?? new Date(),
            } as Partial<IUserDocument>,
            options,
        );

        eventBus.emit('user:registered', {
            userId: user.id,
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
        });

        addActivityJob({
            activityType: 'user_registered',
            actorId: user.id,
            actorType: 'user',
            targetId: user.id,
            targetType: 'user',
            message: `${user.firstName} ${user.lastName} registered a new account.`,
            metadata: { email: user.email },
        });

        return user;
    }

    async getById(id: string, options?: RepositoryQueryOptions): Promise<IUserDocument> {
        const user = await this.repository.findById(id, options);
        if (!user) {
            throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
        }
        return user;
    }

    async listUsers(
        filters: UserListFilters,
        pagination: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IUserDocument>> {
        const query: Record<string, unknown> = {};

        if (filters.role) query.role = filters.role;
        if (filters.status) query.status = filters.status;
        if (filters.registrationStrategy) query.registrationStrategy = filters.registrationStrategy;

        if (filters.search) {
            const safe = escapeRegex(filters.search);
            query.$or = [
                { firstName: { $regex: safe, $options: 'i' } },
                { lastName: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } },
            ];
        }

        return this.repository.paginateOffset(query, pagination, options);
    }

    async updateById(
        id: string,
        payload: UpdateUserInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const updated = await this.repository.updateById(id, payload, options);

        if (!updated) {
            throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
        }

        return updated;
    }

    async updateProfile(
        userId: string,
        payload: UpdateProfileInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        // Check email uniqueness if email is being updated
        if (payload.email) {
            const existingUser = await this.repository.findOne(
                { email: payload.email.toLowerCase(), _id: { $ne: userId } },
                options,
            );
            if (existingUser) {
                throw new ConflictError(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS, 'USER_EMAIL_EXISTS');
            }
            payload.email = payload.email.toLowerCase();
        }

        return this.updateById(userId, payload, options);
    }

    async deleteById(id: string, options?: RepositoryWriteOptions): Promise<void> {
        const deleted = await this.repository.softDeleteById(id, options);

        if (!deleted) {
            throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
        }
    }

    async deleteMe(userId: string, options?: RepositoryWriteOptions): Promise<void> {
        await this.repository.softDeleteById(userId, options);
    }

    async getUserStats(userId: string): Promise<{
        totalProducts: number;
        soldItemsCount: number;
        avgRating: number;
        totalReviewCount: number;
        ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
    }> {
        const user = await this.repository.findById(userId);
        if (!user) {
            return {
                totalProducts: 0,
                soldItemsCount: 0,
                avgRating: 0,
                totalReviewCount: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            };
        }
        return {
            totalProducts: user.totalProducts ?? 0,
            soldItemsCount: user.soldItemsCount ?? 0,
            avgRating: user.avgRating ?? 0,
            totalReviewCount: user.totalReviewCount ?? 0,
            ratingDistribution: user.ratingDistribution ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
    }
}

export const userService = new UserService();
