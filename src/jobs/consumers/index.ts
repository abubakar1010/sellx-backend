import { emailWorker } from './email.consumer';
import { notificationWorker } from './notification.consumer';
import { storeTrackingWorker } from './store-tracking.consumer';
import { activityWorker } from './activity.consumer';

export const queueWorkers = {
    emailWorker,
    notificationWorker,
    storeTrackingWorker,
    activityWorker,
};

export const closeQueueWorkers = async (): Promise<void> => {
    await Promise.all([
        emailWorker.close(),
        notificationWorker.close(),
        storeTrackingWorker.close(),
        activityWorker.close(),
    ]);
};
