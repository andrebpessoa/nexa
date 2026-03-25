# pxbr to nexa Migration Design

## Overview

Migrate a cloned monorepo from the `pxbr` project identity to `nexa`, removing unused packages, migrating from MySQL to PostgreSQL, and cleaning up documentation. The product module is kept as an example reference for building future modules.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Project name | `nexa` / `@nexa/*` | New project identity |
| Product module | Keep as example | Reference for creating new bounded contexts |
| `packages/transactional` | Remove | Not needed now |
| `packages/analytics` | Remove | Not needed now |
| `apps/storefront` | Remove | Only admin + server needed |
| Database | MySQL to PostgreSQL | Preference |
| Redis | Keep | Used for `@Cacheable`/`@CacheInvalidate` cache layer |
| `docs/plans/` | Delete all | Old project plans, not relevant |

## Approach

Incremental by layer — four sequential stages, each verified with typecheck and tests before proceeding to the next.

---

## Stage 1: Rename pxbr to nexa

Global find/replace across the entire codebase (excluding `node_modules`, `bun.lock`).

### Replacements

| Pattern | Replacement | Scope |
|---|---|---|
| `@pxbr/` | `@nexa/` | package names, dependencies, imports, tsconfig extends, shadcn aliases, tsdown regex |
| `"pxbr"` (root package name) | `"nexa"` | `package.json` root |
| `pxbr-mysql`, `pxbr-redis` | `nexa-mysql`, `nexa-redis` | `docker-compose.yml` service/container names (interim; Stage 3 replaces mysql with postgres) |
| `pxbr_mysql_data`, `pxbr_redis_data` | `nexa_mysql_data`, `nexa_redis_data` | `docker-compose.yml` volume names (interim; Stage 3 replaces mysql volume) |
| `pxbr` (database name in URLs) | `nexa` | `.env.example`, env test files |
| `PXBR Admin` | `Nexa Admin` | UI strings in admin app (titles, headings) |
| `PXBR API` | `Nexa API` | OpenAPI title in server index |
| `PXBR` (page meta titles) | `Nexa` | Storefront route meta (removed in Stage 2, but renamed first for consistency) |
| `pxbr` | `nexa` | docker-compose project name |

### Files affected (~89 files)

- 13 `package.json` files (root + 7 packages + 3 apps)
- 10 `tsconfig.json` files
- 3 `components.json` (shadcn)
- ~50 source files (`.ts`/`.tsx`) with `@pxbr/` imports
- 1 `tsdown.config.ts` (regex)
- 1 `docker-compose.yml`
- 2 `.env.example` / `.env.test` files
- 5+ files with UI branding strings
- `README.md`, `CLAUDE.md`
- `packages/env/src/admin.ts` (verify for pxbr references)

### Post-step

- Run `bun install` to regenerate `bun.lock`
- Run `cd apps/server && bunx tsgo --noEmit` (typecheck)
- Run `cd apps/server && bun test` (unit tests)

---

## Stage 2: Remove unused packages and apps

### Delete entirely

- `packages/transactional/` — React Email templates and SMTP client
- `packages/analytics/` — PostHog client and server error tracking
- `apps/storefront/` — TanStack Start SSR frontend

### Clean up references

**`packages/auth/src/index.ts`:**
- Remove `@nexa/transactional` import
- Replace `sendResetPassword` callback with a no-op/console.log placeholder (Better Auth requires the callback shape but we don't need real email sending yet)

**`packages/auth/package.json`:**
- Remove `@nexa/transactional` dependency

**`apps/server/src/container.ts`:**
- Remove `ErrorTracker` DI registration (analytics)
- Remove `createEmailClient` import and the entire `emailClient` creation block
- Remove all imports from `@nexa/analytics` and `@nexa/transactional`
- Update `createAuth` call if it depends on `emailClient` parameter

**`apps/server/src/index.ts`:**
- Remove `import type { ErrorTracker } from "@nexa/analytics"`
- Remove `container.resolve<ErrorTracker>("ErrorTracker")` call
- Remove `await errorTracker.shutdown()` from the shutdown function
- Remove any other `@nexa/analytics` imports

**`apps/server/package.json`:**
- Remove `@nexa/analytics` and `@nexa/transactional` dependencies

**`apps/server/src/shared/infra/middleware/error-handler.ts`:**
- Remove PostHog error logging, keep the Elysia `onError` hook structure

**`packages/env/src/server.ts`:**
- Remove SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`)
- Remove PostHog env vars (`POSTHOG_KEY`, `POSTHOG_HOST`)

**`packages/env/src/server.test.ts`:**
- Remove `POSTHOG_KEY` and `POSTHOG_HOST` from `baseEnv` fixture
- Remove any SMTP-related test assertions

**`packages/env/src/storefront.ts`:**
- Delete file entirely

**`apps/server/.env.example`:**
- Remove SMTP and PostHog sections

**`packages/env/src/server.ts` (CORS_ORIGIN):**
- Remove storefront port (3002) from the default CORS_ORIGIN array, keep only admin port (3001)

**`package.json` (root):**
- Remove `dev:storefront` and `dev:transactional` scripts

### Post-step

- Run `bun install` to clean lockfile
- Typecheck
- Run tests

---

## Stage 3: MySQL to PostgreSQL migration

### Schema changes (`packages/db/src/schema/`)

| MySQL (current) | PostgreSQL (target) |
|---|---|
| `import { ... } from "drizzle-orm/mysql-core"` | `import { ... } from "drizzle-orm/pg-core"` |
| `mysqlTable(...)` | `pgTable(...)` |
| `datetime(...)` | `timestamp(...)` |
| `{ fsp: 3 }` (datetime option) | `{ precision: 3 }` (timestamp option) |
| `int(...)` | `integer(...)` |
| `mysqlEnum(...)` | `pgEnum(...)` |
| `varchar(...)` | `varchar(...)` (no change) |
| `boolean(...)` | `boolean(...)` (no change) |
| `text(...)` | `text(...)` (no change) |

Files: `product.ts`, `user-permission.ts`, `auth.ts`, `relations.ts`, `index.ts`

Note: `{ fsp: 3 }` appears in 17+ timestamp columns across all schema files. Every occurrence must change to `{ precision: 3 }`.

### Drizzle config (`packages/db/drizzle.config.ts`)

- Change `dialect: "mysql"` to `dialect: "postgresql"`
- Update connection string format if hardcoded

### Connection (`packages/db/src/index.ts`)

- Replace `mysql2` driver import with `postgres` (postgres.js)
- Update `drizzle()` call to use PG adapter
- Remove `mode: "default"` option (MySQL-specific, does not exist in PG adapter)
- Translate connection pool options: `connectionLimit` → `max`, `connectTimeout` → `connect_timeout`, remove `queueLimit`/`waitForConnections` (not applicable to postgres.js)

### Health check and shutdown (`apps/server/src/index.ts`)

- The health check uses `db.$client.query("SELECT 1")` which is mysql2 API
- postgres.js uses tagged template literals: `` sql`SELECT 1` ``
- Update the health check to use the postgres.js API
- Update the shutdown function's `db.$client.end()` call if the type cast changes

### Seed script (`packages/db/src/seed/index.ts`)

- Replace `drizzle-orm/mysql2` import with postgres.js equivalent
- Replace mysql2 connection creation with postgres.js connection
- Remove `mode: "default"` from `drizzle()` call

### Better Auth adapter (`packages/auth/src/index.ts`)

- Change `provider: "mysql"` to `provider: "pg"` in the Drizzle adapter configuration

### Dependencies

**`packages/db/package.json`:**
- Remove: `mysql2`
- Add: `postgres` (postgres.js driver)

**`apps/server/package.json` (devDependencies):**
- Remove: `@testcontainers/mysql`
- Add: `@testcontainers/postgresql`

### Docker (`packages/db/docker-compose.yml`)

Replace MySQL service with PostgreSQL:
- Image: `postgres:17-alpine`
- Port: `5432`
- Env: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Volume: `nexa_postgres_data` (replace `nexa_mysql_data`)
- Rename service from `nexa-mysql` to `nexa-postgres`

Keep Redis service as-is (already renamed to `nexa-redis` in Stage 1).

### Environment

**`.env.example`:**
- `DATABASE_URL=postgresql://user:password@localhost:5432/nexa`

**`packages/env/src/server.ts`:**
- Update DATABASE_URL validation/default if it references MySQL format
- Review pool-related env vars (`DB_POOL_SIZE`, `DB_QUEUE_LIMIT`, `DB_CONNECTION_TIMEOUT`) — rename or remove as needed to match postgres.js option names

**`packages/env/src/server.test.ts`:**
- Update test DATABASE_URL to PostgreSQL format

### Test infrastructure

**`apps/server/test/helpers/test-container.ts`:**
- Replace `MySqlContainer` with `PostgreSqlContainer` from `@testcontainers/postgresql`
- Replace `drizzle-orm/mysql2/migrator` import with `drizzle-orm/postgres-js/migrator` (or equivalent)
- Remove `mode: "default"` from `drizzle()` call
- Update connection string construction for PostgreSQL format

### Better Auth tables

- The `schema/auth.ts` file contains Better Auth's generated tables using MySQL types
- These need to be regenerated or manually converted to PG types
- Better Auth's Drizzle adapter supports PostgreSQL natively

### Post-step

- Run `bun install`
- Typecheck
- Run tests (testcontainers will spin up PostgreSQL)
- Test `bun run db:seed` explicitly

---

## Stage 4: Documentation cleanup

### Delete

- `docs/plans/` — all 7 files (old project plans)

### Update README.md

- Project name: `nexa`
- Remove storefront references (URLs, scripts, structure diagram)
- Update DB instructions: PostgreSQL instead of MySQL
- Update import examples: `@nexa/ui/components/button`
- Update available scripts list
- Update project structure diagram (no storefront, no transactional, no analytics)

### Update CLAUDE.md

- Rename all `@pxbr/*` to `@nexa/*` in Project Map and throughout
- Remove storefront, transactional, analytics from Project Map
- Update DB references: MySQL to PostgreSQL
- Remove PostHog mentions in middleware section
- Update commands section
- Update gotchas if any reference removed packages

### Post-step (final verification)

- `bun install`
- `cd apps/server && bunx tsgo --noEmit` (typecheck)
- `cd apps/server && bun test` (all tests pass)
- `bun run check` (biome lint/format)

---

## Out of scope

- Adding new domain modules (that's future work)
- Changing auth configuration or roles
- Modifying the DDD/Clean Architecture patterns
- Changing the cache layer implementation
- CI/CD pipeline setup
