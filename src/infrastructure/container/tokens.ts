export const TOKENS = {
    LOGGER: 'LOGGER',
    CACHE_SERVICE: 'CACHE_SERVICE',
    HEALTH_SERVICE: 'HEALTH_SERVICE',
} as const;

export type ContainerToken = (typeof TOKENS)[keyof typeof TOKENS];
