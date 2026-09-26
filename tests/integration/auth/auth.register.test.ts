import request from 'supertest';

import { connectTestDatabase, describeWithDatabase } from '../../helpers/db.helper';

import { app } from '../../../src/app';
import { UserModel } from '../../../src/modules/user/user.model';
import { MESSAGES } from '../../../src/core/constants/messages';
import { USER_STATUS } from '../../../src/modules/user/user.constants';

describeWithDatabase('Auth Register Flow', () => {
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

    it('POST /api/v1/auth/register creates a new user', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('john.doe@example.com');
        expect(response.body.data.userId).toBeDefined();
    });

    it('POST /api/v1/auth/register rejects invalid email', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'invalid-email',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/auth/register rejects weak password', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'weak',
            agreeTermsAndConditions: true,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('POST /api/v1/auth/register rejects without agreeing to terms', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: false,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('POST /api/v1/auth/register restores deleted user silently', async () => {
        // First, create and delete a user
        const registerResponse = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        const userId = registerResponse.body.data.userId;

        // Delete the user
        const user = await UserModel.findById(userId);
        if (user) {
            user.isDeleted = true;
            user.deletedAt = new Date();
            await user.save();
        }

        // Now register again with same email - should restore silently
        const restoreResponse = await request(app).post('/api/v1/auth/register').send({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'NewPassword@456',
            agreeTermsAndConditions: true,
        });

        expect(restoreResponse.status).toBe(201);
        expect(restoreResponse.body.success).toBe(true);
        expect(restoreResponse.body.data.userId).toBeDefined();

        // Verify the user was restored (not duplicated)
        const userCount = await UserModel.countDocuments({ email: 'john.doe@example.com' });
        expect(userCount).toBe(1);

        // Verify old data was cleared
        const restoredUser = await UserModel.findOne({ email: 'john.doe@example.com' });
        expect(restoredUser?.isDeleted).toBe(false);
        expect(restoredUser?.deletedAt).toBeNull();
        expect(restoredUser?.address).toBeUndefined();
    });

    it('POST /api/v1/auth/register validates required fields', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({
            email: 'john.doe@example.com',
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });
});
