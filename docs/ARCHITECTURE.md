# Architecture

This project follows **Clean Architecture** (Robert C. Martin)
with **component-based structure** (Goldbergyoni) and
**Repository Pattern** (Fowler).

## Layer Rules

| Layer          | Folder                | Can Import From                                | Cannot Import From               |
| -------------- | --------------------- | ---------------------------------------------- | -------------------------------- |
| Core           | `src/core/`           | Nothing                                        | Everything else                  |
| Infrastructure | `src/infrastructure/` | `core/`                                        | `modules/`, `shared/`, `jobs/`   |
| Shared         | `src/shared/`         | `core/`                                        | `modules/`, `jobs/`              |
| Modules        | `src/modules/`        | `core/`, `infrastructure/` (via DI), `shared/` | Other modules ¹                  |
| Jobs           | `src/jobs/`           | `core/`, `infrastructure/`                     | `modules/` (uses repos directly) |

¹ Exception: `auth` module may import `user` and `token` modules
(auth owns identity management).

## Module Internal Flow

`routes -> controller -> service -> repository -> model`

`controller -> serializer -> response`

`service -> core errors/messages`

`controller/service -> infrastructure adapters (mail, cache, queue, realtime)`

## Realtime Architecture (Socket.IO)

Realtime functionality lives in `src/infrastructure/realtime/` and is split into:

- `socket.server.ts`: server bootstrap, transport/cors/timeouts, redis adapter, lifecycle.
- `socket.auth.ts`: JWT handshake auth and user status checks.
- `socket.handlers.ts`: chat room join/leave/message handlers with per-socket rate limits.
- `socket.gateway.ts`: publish helpers for domain events (notifications, system messages).
- `socket.types.ts`: typed client/server event contracts and room helpers.

### Security Defaults

- JWT access token is required for socket handshake.
- Only `active` users can connect.
- Allowed origins are shared with HTTP CORS config.
- Chat payloads are validated with Zod.
- Chat messaging is rate-limited per socket window.
- Max websocket payload is bounded by env config.

### Scalability Defaults

- Redis adapter is enabled by default (`SOCKET_IO_USE_REDIS_ADAPTER=true`) for multi-instance fanout.
- In test mode, Redis adapter is skipped to keep tests deterministic.
- User-specific notifications are emitted via stable user rooms (`user:<id>`).
