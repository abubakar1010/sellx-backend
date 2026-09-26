type Factory<T> = () => T;

export class Container {
    private readonly services = new Map<string, unknown>();
    private readonly factories = new Map<string, Factory<unknown>>();

    registerSingleton<T>(token: string, value: T): void {
        if (this.services.has(token) || this.factories.has(token)) {
            throw new Error(`Token already registered: ${token}`);
        }
        this.services.set(token, value);
    }

    registerFactory<T>(token: string, factory: Factory<T>): void {
        if (this.services.has(token) || this.factories.has(token)) {
            throw new Error(`Token already registered: ${token}`);
        }
        this.factories.set(token, factory as Factory<unknown>);
    }

    resolve<T>(token: string): T {
        if (this.services.has(token)) {
            return this.services.get(token) as T;
        }

        const factory = this.factories.get(token);
        if (factory) {
            const instance = factory() as T;
            this.services.set(token, instance);
            return instance;
        }

        throw new Error(`Token not registered: ${token}`);
    }
}

export const container = new Container();
