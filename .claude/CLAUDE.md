# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Overview

This is a monorepo project. Key languages: TypeScript (primary). Schema validation uses Zod. ORM is Drizzle (MySQL). Auth uses Better Auth. Package manager: Bun. Monorepo orchestration: Turbo.

## Project Map

```text
pxbr/                              # Bun monorepo, Turbo orchestration
├── apps/
│   ├── server/                    # @nexa/server — Elysia API (port 3000)
│   │   ├── src/index.ts           # App entry: Elysia + CORS + OpenAPI + error handler + module routes
│   │   ├── src/container.ts       # tsyringe DI container (Database, CacheClient, ErrorTracker, repos, gateways)
│   │   ├── src/modules/
│   │   │   ├── product/           # Product bounded context
│   │   │   │   ├── domain/        # ProductEntity, ProductId (branded), Price (value object)
│   │   │   │   ├── application/   # Use cases: Create, Get, List, Update, Delete, ToggleActive + DTOs (Zod)
│   │   │   │   ├── infra/         # DrizzleProductRepository (@Cacheable/@CacheInvalidate), persistence mapper
│   │   │   │   ├── presentation/  # product.routes.ts, product-feed.routes.ts (public), response mapper/schemas
│   │   │   │   └── module.ts      # Factory: registers DI, resolves use cases, composes routes
│   │   │   └── authorization/     # Authorization bounded context
│   │   │       ├── domain/        # UserPermissionEntity, UserPermissionId (branded)
│   │   │       ├── application/   # Use cases: Check, Upsert, List, Delete + PermissionPolicyGateway interface
│   │   │       ├── infra/         # DrizzleUserPermissionRepository, BetterAuthPermissionPolicyGateway
│   │   │       ├── presentation/  # authorization.guards.ts (requirePermission/requireAdmin factories),
│   │   │       │                  # authorization.guards.contract.ts (compile-time type assertions),
│   │   │       │                  # authorization.routes.ts (admin CRUD for permission overrides)
│   │   │       └── module.ts      # Factory: creates guards + routes, exports to other modules
│   │   ├── src/shared/
│   │   │   ├── domain/            # Entity<TId,TProps> base, Brand<T,TBrand>, ValueObject base
│   │   │   │   └── errors/        # DomainError tagged union (Validation|NotFound|Conflict|Infra), toHttpStatus()
│   │   │   ├── application/       # UseCase<Output,Input,Error> interface (neverthrow Result)
│   │   │   ├── infra/
│   │   │   │   ├── cache/         # Redis client, @Cacheable/@CacheInvalidate decorators, serializer
│   │   │   │   └── middleware/    # error-handler.ts (Elysia onError hook, PostHog logging)
│   │   │   └── presentation/      # json-response helper, error-response Zod schema
│   │   └── test/                  # Test factories and helpers (vitest)
│   ├── admin/                     # @nexa/admin — React SPA (TanStack Router, Vite)
│   │   ├── src/routes/            # File-based routing: login, products (CRUD), __root
│   │   ├── src/components/        # admin-layout, product-form
│   │   └── src/lib/               # auth-client (Better Auth), eden (Elysia type-safe client), query-client
│   └── storefront/                # @nexa/storefront — React SSR (TanStack Start, Vite)
│       ├── src/routes/            # File-based routing: login, products (list + detail), index, __root
│       ├── src/components/        # header, user-menu, sign-in/up forms, loader
│       └── src/lib/               # auth-client (Better Auth), eden (Elysia type-safe client)
├── packages/
│   ├── auth/                      # @nexa/auth — Better Auth config (Drizzle adapter, admin plugin + AC)
│   │   └── src/permissions.ts     # Access control statement, Resource/Action/Role derived types, role definitions
│   ├── db/                        # @nexa/db — Drizzle ORM (MySQL)
│   │   └── src/schema/            # Tables: product, user-permission, auth (Better Auth tables), relations
│   ├── env/                       # @nexa/env — t3-env typed env vars (server, admin, storefront)
│   ├── analytics/                 # @nexa/analytics — PostHog client + server error tracking
│   ├── ui/                        # @nexa/ui — Shared React components (Base UI + Tailwind)
│   └── config/                    # @nexa/config — Shared tsconfig base
└── docs/plans/                    # Implementation plans (design docs + step-by-step task plans)
```

### Key Patterns

- **Module structure**: `domain/ → application/ → infra/ → presentation/` per bounded context
- **Error handling**: `neverthrow Result<T, DomainError>` — no thrown exceptions in domain/application
- **DI**: tsyringe with `@injectable()` + `@inject("token")`, registration in `container.ts`
- **Entities**: Private constructor, `create()` (validated, returns Result) + `reconstitute()` (from DB)
- **IDs**: Branded types (`Brand<string, "ProductId">`) with `create/generate/unwrap` namespace
- **Guards**: Factory functions returning Elysia `beforeHandle` hooks
- **Soft deletes**: All entities use `deletedAt` timestamp — never hard delete rows
- **Caching**: `@Cacheable()` / `@CacheInvalidate()` decorators on repository methods (Redis)
- **Frontend clients**: Eden (Elysia type-safe RPC) + TanStack Query/Router

## Architecture Principles

- Follow DDD/Clean Architecture/SOLID principles. All new code and refactors must respect bounded contexts, dependency inversion, and clean layer separation.

## Testing

- After any code changes, always run the full test suite before presenting results. Report the test count and pass/fail status.
- Server tests: `cd apps/server && bun test`
- After modifying TypeScript files, run typecheck before considering the task complete. Do not leave unresolved TypeScript errors.
- Server typecheck: `cd apps/server && bunx tsgo --noEmit`
- admin/storefront have no unit tests currently — only server tests are tracked.

## Code Style

- Formatter/linter: Biome (tab indentation, double quotes, semicolons)
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)

## Code Changes

- When renaming symbols, types, or constants, use grep/search to find ALL references across the entire codebase before making changes. Verify no broken references remain after the rename.

## Gotchas

- **DI registration**: Every new repository or gateway class must be registered in `apps/server/src/container.ts` with `container.register(...)` — forgetting this causes runtime DI resolution errors.
- **Env vars**: Typed env schema lives in `packages/env/src/`. Adding a new env var requires updating the schema there AND adding the value to `.env` — without both, t3-env throws at startup.
- **Guards are module-scoped**: Permission guards are created inside `authorization/module.ts` and passed to other modules — never import the shared middleware approach (it was removed).

## Workflows

- **Planning required** for multi-step features, refactors spanning multiple files, or architecture decisions. Use the brainstorming → writing-plans skill workflow before touching code.
- **Just implement** for single-file fixes, bug corrections, or clearly scoped additions — no plan needed.

## Commands

- `bun run dev` — Start all apps (Turbo)
- `bun run dev:server` / `bun run dev:admin` / `bun run dev:storefront` — Start individual apps
- `cd apps/server && bun test` — Run server tests (vitest)
- `cd apps/server && bunx bunx tsgo --noEmit` — Typecheck server
- `bun run check` — Lint/format check + auto-fix (Biome, runs at monorepo root, covers all apps)
- `bun run format` — Aggressive format with unsafe transforms (Biome)
- `bun run lint` — Turbo lint pipeline across all packages
- `bun run check-types` — Turbo typecheck pipeline across all packages
- `bun run db:push` — Push schema changes to DB (no migration file)
- `bun run db:generate` / `bun run db:migrate` — Generate and run migrations
