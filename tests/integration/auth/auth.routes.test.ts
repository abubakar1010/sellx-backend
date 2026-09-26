import request from 'supertest';

import { app } from '../../../src/app';
import { authService } from '../../../src/modules/auth/auth.service';
import { AUTH_STRATEGIES, ONBOARDING_STEPS } from '../../../src/modules/user/user.constants';

describe('Auth routes', () => {
    it('POST /api/v1/auth/login returns login payload', async () => {
        jest.spyOn(authService, 'login').mockResolvedValue({
            user: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'Alice',
                lastName: 'Example',
                phone: '+1231231234',
                email: 'alice@example.com',
                role: 'user',
                status: 'active',
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginStrategy: AUTH_STRATEGIES.LOCAL,
                fullName: 'Alice Example',
                isEmailVerified: false,
                onboardingStep: 'REGISTERED' as any,
                isOnboardingCompleted: false,
                activeProfileType: 'user' as const,
                storeId: null,
                stores: [] as any[],
                address: null,
                totalProducts: 0,
                soldItemsCount: 0,
                avgRating: 0,
                totalReviewCount: 0,
            },
            tokens: {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            },
            onboarding: {
                step: ONBOARDING_STEPS.REGISTERED,
                isCompleted: false,
                nextRoute: '/onboarding/verify-email',
            },
        });

        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'alice@example.com',
            password: 'Password@123',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toBe('access-token');
    });

    it('POST /api/v1/auth/login validates payload', async () => {
        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'alice@example.com',
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/auth/me rejects unauthenticated request', async () => {
        const response = await request(app).get('/api/v1/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('GET /api/v1/auth/google/callback returns social login payload', async () => {
        jest.spyOn(authService, 'loginWithGoogle').mockResolvedValue({
            user: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'Social',
                lastName: 'User',
                phone: '+1231231234',
                email: 'social@example.com',
                role: 'user',
                status: 'active',
                registrationStrategy: AUTH_STRATEGIES.GOOGLE,
                lastLoginStrategy: AUTH_STRATEGIES.GOOGLE,
                fullName: 'Social User',
                isEmailVerified: true,
                onboardingStep: 'REGISTERED' as any,
                isOnboardingCompleted: false,
                activeProfileType: 'user' as const,
                storeId: null,
                stores: [] as any[],
                address: null,
                totalProducts: 0,
                soldItemsCount: 0,
                avgRating: 0,
                totalReviewCount: 0,
            },
            tokens: {
                accessToken: 'social-access-token',
                refreshToken: 'social-refresh-token',
            },
            onboarding: {
                step: ONBOARDING_STEPS.REGISTERED,
                isCompleted: false,
                nextRoute: '/onboarding/verify-email',
            },
        });

        const response = await request(app).get('/api/v1/auth/google/callback?code=abc123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toBe('social-access-token');
    });

    it('GET /api/v1/auth/facebook/callback validates callback query', async () => {
        const response = await request(app).get('/api/v1/auth/facebook/callback');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
});
