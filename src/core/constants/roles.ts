export const ROLES = {
    USER: 'user',
    SUPER_ADMIN: 'superAdmin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

/**
 * Role hierarchy for permission checks.
 * Higher index = more privileges.
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
    [ROLES.USER]: 0,
    [ROLES.SUPER_ADMIN]: 1,
};
