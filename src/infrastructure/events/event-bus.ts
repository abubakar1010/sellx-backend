import { EventEmitter } from 'node:events';

import type { IEventBus } from '@/core/interfaces/event-bus.interface';

export class InMemoryEventBus implements IEventBus {
    private readonly emitter = new EventEmitter();

    emit<T>(event: string, payload: T): void {
        this.emitter.emit(event, payload);
    }

    on<T>(event: string, handler: (payload: T) => void): void {
        this.emitter.on(event, handler);
    }

    once<T>(event: string, handler: (payload: T) => void): void {
        this.emitter.once(event, handler);
    }

    off<T>(event: string, handler: (payload: T) => void): void {
        this.emitter.off(event, handler);
    }

    removeAllListeners(event?: string): void {
        this.emitter.removeAllListeners(event);
    }
}

export const eventBus = new InMemoryEventBus();
