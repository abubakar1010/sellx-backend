import {
    startInactiveUsersScheduler,
    stopInactiveUsersScheduler,
} from './inactive-users.scheduler';
import { startTokenCleanupScheduler, stopTokenCleanupScheduler } from './token-cleanup.scheduler';
import {
    startStoryPurchaseExpiryScheduler,
    stopStoryPurchaseExpiryScheduler,
} from './story-purchase-expiry.scheduler';
import {
    startListingExpiryScheduler,
    stopListingExpiryScheduler,
} from './listing-expiry.scheduler';
import {
    startListingPurchaseExpiryScheduler,
    stopListingPurchaseExpiryScheduler,
} from './listing-purchase-expiry.scheduler';
import {
    startSubscriptionExpiryScheduler,
    stopSubscriptionExpiryScheduler,
} from './subscription-expiry.scheduler';

export const startSchedulers = (): void => {
    startTokenCleanupScheduler();
    startInactiveUsersScheduler();
    startStoryPurchaseExpiryScheduler();
    startListingExpiryScheduler();
    startListingPurchaseExpiryScheduler();
    startSubscriptionExpiryScheduler();
};

export const stopSchedulers = (): void => {
    stopTokenCleanupScheduler();
    stopInactiveUsersScheduler();
    stopStoryPurchaseExpiryScheduler();
    stopListingExpiryScheduler();
    stopListingPurchaseExpiryScheduler();
    stopSubscriptionExpiryScheduler();
};
