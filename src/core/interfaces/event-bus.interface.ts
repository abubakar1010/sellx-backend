/**
 * In-process synchronous event bus.
 * NOT for heavy async work (use job queue for that).
 *
 * Use cases:
 * - Cache invalidation after writes
 * - Audit/activity logging
 * - Updating in-memory counters
 * - Triggering lightweight sync side-effects
 */
export interface IEventBus {
    /**
     * Emit an event. All registered listeners execute synchronously.
     */
    emit<T = unknown>(event: string, payload: T): void;

    /**
     * Register a listener for an event.
     */
    on<T = unknown>(event: string, handler: (payload: T) => void): void;

    /**
     * Register a one-time listener.
     */
    once<T = unknown>(event: string, handler: (payload: T) => void): void;

    /**
     * Remove a specific listener.
     */
    off<T = unknown>(event: string, handler: (payload: T) => void): void;

    /**
     * Remove all listeners for an event, or all events if no event specified.
     */
    removeAllListeners(event?: string): void;
}
