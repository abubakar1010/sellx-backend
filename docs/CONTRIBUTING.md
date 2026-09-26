# Contributing Guide

This guide is the fast path for developers starting work on this template.
Read this once, then use it as your day-to-day checklist.

## 1. Prerequisites

- Node.js `>=20.11.0` (Node 22 recommended)
- npm (comes with Node)
- Docker Desktop
- Git

## 2. First-Time Setup

### Option A: Docker + HTTPS (recommended on Windows)

```bash
cp .env.example .env
npm ci
npm run docker:up:https:windows
```

Endpoints:

- API: `https://localhost`
- Health: `https://localhost/health`
- API v1 health: `https://localhost/api/v1/health`
- Mongo Express: `http://localhost:8081`

### Option B: Local Node process + Docker services

```bash
cp .env.development .env
npm ci
docker compose up -d mongo redis
npm run dev
```

## 3. Essential Commands

- `npm run dev` -> run server in watch mode
- `npm run build` -> compile TypeScript
- `npm run typecheck` -> strict type validation
- `npm run lint` -> static lint checks
- `npm run lint:fix` -> auto-fix lint issues
- `npm run format` -> apply Prettier formatting
- `npm run test` -> run unit + integration tests

## 4. Architecture at a Glance

- `src/core` -> pure contracts, constants, errors, shared types
- `src/infrastructure` -> adapters (db, cache, logger, queue, mail, realtime)
- `src/modules` -> business modules (`routes -> controller -> service -> repository -> model`)
- `src/shared` -> cross-cutting middleware/utilities
- `src/jobs` -> background queues, producers, consumers, schedulers
- `tests` -> factories, helpers, unit tests, integration tests

Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) for layer boundaries before coding.

## 5. Coding Rules You Must Follow

- Follow [`CONVENTIONS.md`](./CONVENTIONS.md) naming and file rules.
- Keep imports aligned with allowed layer direction.
- Validate every public HTTP input using Zod schemas.
- Keep business logic inside services; keep controllers thin.
- Use typed app errors (`BadRequestError`, `NotFoundError`, etc.).
- Return API output via `sendResponse`.
- Keep files small and focused; split when responsibilities grow.

## 6. Standard Workflow for Any Task

1. Read relevant module and tests first.
2. Implement minimal changes in the correct layer(s).
3. Add/update tests for behavior change.
4. Run quality gates:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
5. Update docs if API, conventions, architecture, or behavior changed.

## 7. How to Add a New Module

1. Create folder: `src/modules/<module>/`
2. Add required files:
   - `<module>.interface.ts`
   - `<module>.constants.ts`
   - `<module>.validation.ts`
   - `<module>.model.ts`
   - `<module>.repository.ts`
   - `<module>.service.ts`
   - `<module>.serializer.ts`
   - `<module>.controller.ts`
   - `<module>.routes.ts`
3. Register the module routes in `src/routes/v1.ts`.
4. Add tests:
   - `tests/unit/modules/<module>/<module>.service.test.ts`
   - `tests/integration/<module>/<module>.routes.test.ts`
5. Run all quality gates.

## 8. How to Add Queue or Realtime Features

Queue:

1. Add payload type in `src/jobs/types`.
2. Add producer method in `src/jobs/producers`.
3. Add consumer worker in `src/jobs/consumers`.
4. Register queue names in `src/jobs/queues.ts`.
5. Add unit tests for producer/consumer logic.

Realtime:

1. Add event contracts in `src/infrastructure/realtime/socket.types.ts`.
2. Implement handlers in `socket.handlers.ts`.
3. Add gateway publish function in `socket.gateway.ts` if module code must emit.
4. Add/extend integration tests in `tests/integration/system/realtime.socket.test.ts`.

## 9. Branch, Commit, and PR Guidelines

- Branch names:
  - `feature/<short-topic>`
  - `fix/<short-topic>`
  - `chore/<short-topic>`
- Commit message format:
  - `feat: add user invite endpoint`
  - `fix: prevent token reuse after logout`
  - `docs: update module conventions`
- Keep commits focused and reviewable.
- PR must describe:
  - behavior change
  - affected modules
  - test evidence

## 10. Definition of Done

A task is done when all are true:

- Behavior works as expected.
- Tests for changed behavior exist and pass.
- `typecheck`, `lint`, and `test` pass locally.
- Docs are updated where relevant.
- No architecture boundary violations were introduced.

## 11. Common Mistakes to Avoid

- Skipping validation in routes/controllers.
- Putting business decisions in controllers or repositories.
- Importing across module boundaries directly.
- Returning raw Mongoose documents without serializer shaping.
- Adding untyped payloads to jobs, events, or realtime handlers.
