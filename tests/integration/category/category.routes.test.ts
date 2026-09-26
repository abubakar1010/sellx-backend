import request from 'supertest';

import { connectTestDatabase, describeWithDatabase } from '../../helpers/db.helper';

import { app } from '../../../src/app';
import { CategoryModel } from '../../../src/modules/categories/category.model';
import { UserModel } from '../../../src/modules/user/user.model';
import { buildAccessToken } from '../../helpers/auth.helper';
import { ROLES } from '../../../src/core/constants/roles';

describeWithDatabase('Category Routes', () => {
    // Needs a live MongoDB: these suites read and write real documents, and clear the collections
    // between tests. See `tests/helpers/db.helper.ts` — run them with `RUN_DB_TESTS=1`.
    beforeAll(async () => {
        await connectTestDatabase();
    });

    let adminToken: string;
    let userToken: string;
    let adminUser: any;
    let regularUser: any;

    beforeEach(async () => {
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});

        // Create admin user
        adminUser = await UserModel.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
            password: 'hashed',
            role: ROLES.SUPER_ADMIN,
            isDeleted: false,
        });

        // Create regular user
        regularUser = await UserModel.create({
            firstName: 'Regular',
            lastName: 'User',
            email: 'user@example.com',
            password: 'hashed',
            role: ROLES.USER,
            isDeleted: false,
        });

        adminToken = buildAccessToken({
            sub: adminUser._id.toString(),
            email: adminUser.email,
            role: ROLES.SUPER_ADMIN,
        });

        userToken = buildAccessToken({
            sub: regularUser._id.toString(),
            email: regularUser.email,
            role: ROLES.USER,
        });
    });

    afterAll(async () => {
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
    });

    describe('Public Routes', () => {
        it('GET /api/v1/categories/public returns empty list initially', async () => {
            const response = await request(app).get('/api/v1/categories/public');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

        it('GET /api/v1/categories/public lists categories with pagination', async () => {
            // Create test categories
            await CategoryModel.create([
                { title: 'Electronics', slug: 'electronics', thumbnail: 'http://example.com/e.jpg', sortOrder: 1 },
                { title: 'Clothing', slug: 'clothing', thumbnail: 'http://example.com/c.jpg', sortOrder: 2 },
            ]);

            const response = await request(app)
                .get('/api/v1/categories/public')
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.meta).toBeDefined();
        });

        it('GET /api/v1/categories/public supports search', async () => {
            await CategoryModel.create([
                { title: 'Electronics', slug: 'electronics', thumbnail: 'http://example.com/e.jpg', sortOrder: 1 },
                { title: 'Clothing', slug: 'clothing', thumbnail: 'http://example.com/c.jpg', sortOrder: 2 },
                { title: 'Electronic Accessories', slug: 'electronic-accessories', thumbnail: 'http://example.com/ea.jpg', sortOrder: 3 },
            ]);

            const response = await request(app)
                .get('/api/v1/categories/public')
                .query({ search: 'electronic', page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0].title.toLowerCase()).toContain('electronic');
        });
    });

    describe('Admin Routes', () => {
        it('POST /api/v1/categories creates category with admin token', async () => {
            const response = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'New Category',
                    thumbnail: 'http://example.com/new.jpg',
                    sortOrder: 1,
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('New Category');
            expect(response.body.data.slug).toBeDefined();
        });

        it('POST /api/v1/categories fails without admin token', async () => {
            const response = await request(app)
                .post('/api/v1/categories')
                .send({
                    title: 'New Category',
                    thumbnail: 'http://example.com/new.jpg',
                });

            expect(response.status).toBe(401);
        });

        it('POST /api/v1/categories fails with user token', async () => {
            const response = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'New Category',
                    thumbnail: 'http://example.com/new.jpg',
                });

            expect(response.status).toBe(403);
        });

        it('POST /api/v1/categories validates required fields', async () => {
            const response = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('POST /api/v1/categories validates thumbnail URL', async () => {
            const response = await request(app)
                .post('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'New Category',
                    thumbnail: 'invalid-url',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('GET /api/v1/categories lists all categories for admin', async () => {
            await CategoryModel.create([
                { title: 'Electronics', slug: 'electronics', thumbnail: 'http://example.com/e.jpg' },
                { title: 'Clothing', slug: 'clothing', thumbnail: 'http://example.com/c.jpg' },
            ]);

            const response = await request(app)
                .get('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it('GET /api/v1/categories supports search for admin', async () => {
            await CategoryModel.create([
                { title: 'Electronics', slug: 'electronics', thumbnail: 'http://example.com/e.jpg' },
                { title: 'Clothing', slug: 'clothing', thumbnail: 'http://example.com/c.jpg' },
            ]);

            const response = await request(app)
                .get('/api/v1/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ search: 'electronics' });

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].title).toBe('Electronics');
        });
    });
});
