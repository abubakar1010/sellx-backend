import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { config } from '@/config';
import { MESSAGES } from '@/core/constants/messages';
import {
    BadRequestError,
    UnauthorizedError,
    TooManyRequestsError,
    NotFoundError,
    ForbiddenError,
} from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { compareHash, hashValue } from '@/shared/utils/hash';
import { ROLES } from '@/core/constants/roles';
import { userRepository, type UserRepository } from '../user/user.repository';
import {
    AUTH_STRATEGIES,
    USER_STATUS,
    type AuthStrategy,
    ONBOARDING_REDIRECTS,
    ONBOARDING_STEPS as OnboardingStepsEnum,
} from '../user/user.constants';
import type { IUserDocument } from '../user/user.interface';
import { userService, type UserService } from '../user/user.service';
import { tokenService, type TokenService } from '../token/token.service';
import { TOKEN_TYPES } from '../token/token.constants';
import { eventBus } from '@/infrastructure/events/event-bus';
import { storeService } from '../stores/store.service';
import { notificationPreferenceService } from '../notification/preference/notification-preference.service';
import {
    serializeStoresBasic,
} from '../stores/store.serializer';
import type {
    AuthResponse,
    VerifyResetCodeResponse,
    LoginInput,
    OAuthCallbackInput,
    RefreshInput,
    RegisterInput,
    TokenPair,
    ForgotPasswordInput,
    VerifyResetCodeInput,
    ResendOtpInput,
    VerifyEmailInput,
    ChangePasswordInput,
} from './auth.interface';
import { AUTH_JWT_TYPES } from './auth.constants';
import {
    exchangeFacebookCodeForProfile,
    exchangeGoogleCodeForProfile,
    verifyGoogleIdToken,
    verifyAppleIdentityToken,
    type FacebookProfile,
    type GoogleProfile,
    type AppleProfile,
} from './strategies';

const MAX_FAILED_ATTEMPTS = config.auth.maxFailedAttempts;
const LOCK_DURATION = config.auth.lockDurationMinutes * 60 * 1000;

const isUserLocked = (user: IUserDocument): boolean =>
    !!(user.lockUntil && new Date(user.lockUntil) > new Date());

const incrementFailedAttempts = async (user: IUserDocument, options?: RepositoryWriteOptions) => {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    let lockUntil = user.lockUntil;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS && !isUserLocked(user)) {
        lockUntil = new Date(Date.now() + LOCK_DURATION);
    }
    await userRepository.updateById(
        user.id,
        { failedLoginAttempts: failedAttempts, lockUntil },
        options,
    );
};

const resetFailedAttempts = async (user: IUserDocument, options?: RepositoryWriteOptions) => {
    await userRepository.updateById(user.id, { failedLoginAttempts: 0, lockUntil: null }, options);
};

const toUserId = (user: IUserDocument): string => user.id ?? String((user as any)._id ?? '');

const buildUserStats = (user: IUserDocument) => ({
    totalProducts: user.totalProducts ?? 0,
    soldItemsCount: user.soldItemsCount ?? 0,
    avgRating: user.avgRating ?? 0,
    totalReviewCount: user.totalReviewCount ?? 0,
    ratingDistribution: user.ratingDistribution,
});

export class AuthService {
    constructor(
        private readonly users: UserRepository = userRepository,
        private readonly tokens: TokenService = tokenService,
        private readonly userDomainService: UserService = userService,
    ) {}

    private getRegistrationStrategy(user: IUserDocument): AuthStrategy {
        return user.registrationStrategy ?? AUTH_STRATEGIES.LOCAL;
    }

    private createAccessToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: this.getRegistrationStrategy(user),
                isEmailVerified: user.isEmailVerified,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                type: AUTH_JWT_TYPES.ACCESS,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: `${config.jwt.accessExpirationMinutes}m` },
        );
    }

    private createRefreshToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: this.getRegistrationStrategy(user),
                isEmailVerified: user.isEmailVerified,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                type: AUTH_JWT_TYPES.REFRESH,
                jti: crypto.randomUUID(),
            },
            config.jwt.refreshSecret,
            { expiresIn: `${config.jwt.refreshExpirationDays}d` },
        );
    }

    private async issueTokenPair(
        user: IUserDocument,
        options?: RepositoryWriteOptions,
    ): Promise<TokenPair> {
        const accessToken = this.createAccessToken(user);
        const refreshToken = this.createRefreshToken(user);
        const refreshExpiresAt = new Date(
            Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
        );
        await this.tokens.createToken(
            {
                userId: toUserId(user),
                token: refreshToken,
                type: TOKEN_TYPES.REFRESH,
                expiresAt: refreshExpiresAt,
            },
            options,
        );
        return { accessToken, refreshToken };
    }

    private async buildAuthResponse(user: IUserDocument, tokens: TokenPair): Promise<AuthResponse> {
        const store = await storeService.getUserStore(toUserId(user));
        const serializedStores = store ? serializeStoresBasic([store] as any) : [];

        return {
            user: {
                id: toUserId(user),
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`,
                role: user.role,
                status: user.status,
                registrationStrategy: this.getRegistrationStrategy(user),
                lastLoginStrategy: user.lastLoginStrategy,
                isEmailVerified: user.isEmailVerified,
                avatarUrl: user.avatarUrl,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                notificationToken: user.notificationToken,
                deviceType: user.deviceType,
                activeProfileType: (user.activeProfileType as any) ?? 'user',
                activeStoreId: user.activeStoreId?.toString(),
                storeId: store ? (store as any)._id?.toString() ?? (store as any).id : null,
                stores: serializedStores,
                address: user.address ?? null,
                ...buildUserStats(user),
            },
            tokens,
            onboarding: {
                step: user.onboardingStep,
                isCompleted: user.isOnboardingCompleted,
                nextRoute: ONBOARDING_REDIRECTS[user.onboardingStep],
            },
        };
    }

    private async buildVerifyResetResponse(
        user: IUserDocument,
        tokens: TokenPair,
    ): Promise<VerifyResetCodeResponse> {
        const store = await storeService.getUserStore(toUserId(user));
        const serializedStores = store ? serializeStoresBasic([store] as any) : [];

        return {
            user: {
                id: toUserId(user),
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`,
                role: user.role,
                status: user.status,
                registrationStrategy: this.getRegistrationStrategy(user),
                lastLoginStrategy: user.lastLoginStrategy,
                isEmailVerified: user.isEmailVerified,
                avatarUrl: user.avatarUrl,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                notificationToken: user.notificationToken,
                deviceType: user.deviceType,
                activeProfileType: (user.activeProfileType as any) ?? 'user',
                activeStoreId: user.activeStoreId?.toString(),
                storeId: store ? (store as any)._id?.toString() ?? (store as any).id : null,
                stores: serializedStores,
                address: user.address ?? null,
                ...buildUserStats(user),
            },
            tokens,
        };
    }

    private assertUserCanAuthenticate(user: IUserDocument, expectedStrategy?: AuthStrategy) {
        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);
        if (user.status === USER_STATUS.BLOCKED)
            throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_BLOCKED);
        if (user.status === USER_STATUS.INACTIVE && user.isOnboardingCompleted)
            throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_INACTIVE);
        if (expectedStrategy && this.getRegistrationStrategy(user) !== expectedStrategy)
            throw new UnauthorizedError(MESSAGES.AUTH.PROVIDER_MISMATCH);
    }

    private async touchLastLogin(
        user: IUserDocument,
        strategy: AuthStrategy,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const now = new Date();
        const updated = await this.users.updateById(
            toUserId(user),
            { lastLoginAt: now, lastLoginStrategy: strategy } as Partial<IUserDocument>,
            options,
        );
        return (
            updated ?? ({ ...user, lastLoginAt: now, lastLoginStrategy: strategy } as IUserDocument)
        );
    }

    private splitName(fullName: string): { firstName: string; lastName: string } {
        const parts = fullName.trim().split(' ');
        const firstName = parts.shift() || '';
        const lastName = parts.join(' ') || '';
        return { firstName, lastName: lastName || firstName };
    }

    private async upsertSocialUser(
        profile: GoogleProfile | FacebookProfile | AppleProfile,
        strategy: AuthStrategy,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const existing = await this.users.findByEmail(profile.email, options);
        const now = new Date();

        if (!existing) {
            const { firstName, lastName } = this.splitName(profile.name || '');
            const generatedPassword = crypto.randomBytes(32).toString('base64url');
            const hashedPassword = await hashValue(generatedPassword);

            const user = await this.users.create(
                {
                    firstName,
                    lastName,
                    email: profile.email.toLowerCase(),
                    phone: '',
                    password: hashedPassword,
                    role: ROLES.USER,
                    status: USER_STATUS.ACTIVE,
                    registrationStrategy: strategy,
                    lastLoginStrategy: strategy,
                    isEmailVerified: 'emailVerified' in profile ? profile.emailVerified : true,
                    isDeleted: false,
                    deletedAt: null,
                    avatarUrl: profile.avatarUrl,
                    lastLoginAt: now,
                    isOnboardingCompleted: false,
                    onboardingStep: 'EMAIL_VERIFIED',
                    agreeTermsAndConditions: true,
                    termsAcceptedAt: now,
                } as any,
                options,
            );

            await notificationPreferenceService.createDefaultPreferences(toUserId(user), options);

            eventBus.emit('auth:email-verified', {
                userId: toUserId(user),
                email: user.email,
                fullName: `${user.firstName} ${user.lastName}`,
            });
            return user;
        }

        this.assertUserCanAuthenticate(existing, strategy);

        const updates: Partial<IUserDocument> = {
            lastLoginAt: now,
            lastLoginStrategy: strategy,
        };
        if (profile.avatarUrl && !existing.avatarUrl) updates.avatarUrl = profile.avatarUrl;
        if ('emailVerified' in profile && profile.emailVerified && !existing.isEmailVerified)
            updates.isEmailVerified = true;

        const updated = await this.users.updateById(toUserId(existing), updates, options);
        return updated ?? existing;
    }

    async register(payload: RegisterInput, options?: RepositoryWriteOptions) {
        const existingUser = await this.users.findByEmailIncludingDeleted(payload.email, options);

        if (existingUser && existingUser.isDeleted) {
            const hashedPassword = await hashValue(payload.password);
            const now = new Date();

            const updatedUser = await this.users.updateAnyUser(toUserId(existingUser), {
                firstName: payload.firstName,
                lastName: payload.lastName,
                email: payload.email.toLowerCase(),
                password: hashedPassword,
                phone: payload.phone || '',
                isDeleted: false,
                deletedAt: null,
                status: USER_STATUS.ACTIVE,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginAt: now,
                isEmailVerified: false,
                onboardingStep: 'REGISTERED' as any,
                isOnboardingCompleted: false,
                agreeTermsAndConditions: payload.agreeTermsAndConditions,
                termsAcceptedAt: now,
                failedLoginAttempts: 0,
                lockUntil: null,
                interestedCategories: [],
                avatarUrl: '',
                bio: '',
            } as any);

            await this.tokens.revokeAllByUser(toUserId(existingUser), TOKEN_TYPES.REFRESH, options);
            await this.tokens.revokeAllByUser(
                toUserId(existingUser),
                TOKEN_TYPES.VERIFY_EMAIL,
                options,
            );

            const userId = toUserId(updatedUser || existingUser);

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 600_000);

            await this.tokens.createToken(
                { userId, token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
                options,
            );
            eventBus.emit('auth:otp-resend', {
                userId,
                email: payload.email.toLowerCase(),
                fullName: `${payload.firstName} ${payload.lastName}`,
                otp,
                expiresAt,
            });

            return {
                userId,
                email: payload.email.toLowerCase(),
                name: `${payload.firstName} ${payload.lastName}`,
                onboarding: {
                    step: 'REGISTERED',
                    isCompleted: false,
                    nextRoute: '/onboarding/verify-email',
                },
            };
        }

        const user = await this.userDomainService.createUser(
            {
                ...payload,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginAt: new Date(),
            },
            options,
        );

        await notificationPreferenceService.createDefaultPreferences(toUserId(user), options);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 600_000);

        await this.tokens.createToken(
            { userId: toUserId(user), token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
            options,
        );
        eventBus.emit('auth:otp-resend', {
            userId: toUserId(user),
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            otp,
            expiresAt,
        });

        return {
            userId: toUserId(user),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            onboarding: {
                step: 'REGISTERED',
                isCompleted: false,
                nextRoute: '/onboarding/verify-email',
            },
        };
    }

    async login(payload: LoginInput, options?: RepositoryWriteOptions): Promise<AuthResponse> {
        if (payload.provider && payload.token) {
            return this.loginWithMobileSocial(payload, options);
        }

        if (!payload.email || !payload.password) {
            throw new BadRequestError('Email and password are required', 'INVALID_LOGIN');
        }

        const user = await this.users.findByEmail(payload.email, options);
        if (!user || !user.password || user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.INVALID_CREDENTIALS);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        const matched = await compareHash(payload.password, user.password);
        if (!matched) {
            await incrementFailedAttempts(user, options);
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_CREDENTIALS);
        }

        this.assertUserCanAuthenticate(user, AUTH_STRATEGIES.LOCAL);
        await resetFailedAttempts(user, options);

        if (payload.notificationToken || payload.deviceType) {
            const updateData: Partial<IUserDocument> = {};
            if (payload.notificationToken) updateData.notificationToken = payload.notificationToken;
            if (payload.deviceType) updateData.deviceType = payload.deviceType;
            await this.users.updateById(toUserId(user), updateData, options);
        }

        const authedUser = await this.touchLastLogin(user, AUTH_STRATEGIES.LOCAL, options);
        const tokens = await this.issueTokenPair(authedUser, options);
        return await this.buildAuthResponse(authedUser, tokens);
    }

    private async loginWithMobileSocial(
        payload: LoginInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        const { provider, token } = payload;
        if (!provider || !token) {
            throw new BadRequestError('Provider and token are required', 'INVALID_LOGIN');
        }

        let profile: GoogleProfile | AppleProfile;
        let strategy: AuthStrategy;

        if (provider === 'google') {
            profile = await verifyGoogleIdToken(token, options?.signal);
            strategy = AUTH_STRATEGIES.GOOGLE;
        } else if (provider === 'apple') {
            profile = await verifyAppleIdentityToken(token, options?.signal);
            strategy = AUTH_STRATEGIES.APPLE;
        } else {
            throw new BadRequestError('Unsupported provider', 'UNSUPPORTED_PROVIDER');
        }

        const user = await this.upsertSocialUser(profile, strategy, options);

        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);

        if (payload.notificationToken || payload.deviceType) {
            const updateData: Partial<IUserDocument> = {};
            if (payload.notificationToken) updateData.notificationToken = payload.notificationToken;
            if (payload.deviceType) updateData.deviceType = payload.deviceType;
            await this.users.updateById(toUserId(user), updateData, options);
        }

        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async refreshTokens(
        payload: RefreshInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        let decoded: any;
        try {
            decoded = jwt.verify(payload.refreshToken, config.jwt.refreshSecret) as any;
        } catch {
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);
        }
        if (decoded.type !== AUTH_JWT_TYPES.REFRESH)
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);

        const userId = decoded.sub;
        const stored = await this.tokens.validateToken(
            userId,
            payload.refreshToken,
            TOKEN_TYPES.REFRESH,
            options,
        );
        if (!stored) throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);

        const user = await this.users.findById(userId, options as RepositoryQueryOptions);
        if (!user || user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);
        this.assertUserCanAuthenticate(user);

        await this.tokens.revokeToken(userId, payload.refreshToken, TOKEN_TYPES.REFRESH, options);
        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async logout(refreshToken: string, options?: RepositoryWriteOptions) {
        try {
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
            await this.tokens.revokeToken(decoded.sub, refreshToken, TOKEN_TYPES.REFRESH, options);
        } catch {
            /* idempotent */
        }
    }

    async deleteAccount(userId: string, password: string, options?: RepositoryWriteOptions) {
        const user = await this.users.findById(userId, { ...options } as any);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND);

        if (user.password) {
            const matched = await compareHash(password, user.password);
            if (!matched) throw new UnauthorizedError('Invalid password', 'INVALID_PASSWORD');
        }

        await this.users.updateById(
            userId,
            {
                isDeleted: true,
                deletedAt: new Date(),
                status: USER_STATUS.DELETED,
            } as any,
            options,
        );

        await this.tokens.revokeAllByUser(userId, AUTH_JWT_TYPES.REFRESH as any, options);
        await this.tokens.revokeAllByUser(userId, AUTH_JWT_TYPES.ACCESS as any, options);

        return { message: 'Account deleted successfully' };
    }

    async loginWithGoogle(
        payload: OAuthCallbackInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        const profile = await exchangeGoogleCodeForProfile(payload.code, options?.signal);
        const user = await this.upsertSocialUser(profile, AUTH_STRATEGIES.GOOGLE, options);
        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);
        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async loginWithFacebook(
        payload: OAuthCallbackInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        const profile = await exchangeFacebookCodeForProfile(payload.code, options?.signal);
        const user = await this.upsertSocialUser(profile, AUTH_STRATEGIES.FACEBOOK, options);
        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);
        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async forgotPassword(payload: ForgotPasswordInput, options?: RepositoryWriteOptions) {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);
        await resetFailedAttempts(user, options);

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 600_000);

        await this.tokens.revokeAllByUser(toUserId(user), TOKEN_TYPES.RESET_PASSWORD, options);
        await this.tokens.createToken(
            {
                userId: toUserId(user),
                token: resetCode,
                type: TOKEN_TYPES.RESET_PASSWORD,
                expiresAt,
            },
            options,
        );

        eventBus.emit('auth:password-reset-requested', {
            userId: toUserId(user),
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            code: resetCode,
            expiresAt,
        });
    }

    async verifyResetCode(
        payload: VerifyResetCodeInput,
        options?: RepositoryWriteOptions,
    ): Promise<VerifyResetCodeResponse> {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user) throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        const valid = await this.tokens.validateToken(
            toUserId(user),
            payload.otp,
            TOKEN_TYPES.RESET_PASSWORD,
            options,
        );
        if (!valid) {
            await incrementFailedAttempts(user, options);
            throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        }

        // Revoke the reset code and issue tokens
        await this.tokens.revokeAllByUser(toUserId(user), TOKEN_TYPES.RESET_PASSWORD, options);
        const tokens = await this.issueTokenPair(user, options);

        return await this.buildVerifyResetResponse(user, tokens);
    }

    async changePassword(
        userId: string,
        payload: ChangePasswordInput,
        options?: RepositoryWriteOptions,
    ) {
        const user = await this.users.findByIdWithPassword(userId, options);
        if (!user) throw new BadRequestError(MESSAGES.USER.NOT_FOUND);

        if (user.password && !payload.isReset) {
            if (!payload.currentPassword) {
                throw new BadRequestError('Current password is required');
            }
            const matched = await compareHash(payload.currentPassword, user.password);
            if (!matched) throw new BadRequestError(MESSAGES.AUTH.OLD_PASSWORD_WRONG);
        }

        const hashed = await hashValue(payload.newPassword);
        await this.users.updateById(userId, { password: hashed }, options);

        eventBus.emit('auth:password-reset', {
            userId: toUserId(user),
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
        });
    }

    async resendOtp(payload: ResendOtpInput, options?: RepositoryWriteOptions) {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user || user.isEmailVerified) return;
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);
        await incrementFailedAttempts(user, options);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 600_000);
        await this.tokens.createToken(
            { userId: toUserId(user), token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
            options,
        );

        eventBus.emit('auth:otp-resend', {
            userId: toUserId(user),
            email: user.email,
            fullName: `${user.firstName} ${user.lastName}`,
            otp,
            expiresAt,
        });
    }

    async verifyEmail(payload: VerifyEmailInput, options?: RepositoryWriteOptions) {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user || user.isEmailVerified) throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        const valid = await this.tokens.validateToken(
            toUserId(user),
            payload.otp,
            TOKEN_TYPES.VERIFY_EMAIL,
            options,
        );
        if (!valid) {
            await incrementFailedAttempts(user, options);
            throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        }

        const updatedUser = await this.users.updateById(
            toUserId(user),
            {
                isEmailVerified: true,
                status: USER_STATUS.ACTIVE,
                onboardingStep: 'EMAIL_VERIFIED' as any,
            },
            options,
        );
        await this.tokens.revokeAllByUser(toUserId(user), TOKEN_TYPES.VERIFY_EMAIL, options);

        const tokens = await this.issueTokenPair(updatedUser || user, options);
        const verifiedUser = updatedUser || user;

        eventBus.emit('auth:email-verified', {
            userId: toUserId(verifiedUser),
            email: verifiedUser.email,
            fullName: `${verifiedUser.firstName} ${verifiedUser.lastName}`,
        });

        const store = await storeService.getUserStore(toUserId(verifiedUser));
        const serializedStores = store ? serializeStoresBasic([store] as any) : [];

        return {
            user: {
                id: toUserId(verifiedUser),
                email: verifiedUser.email,
                phone: verifiedUser.phone,
                firstName: verifiedUser.firstName,
                lastName: verifiedUser.lastName,
                fullName: `${verifiedUser.firstName} ${verifiedUser.lastName}`,
                role: verifiedUser.role,
                status: USER_STATUS.ACTIVE,
                registrationStrategy: this.getRegistrationStrategy(verifiedUser),
                lastLoginStrategy: verifiedUser.lastLoginStrategy,
                isEmailVerified: true,
                avatarUrl: verifiedUser.avatarUrl,
                onboardingStep: 'EMAIL_VERIFIED',
                isOnboardingCompleted: verifiedUser.isOnboardingCompleted,
                notificationToken: verifiedUser.notificationToken,
                deviceType: verifiedUser.deviceType,
                activeProfileType: (verifiedUser as any).activeProfileType ?? 'user',
                activeStoreId: verifiedUser.activeStoreId?.toString(),
                storeId: store ? (store as any)._id?.toString() ?? (store as any).id : null,
                stores: serializedStores,
                address: verifiedUser.address ?? null,
                ...buildUserStats(verifiedUser),
            },
            tokens,
            onboarding: {
                step: 'EMAIL_VERIFIED',
                isCompleted: verifiedUser.isOnboardingCompleted,
                nextRoute: '/onboarding/profile',
            },
        };
    }
    async switchContext(
        userId: string,
        activeProfileType: 'user' | 'store',
        storeId?: string,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        const user = await this.users.findById(userId, options);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND);

        if (activeProfileType === 'store') {
            if (!storeId) throw new BadRequestError('Store ID is required when switching to store');

            const store = await storeService.getStoreById(storeId);
            if (store.user.toString() !== userId) {
                throw new ForbiddenError('You do not own this store');
            }
        }

        const updatedUser = await this.users.updateById(
            userId,
            {
                activeProfileType,
                activeStoreId: activeProfileType === 'store' ? storeId : null,
            } as any,
            options,
        );

        const tokens = await this.issueTokenPair(updatedUser || user, options);
        const contextUser = updatedUser || user;

        return this.buildAuthResponse(contextUser, tokens);
    }
}

export const authService = new AuthService();