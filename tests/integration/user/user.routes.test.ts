import request from 'supertest';

import { app } from '../../../src/app';
import { ROLES } from '../../../src/core/constants/roles';
import { userService } from '../../../src/modules/user/user.service';
import { buildUser } from '../../factories/user.factory';
import { buildAccessToken } from '../../helpers/auth.helper';

describe('User routes', () => {
    it('GET /api/v1/users/me returns current user', async () => {
        jest.spyOn(userService, 'getById').mockResolvedValue(
            buildUser({
                id: '507f1f77bcf86cd799439011',
                email: 'me@example.com',
            }),
        );
        const accessToken = buildAccessToken({
            sub: '507f1f77bcf86cd799439011',
            email: 'me@example.com',
            role: ROLES.USER,
        });

        const response = await request(app)
            .get('/api/v1/users/me')
            .set('authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('me@example.com');
    });

    it('GET /api/v1/users denies non-admin role', async () => {
        const accessToken = buildAccessToken({
            role: ROLES.USER,
        });

        const response = await request(app)
            .get('/api/v1/users')
            .set('authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    });

    it('GET /api/v1/users allows admin role', async () => {
        jest.spyOn(userService, 'listUsers').mockResolvedValue({
            data: [buildUser({ email: 'admin.view@example.com' })],
            meta: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        });
        const accessToken = buildAccessToken({
            role: ROLES.SUPER_ADMIN,
        });

        const response = await request(app)
            .get('/api/v1/users')
            .set('authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
    });
});
