import { activityRepository } from './activity.repository';
import type { CreateActivityInput, ActivityQuery } from './activity.interface';

class ActivityService {
    async logActivity(data: CreateActivityInput): Promise<void> {
        await activityRepository.create(data);
    }

    async getActivities(query: ActivityQuery) {
        return activityRepository.findAll(query);
    }
}

export const activityService = new ActivityService();
