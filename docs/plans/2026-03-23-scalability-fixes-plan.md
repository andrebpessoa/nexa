# Scalability Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir os 16 gaps de escalabilidade identificados na análise arquitetural do monorepo PXBR, organizados em 4 sprints por impacto/esforço.

**Architecture:** Cada tarefa é isolada e commitável individualmente. As tarefas do Sprint 1 não têm dependências entre si. Sprint 2 depende de Sprint 1 (índices devem existir antes de adicionar paginação). Sprint 3 é independente. Seguimos TDD com vitest + testcontainers conforme o projeto.

**Tech Stack:** Bun, Elysia, Drizzle ORM (mysql2), Redis (Bun native client), tsyringe DI, neverthrow, Zod, vitest + testcontainers

---

## SPRINT 1 — Fundação (baixo esforço, alto impacto imediato)

### Task 1: Índices na tabela `product` [P1 — CRITICO]

**Files:**

- Create: `packages/db/src/migrations/20260323000001_product_indexes/migration.sql`
- Modify: `packages/db/src/migrations/meta/_journal.json`

> **Nota:** Neste projeto usa-se `bun run db:push` para dev. Para criar a migration manualmente (modo correto para produção), crie os arquivos abaixo.

**Step 1: Criar o arquivo de migration SQL**

Crie `packages/db/src/migrations/20260323000001_product_indexes/migration.sql`:

```sql
CREATE INDEX `product_deleted_at_idx` ON `product`(`deleted_at`);
CREATE INDEX `product_active_deleted_idx` ON `product`(`active`, `deleted_at`);
```

**Step 2: Adicionar a migration ao journal**

Abra `packages/db/src/migrations/meta/_journal.json` e adicione ao array `entries`:

```json
{
  "idx": <next_idx>,
  "version": "7",
  "when": 1742688001000,
  "tag": "20260323000001_product_indexes",
  "breakpoints": true
}
```

**Step 3: Adicionar índices ao schema Drizzle**

Modifique `packages/db/src/schema/product.ts`:

```typescript
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const product = mysqlTable(
  "product",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    priceInCents: int("price_in_cents").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", { fsp: 3 }),
  },
  (table) => [
    index("product_deleted_at_idx").on(table.deletedAt),
    index("product_active_deleted_idx").on(table.active, table.deletedAt),
  ],
);
```

**Step 4: Aplicar ao banco de dev e verificar**

```bash
cd /home/upvendas/projetos/pxbr
bun run db:push
```

Expected: Schema sincronizado sem erros.

**Step 5: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

Expected: zero erros.

**Step 6: Commit**

```bash
git add packages/db/src/schema/product.ts packages/db/src/migrations/
git commit -m "feat(db): add indexes on product.deleted_at and (active, deleted_at)"
```

---

### Task 2: Configurar pool de conexões MySQL via env [I1 — CRITICO]

**Files:**

- Modify: `packages/env/src/server.ts`
- Modify: `packages/db/src/index.ts`

**Step 1: Adicionar variáveis ao schema de env**

Modifique `packages/env/src/server.ts` — adicione ao objeto `server`:

```typescript
DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
DB_QUEUE_LIMIT: z.coerce.number().int().nonnegative().default(50),
DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(10000),
PORT: z.coerce.number().int().positive().default(3000),
```

**Step 2: Passar pool config ao Drizzle**

Modifique `packages/db/src/index.ts`:

```typescript
import { env } from "@nexa/env/server";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.ts";
import { relations } from "./schema/relations.ts";

const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: env.DB_POOL_SIZE,
  queueLimit: env.DB_QUEUE_LIMIT,
  connectTimeout: env.DB_CONNECTION_TIMEOUT,
  waitForConnections: true,
});

export const db = drizzle({ client: pool, schema, relations, mode: "default" });
```

**Step 3: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 4: Verificar dev server sobe**

```bash
bun run dev:server
```

Expected: `Server is running on http://localhost:3000`

**Step 5: Commit**

```bash
git add packages/env/src/server.ts packages/db/src/index.ts
git commit -m "feat(db): configure MySQL connection pool via env vars"
```

---

### Task 3: Graceful shutdown completo [I2 — CRITICO]

**Files:**

- Modify: `apps/server/src/index.ts`

**Step 1: Reescrever o handler de shutdown**

Modifique `apps/server/src/index.ts`. Substitua as linhas 56-64:

```typescript
const server = app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.stop(true); // drena in-flight requests

  const errorTracker = container.resolve<ErrorTracker>("ErrorTracker");
  await errorTracker.shutdown();

  const { db } = await import("@nexa/db");
  await (db.$client as import("mysql2/promise").Pool).end();

  const { redisClient } = await import(
    "./shared/infra/cache/redis-client.ts"
  );
  redisClient.close();

  console.log("Graceful shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

**Step 2: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 3: Testar manualmente**

```bash
bun run dev:server &
sleep 2
kill -SIGTERM $(lsof -ti:3000)
```

Expected: log "Graceful shutdown complete." antes de encerrar.

**Step 4: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(server): implement graceful shutdown for DB, Redis, and in-flight requests"
```

---

### Task 4: Health check endpoints [I4 — ALTO]

**Files:**

- Modify: `apps/server/src/index.ts`

**Step 1: Adicionar rotas de health check**

No `apps/server/src/index.ts`, antes do `.listen(...)`, adicione após `.get("/", () => "OK")`:

```typescript
.get("/health/live", () => new Response("OK", { status: 200 }))
.get("/health/ready", async () => {
  const checks: Record<string, string> = {};

  try {
    const { db } = await import("@nexa/db");
    await (db.$client as import("mysql2/promise").Pool).query("SELECT 1");
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const { redisClient } = await import(
      "./shared/infra/cache/redis-client.ts"
    );
    await redisClient.ping();
    checks.cache = "ok";
  } catch {
    checks.cache = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");
  return new Response(JSON.stringify({ status: allOk ? "ok" : "degraded", checks }), {
    status: allOk ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
})
```

**Step 2: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 3: Testar manualmente**

```bash
bun run dev:server &
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

Expected: `200 OK` em ambas. `/health/ready` retorna JSON `{"status":"ok","checks":{"database":"ok","cache":"ok"}}`.

**Step 4: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(server): add /health/live and /health/ready endpoints"
```

---

### Task 5: Limites de payload nos DTOs [C3 — ALTO]

**Files:**

- Modify: `apps/server/src/modules/product/application/dtos/create-product.dto.ts`
- Modify: `apps/server/src/modules/product/application/dtos/update-product.dto.ts`
- Modify: `apps/server/src/index.ts`

**Step 1: Escrever teste que falha**

Abra `apps/server/src/modules/product/application/use-cases/create-product.use-case.test.ts` e adicione:

```typescript
it("should reject empty name", async () => {
  const mockRepo = makeMockRepo();
  const useCase = new CreateProductUseCase(mockRepo);

  const dto = { name: "", description: null, priceInCents: 1000 };
  // parsing via DTO schema
  const parsed = createProductDto.safeParse(dto);
  expect(parsed.success).toBe(false);
});

it("should reject description over 5000 chars", async () => {
  const longDesc = "a".repeat(5001);
  const dto = { name: "Valid", description: longDesc, priceInCents: 1000 };
  const parsed = createProductDto.safeParse(dto);
  expect(parsed.success).toBe(false);
});
```

**Step 2: Rodar para ver falhar**

```bash
cd apps/server && bun test src/modules/product/application/use-cases/create-product.use-case.test.ts
```

Expected: 2 testes novos falhando.

**Step 3: Corrigir os DTOs**

`apps/server/src/modules/product/application/dtos/create-product.dto.ts`:

```typescript
import z from "zod";

export const createProductDto = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(5000).nullable().optional(),
  priceInCents: z.number().int().nonnegative().max(100_000_000),
});

export type CreateProductDto = z.infer<typeof createProductDto>;
```

`apps/server/src/modules/product/application/dtos/update-product.dto.ts`:

```typescript
import z from "zod";

export const updateProductDto = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(5000).nullable().optional(),
  priceInCents: z.number().int().nonnegative().max(100_000_000),
});

export type UpdateProductDto = z.infer<typeof updateProductDto>;
```

**Step 4: Adicionar bodyLimit no Elysia**

Em `apps/server/src/index.ts`, altere a instanciação do Elysia:

```typescript
const app = new Elysia({ serve: { maxRequestBodySize: 1 * 1024 * 1024 } }) // 1MB
```

**Step 5: Rodar testes**

```bash
cd apps/server && bun test src/modules/product/application/use-cases/create-product.use-case.test.ts
```

Expected: todos os testes passando incluindo os 2 novos.

**Step 6: Rodar suite completa**

```bash
cd apps/server && bun test
```

Expected: todos passando.

**Step 7: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 8: Commit**

```bash
git add apps/server/src/modules/product/application/dtos/ apps/server/src/index.ts
git commit -m "feat(validation): add min/max constraints to DTOs and 1MB body limit"
```

---

## SPRINT 2 — Paginação e Cache

### Task 6: Paginação end-to-end — interface, repositório, use case, rota [P2 — CRITICO]

Esta tarefa atravessa 6 arquivos. Seguir na ordem para manter o código compilando a cada passo.

**Files:**

- Modify: `apps/server/src/modules/product/domain/repositories/product.repository.ts`
- Modify: `apps/server/src/modules/product/infra/repositories/drizzle-product.repository.ts`
- Modify: `apps/server/src/modules/product/application/use-cases/list-products.use-case.ts`
- Modify: `apps/server/src/modules/product/application/use-cases/list-active-products.use-case.ts`
- Modify: `apps/server/src/modules/product/presentation/product.routes.ts`
- Modify: `apps/server/src/modules/product/presentation/product-feed.routes.ts`
- Modify: `apps/server/src/modules/product/infra/repositories/drizzle-product.repository.integration.test.ts`

**Step 1: Definir tipo de paginação**

Crie `apps/server/src/shared/domain/pagination.ts`:

```typescript
export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
```

**Step 2: Atualizar interface do repositório**

`apps/server/src/modules/product/domain/repositories/product.repository.ts`:

```typescript
import type { Result } from "neverthrow";
import type { InfraError } from "@/shared/domain/errors/index.ts";
import type { PaginatedResult, PaginationParams } from "@/shared/domain/pagination.ts";
import type { ProductEntity } from "../entities/product.entity.ts";
import type { ProductId } from "../value-objects/product-id.vo.ts";

export interface ProductRepository {
  findById(id: ProductId): Promise<Result<ProductEntity | null, InfraError>>;
  findAll(params: PaginationParams): Promise<Result<PaginatedResult<ProductEntity>, InfraError>>;
  findAllActive(params: PaginationParams): Promise<Result<PaginatedResult<ProductEntity>, InfraError>>;
  findActiveById(id: ProductId): Promise<Result<ProductEntity | null, InfraError>>;
  save(product: ProductEntity): Promise<Result<void, InfraError>>;
  delete(id: ProductId): Promise<Result<void, InfraError>>;
}
```

**Step 3: Escrever testes de paginação no integration test**

No arquivo `drizzle-product.repository.integration.test.ts`, adicione após os testes existentes:

```typescript
it("should paginate findAll correctly", async () => {
  for (let i = 0; i < 5; i++) {
    await repo.save(makeProduct({ name: `Product ${i}` }));
  }

  const page1 = await repo.findAll({ limit: 2, offset: 0 });
  expect(page1.isOk()).toBe(true);
  const result1 = page1._unsafeUnwrap();
  expect(result1.items).toHaveLength(2);
  expect(result1.total).toBe(5);
  expect(result1.limit).toBe(2);
  expect(result1.offset).toBe(0);

  const page2 = await repo.findAll({ limit: 2, offset: 2 });
  expect(page2._unsafeUnwrap().items).toHaveLength(2);

  const page3 = await repo.findAll({ limit: 2, offset: 4 });
  expect(page3._unsafeUnwrap().items).toHaveLength(1);
});

it("should paginate findAllActive correctly", async () => {
  await repo.save(makeProduct({ name: "Active 1", active: true }));
  await repo.save(makeProduct({ name: "Active 2", active: true }));
  await repo.save(makeProduct({ name: "Inactive", active: false }));

  const result = await repo.findAllActive({ limit: 10, offset: 0 });
  expect(result.isOk()).toBe(true);
  const data = result._unsafeUnwrap();
  expect(data.items).toHaveLength(2);
  expect(data.total).toBe(2);
});
```

**Step 4: Rodar para ver falhar**

```bash
cd apps/server && bun test src/modules/product/infra/repositories/drizzle-product.repository.integration.test.ts
```

Expected: erros de tipo (interface mudou) e testes novos falhando.

**Step 5: Implementar paginação no repositório Drizzle**

Em `apps/server/src/modules/product/infra/repositories/drizzle-product.repository.ts`, substitua `findAll` e `findAllActive`:

```typescript
import { count } from "drizzle-orm";
import type { PaginatedResult, PaginationParams } from "@/shared/domain/pagination.ts";

// substitui findAll():
async findAll(params: PaginationParams): Promise<Result<PaginatedResult<ProductEntity>, InfraError>> {
  try {
    const where = isNull(product.deletedAt);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(product)
        .where(where)
        .limit(params.limit)
        .offset(params.offset),
      this.db
        .select({ total: count() })
        .from(product)
        .where(where),
    ]);

    const entities: ProductEntity[] = [];
    for (const row of rows) {
      const mapped = ProductPersistenceMapper.toDomain(row);
      if (mapped.isErr()) return err(mapped.error);
      entities.push(mapped.value);
    }

    return ok({
      items: entities,
      total: countRows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    return err(DomainError.infra("Failed to list products", error));
  }
}

// substitui findAllActive():
async findAllActive(params: PaginationParams): Promise<Result<PaginatedResult<ProductEntity>, InfraError>> {
  try {
    const where = and(eq(product.active, true), isNull(product.deletedAt));

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(product)
        .where(where)
        .limit(params.limit)
        .offset(params.offset),
      this.db
        .select({ total: count() })
        .from(product)
        .where(where),
    ]);

    const entities: ProductEntity[] = [];
    for (const row of rows) {
      const mapped = ProductPersistenceMapper.toDomain(row);
      if (mapped.isErr()) return err(mapped.error);
      entities.push(mapped.value);
    }

    return ok({
      items: entities,
      total: countRows[0]?.total ?? 0,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    return err(DomainError.infra("Failed to list active products", error));
  }
}
```

**Nota:** Remova também os decorators `@Cacheable` de `findAll` e `findAllActive` — paginação com offset não é cacheável de forma trivial por chave. O cache de `findById` e `findActiveById` permanece intacto.

**Step 6: Atualizar use cases**

`list-products.use-case.ts`:

```typescript
import type { PaginatedResult } from "@/shared/domain/pagination.ts";
// ...
async execute(params: { limit: number; offset: number }): Promise<Result<PaginatedResult<ProductEntity>, DomainError>> {
  return this.productRepo.findAll(params);
}
```

`list-active-products.use-case.ts` — mesma mudança com `findAllActive`.

**Step 7: Atualizar rotas**

Em `product.routes.ts`, substitua o handler GET `/`:

```typescript
.get(
  "/",
  async ({ query }) => {
    const limit = Math.min(Number(query.limit ?? 50), 200);
    const offset = Number(query.offset ?? 0);

    const result = await deps.listProducts.execute({ limit, offset });

    return result.match(
      (data) =>
        jsonResponse({
          items: data.items.map(ProductResponseMapper.toResponse),
          total: data.total,
          limit: data.limit,
          offset: data.offset,
        }),
      (error) => jsonResponse(toErrorResponse(error), toHttpStatus(error)),
    );
  },
  {
    beforeHandle: [deps.requirePermission("product", "read")],
    query: z.object({
      limit: z.coerce.number().int().positive().max(200).optional(),
      offset: z.coerce.number().int().nonnegative().optional(),
    }),
    // ...responses
  },
)
```

Mesma lógica em `product-feed.routes.ts` para o endpoint `GET /`.

**Step 8: Rodar testes**

```bash
cd apps/server && bun test
```

Expected: todos os testes passando, incluindo os novos de paginação.

**Step 9: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 10: Commit**

```bash
git add apps/server/src/shared/domain/pagination.ts \
        apps/server/src/modules/product/ \
git commit -m "feat(product): add offset/limit pagination to list endpoints"
```

---

### Task 7: Cache invalidation com UNLINK (async) [C1 — CRITICO]

**Files:**

- Modify: `apps/server/src/shared/infra/cache/cache.decorators.ts`

**Step 1: Adicionar `unlink` ao tipo RedisClient**

No tipo `RedisClient` (linha 16 do arquivo), adicione:

```typescript
unlink(...keys: string[]): Promise<unknown>;
```

**Step 2: Substituir DEL por UNLINK no loop de invalidação**

Na função `CacheInvalidate` (linha 148), troque:

```typescript
await redis.del(...keys);
```

por:

```typescript
await redis.unlink(...keys);
```

**Nota:** `UNLINK` é o equivalente assíncrono de `DEL` no Redis — retorna imediatamente e deleta em background, eliminando a latência de I/O bloqueante.

**Step 3: Rodar testes de integração do repositório**

```bash
cd apps/server && bun test src/modules/product/infra/repositories/
```

Expected: todos passando (comportamento de invalidação idêntico, só mais rápido).

**Step 4: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 5: Commit**

```bash
git add apps/server/src/shared/infra/cache/cache.decorators.ts
git commit -m "perf(cache): replace DEL with UNLINK for async cache invalidation"
```

---

### Task 8: Rate limiting [C2 — ALTO]

**Files:**

- Modify: `apps/server/package.json` (adicionar dependência)
- Modify: `apps/server/src/index.ts`

**Step 1: Instalar o plugin de rate limit**

```bash
cd apps/server && bun add @elysiajs/rate-limit
```

**Step 2: Adicionar rate limiter global**

Em `apps/server/src/index.ts`, importe e adicione antes do errorHandler:

```typescript
import { rateLimit } from "@elysiajs/rate-limit";

const app = new Elysia({ serve: { maxRequestBodySize: 1 * 1024 * 1024 } })
  .use(rateLimit({
    duration: 60_000,   // janela de 1 minuto
    max: 300,           // 300 requests por IP por janela
    responseMessage: { error: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
  }))
  // ... resto dos plugins
```

**Step 3: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 4: Testar manualmente**

```bash
bun run dev:server &
for i in $(seq 1 305); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health/live; done | tail -10
```

Expected: últimas respostas retornam `429`.

**Step 5: Commit**

```bash
git add apps/server/package.json apps/server/src/index.ts bun.lockb
git commit -m "feat(server): add global rate limiting (300 req/min per IP)"
```

---

## SPRINT 3 — Auth, Concorrência e Observabilidade

### Task 9: PORT via env var [I7 — MEDIO]

**Files:**

- Modify: `apps/server/src/index.ts` (já tem `env.PORT` da Task 2)

Esta task foi resolvida na Task 2 ao adicionar `PORT` ao env e usar `env.PORT` no `.listen()` da Task 3. Verificar se está aplicado.

**Step 1: Confirmar**

```bash
grep "PORT" apps/server/src/index.ts
```

Expected: `.listen(env.PORT, ...)` — se sim, esta task está completa.

**Step 2: Commit (se ainda não feito)**

Incluído no commit da Task 3.

---

### Task 10: ErrorTracker request-scoped — eliminar estado mutável [I6 — MEDIO]

**Files:**

- Modify: `packages/analytics/src/types.ts`
- Modify: `packages/analytics/src/posthog/server.ts`
- Modify: `apps/server/src/shared/infra/middleware/error-handler.ts`
- Modify: `apps/server/src/container.ts`

**Step 1: Simplificar interface ErrorTracker**

`packages/analytics/src/types.ts`:

```typescript
export interface ErrorTracker {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureExceptionForUser(
    error: unknown,
    userId: string,
    context?: Record<string, unknown>,
  ): void;
  shutdown(): Promise<void>;
}
```

**Step 2: Atualizar implementação PostHog**

`packages/analytics/src/posthog/server.ts` — eliminar o `currentDistinctId` mutável:

```typescript
import { PostHog } from "posthog-node";
import type { ErrorTracker } from "../types.ts";

export function createPostHogServerErrorTracker(config: {
  apiKey: string;
  host: string;
}): ErrorTracker {
  const client = new PostHog(config.apiKey, {
    host: config.host,
    enableExceptionAutocapture: true,
  });

  return {
    captureException(error, context) {
      client.captureException(error, "anonymous", context);
    },
    captureExceptionForUser(error, userId, context) {
      client.captureException(error, userId, context);
    },
    async shutdown() {
      await client.shutdown();
    },
  };
}
```

**Step 3: Atualizar error-handler para passar userId explicitamente**

`apps/server/src/shared/infra/middleware/error-handler.ts`:

```typescript
export const errorHandler = (app: Elysia) =>
  app.onError(({ error, request }) => {
    if (isDomainError(error)) {
      return new Response(JSON.stringify(toErrorResponse(error)), {
        status: toHttpStatus(error),
        headers: { "Content-Type": "application/json" },
      });
    }

    const errorTracker = container.resolve<ErrorTracker>("ErrorTracker");
    // Sem estado mutável: anonymous por padrão para erros não autenticados
    errorTracker.captureException(error, {
      path: new URL(request.url).pathname,
      method: request.method,
    });

    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  });
```

**Step 4: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 5: Rodar todos os testes**

```bash
cd apps/server && bun test
```

**Step 6: Commit**

```bash
git add packages/analytics/src/ apps/server/src/shared/infra/middleware/
git commit -m "fix(analytics): remove shared mutable state from ErrorTracker"
```

---

### Task 11: Cache de permission checks [C5 — MEDIO]

**Files:**

- Modify: `apps/server/src/modules/authorization/infra/gateways/better-auth-permission-policy.gateway.ts`

**Step 1: Adicionar cache in-memory por request cycle**

O gateway `BetterAuthPermissionPolicyGateway` é singleton no DI. Adicione um `Map` com TTL simples para evitar round-trips repetidas para o mesmo (userId, resource, action) no mesmo segundo:

```typescript
import { auth } from "@nexa/auth";
import { err, ok, type Result } from "neverthrow";
import { injectable } from "tsyringe";
import { DomainError, type InfraError } from "@/shared/domain/errors/index.ts";
import type {
  PermissionCheckInput,
  PermissionPolicyGateway,
} from "../../application/gateways/permission-policy.gateway.ts";

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

@injectable()
export class BetterAuthPermissionPolicyGateway implements PermissionPolicyGateway {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 30_000; // 30 segundos

  async hasPermission(input: PermissionCheckInput): Promise<Result<boolean, InfraError>> {
    const key = `${input.userId}:${input.resource}:${input.action}`;
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return ok(cached.value);
    }

    try {
      const response = await auth.api.userHasPermission({
        body: {
          userId: input.userId,
          permissions: { [input.resource]: [input.action] },
        },
      });

      this.cache.set(key, { value: response.success, expiresAt: now + this.ttlMs });

      // Limpar entradas expiradas periodicamente (evitar memory leak)
      if (this.cache.size > 1000) {
        for (const [k, entry] of this.cache.entries()) {
          if (entry.expiresAt <= now) this.cache.delete(k);
        }
      }

      return ok(response.success);
    } catch (error) {
      return err(DomainError.infra("Failed to evaluate base permission policy", error));
    }
  }
}
```

**Step 2: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

**Step 3: Rodar testes**

```bash
cd apps/server && bun test
```

**Step 4: Commit**

```bash
git add apps/server/src/modules/authorization/infra/gateways/
git commit -m "perf(auth): add 30s in-memory cache for permission checks"
```

---

### Task 12: Índice de `user_id` isolado na tabela `user_permission` [P5 — MEDIO]

**Files:**

- Modify: `packages/db/src/schema/user-permission.ts`
- Create: `packages/db/src/migrations/20260323000002_user_permission_userid_idx/migration.sql`

**Step 1: Criar migration SQL**

```sql
CREATE INDEX `user_permission_user_id_idx` ON `user_permission`(`user_id`);
```

**Step 2: Adicionar ao journal** (mesmo processo da Task 1)

**Step 3: Atualizar schema Drizzle**

`packages/db/src/schema/user-permission.ts`:

```typescript
import {
  boolean,
  index,
  mysqlTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth.ts";

export const userPermission = mysqlTable(
  "user_permission",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resource: varchar("resource", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    granted: boolean("granted").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_permission_unique_idx").on(
      table.userId,
      table.resource,
      table.action,
    ),
    index("user_permission_user_id_idx").on(table.userId),
  ],
);
```

**Step 4: Push e typecheck**

```bash
bun run db:push
cd apps/server && bunx tsgo --noEmit
```

**Step 5: Commit**

```bash
git add packages/db/src/schema/user-permission.ts packages/db/src/migrations/
git commit -m "feat(db): add index on user_permission.user_id for faster user lookups"
```

---

## SPRINT 4 — Resiliência horizontal (futuro)

> Estas tarefas requerem infraestrutura externa (Redis Sentinel/Cluster, read replicas MySQL) e são documentadas como próximos passos. Não são implementadas neste plano.

### [I3] Redis Sentinel ou Cluster

- Substituir `bun`'s native Redis client por `ioredis` com suporte a Sentinel
- Configurar `REDIS_SENTINELS` ou `REDIS_CLUSTER_NODES` em `packages/env/src/server.ts`
- Atualizar `apps/server/src/shared/infra/cache/redis-client.ts`

### [I8] Read Replicas MySQL

- Adicionar `DATABASE_READ_URL` a `packages/env/src/server.ts`
- Criar instância de pool separada para reads em `packages/db/src/index.ts`
- Expor `dbRead` nas queries de `findAll*` e `findById`

### [C6] Anti-stampede no cache (probabilistic early expiry)

- Implementar xfetch algorithm no decorator `@Cacheable`
- Parâmetro `beta` configurável no decorator (default: 1.0)

---

## Verificação Final

Após completar todos os sprints:

**1. Suite de testes completa:**

```bash
cd apps/server && bun test
```

Expected: todos passando, sem regressões.

**2. Typecheck completo:**

```bash
cd apps/server && bunx tsgo --noEmit
bun run check-types
```

Expected: zero erros em todos os pacotes.

**3. Lint:**

```bash
bun run check
```

Expected: zero violations.

**4. Smoke test manual:**

```bash
bun run dev:server &

# Health checks
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# Paginação
curl "http://localhost:3000/api/products/feed/?limit=5&offset=0"
curl "http://localhost:3000/api/products/feed/?limit=5&offset=5"

# Rate limit (deve retornar 429 após 300 requests/min)
```

**5. Verificar índices no MySQL:**

```sql
SHOW INDEX FROM product;
SHOW INDEX FROM user_permission;
```

Expected: índices `product_deleted_at_idx`, `product_active_deleted_idx`, `user_permission_user_id_idx` presentes.
