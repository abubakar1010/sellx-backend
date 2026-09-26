import request from 'supertest';

import { connectTestDatabase, describeWithDatabase } from '../../helpers/db.helper';

import { app } from '../../../src/app';
import { UserModel } from '../../../src/modules/user/user.model';
import { MESSAGES } from '../../../src/core/constants/messages';

describeWithDatabase('Auth Login Flow', () => {
    // Needs a live MongoDB: these suites read and write real documents, and clear the collections
    // between tests. See `tests/helpers/db.helper.ts` — run them with `RUN_DB_TESTS=1`.
    beforeAll(async () => {
        await connectTestDatabase();
    });

    beforeEach(async () => {
        await UserModel.deleteMany({});
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
    });

    it('POST /api/v1/auth/login successfully with valid credentials', async () => {
        // First register a user
        await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        // Then login
        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'john.doe@example.com',
            password: 'Password@123',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toBeDefined();
        expect(response.body.data.tokens.refreshToken).toBeDefined();
        expect(response.body.data.user.email).toBe('john.doe@example.com');
    });

    it('POST /api/v1/auth/login fails with wrong password', async () => {
        // Register user
        await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'john.doe@example.com',
            password: 'WrongPassword@123',
        });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('POST /api/v1/auth/login fails with non-existent email', async () => {
        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'nonexistent@example.com',
            password: 'Password@123',
        });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login validates required fields', async () => {
        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'john.doe@example.com',
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/auth/refresh-token returns new tokens', async () => {
        // Register and login
        await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        const loginResponse = await request(app).post('/api/v1/auth/login').send({
            email: 'john.doe@example.com',
            password: 'Password@123',
        });

        const refreshToken = loginResponse.body.data.tokens.refreshToken;

        const response = await request(app).post('/api/v1/auth/refresh-token').send({
            refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
    });

    it('POST /api/v1/auth/logout revokes refresh token', async () => {
        // Register and login
        await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        const loginResponse = await request(app).post('/api/v1/auth/login').send({
            email: 'john.doe@example.com',
            password: 'Password@123',
        });

        const refreshToken = loginResponse.body.data.tokens.refreshToken;

        const response = await request(app).post('/api/v1/auth/logout').send({
            refreshToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Try to refresh with revoked token
        const refreshResponse = await request(app).post('/api/v1/auth/refresh-token').send({
            refreshToken,
        });

        expect(refreshResponse.status).toBe(401);
    });
});
