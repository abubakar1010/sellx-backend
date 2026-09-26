import request from 'supertest';

import { app } from '../../../src/app';
import { ROLES } from '../../../src/core/constants/roles';
import { notificationService } from '../../../src/modules/notification/notification.service';
import { buildNotification } from '../../factories/notification.factory';
import { buildAccessToken } from '../../helpers/auth.helper';

describe('Notification routes', () => {
    it('GET /api/v1/notifications returns current user notifications', async () => {
        jest.spyOn(notificationService, 'listUserNotifications').mockResolvedValue({
            data: [buildNotification({ title: 'Test Notification', isRead: false })],
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
            sub: '507f1f77bcf86cd799439011',
            role: ROLES.USER,
        });

        const response = await request(app)
            .get('/api/v1/notifications?isRead=false')
            .set('authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(notificationService.listUserNotifications).toHaveBeenCalledWith(
            '507f1f77bcf86cd799439011',
            { isRead: false },
            expect.any(Object),
            expect.any(Object),
        );
    });

    it('POST /api/v1/notifications forbids non-admin role', async () => {
        const accessToken = buildAccessToken({ role: ROLES.SUPER_ADMIN });

        const response = await request(app)
            .post('/api/v1/notifications')
            .set('authorization', `Bearer ${accessToken}`)
            .send({
                userId: '507f1f77bcf86cd799439011',
                title: 'A',
                message: 'B',
                type: 'info',
            });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
    });

    it('POST /api/v1/notifications creates for admin role', async () => {
        jest.spyOn(notificationService, 'createNotification').mockResolvedValue(
            buildNotification({
                userId: '507f1f77bcf86cd799439011',
                title: 'Admin Notification',
            }),
        );

        const accessToken = buildAccessToken({ role: ROLES.SUPER_ADMIN });
        const response = await request(app)
            .post('/api/v1/notifications')
            .set('authorization', `Bearer ${accessToken}`)
            .send({
                userId: '507f1f77bcf86cd799439011',
                title: 'Admin Notification',
                message: 'Hello',
                type: 'info',
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Admin Notification');
    });
});
