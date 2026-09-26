import request from 'supertest';

import { connectTestDatabase, describeWithDatabase } from '../../helpers/db.helper';
import path from 'path';

import { app } from '../../../src/app';
import { UserModel } from '../../../src/modules/user/user.model';
import { userRepository } from '../../../src/modules/user/user.repository';
import { buildAccessToken } from '../../helpers/auth.helper';
import { ROLES } from '../../../src/core/constants/roles';

describeWithDatabase('User Profile Routes', () => {
    // Needs a live MongoDB: these suites read and write real documents, and clear the collections
    // between tests. See `tests/helpers/db.helper.ts` — run them with `RUN_DB_TESTS=1`.
    beforeAll(async () => {
        await connectTestDatabase();
    });

    let userToken: string;
    let userId: string;
    let adminToken: string;

    beforeEach(async () => {
        await UserModel.deleteMany({});

        const user = await userRepository.create({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            password: 'hashed',
            role: ROLES.USER,
            isDeleted: false,
        });

        userId = user._id.toString();

        userToken = buildAccessToken({
            sub: userId,
            email: user.email,
            role: ROLES.USER,
        });

        const admin = await userRepository.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            password: 'hashed',
            role: ROLES.SUPER_ADMIN,
            isDeleted: false,
        });

        adminToken = buildAccessToken({
            sub: admin._id.toString(),
            email: admin.email,
            role: ROLES.SUPER_ADMIN,
        });
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
    });

    describe('GET /api/v1/users/me', () => {
        it('returns current user profile', async () => {
            const response = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe('john.doe@example.com');
            expect(response.body.data.firstName).toBe('John');
        });

        it('rejects unauthenticated request', async () => {
            const response = await request(app).get('/api/v1/users/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/v1/users/me (JSON)', () => {
        it('updates user profile with JSON', async () => {
            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    firstName: 'John Updated',
                    lastName: 'Doe Updated',
                    bio: 'My updated bio',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.firstName).toBe('John Updated');
            expect(response.body.data.bio).toBe('My updated bio');
        });

        it('updates email with validation', async () => {
            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    email: 'new.email@example.com',
                });

            expect(response.status).toBe(200);
            expect(response.body.data.email).toBe('new.email@example.com');
        });

        it('rejects duplicate email', async () => {
            // Create another user
            await userRepository.create({
                firstName: 'Another',
                lastName: 'User',
                email: 'existing@example.com',
                password: 'hashed',
                role: ROLES.USER,
                isDeleted: false,
            });

            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    email: 'existing@example.com',
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });

        it('rejects invalid email format', async () => {
            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    email: 'invalid-email',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/v1/users/me (Form-Data)', () => {
        it('updates profile with form-data', async () => {
            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .field(
                    'data',
                    JSON.stringify({
                        firstName: 'John Form',
                        lastName: 'Doe Form',
                        bio: 'Bio from form-data',
                    }),
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.firstName).toBe('John Form');
        });

        it('handles avatar file upload', async () => {
            const response = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .field(
                    'data',
                    JSON.stringify({
                        firstName: 'With Avatar',
                    }),
                )
                .attach('avatarURL', path.join(__dirname, '../../fixtures/test-image.jpg'));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('DELETE /api/v1/users/me', () => {
        it('soft-deletes own account', async () => {
            const response = await request(app)
                .delete('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify user is marked as deleted
            const user = await UserModel.findById(userId);
            expect(user?.isDeleted).toBe(true);
            expect(user?.deletedAt).toBeDefined();
        });

        it('rejects unauthenticated delete', async () => {
            const response = await request(app).delete('/api/v1/users/me');

            expect(response.status).toBe(401);
        });
    });

    describe('Admin User Routes', () => {
        it('GET /api/v1/users lists all users for admin', async () => {
            const response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
        });

        it('GET /api/v1/users denies regular user', async () => {
            const response = await request(app)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
        });

        it('GET /api/v1/users/:id gets user by id for admin', async () => {
            const response = await request(app)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(userId);
        });

        it('DELETE /api/v1/users/:id deletes user for admin', async () => {
            const response = await request(app)
                .delete(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
