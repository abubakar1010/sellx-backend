import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextValue {
    requestId: string;
    startedAt: number;
    userId?: string;
}

const storage = new AsyncLocalStorage<RequestContextValue>();

export const requestContext = {
    run<T>(context: RequestContextValue, callback: () => T): T {
        return storage.run(context, callback);
    },

    get(): RequestContextValue | undefined {
        return storage.getStore();
    },

    getRequestId(): string | undefined {
        return storage.getStore()?.requestId;
    },

    setUserId(userId: string): void {
        const context = storage.getStore();
        if (context) {
            context.userId = userId;
        }
    },
};
