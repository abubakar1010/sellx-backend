# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express + TypeScript backend for a multi-category marketplace (SellX). Uses Mongoose (MongoDB), Redis, BullMQ job queues, Socket.IO realtime, and Cloudinary/local file storage. Firebase Admin for push notifications.

## Commit Guideline

- never use `Co-Authored-By: Claude` or something like this.
- always commit and push after your work
- commit message should be in the format: `feat: add new feature` or `fix: fix bug` etc.
- use conventional commits.
- never commit everything at once, do commit for each feature, module or fix. always follow conventional commits, principles and standards. always make sure your changes are tested before committing.

## Commands

| Task            | Command                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| Dev server      | `npm run dev`                                                                        |
| Build           | `npm run build`                                                                      |
| Start prod      | `npm run start:prod`                                                                 |
| Typecheck       | `npm run typecheck`                                                                  |
| Lint            | `npm run lint`                                                                       |
| Lint fix        | `npm run lint:fix`                                                                   |
| Format          | `npm run format`                                                                     |
| Run all tests   | `npm run test`                                                                       |
| Watch tests     | `npm run test:watch`                                                                 |
| Run single test | `npx jest --runInBand tests/unit/path/to/file.test.ts`                               |
| Seed data       | `npm run seed:super-admin`, `npm run seed:categories`, `npm run seed:products`, etc. |
| Docker up       | `npm run docker:up`                                                                  |
| Docker down     | `npm run docker:down`                                                                |

Local dev requires Redis running (`docker compose up -d redis`). MongoDB is hosted on Atlas — set `MONGODB_URI` in `.env` to your Atlas connection string.

## Architecture

Clean Architecture with layers: **Core -> Infrastructure -> Shared -> Modules -> Jobs**.

- `src/core/` - Constants, error classes, interfaces, types. No imports from other layers.
- `src/infrastructure/` - Adapters: database, cache (Redis), queue (BullMQ), mail (Nodemailer+EJS), realtime (Socket.IO), storage (Cloudinary/local), push notifications (Firebase), logger (Winston), health checks. Imports only `core/`.
- `src/shared/` - Middlewares (auth, rate limiter, error handler, validation), utilities, base classes. Imports only `core/`.
- `src/modules/` - Domain modules (user, auth, products, stores, chat, etc.). Each module follows: `routes -> controller -> service -> repository -> model`. Imports `core/`, `infrastructure/` (via DI), `shared/`. Modules must NOT import other modules (exception: `auth` may import `user` and `token`).
- `src/jobs/` - BullMQ producers/consumers. Imports `core/`, `infrastructure/`. Accesses repos directly, not module services.
- `src/routes/v1/` - API route aggregation under `/api/v1`.
- `src/config/` - Centralized env config.

### Module File Convention

Each module in `src/modules/<name>/` has: `<name>.interface.ts`, `<name>.constants.ts`, `<name>.validation.ts` (Zod), `<name>.model.ts`, `<name>.repository.ts`, `<name>.service.ts`, `<name>.serializer.ts`, `<name>.controller.ts`, `<name>.routes.ts`.

### Path Aliases

`@/*` = `src/*`, `@config/*`, `@core/*`, `@infra/*` = `src/infrastructure/*`, `@shared/*`, `@modules/*`, `@jobs/*`, `@tests/*` = `tests/*`.

## Key Conventions

- **No TypeScript enums.** Use `as const` objects + union types.
- **Zod for all validation** in `*.validation.ts` files.
- Route handler order: `auth -> authorize -> validate -> controller`.
- Services throw typed app errors (from `core/errors/`), controllers use `sendResponse()`.
- Serializers shape API responses before returning.
- File naming: lowercase dot-separated `<feature>.<role>.ts`.
- Folder naming: singular for modules (`user`, `auth`), plural for infrastructure groups (`listeners`, `producers`).
- Constants use `UPPER_SNAKE_CASE` with `as const`.
- Interfaces use `I` prefix (`IUser`, `IBaseRepository`).
- Import order: node builtins -> external packages -> path aliases -> relative imports.
- Prefer named exports; default exports only for route modules.

## Tests

- Tests live in `tests/` (not colocated): `tests/unit/`, `tests/integration/`, `tests/factories/`, `tests/helpers/`.
- Setup file: `tests/setup.ts`.
- Jest with ts-jest preset. Tests must pass `npm run test` (runs with `--runInBand --detectOpenHandles`).
- Coverage thresholds: 80% lines/functions/statements, 70% branches.

## Pre-merge Checklist

All three must pass: `npm run typecheck`, `npm run lint`, `npm run test`.
