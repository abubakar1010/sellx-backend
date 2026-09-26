import request from 'supertest';

import { app } from '../../../src/app';
import { buildAccessToken } from '../../helpers/auth.helper';
import { onboardingService } from '../../../src/modules/onboarding/onboarding.service';
import type { IUserDocument } from '../../../src/modules/user/user.interface';

const USER_ID = '507f1f77bcf86cd799439011';

const PROFILE_PAYLOAD = {
    address: 'Chinatown, London, UK',
    location: { type: 'Point', coordinates: [-0.1311286, 51.5117601] },
};

const buildUpdatedUser = (address: string | null) => ({
    id: USER_ID,
    email: 'test.user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    status: 'active',
    registrationStrategy: 'local',
    isEmailVerified: true,
    onboardingStep: 'PROFILE_SETUP',
    isOnboardingCompleted: false,
    address,
});

describe('Onboarding routes', () => {
    // Clients send profile fields as a JSON string in a multipart `data` field.
    // Without parseFormData ahead of validate, the envelope was stripped and the
    // address/location/phone were silently dropped.
    it('POST /api/v1/onboarding/profile parses the multipart data envelope', async () => {
        const completeProfile = jest
            .spyOn(onboardingService, 'completeProfile')
            .mockResolvedValue(
                buildUpdatedUser(PROFILE_PAYLOAD.address) as unknown as IUserDocument,
            );

        const response = await request(app)
            .post('/api/v1/onboarding/profile')
            .set('Authorization', `Bearer ${buildAccessToken({ sub: USER_ID })}`)
            .field('data', JSON.stringify(PROFILE_PAYLOAD));

        expect(response.status).toBe(200);
        expect(completeProfile).toHaveBeenCalledWith(
            USER_ID,
            expect.objectContaining({
                address: PROFILE_PAYLOAD.address,
                location: PROFILE_PAYLOAD.location,
            }),
            undefined,
        );
        expect(response.body.data.user.address).toBe(PROFILE_PAYLOAD.address);
    });

    it('POST /api/v1/onboarding/profile rejects a payload without an address', async () => {
        const completeProfile = jest.spyOn(onboardingService, 'completeProfile');

        const response = await request(app)
            .post('/api/v1/onboarding/profile')
            .set('Authorization', `Bearer ${buildAccessToken({ sub: USER_ID })}`)
            .field('data', JSON.stringify({ location: PROFILE_PAYLOAD.location }));

        expect(response.status).toBe(400);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
        expect(response.body.message).toBe('Address is required');
        expect(completeProfile).not.toHaveBeenCalled();
    });

    it('POST /api/v1/onboarding/profile rejects an unauthenticated request', async () => {
        const response = await request(app).post('/api/v1/onboarding/profile');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});
