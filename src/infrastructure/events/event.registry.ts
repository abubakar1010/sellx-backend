import { eventBus } from './event-bus';
import { registerAuthListeners } from './listeners/auth.listeners';
import { registerUserListeners } from './listeners/user.listeners';

let initialized = false;

export const registerEventListeners = (): void => {
    if (initialized) {
        return;
    }

    registerAuthListeners(eventBus);
    registerUserListeners(eventBus);
    initialized = true;
};
