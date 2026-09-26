# Conventions

This file defines code and naming standards for the template.
Use these rules for all new code and refactors.

## 1. Core Rules

- Keep architecture boundaries from [`ARCHITECTURE.md`](./ARCHITECTURE.md) strict.
- Prefer consistency over personal style.
- Keep names short, explicit, and searchable.
- Avoid abbreviations unless they are established (`JWT`, `URL`, `ID`).
- Use TypeScript `strict`-safe patterns; avoid `any`.

## 2. Naming Standards (All Artifacts)

| Artifact | Convention | Examples |
| --- | --- | --- |
| Variables / params | `camelCase` | `accessToken`, `requestTimeoutMs` |
| Functions / methods | `camelCase` verb-first | `createUser`, `findByEmail` |
| Boolean variables | `is/has/can/should + PascalTail` | `isEmailVerified`, `hasAccess` |
| Classes | `PascalCase` with role suffix | `UserService`, `TokenRepository`, `BadRequestError` |
| Interfaces (contracts/doc shapes) | `I` prefix + `PascalCase` | `IUser`, `IBaseRepository`, `IEventBus` |
| Type aliases | `PascalCase` | `AuthJwtType`, `OffsetPaginationResult` |
| DTOs / input types | `PascalCase` with intent suffix | `CreateUserInput`, `ListUsersQuery`, `JobOptions` |
| Const maps (enum-like) | `UPPER_SNAKE_CASE` + `as const` | `ROLES`, `TOKEN_TYPES`, `QUEUE_NAMES` |
| Plain constants | `UPPER_SNAKE_CASE` | `EVENT_TIMEOUT_MS`, `ALL_ROLES` |
| Environment variables | `UPPER_SNAKE_CASE` | `MONGODB_URI`, `SOCKET_IO_PATH` |
| Error codes | `UPPER_SNAKE_CASE` with domain prefix | `AUTH_REQUIRED`, `USER_NOT_FOUND` |
| Event names (event bus/socket) | `domain:action` (kebab action if multi-word) | `user:registered`, `auth:logged-in`, `chat:message` |
| Cache keys | `domain:identifier[:subkey]` | `user:507f...`, `session:abc123` |
| Route paths | lowercase, resource-first, kebab-case for segments | `/users/:id`, `/auth/forgot-password` |
| Queue names (BullMQ) | `UPPER_SNAKE_CASE` string values | `EMAIL_QUEUE`, `NOTIFICATION_QUEUE` |
| Mongo collections | lowercase plural | `users`, `tokens`, `notifications` |

## 3. TypeScript Enum Policy

Do not use TypeScript `enum` for domain constants.
Use `as const` objects plus union types:

```ts
export const USER_STATUS = {
    ACTIVE: 'active',
    BLOCKED: 'blocked',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
```

## 4. File and Folder Naming

### 4.1 Folders

- Use lowercase folder names.
- Use singular nouns for domain modules in `src/modules` (`user`, `auth`, `token`).
- Use plural category folders for grouped infrastructure code (`listeners`, `checks`, `producers`).
- Keep related code inside one module folder unless it is cross-cutting infrastructure.

### 4.2 Files

- Use lowercase dot-separated names: `<feature>.<role>.ts`.
- Keep role suffixes explicit (`.service.ts`, `.repository.ts`, `.controller.ts`).
- Use `index.ts` only as a barrel entry point.
- Use `*.d.ts` only for declaration merging or ambient types.

Examples:

- `user.service.ts`
- `token.model.ts`
- `realtime.socket.test.ts`
- `request.context.ts`

## 5. Module Contract (Required Files)

Every HTTP module in `src/modules/<module>/` must include:

| File | Purpose |
| --- | --- |
| `<module>.interface.ts` | Types and interfaces |
| `<module>.constants.ts` | Module-level constants and enum-like maps |
| `<module>.validation.ts` | Zod request schemas |
| `<module>.model.ts` | Mongoose schema + model |
| `<module>.repository.ts` | Data access |
| `<module>.service.ts` | Business logic |
| `<module>.serializer.ts` | API response shaping |
| `<module>.controller.ts` | Request handlers |
| `<module>.routes.ts` | Express routes |

Optional: module-specific sub-folders (for strategies, helpers, mappers) when needed.

## 6. Model and DB Conventions

- Schema variable: `<module>Schema` (camelCase), e.g. `userSchema`.
- Model export: `PascalCase + Model`, e.g. `UserModel`.
- Explicit collection name as third arg in `mongoose.model(...)`.
- Add indexes in model files only.
- Keep Mongoose plugins (`toJSON`, pagination) attached in model definition.

## 7. API and Validation Conventions

- Validate all incoming `body`, `params`, and `query` with Zod in `*.validation.ts`.
- Route handler order: `auth -> authorize -> validate -> controller`.
- Controllers return responses through `sendResponse(...)`.
- Services throw typed app errors, not raw strings.
- Serializers transform documents before returning API data.

## 8. Jobs, Events, and Realtime

- Job payload types live in `src/jobs/types/*.job.ts`.
- Producers are class-based (`EmailProducer`) and exported as singleton instances (`emailProducer`).
- Consumers use `<name>Worker` variable naming (`emailWorker`).
- Event bus names and socket events must follow `domain:action`.
- Realtime room naming should go through helpers in `socket.types.ts` (`getUserRoom`, `getChatRoom`).

## 9. Test Naming and Layout

- Unit tests: `tests/unit/.../*.test.ts`
- Integration tests: `tests/integration/.../*.test.ts`
- Factory helpers: `tests/factories/*.factory.ts`
- Shared test helpers: `tests/helpers/*.helper.ts`
- Preferred pattern: `<subject>.<scope>.test.ts`

Examples:

- `user.service.test.ts`
- `auth.routes.test.ts`
- `realtime.socket.test.ts`

## 10. Imports and Exports

Import order:

1. Node built-ins (`node:*`)
2. External packages
3. Internal aliases (`@/`, `@core`, `@infra`, `@shared`, `@modules`, `@jobs`, `@tests`)
4. Relative imports (`./`, `../`)

Additional rules:

- Prefer named exports.
- Default export is acceptable for Express route modules only.
- Use `import type` for type-only imports.

## 11. Formatting and Lint

- Formatting is controlled by Prettier (4 spaces, single quotes, trailing commas).
- Lint rules are enforced by ESLint.
- Do not merge code that fails:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
