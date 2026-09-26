import request from 'supertest';

import { connectTestDatabase, describeWithDatabase } from '../../helpers/db.helper';

import { app } from '../../../src/app';
import { buildAccessToken } from '../../helpers/auth.helper';

const USER_ID = '507f1f77bcf86cd799439011';

const baseBody = {
    category: '507f1f77bcf86cd799439011',
    title: 'Refurbished iPhone 15 Pro',
    price: 4500,
    location: { address: 'Karl Johans gate 1, Oslo', city: 'Oslo', country: 'Norway' },
};

describeWithDatabase('Product currency enforcement', () => {
    // Needs a live MongoDB: these suites read and write real documents, and clear the collections
    // between tests. See `tests/helpers/db.helper.ts` — run them with `RUN_DB_TESTS=1`.
    beforeAll(async () => {
        await connectTestDatabase();
    });

    it('POST /api/v1/products rejects a non-NOK currency at the route', async () => {
        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${buildAccessToken({ sub: USER_ID })}`)
            .send({ ...baseBody, currency: 'USD' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toBe('Only NOK is supported.');
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: 'currency', message: 'Only NOK is supported.' }),
            ]),
        );
    });

    it('POST /api/v1/products passes validation when currency is omitted', async () => {
        const response = await request(app)
            .post('/api/v1/products')
            .set('Authorization', `Bearer ${buildAccessToken({ sub: USER_ID })}`)
            .send(baseBody);

        // Validation is satisfied, so the request reaches the controller and fails
        // on the missing image instead — proving currency is no longer the blocker.
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('At least one image is required');
    });
});
