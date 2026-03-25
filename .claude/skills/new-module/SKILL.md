---
name: new-module
description: Scaffold a new DDD bounded context module under apps/server/src/modules/
disable-model-invocation: true
---

Create a new bounded context module following the project's DDD/Clean Architecture patterns.

Usage: `/new-module <ModuleName>` (e.g., `/new-module Order`)

`$ARGUMENTS` contains the module name. If not provided, ask the user.

## Directory Structure

Create the following under `apps/server/src/modules/<module-name>/`:

```
<module-name>/
├── domain/
│   ├── entities/<module-name>.entity.ts
│   ├── value-objects/<module-name>-id.vo.ts
│   └── repositories/<module-name>.repository.ts
├── application/
│   ├── dtos/
│   └── use-cases/
├── infra/
│   ├── repositories/drizzle-<module-name>.repository.ts
│   └── mappers/<module-name>-persistence.mapper.ts
├── presentation/
│   ├── <module-name>.routes.ts
│   ├── schemas/<module-name>-response.schema.ts
│   └── mappers/<module-name>-response.mapper.ts
└── module.ts
```

## File Templates

Follow these exact patterns from the existing codebase:

### ID Value Object (`domain/value-objects/<name>-id.vo.ts`)
- Branded type: `Brand<string, "<Name>Id">`
- Namespace with `create`, `generate`, `unwrap` (see `@/shared/domain/brand.ts`)

### Entity (`domain/entities/<name>.entity.ts`)
- Extends `Entity<TId, TProps>` from `@/shared/domain/entity.base.ts`
- Private constructor
- Static `create()` returning `Result<Entity, DomainError>` with validation
- Static `reconstitute()` for DB hydration (no validation)
- `softDelete()` method setting `deletedAt` + deactivating
- Private `touch()` method updating `updatedAt`
- Always include `deletedAt: Date | null`, `createdAt: Date`, `updatedAt: Date` in props

### Repository Interface (`domain/repositories/<name>.repository.ts`)
- Pure interface (no implementation details)
- Methods return `Promise<Result<T, InfraError>>`
- Include: `findById`, `findAll` (with `PaginationParams`), `save`, `delete`

### Module Factory (`module.ts`)
- Register DI: `container.register("<Name>Repository", { useClass: Drizzle<Name>Repository })`
- Export `create<Name>Module(deps)` factory that resolves use cases and composes routes
- Accept `requirePermission` guard from authorization module

## After Scaffolding

1. Remind the user to add the Drizzle schema table in `packages/db/src/schema/`
2. Remind the user to register any new DI tokens in `apps/server/src/container.ts` if needed beyond the module-local registration
3. Remind the user to wire the module in `apps/server/src/index.ts`
4. Ask what use cases they want to implement first
