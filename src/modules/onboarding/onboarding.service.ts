import { userRepository } from '../user/user.repository';
import type { IUserDocument } from '../user/user.interface';
import type { CompleteProfileBody, SelectCategoriesBody } from './onboarding.validation';

export class OnboardingService {
    async completeProfile(userId: string, payload: CompleteProfileBody, avatarUrl?: string) {
        const updateData: Partial<IUserDocument> = {};

        if (payload.phone) {
            updateData.phone = payload.phone;
        }

        if (payload.location) {
            updateData.location = payload.location;
        }

        updateData.address = payload.address;

        if (avatarUrl) {
            updateData.avatarUrl = avatarUrl;
        }

        const updated = await userRepository.updateById(userId, {
            ...updateData,
            onboardingStep: 'PROFILE_SETUP' as any,
        });
        return updated;
    }

    async selectCategories(userId: string, payload: SelectCategoriesBody) {
        const updated = await userRepository.updateById(userId, {
            interestedCategories: payload.categories as any,
            onboardingStep: 'COMPLETED' as any,
            isOnboardingCompleted: true,
        });
        return updated;
    }
}

export const onboardingService = new OnboardingService();