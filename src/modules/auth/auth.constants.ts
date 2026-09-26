export const AUTH_JWT_TYPES = {
    ACCESS: 'access',
    REFRESH: 'refresh',
} as const;

export type AuthJwtType = (typeof AUTH_JWT_TYPES)[keyof typeof AUTH_JWT_TYPES];
