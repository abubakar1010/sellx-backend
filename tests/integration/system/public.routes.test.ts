import request from 'supertest';

import { app } from '../../../src/app';

describe('Public routes', () => {
    it('GET / returns HTML landing page', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/html');
        expect(response.text).toContain('GET /health');
        expect(response.text).toContain('Socket.IO path');
    });

    it('GET /health returns service health', async () => {
        const response = await request(app).get('/health');

        expect([200, 503]).toContain(response.status);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Health report fetched successfully.');
        expect(response.body.data).toEqual(
            expect.objectContaining({
                status: expect.any(String),
                timestamp: expect.any(String),
                checks: expect.any(Object),
                uptimeSeconds: expect.any(Number),
                environment: expect.any(String),
            }),
        );
    });
});
