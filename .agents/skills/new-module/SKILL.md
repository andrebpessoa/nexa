---
name: new-module
description: Scaffold a new DDD bounded context module under apps/server/src/modules/
disable-model-invocation: true
---

Create a new bounded context module following the project's DDD/Clean Architecture patterns.

Usage: `/new-module <ModuleName>` (e.g., `/new-module Order`)

`$ARGUMENTS` contains the module name in PascalCase. If not provided, ask the user.

Throughout these templates:
- `<Name>` = PascalCase (e.g., `Order`)
- `<name>` = kebab-case (e.g., `order`)
- `<nameToken>` = DI injection token string (e.g., `"OrderRepository"`)

---

## Step 1 — Validators (packages/db/src/validators/<name>.ts)

Validators are generated from Drizzle schemas using `drizzle-orm/zod`. The schema table must already exist in `packages/db/src/schema/<name>.ts`.

```typescript
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import z from "zod";
import { <name> } from "../schema/<name>.ts";

export const <name>SelectSchema = createSelectSchema(<name>);
export const <name>InsertSchema = createInsertSchema(<name>);
export const <name>ResponseSchema = <name>SelectSchema.extend({
	deletedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type <Name>Row = z.infer<typeof <name>SelectSchema>;
export type <Name>InsertRow = z.infer<typeof <name>InsertSchema>;
export type <Name>Response = z.infer<typeof <name>ResponseSchema>;
```

Also add `export * from "./<name>.ts";` to `packages/db/src/validators/index.ts`.

---

## Step 2 — Directory Structure

Create the following under `apps/server/src/modules/<name>/`:

```
<name>/
├── domain/
│   ├── entities/<name>.entity.ts
│   ├── value-objects/<name>-id.vo.ts
│   └── repositories/<name>.repository.ts
├── application/
│   ├── dtos/
│   │   ├── create-<name>.dto.ts
│   │   └── update-<name>.dto.ts
│   └── use-cases/
│       ├── create-<name>.use-case.ts
│       ├── get-<name>.use-case.ts
│       ├── list-<name>s.use-case.ts
│       ├── update-<name>.use-case.ts
│       └── delete-<name>.use-case.ts
├── infra/
│   ├── repositories/drizzle-<name>.repository.ts
│   └── mappers/<name>-persistence.mapper.ts
├── presentation/
│   ├── <name>.routes.ts
│   ├── schemas/<name>-response.schema.ts
│   └── mappers/<name>-response.mapper.ts
└── module.ts
```

Also create test factories under `apps/server/test/factories/`:
```
test/factories/
├── <name>.factory.ts
└── <name>-repository.mock.ts
```

---

## Step 3 — Domain Layer

### ID Value Object (`domain/value-objects/<name>-id.vo.ts`)

```typescript
import { type Brand, Branded } from "@/shared/domain/brand.ts";

export type <Name>Id = Brand<string, "<Name>Id">;

export const <Name>Id = {
	create: (value: string): <Name>Id =>
		Branded.cast<string, "<Name>Id">(value),
	generate: (): <Name>Id =>
		Branded.cast<string, "<Name>Id">(crypto.randomUUID()),
	unwrap: (value: <Name>Id): string =>
		Branded.unwrap<string, "<Name>Id">(value),
} as const;
```

### Entity (`domain/entities/<name>.entity.ts`)

```typescript
import { err, ok, type Result } from "neverthrow";
import { Entity } from "@/shared/domain/entity.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { <Name>Id } from "../value-objects/<name>-id.vo.ts";

export interface <Name>Props {
	// TODO: add domain-specific fields here
	active: boolean;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export class <Name>Entity extends Entity<<Name>Id, <Name>Props> {
	private constructor(id: <Name>Id, props: <Name>Props) {
		super(id, props);
	}

	static create(params: {
		id: <Name>Id;
		// TODO: add fields here
		active: boolean;
		createdAt: Date;
		updatedAt: Date;
	}): Result<<Name>Entity, DomainError> {
		// TODO: add domain validation here
		// Example: if (!params.name.trim()) return err(DE.validation("Name cannot be empty", "name"));

		return ok(
			new <Name>Entity(params.id, {
				// TODO: map params to props
				active: params.active,
				deletedAt: null,
				createdAt: params.createdAt,
				updatedAt: params.updatedAt,
			}),
		);
	}

	static reconstitute(id: <Name>Id, props: <Name>Props): <Name>Entity {
		return new <Name>Entity(id, props);
	}

	// TODO: add update() method if applicable
	// update(params: { ... }): Result<void, DomainError> { ... }

	activate(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("Cannot activate a deleted <name>"));
		}
		this.props.active = true;
		this.touch();
		return ok(undefined);
	}

	deactivate(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("Cannot deactivate a deleted <name>"));
		}
		this.props.active = false;
		this.touch();
		return ok(undefined);
	}

	softDelete(): Result<void, DomainError> {
		if (this.props.deletedAt !== null) {
			return err(DE.validation("<Name> is already deleted"));
		}
		this.props.deletedAt = new Date();
		this.props.active = false;
		this.touch();
		return ok(undefined);
	}

	private touch(): void {
		this.props.updatedAt = new Date();
	}

	// Getters — expose all props
	// TODO: add getters for domain-specific fields
	get active(): boolean { return this.props.active; }
	get isDeleted(): boolean { return this.props.deletedAt !== null; }
	get deletedAt(): Date | null { return this.props.deletedAt; }
	get createdAt(): Date { return this.props.createdAt; }
	get updatedAt(): Date { return this.props.updatedAt; }
}
```

### Repository Interface (`domain/repositories/<name>.repository.ts`)

```typescript
import type { Result } from "neverthrow";
import type { InfraError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import type { <Name>Entity } from "../entities/<name>.entity.ts";
import type { <Name>Id } from "../value-objects/<name>-id.vo.ts";

export interface <Name>Repository {
	findById(id: <Name>Id): Promise<Result<<Name>Entity | null, InfraError>>;
	findAll(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<<Name>Entity>, InfraError>>;
	findAllActive(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<<Name>Entity>, InfraError>>;
	findActiveById(
		id: <Name>Id,
	): Promise<Result<<Name>Entity | null, InfraError>>;
	save(<name>: <Name>Entity): Promise<Result<void, InfraError>>;
	delete(id: <Name>Id): Promise<Result<void, InfraError>>;
}
```

---

## Step 4 — Application Layer

### DTOs (`application/dtos/create-<name>.dto.ts`)

One Zod schema per use case input. Export schema + inferred type.

```typescript
import z from "zod";

export const create<Name>Dto = z.object({
	// TODO: add validated fields
	// Example: name: z.string().trim().min(1).max(255),
});

export type Create<Name>Dto = z.infer<typeof create<Name>Dto>;
```

```typescript
// application/dtos/update-<name>.dto.ts
import z from "zod";

export const update<Name>Dto = z.object({
	// TODO: mirror create fields
});

export type Update<Name>Dto = z.infer<typeof update<Name>Dto>;
```

### Use Cases

**Create** (`application/use-cases/create-<name>.use-case.ts`):

```typescript
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import type { Create<Name>Dto } from "../dtos/create-<name>.dto.ts";

@injectable()
export class Create<Name>UseCase implements UseCase<<Name>Entity, Create<Name>Dto> {
	constructor(
		@inject("<Name>Repository")
		private readonly <name>Repo: <Name>Repository,
	) {}

	async execute(dto: Create<Name>Dto): Promise<Result<<Name>Entity, DomainError>> {
		const now = new Date();
		const <name>OrError = <Name>Entity.create({
			id: <Name>Id.generate(),
			// TODO: map dto fields
			active: true,
			createdAt: now,
			updatedAt: now,
		});
		if (<name>OrError.isErr()) return err(<name>OrError.error);

		const <name> = <name>OrError.value;
		const saveResult = await this.<name>Repo.save(<name>);
		if (saveResult.isErr()) return err(saveResult.error);

		return ok(<name>);
	}
}
```

**Get** (`application/use-cases/get-<name>.use-case.ts`):

```typescript
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";

@injectable()
export class Get<Name>UseCase implements UseCase<<Name>Entity, <Name>Id> {
	constructor(
		@inject("<Name>Repository")
		private readonly <name>Repo: <Name>Repository,
	) {}

	async execute(id: <Name>Id): Promise<Result<<Name>Entity, DomainError>> {
		const result = await this.<name>Repo.findById(id);
		if (result.isErr()) return err(result.error);

		const <name> = result.value;
		if (!<name>) return err(DE.notFound("<Name>", <Name>Id.unwrap(id)));

		return ok(<name>);
	}
}
```

**List** (`application/use-cases/list-<name>s.use-case.ts`):

```typescript
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import type { DomainError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import type { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";

@injectable()
export class List<Name>sUseCase
	implements UseCase<PaginatedResult<<Name>Entity>, PaginationParams>
{
	constructor(
		@inject("<Name>Repository")
		private readonly <name>Repo: <Name>Repository,
	) {}

	async execute(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<<Name>Entity>, DomainError>> {
		const result = await this.<name>Repo.findAll(params);
		if (result.isErr()) return err(result.error);
		return ok(result.value);
	}
}
```

**Update** (`application/use-cases/update-<name>.use-case.ts`):

```typescript
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";
import type { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import type { Update<Name>Dto } from "../dtos/update-<name>.dto.ts";

export interface Update<Name>Input {
	id: <Name>Id;
	dto: Update<Name>Dto;
}

@injectable()
export class Update<Name>UseCase implements UseCase<<Name>Entity, Update<Name>Input> {
	constructor(
		@inject("<Name>Repository")
		private readonly <name>Repo: <Name>Repository,
	) {}

	async execute(input: Update<Name>Input): Promise<Result<<Name>Entity, DomainError>> {
		const result = await this.<name>Repo.findById(input.id);
		if (result.isErr()) return err(result.error);

		const <name> = result.value;
		if (!<name>) return err(DE.notFound("<Name>", <Name>Id.unwrap(input.id)));

		const updateResult = <name>.update({ /* TODO: map from input.dto */ });
		if (updateResult.isErr()) return err(updateResult.error);

		const saveResult = await this.<name>Repo.save(<name>);
		if (saveResult.isErr()) return err(saveResult.error);

		return ok(<name>);
	}
}
```

**Delete** (`application/use-cases/delete-<name>.use-case.ts`):

```typescript
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import type { UseCase } from "@/shared/application/use-case.base.ts";
import {
	DomainError as DE,
	type DomainError,
} from "@/shared/domain/errors/index.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";
import type { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import { <Name>Id as <Name>IdVo } from "../../domain/value-objects/<name>-id.vo.ts";

@injectable()
export class Delete<Name>UseCase implements UseCase<void, <Name>Id> {
	constructor(
		@inject("<Name>Repository")
		private readonly <name>Repo: <Name>Repository,
	) {}

	async execute(id: <Name>Id): Promise<Result<void, DomainError>> {
		const result = await this.<name>Repo.findById(id);
		if (result.isErr()) return err(result.error);

		const <name> = result.value;
		if (!<name>) return err(DE.notFound("<Name>", <Name>IdVo.unwrap(id)));

		const deleteResult = <name>.softDelete();
		if (deleteResult.isErr()) return err(deleteResult.error);

		const saveResult = await this.<name>Repo.save(<name>);
		if (saveResult.isErr()) return err(saveResult.error);

		return ok(undefined);
	}
}
```

---

## Step 5 — Infra Layer

### Persistence Mapper (`infra/mappers/<name>-persistence.mapper.ts`)

```typescript
import type { <Name>Row } from "@pxbr/db/validators/<name>";
import { err, ok, type Result } from "neverthrow";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";

export class <Name>PersistenceMapper {
	static toDomain(row: <Name>Row): Result<<Name>Entity, InfraError> {
		// TODO: validate/reconstruct any value objects here
		// If value object validation fails: return err(DomainError.infra("Invalid ...", error))

		return ok(
			<Name>Entity.reconstitute(<Name>Id.create(row.id), {
				// TODO: map row fields to props
				active: row.active,
				deletedAt: row.deletedAt,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			}),
		);
	}

	static toPersistence(entity: <Name>Entity) {
		return {
			id: entity.idValue,
			// TODO: map entity getters to DB columns
			active: entity.active,
			deletedAt: entity.deletedAt,
		};
	}
}
```

### Drizzle Repository (`infra/repositories/drizzle-<name>.repository.ts`)

```typescript
import { <name> } from "@pxbr/db/schema/<name>";
import { and, count, eq, isNull, type SQL } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import { inject, injectable } from "tsyringe";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import type {
	PaginatedResult,
	PaginationParams,
} from "@/shared/domain/pagination.ts";
import {
	Cacheable,
	CacheInvalidate,
} from "@/shared/infra/cache/cache.decorators.ts";
import type { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import type { <Name>Repository } from "../../domain/repositories/<name>.repository.ts";
import type { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import { <Name>Id as <Name>IdVo } from "../../domain/value-objects/<name>-id.vo.ts";
import { <Name>ResponseMapper } from "../../presentation/mappers/<name>-response.mapper.ts";
import { <Name>PersistenceMapper } from "../mappers/<name>-persistence.mapper.ts";

@injectable()
export class Drizzle<Name>Repository implements <Name>Repository {
	constructor(
		@inject("Database") private readonly db: typeof import("@pxbr/db")["db"],
	) {}

	@Cacheable({
		ttl: 300,
		serialize: (entity: <Name>Entity | null) =>
			entity ? <Name>ResponseMapper.toResponse(entity) : null,
		hydrate: <Name>ResponseMapper.fromCacheOrNull,
	})
	async findById(id: <Name>Id): Promise<Result<<Name>Entity | null, InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(<name>)
				.where(
					and(
						eq(<name>.id, <Name>IdVo.unwrap(id)),
						isNull(<name>.deletedAt),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = <Name>PersistenceMapper.toDomain(row);
			if (mapped.isErr()) return err(mapped.error);
			return ok(mapped.value);
		} catch (error) {
			return err(DomainError.infra("Failed to find <name> by id", error));
		}
	}

	async findAll(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<<Name>Entity>, InfraError>> {
		return this.paginatedQuery(
			isNull(<name>.deletedAt),
			params,
			"Failed to list <name>s",
		);
	}

	async findAllActive(
		params: PaginationParams,
	): Promise<Result<PaginatedResult<<Name>Entity>, InfraError>> {
		return this.paginatedQuery(
			and(eq(<name>.active, true), isNull(<name>.deletedAt)),
			params,
			"Failed to list active <name>s",
		);
	}

	private async paginatedQuery(
		where: SQL | undefined,
		params: PaginationParams,
		errorMessage: string,
	): Promise<Result<PaginatedResult<<Name>Entity>, InfraError>> {
		try {
			const [rows, countRows] = await Promise.all([
				this.db.select().from(<name>).where(where).limit(params.limit).offset(params.offset),
				this.db.select({ total: count() }).from(<name>).where(where),
			]);
			const entities: <Name>Entity[] = [];
			for (const row of rows) {
				const mapped = <Name>PersistenceMapper.toDomain(row);
				if (mapped.isErr()) return err(mapped.error);
				entities.push(mapped.value);
			}
			return ok({
				items: entities,
				total: Number(countRows[0]?.total ?? 0),
				limit: params.limit,
				offset: params.offset,
			});
		} catch (error) {
			return err(DomainError.infra(errorMessage, error));
		}
	}

	@Cacheable({
		ttl: 300,
		serialize: (entity: <Name>Entity | null) =>
			entity ? <Name>ResponseMapper.toResponse(entity) : null,
		hydrate: <Name>ResponseMapper.fromCacheOrNull,
	})
	async findActiveById(id: <Name>Id): Promise<Result<<Name>Entity | null, InfraError>> {
		try {
			const rows = await this.db
				.select()
				.from(<name>)
				.where(
					and(
						eq(<name>.id, <Name>IdVo.unwrap(id)),
						eq(<name>.active, true),
						isNull(<name>.deletedAt),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const mapped = <Name>PersistenceMapper.toDomain(row);
			if (mapped.isErr()) return err(mapped.error);
			return ok(mapped.value);
		} catch (error) {
			return err(DomainError.infra("Failed to find active <name> by id", error));
		}
	}

	@CacheInvalidate()
	async save(entity: <Name>Entity): Promise<Result<void, InfraError>> {
		try {
			const data = <Name>PersistenceMapper.toPersistence(entity);
			await this.db
				.insert(<name>)
				.values(data)
				.onDuplicateKeyUpdate({
					set: {
						// TODO: list updatable columns (not id, not createdAt)
						active: data.active,
						deletedAt: data.deletedAt,
					},
				});
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to save <name>", error));
		}
	}

	@CacheInvalidate()
	async delete(id: <Name>Id): Promise<Result<void, InfraError>> {
		try {
			await this.db
				.update(<name>)
				.set({ deletedAt: new Date() })
				.where(eq(<name>.id, <Name>IdVo.unwrap(id)));
			return ok(undefined);
		} catch (error) {
			return err(DomainError.infra("Failed to soft delete <name>", error));
		}
	}
}
```

---

## Step 6 — Presentation Layer

### Response Schema (`presentation/schemas/<name>-response.schema.ts`)

Re-exports from the shared validators package:

```typescript
export {
	type <Name>Response,
	<name>ResponseSchema,
} from "@pxbr/db/validators/<name>";
```

### Response Mapper (`presentation/mappers/<name>-response.mapper.ts`)

```typescript
import { <Name>Entity } from "../../domain/entities/<name>.entity.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import {
	type <Name>Response,
	<name>ResponseSchema,
} from "../schemas/<name>-response.schema.ts";

export class <Name>ResponseMapper {
	static toResponse(entity: <Name>Entity): <Name>Response {
		return {
			id: entity.idValue,
			// TODO: map all entity getters — dates use .toISOString()
			// Example: deletedAt: entity.deletedAt?.toISOString() ?? null,
			active: entity.active,
			deletedAt: entity.deletedAt?.toISOString() ?? null,
			createdAt: entity.createdAt.toISOString(),
			updatedAt: entity.updatedAt.toISOString(),
		};
	}

	static fromCacheOrNull(plain: unknown): <Name>Entity | null {
		if (!isRecord(plain)) return null;

		const parsed = <name>ResponseSchema.safeParse(normalizeCachePayload(plain));
		if (!parsed.success) return null;

		const data = parsed.data;
		// TODO: reconstruct value objects if any, return null if they fail

		return <Name>Entity.reconstitute(<Name>Id.create(data.id), {
			// TODO: map data fields back to props — ISO strings → new Date()
			active: data.active,
			deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		});
	}

	static fromCacheList(plain: unknown): <Name>Entity[] {
		if (!Array.isArray(plain)) return [];
		return plain
			.map((item) => <Name>ResponseMapper.fromCacheOrNull(item))
			.filter((entity): entity is <Name>Entity => entity !== null);
	}
}

function normalizeCachePayload(plain: Record<string, unknown>): unknown {
	return {
		...plain,
		deletedAt: normalizeDateField(plain.deletedAt),
		createdAt: normalizeDateField(plain.createdAt),
		updatedAt: normalizeDateField(plain.updatedAt),
	};
}

function normalizeDateField(value: unknown): unknown {
	return value instanceof Date ? value.toISOString() : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

### Routes (`presentation/<name>.routes.ts`)

```typescript
import { Elysia } from "elysia";
import * as z from "zod";
import { toErrorResponse, toHttpStatus } from "@/shared/domain/errors/index.ts";
import { jsonResponse } from "@/shared/presentation/helpers/json-response.ts";
import { errorResponseSchema } from "@/shared/presentation/schemas/error-response.schema.ts";
import {
	paginatedResponseSchema,
	paginationQuerySchema,
} from "@/shared/presentation/schemas/pagination.schema.ts";
import type { RequirePermissionGuardFactory } from "../../authorization/presentation/authorization.guards.ts";
import { create<Name>Dto } from "../application/dtos/create-<name>.dto.ts";
import { update<Name>Dto } from "../application/dtos/update-<name>.dto.ts";
import type { Create<Name>UseCase } from "../application/use-cases/create-<name>.use-case.ts";
import type { Delete<Name>UseCase } from "../application/use-cases/delete-<name>.use-case.ts";
import type { Get<Name>UseCase } from "../application/use-cases/get-<name>.use-case.ts";
import type { List<Name>sUseCase } from "../application/use-cases/list-<name>s.use-case.ts";
import type { Update<Name>UseCase } from "../application/use-cases/update-<name>.use-case.ts";
import { <Name>Id } from "../domain/value-objects/<name>-id.vo.ts";
import { <Name>ResponseMapper } from "./mappers/<name>-response.mapper.ts";
import { <name>ResponseSchema } from "./schemas/<name>-response.schema.ts";

interface <Name>RouteDeps {
	create<Name>: Create<Name>UseCase;
	list<Name>s: List<Name>sUseCase;
	get<Name>: Get<Name>UseCase;
	update<Name>: Update<Name>UseCase;
	delete<Name>: Delete<Name>UseCase;
	requirePermission: RequirePermissionGuardFactory;
}

const paginated<Name>ResponseSchema = paginatedResponseSchema(<name>ResponseSchema);

export const <name>Routes = (deps: <Name>RouteDeps) =>
	new Elysia({ prefix: "/api/<name>s" })
		.get(
			"/",
			async ({ query }) => {
				const limit = query.limit ?? 50;
				const offset = query.offset ?? 0;
				const result = await deps.list<Name>s.execute({ limit, offset });

				return result.match(
					(data) =>
						jsonResponse({
							items: data.items.map(<Name>ResponseMapper.toResponse),
							total: data.total,
							limit: data.limit,
							offset: data.offset,
						}),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("<name>", "read")],
				detail: { tags: ["<name>s"], summary: "List all <name>s" },
				query: paginationQuerySchema,
				response: {
					200: paginated<Name>ResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.get(
			"/:id",
			async ({ params }) => {
				const result = await deps.get<Name>.execute(<Name>Id.create(params.id));

				return result.match(
					(<name>) => jsonResponse(<Name>ResponseMapper.toResponse(<name>)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("<name>", "read")],
				detail: { tags: ["<name>s"], summary: "Get <name> by ID" },
				response: {
					200: <name>ResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.post(
			"/",
			async ({ body }) => {
				const result = await deps.create<Name>.execute(body);

				return result.match(
					(<name>) => jsonResponse(<Name>ResponseMapper.toResponse(<name>), 201),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("<name>", "create")],
				detail: { tags: ["<name>s"], summary: "Create a new <name>" },
				body: create<Name>Dto,
				response: {
					201: <name>ResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					422: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.put(
			"/:id",
			async ({ params, body }) => {
				const result = await deps.update<Name>.execute({
					id: <Name>Id.create(params.id),
					dto: body,
				});

				return result.match(
					(<name>) => jsonResponse(<Name>ResponseMapper.toResponse(<name>)),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("<name>", "update")],
				detail: { tags: ["<name>s"], summary: "Update <name> by ID" },
				body: update<Name>Dto,
				response: {
					200: <name>ResponseSchema,
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					422: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		)
		.delete(
			"/:id",
			async ({ params }) => {
				const result = await deps.delete<Name>.execute(<Name>Id.create(params.id));

				return result.match(
					() => jsonResponse({ success: true }),
					(error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
				);
			},
			{
				beforeHandle: [deps.requirePermission("<name>", "delete")],
				detail: { tags: ["<name>s"], summary: "Soft delete <name> by ID" },
				response: {
					200: z.object({ success: z.boolean() }),
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		);
```

---

## Step 7 — Module Factory (`module.ts`)

DI registration happens here (NOT in `container.ts`). `container.ts` is for infrastructure only (Database, CacheClient, Auth, ErrorTracker).

```typescript
import { container } from "@/container.ts";
import type { RequirePermissionGuardFactory } from "../authorization/presentation/authorization.guards.ts";
import { Create<Name>UseCase } from "./application/use-cases/create-<name>.use-case.ts";
import { Delete<Name>UseCase } from "./application/use-cases/delete-<name>.use-case.ts";
import { Get<Name>UseCase } from "./application/use-cases/get-<name>.use-case.ts";
import { List<Name>sUseCase } from "./application/use-cases/list-<name>s.use-case.ts";
import { Update<Name>UseCase } from "./application/use-cases/update-<name>.use-case.ts";
import { Drizzle<Name>Repository } from "./infra/repositories/drizzle-<name>.repository.ts";
import { <name>Routes } from "./presentation/<name>.routes.ts";

container.register("<Name>Repository", {
	useClass: Drizzle<Name>Repository,
});

interface <Name>ModuleDeps {
	requirePermission: RequirePermissionGuardFactory;
}

export const create<Name>Module = (deps: <Name>ModuleDeps) => ({
	routes: <name>Routes({
		create<Name>: container.resolve(Create<Name>UseCase),
		list<Name>s: container.resolve(List<Name>sUseCase),
		get<Name>: container.resolve(Get<Name>UseCase),
		update<Name>: container.resolve(Update<Name>UseCase),
		delete<Name>: container.resolve(Delete<Name>UseCase),
		requirePermission: deps.requirePermission,
	}),
});
```

---

## Step 8 — Test Factories

### Entity factory (`test/factories/<name>.factory.ts`):

```typescript
import { <Name>Entity } from "../../src/modules/<name>/domain/entities/<name>.entity.ts";
import { <Name>Id } from "../../src/modules/<name>/domain/value-objects/<name>-id.vo.ts";

interface <Name>Overrides {
	id?: string;
	// TODO: add domain-specific field overrides
	active?: boolean;
	createdAt?: Date;
	updatedAt?: Date;
}

export function make<Name>(overrides: <Name>Overrides = {}): <Name>Entity {
	const now = new Date();
	return <Name>Entity.create({
		id: <Name>Id.create(overrides.id ?? crypto.randomUUID()),
		// TODO: map overrides to create() params
		active: overrides.active ?? true,
		createdAt: overrides.createdAt ?? now,
		updatedAt: overrides.updatedAt ?? now,
	})._unsafeUnwrap();
}
```

### Repository mock (`test/factories/<name>-repository.mock.ts`):

```typescript
import { ok } from "neverthrow";
import { vi } from "vitest";
import type { <Name>Repository } from "@/modules/<name>/domain/repositories/<name>.repository.ts";

export function makeMock<Name>Repository(
	overrides: Partial<<Name>Repository> = {},
): <Name>Repository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(),
		findAllActive: vi.fn(),
		findActiveById: vi.fn(),
		save: vi.fn().mockResolvedValue(ok(undefined)),
		delete: vi.fn(),
		...overrides,
	};
}
```

### Example use case test:

```typescript
// application/use-cases/create-<name>.use-case.test.ts
import "reflect-metadata";
import { err } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { Create<Name>UseCase } from "./<name>-use-case.ts";

describe("Create<Name>UseCase", () => {
	it("should create successfully", async () => {
		const mockRepo = makeMock<Name>Repository();
		const useCase = new Create<Name>UseCase(mockRepo);

		const result = await useCase.execute({ /* TODO: valid dto */ });

		expect(result.isOk()).toBe(true);
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should propagate repository error", async () => {
		const repoError = DomainError.infra("DB connection lost");
		const mockRepo = makeMock<Name>Repository({
			save: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new Create<Name>UseCase(mockRepo);

		const result = await useCase.execute({ /* TODO: valid dto */ });

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
```

---

## Step 9 — Wire in `apps/server/src/index.ts`

Authorization module must be initialized first (it provides guards):

```typescript
// Add import at top
import { create<Name>Module } from "./modules/<name>/module.ts";

// After authorizationModule initialization, add:
const <name>Module = create<Name>Module({
	requirePermission: authorizationModule.guards.requirePermission,
});

// In the Elysia chain, add:
.use(<name>Module.routes)
```

---

## Step 10 — Register permissions in `packages/auth/src/permissions.ts`

Add `"<name>"` as a resource with its valid actions so the permission guard accepts it:

```typescript
// In the access control statement, add:
"<name>": ["create", "read", "update", "delete"],
```

---

---

## Step 11 — Test Templates

Every test file must import `"reflect-metadata"` at the top when using tsyringe classes. Use vitest (`describe`, `it`, `expect`, `vi`). Use `_unsafeUnwrap()` / `_unsafeUnwrapErr()` in tests — never in production code.

### Validators (`packages/db/src/validators/<name>.test.ts`)

The validator test lives in `packages/db/src/validators/`, not in `apps/server`. Run with `cd packages/db && bun test`.

```typescript
import { describe, expect, it } from "vitest";
import { <name>ResponseSchema, <name>SelectSchema, <name>InsertSchema } from "./<name>.ts";

// TODO: fill in all required columns with valid values matching the Drizzle schema
const validRow = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	// TODO: add domain-specific fields
	active: true,
	deletedAt: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("<name>SelectSchema", () => {
	it("should accept a valid database row (Date objects)", () => {
		const result = <name>SelectSchema.safeParse(validRow);
		expect(result.success).toBe(true);
	});
});

describe("<name>ResponseSchema", () => {
	it("should accept a valid response with ISO date strings", () => {
		const valid = {
			...validRow,
			deletedAt: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		};

		const result = <name>ResponseSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	it("should reject Date objects in timestamp fields", () => {
		const invalid = {
			...validRow,
			// Date objects are not valid — must be ISO strings in responses
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = <name>ResponseSchema.safeParse(invalid);
		expect(result.success).toBe(false);
	});

	it("should accept null for deletedAt", () => {
		const result = <name>ResponseSchema.safeParse({
			...validRow,
			deletedAt: null,
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(true);
	});

	it("should accept an ISO string for deletedAt", () => {
		const result = <name>ResponseSchema.safeParse({
			...validRow,
			deletedAt: "2026-06-01T00:00:00.000Z",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(true);
	});
});
```

---

### ID Value Object (`domain/value-objects/<name>-id.vo.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { <Name>Id } from "./<name>-id.vo.ts";

describe("<Name>Id", () => {
	it("should create a <Name>Id from a string", () => {
		const id = <Name>Id.create("abc-123");
		expect(<Name>Id.unwrap(id)).toBe("abc-123");
	});

	it("should generate unique ids", () => {
		const id1 = <Name>Id.generate();
		const id2 = <Name>Id.generate();
		expect(<Name>Id.unwrap(id1)).not.toBe(<Name>Id.unwrap(id2));
	});
});
```

### Entity (`domain/entities/<name>.entity.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { <Name>Id } from "../value-objects/<name>-id.vo.ts";
import { <Name>Entity } from "./<name>.entity.ts";

describe("<Name>Entity", () => {
	const now = new Date();

	function createValid(overrides: Partial<{ id: string; active: boolean }> = {}) {
		return <Name>Entity.create({
			id: <Name>Id.create(overrides.id ?? "test-id"),
			// TODO: fill in required params with sensible defaults
			active: overrides.active ?? true,
			createdAt: now,
			updatedAt: now,
		});
	}

	describe("create", () => {
		it("should create with valid params", () => {
			const result = createValid();
			expect(result.isOk()).toBe(true);
			const entity = result._unsafeUnwrap();
			expect(entity.idValue).toBe("test-id");
			expect(entity.active).toBe(true);
			expect(entity.deletedAt).toBeNull();
		});

		// TODO: add validation failure cases specific to this entity
		// it("should reject empty ...", () => { ... });
	});

	describe("softDelete", () => {
		it("should soft delete", () => {
			const entity = createValid()._unsafeUnwrap();
			expect(entity.softDelete().isOk()).toBe(true);
			expect(entity.isDeleted).toBe(true);
			expect(entity.active).toBe(false);
			expect(entity.deletedAt).toBeInstanceOf(Date);
		});

		it("should fail to delete an already deleted entity", () => {
			const entity = createValid()._unsafeUnwrap();
			entity.softDelete();
			expect(entity.softDelete().isErr()).toBe(true);
		});
	});

	describe("activate / deactivate", () => {
		it("should deactivate an active entity", () => {
			const entity = createValid({ active: true })._unsafeUnwrap();
			expect(entity.deactivate().isOk()).toBe(true);
			expect(entity.active).toBe(false);
		});

		it("should activate an inactive entity", () => {
			const entity = createValid({ active: false })._unsafeUnwrap();
			expect(entity.activate().isOk()).toBe(true);
			expect(entity.active).toBe(true);
		});

		it("should fail to activate a deleted entity", () => {
			const entity = createValid()._unsafeUnwrap();
			entity.softDelete();
			expect(entity.activate().isErr()).toBe(true);
		});

		it("should fail to deactivate a deleted entity", () => {
			const entity = createValid()._unsafeUnwrap();
			entity.softDelete();
			expect(entity.deactivate().isErr()).toBe(true);
		});
	});

	describe("equals", () => {
		it("should compare by id", () => {
			const e1 = createValid({ id: "same" })._unsafeUnwrap();
			const e2 = createValid({ id: "same" })._unsafeUnwrap();
			expect(e1.equals(e2)).toBe(true);
		});

		it("should not be equal with different ids", () => {
			const e1 = createValid({ id: "id-1" })._unsafeUnwrap();
			const e2 = createValid({ id: "id-2" })._unsafeUnwrap();
			expect(e1.equals(e2)).toBe(false);
		});
	});
});
```

### Create Use Case (`application/use-cases/create-<name>.use-case.test.ts`)

```typescript
import "reflect-metadata";
import { err } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { create<Name>Dto } from "../dtos/create-<name>.dto.ts";
import { Create<Name>UseCase } from "./create-<name>.use-case.ts";

describe("Create<Name>UseCase", () => {
	it("should create successfully", async () => {
		const mockRepo = makeMock<Name>Repository();
		const useCase = new Create<Name>UseCase(mockRepo);

		// TODO: use valid dto values
		const result = await useCase.execute({ /* valid fields */ });

		expect(result.isOk()).toBe(true);
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should propagate repository save error", async () => {
		const repoError = DomainError.infra("DB connection lost");
		const mockRepo = makeMock<Name>Repository({
			save: vi.fn().mockResolvedValue(err(repoError)),
		});
		const useCase = new Create<Name>UseCase(mockRepo);

		const result = await useCase.execute({ /* valid fields */ });

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});

	// TODO: add DTO validation tests using create<Name>Dto.safeParse()
	// it("should reject invalid ...", () => {
	//   const parsed = create<Name>Dto.safeParse({ ... });
	//   expect(parsed.success).toBe(false);
	// });
});
```

### Get Use Case (`application/use-cases/get-<name>.use-case.test.ts`)

```typescript
import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { make<Name> } from "../../../../../test/factories/<name>.factory.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import { Get<Name>UseCase } from "./get-<name>.use-case.ts";

describe("Get<Name>UseCase", () => {
	it("should return the entity when found", async () => {
		const entity = make<Name>({ id: "existing-id" });
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(entity)),
		});
		const useCase = new Get<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("existing-id"));

		expect(result.isOk()).toBe(true);
		expect(mockRepo.findById).toHaveBeenCalledWith(<Name>Id.create("existing-id"));
	});

	it("should return NotFoundError when entity does not exist", async () => {
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new Get<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("missing-id"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(result._unsafeUnwrapErr().message).toContain("missing-id");
	});

	it("should propagate repository error", async () => {
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(err(DomainError.infra("DB timeout"))),
		});
		const useCase = new Get<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("any-id"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
```

### List Use Case (`application/use-cases/list-<name>s.use-case.test.ts`)

```typescript
import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { make<Name> } from "../../../../../test/factories/<name>.factory.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { List<Name>sUseCase } from "./list-<name>s.use-case.ts";

describe("List<Name>sUseCase", () => {
	const params = { limit: 50, offset: 0 };

	it("should return paginated results", async () => {
		const items = [make<Name>(), make<Name>()];
		const mockRepo = makeMock<Name>Repository({
			findAll: vi.fn().mockResolvedValue(
				ok({ items, total: 2, limit: 50, offset: 0 }),
			),
		});
		const useCase = new List<Name>sUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(2);
		expect(result._unsafeUnwrap().total).toBe(2);
	});

	it("should return empty list when none exist", async () => {
		const mockRepo = makeMock<Name>Repository({
			findAll: vi.fn().mockResolvedValue(
				ok({ items: [], total: 0, limit: 50, offset: 0 }),
			),
		});
		const useCase = new List<Name>sUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().items).toHaveLength(0);
	});

	it("should propagate repository error", async () => {
		const mockRepo = makeMock<Name>Repository({
			findAll: vi.fn().mockResolvedValue(err(DomainError.infra("DB down"))),
		});
		const useCase = new List<Name>sUseCase(mockRepo);

		const result = await useCase.execute(params);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
```

### Update Use Case (`application/use-cases/update-<name>.use-case.test.ts`)

```typescript
import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { make<Name> } from "../../../../../test/factories/<name>.factory.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import { Update<Name>UseCase } from "./update-<name>.use-case.ts";

describe("Update<Name>UseCase", () => {
	it("should update an existing entity", async () => {
		const existing = make<Name>({ id: "entity-1" });
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(existing)),
		});
		const useCase = new Update<Name>UseCase(mockRepo);

		const result = await useCase.execute({
			id: <Name>Id.create("entity-1"),
			dto: { /* TODO: valid update fields */ },
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().idValue).toBe(existing.idValue);
		expect(mockRepo.save).toHaveBeenCalledOnce();
	});

	it("should return NotFoundError when entity does not exist", async () => {
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new Update<Name>UseCase(mockRepo);

		const result = await useCase.execute({
			id: <Name>Id.create("missing-id"),
			dto: { /* TODO: valid update fields */ },
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should propagate repository save error", async () => {
		const existing = make<Name>({ id: "entity-1" });
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(existing)),
			save: vi.fn().mockResolvedValue(err(DomainError.infra("DB unavailable"))),
		});
		const useCase = new Update<Name>UseCase(mockRepo);

		const result = await useCase.execute({
			id: <Name>Id.create("entity-1"),
			dto: { /* TODO: valid update fields */ },
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
```

### Delete Use Case (`application/use-cases/delete-<name>.use-case.test.ts`)

```typescript
import "reflect-metadata";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/shared/domain/errors/index.ts";
import { make<Name> } from "../../../../../test/factories/<name>.factory.ts";
import { makeMock<Name>Repository } from "../../../../../test/factories/<name>-repository.mock.ts";
import { <Name>Id } from "../../domain/value-objects/<name>-id.vo.ts";
import { Delete<Name>UseCase } from "./delete-<name>.use-case.ts";

describe("Delete<Name>UseCase", () => {
	it("should soft delete and persist via save", async () => {
		const entity = make<Name>({ id: "entity-1" });
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(entity)),
		});
		const useCase = new Delete<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("entity-1"));

		expect(result.isOk()).toBe(true);
		expect(entity.isDeleted).toBe(true);
		expect(mockRepo.save).toHaveBeenCalledOnce();
		expect(mockRepo.delete).not.toHaveBeenCalled();
	});

	it("should return NotFoundError when entity does not exist", async () => {
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(null)),
		});
		const useCase = new Delete<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("missing"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("NotFoundError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should fail when entity is already deleted", async () => {
		const entity = make<Name>({ id: "entity-1" });
		entity.softDelete();
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(ok(entity)),
		});
		const useCase = new Delete<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("entity-1"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("ValidationError");
		expect(mockRepo.save).not.toHaveBeenCalled();
	});

	it("should propagate repository errors", async () => {
		const mockRepo = makeMock<Name>Repository({
			findById: vi.fn().mockResolvedValue(err(DomainError.infra("DB unavailable"))),
		});
		const useCase = new Delete<Name>UseCase(mockRepo);

		const result = await useCase.execute(<Name>Id.create("entity-1"));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
	});
});
```

### Persistence Mapper (`infra/mappers/<name>-persistence.mapper.test.ts`)

```typescript
import type { <Name>Row } from "@pxbr/db/validators/<name>";
import { describe, expect, it } from "vitest";
import { <Name>PersistenceMapper } from "./<name>-persistence.mapper.ts";

const validRow: <Name>Row = {
	id: "entity-1",
	// TODO: fill in all required columns with valid values
	active: true,
	deletedAt: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("<Name>PersistenceMapper", () => {
	describe("toDomain", () => {
		it("maps a valid database row into a domain entity", () => {
			const result = <Name>PersistenceMapper.toDomain(validRow);

			expect(result.isOk()).toBe(true);
			const entity = result._unsafeUnwrap();
			expect(entity.idValue).toBe("entity-1");
			// TODO: assert domain-specific fields
		});

		// TODO: if the entity has value objects that can fail validation,
		// add a test for the InfraError case:
		// it("returns an infra error when a persisted value is invalid", () => {
		//   const result = <Name>PersistenceMapper.toDomain({ ...validRow, someField: invalidValue });
		//   expect(result.isErr()).toBe(true);
		//   expect(result._unsafeUnwrapErr()._tag).toBe("InfraError");
		// });
	});

	describe("toPersistence", () => {
		it("maps a domain entity to a persistence object", () => {
			const entity = <Name>PersistenceMapper.toDomain(validRow)._unsafeUnwrap();
			const persistence = <Name>PersistenceMapper.toPersistence(entity);

			expect(persistence.id).toBe("entity-1");
			// TODO: assert domain-specific columns
		});
	});
});
```

### Response Mapper (`presentation/mappers/<name>-response.mapper.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { make<Name> } from "../../../../../test/factories/<name>.factory.ts";
import { <name>ResponseSchema } from "../schemas/<name>-response.schema.ts";
import { <Name>ResponseMapper } from "./<name>-response.mapper.ts";

describe("<Name>ResponseMapper", () => {
	it("serializes an entity to the HTTP response shape", () => {
		const entity = make<Name>({ id: "entity-1" });
		const response = <Name>ResponseMapper.toResponse(entity);

		expect(response.id).toBe("entity-1");
		expect(response.active).toBe(entity.active);
		expect(response.deletedAt).toBeNull();
		expect(typeof response.createdAt).toBe("string");
		expect(typeof response.updatedAt).toBe("string");
		// TODO: assert domain-specific fields
	});

	it("produces output that validates against the response schema", () => {
		const entity = make<Name>();
		const response = <Name>ResponseMapper.toResponse(entity);
		const parsed = <name>ResponseSchema.safeParse(response);

		expect(parsed.success).toBe(true);
	});

	it("hydrates a cached ISO-string payload back to an entity", () => {
		const entity = make<Name>({ id: "entity-2" });
		const hydrated = <Name>ResponseMapper.fromCacheList([
			<Name>ResponseMapper.toResponse(entity),
		]);

		expect(hydrated).toHaveLength(1);
		expect(hydrated[0]?.id).toBe(entity.id);
	});

	it("hydrates a cached payload with Date objects instead of strings", () => {
		const entity = make<Name>({ id: "entity-3" });
		const hydrated = <Name>ResponseMapper.fromCacheList([
			{
				...<Name>ResponseMapper.toResponse(entity),
				createdAt: entity.createdAt,
				updatedAt: entity.updatedAt,
			},
		]);

		expect(hydrated).toHaveLength(1);
		expect(hydrated[0]?.createdAt).toEqual(entity.createdAt);
	});

	it("returns null for incomplete cache payloads", () => {
		expect(
			<Name>ResponseMapper.fromCacheOrNull({ id: "entity-invalid" }),
		).toBeNull();
	});

	it("returns empty array for non-array cache input", () => {
		expect(<Name>ResponseMapper.fromCacheList(null)).toEqual([]);
	});
});
```

---

## Checklist

After scaffolding, confirm each item before considering the module done.

### DB Package
- [ ] `packages/db/src/schema/<name>.ts` exists with all Drizzle tables
- [ ] `packages/db/src/schema/index.ts` exports `./schema/<name>.ts`
- [ ] `packages/db/src/schema/relations.ts` includes all relations for the new tables
- [ ] `packages/db/src/validators/<name>.ts` exists with select/insert/response schemas and types
- [ ] `packages/db/src/validators/index.ts` exports `./validators/<name>.ts`
- [ ] `packages/db/src/validators/<name>.test.ts` exists and passes
- [ ] DB typecheck passes: `cd packages/db && bunx tsgo --noEmit`
- [ ] DB tests pass: `cd packages/db && bun test`

### Domain
- [ ] `domain/value-objects/<name>-id.vo.ts` — branded ID with `create`, `generate`, `unwrap`
- [ ] `domain/entities/<name>.entity.ts` — `create`, `reconstitute`, `softDelete`, `activate`, `deactivate`, getters
- [ ] `domain/repositories/<name>.repository.ts` — interface with `findById`, `findAll`, `findAllActive`, `findActiveById`, `save`, `delete`
- [ ] `domain/value-objects/<name>-id.vo.test.ts` — passes
- [ ] `domain/entities/<name>.entity.test.ts` — passes (create, softDelete, activate/deactivate, equals)

### Application
- [ ] `application/dtos/create-<name>.dto.ts` — Zod schema + inferred type
- [ ] `application/dtos/update-<name>.dto.ts` — Zod schema + inferred type
- [ ] All 5 use cases created: `create`, `get`, `list`, `update`, `delete`
- [ ] Each use case implements `UseCase<Output, Input>` with `@injectable()` + `@inject("<Name>Repository")`
- [ ] All use case tests pass

### Infra
- [ ] `infra/mappers/<name>-persistence.mapper.ts` — `toDomain` (returns `Result`) and `toPersistence` static methods
- [ ] `infra/repositories/drizzle-<name>.repository.ts` — `@injectable()`, `@Cacheable` on reads, `@CacheInvalidate` on writes, `onDuplicateKeyUpdate` in `save`, soft delete in `delete`
- [ ] `infra/mappers/<name>-persistence.mapper.test.ts` — passes

### Presentation
- [ ] `presentation/schemas/<name>-response.schema.ts` — re-exports from `@pxbr/db/validators/<name>`
- [ ] `presentation/mappers/<name>-response.mapper.ts` — `toResponse`, `fromCacheOrNull`, `fromCacheList`
- [ ] `presentation/<name>.routes.ts` — all 5 routes with `beforeHandle` guards, Zod body/response schemas
- [ ] `presentation/mappers/<name>-response.mapper.test.ts` — passes

### Module wiring
- [ ] `module.ts` registers `"<Name>Repository"` via `container.register`, resolves all use cases
- [ ] Permission resource `"<name>"` added to `packages/auth/src/permissions.ts`
- [ ] Module imported and wired in `apps/server/src/index.ts` (after `authorizationModule`)
- [ ] OpenAPI tag added to the tags array in `apps/server/src/index.ts`

### Test factories
- [ ] `test/factories/<name>.factory.ts` — `make<Name>()` with overrides
- [ ] `test/factories/<name>-repository.mock.ts` — `makeMock<Name>Repository()` with `vi.fn()` mocks

### Final verification
- [ ] All server tests pass: `cd apps/server && bun test`
- [ ] Server typecheck passes: `cd apps/server && bunx tsgo --noEmit`
- [ ] Lint passes: `bun run check` (from monorepo root)
- [ ] No `TODO` comments left that block runtime behavior
