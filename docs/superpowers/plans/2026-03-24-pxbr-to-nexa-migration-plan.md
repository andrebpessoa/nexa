# pxbr to nexa Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the cloned monorepo from `pxbr` identity to `nexa`, remove unused packages, migrate MySQL to PostgreSQL, and clean up docs.

**Architecture:** Four sequential stages — rename, remove, migrate DB, clean docs. Each stage is verified with typecheck and tests before proceeding.

**Tech Stack:** Bun, Turbo, Elysia, Drizzle ORM (pg-core + postgres.js), Better Auth, Redis, TanStack Router, tsyringe

**Spec:** `docs/superpowers/specs/2026-03-24-pxbr-to-nexa-migration-design.md`

---

## Stage 1: Rename pxbr to nexa

### Task 1: Global rename @pxbr → @nexa in all source and config files

**Files (modify all):**
- All `package.json` files (root + apps/* + packages/*)
- All `tsconfig.json` files
- All `components.json` files (shadcn)
- All `.ts`/`.tsx` source files with `@pxbr/` imports
- `apps/server/tsdown.config.ts`
- `packages/db/docker-compose.yml`
- `apps/server/.env.example`, `apps/server/.env.test`
- `packages/env/src/server.test.ts`

- [ ] **Step 1: Run global find/replace for `@pxbr/` → `@nexa/`**

```bash
# Replace @pxbr/ with @nexa/ in all non-node_modules files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.html" -o -name "*.md" -o -name "*.env.*" \) \
  -not -path "*/node_modules/*" -not -path "*/bun.lock" -not -path "*/.turbo/*" \
  -exec sed -i 's/@pxbr\//@nexa\//g' {} +
```

- [ ] **Step 2: Rename root package name and docker-compose project**

```bash
# Root package.json: "name": "pxbr" → "name": "nexa"
sed -i 's/"name": "pxbr"/"name": "nexa"/' package.json

# docker-compose.yml: project name and containers
sed -i 's/^name: pxbr/name: nexa/' packages/db/docker-compose.yml
sed -i 's/pxbr-mysql/nexa-mysql/g' packages/db/docker-compose.yml
sed -i 's/pxbr-redis/nexa-redis/g' packages/db/docker-compose.yml
sed -i 's/pxbr_mysql_data/nexa_mysql_data/g' packages/db/docker-compose.yml
sed -i 's/pxbr_redis_data/nexa_redis_data/g' packages/db/docker-compose.yml
sed -i 's/MYSQL_DATABASE: pxbr/MYSQL_DATABASE: nexa/' packages/db/docker-compose.yml
```

- [ ] **Step 3: Rename database name in env files**

```bash
# .env.example: database name in URL
sed -i 's|localhost:3306/pxbr|localhost:3306/nexa|' apps/server/.env.example

# .env.test: if exists
sed -i 's|localhost:3306/pxbr|localhost:3306/nexa|' apps/server/.env.test 2>/dev/null || true

# server.test.ts: test fixture DATABASE_URL
sed -i 's|localhost:3306/pxbr|localhost:3306/nexa|' packages/env/src/server.test.ts
```

- [ ] **Step 4: Rename tsdown regex**

In `apps/server/tsdown.config.ts`, the sed from Step 1 already changed `/@pxbr\/.*/` to `/@nexa\/.*/`. Verify:

```bash
grep -n "nexa" apps/server/tsdown.config.ts
```

Expected: `noExternal: [/@nexa\/.*/]`

- [ ] **Step 5: Rename UI branding strings**

```bash
# PXBR Admin → Nexa Admin
sed -i 's/PXBR Admin/Nexa Admin/g' apps/admin/index.html
sed -i 's/PXBR Admin/Nexa Admin/g' apps/admin/src/features/auth/components/login-page.tsx
sed -i 's/PXBR Admin/Nexa Admin/g' apps/admin/src/shared/components/admin-layout.tsx

# PXBR API → Nexa API
sed -i 's/PXBR API/Nexa API/g' apps/server/src/index.ts

# Storefront page titles (will be removed in Stage 2, but rename for consistency)
sed -i 's/PXBR/Nexa/g' apps/storefront/src/routes/products/index.tsx
sed -i 's/PXBR/Nexa/g' apps/storefront/src/routes/products/\$productId.tsx

# Auth email subject
sed -i 's/PXBR/Nexa/g' packages/auth/src/index.ts

# Admin error fallback email (suporte@pxbr.com.br → suporte@nexa.com)
sed -i 's/suporte@pxbr\.com\.br/suporte@nexa.com/g' apps/admin/src/routes/__root.tsx
```

- [ ] **Step 6: Regenerate lockfile**

```bash
rm bun.lock
bun install
```

- [ ] **Step 7: Verify — grep for any remaining pxbr references**

```bash
grep -ri "pxbr" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.html" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.turbo --exclude=bun.lock . || echo "No remaining pxbr references"
```

Expected: No output (all replaced).

- [ ] **Step 8: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

Expected: No errors.

- [ ] **Step 9: Run tests**

```bash
cd apps/server && bun test
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: rename pxbr to nexa across entire codebase"
```

---

## Stage 2: Remove unused packages and apps

### Task 2: Delete packages/transactional, packages/analytics, apps/storefront

**Files:**
- Delete: `packages/transactional/` (entire directory)
- Delete: `packages/analytics/` (entire directory)
- Delete: `apps/storefront/` (entire directory)

- [ ] **Step 1: Delete directories**

```bash
rm -rf packages/transactional
rm -rf packages/analytics
rm -rf apps/storefront
```

- [ ] **Step 2: Commit deletions**

```bash
git add -A
git commit -m "chore: remove transactional, analytics, and storefront packages"
```

---

### Task 3: Clean up auth package (remove transactional dependency)

**Files:**
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/auth/package.json`

- [ ] **Step 1: Rewrite `packages/auth/src/index.ts`**

Remove all transactional imports and replace `sendResetPassword` with a console.log placeholder. Remove `AuthDependencies` interface and `emailClient` parameter.

New contents of `packages/auth/src/index.ts`:

```typescript
import { db } from "@nexa/db";
import * as schema from "@nexa/db/schema/index";
import { env } from "@nexa/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { ac, admin, member } from "./permissions.ts";

export function createAuth() {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "mysql", // Changed to "pg" in Task 12 (Stage 3)
			schema,
		}),
		trustedOrigins: env.CORS_ORIGIN,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				console.log(
					`[auth] Reset password requested for ${user.email}: ${url}`,
				);
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			adminPlugin({
				ac,
				roles: {
					admin,
					member,
				},
				defaultRole: "member",
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
```

- [ ] **Step 2: Remove `@nexa/transactional` from `packages/auth/package.json`**

Remove the line `"@nexa/transactional": "workspace:*"` from the `dependencies` section.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/
git commit -m "refactor(auth): remove transactional dependency, use console.log placeholder for reset password"
```

---

### Task 4: Clean up server container.ts (remove analytics + email)

**Files:**
- Modify: `apps/server/src/container.ts`

- [ ] **Step 1: Rewrite `apps/server/src/container.ts`**

Remove ErrorTracker, emailClient, and all analytics/transactional imports. `createAuth()` no longer takes parameters.

New contents:

```typescript
import "reflect-metadata";
import { createAuth } from "@nexa/auth";
import { db } from "@nexa/db";
import { container } from "tsyringe";
import { redisClient } from "./shared/infra/cache/redis-client.ts";

container.register("Database", { useValue: db });
container.register("CacheClient", { useValue: redisClient });

const auth = createAuth();
container.register("Auth", { useValue: auth });

export { container };
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/container.ts
git commit -m "refactor(server): remove analytics and email from DI container"
```

---

### Task 5: Clean up server index.ts (remove ErrorTracker)

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Remove ErrorTracker from imports and shutdown**

Remove:
- Line 3: `import type { ErrorTracker } from "@nexa/analytics";`
- Lines 128-129: `const errorTracker = container.resolve<ErrorTracker>("ErrorTracker");` and `await errorTracker.shutdown();`

The shutdown function becomes:

```typescript
async function shutdown(signal: string) {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	console.log(`Received ${signal}, shutting down gracefully...`);

	server.stop(true);

	const { db } = await import("@nexa/db");
	await (db.$client as ClosableDbClient).end();

	const { redisClient } = await import("./shared/infra/cache/redis-client.ts");
	redisClient.close();

	console.log("Graceful shutdown complete.");
	process.exit(0);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "refactor(server): remove ErrorTracker from shutdown"
```

---

### Task 6: Clean up error handler (remove PostHog)

**Files:**
- Modify: `apps/server/src/shared/infra/middleware/error-handler.ts`

- [ ] **Step 1: Rewrite error handler**

Remove ErrorTracker import and captureException call. Replace with console.error.

New contents:

```typescript
import type { Elysia } from "elysia";
import {
	type DomainError,
	toErrorResponse,
	toHttpStatus,
} from "../../domain/errors/index.ts";

function isDomainError(error: unknown): error is DomainError {
	return (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"message" in error
	);
}

export const errorHandler = (app: Elysia) =>
	app.onError(({ error, request }) => {
		if (isDomainError(error)) {
			return new Response(JSON.stringify(toErrorResponse(error)), {
				status: toHttpStatus(error),
				headers: { "Content-Type": "application/json" },
			});
		}

		console.error("[server] Unhandled error:", {
			path: new URL(request.url).pathname,
			method: request.method,
			error,
		});

		return new Response(
			JSON.stringify({
				error: "INTERNAL_ERROR",
				message: "Internal server error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	});
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/shared/infra/middleware/error-handler.ts
git commit -m "refactor(server): replace PostHog error tracking with console.error"
```

---

### Task 7: Clean up env schemas (remove SMTP, PostHog, storefront)

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `packages/env/src/server.test.ts`
- Delete: `packages/env/src/storefront.ts`

- [ ] **Step 1: Rewrite `packages/env/src/server.ts`**

Remove POSTHOG_KEY, POSTHOG_HOST, SMTP_*, EMAIL_FROM. Remove port 3002 from CORS default.

New contents:

```typescript
import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

const corsOriginSchema = z.preprocess((value) => {
	if (typeof value !== "string") {
		return value;
	}

	try {
		const parsed = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}, z.array(z.url()));

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
		DB_QUEUE_LIMIT: z.coerce.number().int().nonnegative().default(50),
		DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(10000),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: corsOriginSchema.default(["http://localhost:3001"]),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		REDIS_URL: z.string().default("redis://localhost:6379"),
		PORT: z.coerce.number().int().positive().default(3000),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
```

- [ ] **Step 2: Update `packages/env/src/server.test.ts`**

Remove POSTHOG_KEY and POSTHOG_HOST from baseEnv. Also update the CORS test assertions to only expect `["http://localhost:3001"]` (storefront port 3002 removed):

```typescript
const baseEnv = {
	DATABASE_URL: "mysql://user:password@localhost:3306/nexa",
	BETTER_AUTH_SECRET: "12345678901234567890123456789012",
	BETTER_AUTH_URL: "http://localhost:3000",
	NODE_ENV: "test",
	REDIS_URL: "redis://localhost:6379",
};
```

Update the CORS test that asserts two origins — change to expect only one:

```typescript
	it("parses CORS_ORIGIN from a JSON array string", async () => {
		process.env.CORS_ORIGIN = '["http://localhost:3001"]';

		const { env } = await import("./server");

		expect(env.CORS_ORIGIN).toEqual(["http://localhost:3001"]);
	});
```

- [ ] **Step 3: Delete `packages/env/src/storefront.ts`**

```bash
rm packages/env/src/storefront.ts
```

- [ ] **Step 4: Remove storefront export from `packages/env/package.json`**

Remove the line `"./storefront": "./src/storefront.ts"` from the `exports` section.

- [ ] **Step 5: Remove storefront theme export from `packages/ui/package.json`**

Remove the line `"./themes/storefront.css": "./src/styles/themes/storefront.css"` from the `exports` section. Also delete the file if it exists:

```bash
rm -f packages/ui/src/styles/themes/storefront.css
```

- [ ] **Step 6: Commit**

```bash
git add packages/env/
git commit -m "refactor(env): remove SMTP, PostHog, and storefront env schemas"
```

---

### Task 8: Clean up root package.json and server package.json

**Files:**
- Modify: `package.json` (root)
- Modify: `apps/server/package.json`

- [ ] **Step 1: Remove scripts from root `package.json`**

Remove these scripts:
- `"dev:storefront": "turbo run dev --filter=@nexa/storefront"`
- `"dev:transactional": "turbo run dev --filter=@nexa/transactional"`

- [ ] **Step 2: Remove dependencies from `apps/server/package.json`**

Remove from `dependencies`:
- `"@nexa/analytics": "workspace:*"`
- `"@nexa/transactional": "workspace:*"`

- [ ] **Step 3: Update `.env.example`**

Remove the PostHog and SMTP sections from `apps/server/.env.example`. Keep: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CORS_ORIGIN, NODE_ENV, REDIS_URL.

New contents of `apps/server/.env.example`:

```env
# -----------------------------------------------------------------------------
# Server environment variables
# Copy this file to .env and replace placeholder values.
# -----------------------------------------------------------------------------

# Database
DATABASE_URL=mysql://user:password@localhost:3306/nexa

# Better Auth
# Use a random secret with at least 32 characters.
BETTER_AUTH_SECRET=replace-with-a-random-secret-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000

# CORS
CORS_ORIGIN='["http://localhost:3001"]'

# Runtime
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 4: Regenerate lockfile**

```bash
rm bun.lock
bun install
```

- [ ] **Step 5: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests**

```bash
cd apps/server && bun test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove storefront/transactional/analytics references from root and server configs"
```

---

## Stage 3: MySQL to PostgreSQL migration

### Task 9: Convert Drizzle schema files to pg-core

**Files:**
- Modify: `packages/db/src/schema/product.ts`
- Modify: `packages/db/src/schema/auth.ts`
- Modify: `packages/db/src/schema/user-permission.ts`
- Modify: `packages/db/src/schema/relations.ts` (no changes needed — dialect-agnostic)
- Modify: `packages/db/src/schema/index.ts` (no changes needed — just re-exports)

- [ ] **Step 1: Convert `packages/db/src/schema/product.ts`**

```typescript
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const product = pgTable(
	"product",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		description: text("description"),
		priceInCents: integer("price_in_cents").notNull(),
		active: boolean("active").default(true).notNull(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { precision: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at", { precision: 3 }),
	},
	(table) => [
		index("product_deleted_at_idx").on(table.deletedAt),
		index("product_active_deleted_idx").on(table.active, table.deletedAt),
	],
);
```

- [ ] **Step 2: Convert `packages/db/src/schema/auth.ts`**

```typescript
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: varchar("id", { length: 36 }).primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	role: varchar("role", { length: 255 }),
	banned: boolean("banned").default(false),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { precision: 3 }),
	image: text("image"),
	createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { precision: 3 })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		expiresAt: timestamp("expires_at", { precision: 3 }).notNull(),
		token: varchar("token", { length: 255 }).notNull().unique(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { precision: 3 })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		impersonatedBy: varchar("impersonated_by", { length: 36 }),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", { precision: 3 }),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { precision: 3 }),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { precision: 3 })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		identifier: varchar("identifier", { length: 255 }).notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { precision: 3 }).notNull(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { precision: 3 })
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);
```

- [ ] **Step 3: Convert `packages/db/src/schema/user-permission.ts`**

```typescript
import {
	boolean,
	index,
	pgTable,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const userPermission = pgTable(
	"user_permission",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		resource: varchar("resource", { length: 64 }).notNull(),
		action: varchar("action", { length: 64 }).notNull(),
		granted: boolean("granted").notNull(),
		createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
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

- [ ] **Step 4: Commit schema changes**

```bash
git add packages/db/src/schema/
git commit -m "refactor(db): convert Drizzle schema from mysql-core to pg-core"
```

---

### Task 10: Convert DB connection and config to PostgreSQL

**Files:**
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/drizzle.config.ts`
- Modify: `packages/db/package.json`
- Modify: `packages/env/src/server.ts`

- [ ] **Step 1: Rewrite `packages/db/src/index.ts`**

Replace mysql2 pool with postgres.js client:

```typescript
import { env } from "@nexa/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";
import { relations } from "./schema/relations.ts";

const client = postgres(env.DATABASE_URL, {
	max: env.DB_POOL_SIZE,
	connect_timeout: Math.floor(env.DB_CONNECTION_TIMEOUT / 1000),
});

export const db = drizzle({
	client,
	schema,
	relations,
});
```

- [ ] **Step 2: Update `packages/db/drizzle.config.ts`**

```typescript
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
```

- [ ] **Step 3: Update `packages/db/package.json` dependencies**

Remove `mysql2`, add `postgres`:

Replace in dependencies:
- Remove: `"mysql2": "..."`
- Add: `"postgres": "^3.4.7"`

- [ ] **Step 4: Simplify env pool vars in `packages/env/src/server.ts`**

Remove `DB_QUEUE_LIMIT` (not applicable to postgres.js). Keep `DB_POOL_SIZE` and `DB_CONNECTION_TIMEOUT`:

Replace the DB pool lines with:
```typescript
		DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
		DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(10000),
```

(Just remove the `DB_QUEUE_LIMIT` line.)

- [ ] **Step 5: Intermediate typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

Expected: No errors (schema + connection are both PG now).

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/index.ts packages/db/drizzle.config.ts packages/db/package.json packages/env/src/server.ts
git commit -m "refactor(db): migrate connection from mysql2 to postgres.js"
```

---

### Task 11: Convert seed script to PostgreSQL

**Files:**
- Modify: `packages/db/src/seed/index.ts`

- [ ] **Step 1: Rewrite seed script**

```typescript
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { reset, seed } from "drizzle-seed";
import postgres from "postgres";
import * as schema from "../schema/index.ts";
import { relations } from "../schema/relations.ts";
import { productSeedPreset } from "./tables/product.seed.ts";

dotenv.config({
	path: new URL("../../../../apps/server/.env", import.meta.url).pathname,
});

async function main() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required to run db:seed.");
	}

	const client = postgres(databaseUrl);
	const db = drizzle({
		client,
		schema,
		relations,
	});

	try {
		await reset(db, schema);

		await seed(db, schema, { count: 0 }).refine((funcs) => ({
			product: {
				count: productSeedPreset.count,
				columns: {
					id: funcs.uuid(),
					name: funcs.valuesFromArray({
						values: [...productSeedPreset.names],
						isUnique: true,
					}),
					description: funcs.valuesFromArray({
						values: [...productSeedPreset.descriptions],
					}),
					priceInCents: funcs.int({
						minValue: productSeedPreset.minPriceInCents,
						maxValue: productSeedPreset.maxPriceInCents,
					}),
					active: funcs.default({
						defaultValue: productSeedPreset.defaultActive,
					}),
				},
			},
		}));

		console.log(`Seed completed with ${productSeedPreset.count} products.`);
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error("Seed failed.");
	console.error(error);
	process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/db/src/seed/index.ts
git commit -m "refactor(db): convert seed script from mysql2 to postgres.js"
```

---

### Task 12: Convert Better Auth provider to pg

**Files:**
- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Change provider**

In `packages/auth/src/index.ts`, change line:
```typescript
provider: "mysql",
```
to:
```typescript
provider: "pg",
```

- [ ] **Step 2: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "refactor(auth): switch Better Auth drizzle adapter to pg provider"
```

---

### Task 13: Convert server health check and shutdown to postgres.js API

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Update health check**

Replace the database health check block (lines ~79-87) with:

```typescript
		try {
			const { db } = await import("@nexa/db");
			await db.$client`SELECT 1`;
			checks.database = "ok";
		} catch {
			checks.database = "error";
		}
```

- [ ] **Step 2: Update shutdown function**

Replace the db shutdown line. postgres.js `.end()` returns a Promise:

```typescript
	const { db } = await import("@nexa/db");
	await db.$client.end();
```

Remove the `ClosableDbClient` type — no longer needed since postgres.js client has `.end()` natively.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "refactor(server): update health check and shutdown for postgres.js API"
```

---

### Task 14: Convert docker-compose to PostgreSQL

**Files:**
- Modify: `packages/db/docker-compose.yml`

- [ ] **Step 1: Rewrite docker-compose.yml**

```yaml
name: nexa

services:
  postgres:
    image: postgres:17-alpine
    container_name: nexa-postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: nexa
    ports:
      - "5432:5432"
    volumes:
      - nexa_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d nexa"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis
    container_name: nexa-redis
    ports:
      - "6379:6379"
    volumes:
      - nexa_redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  nexa_postgres_data:
  nexa_redis_data:
```

- [ ] **Step 2: Update `.env.example` DATABASE_URL**

Change to:
```
DATABASE_URL=postgresql://user:password@localhost:5432/nexa
```

- [ ] **Step 3: Update `packages/env/src/server.test.ts` DATABASE_URL**

Change baseEnv to:
```typescript
DATABASE_URL: "postgresql://user:password@localhost:5432/nexa",
```

- [ ] **Step 3b: Update `apps/server/.env.test` to PostgreSQL**

```
DATABASE_URL=postgresql://test:test@localhost:5432/test
BETTER_AUTH_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN='["http://localhost:3000"]'
```

- [ ] **Step 4: Update `packages/db/package.json` scripts**

The `db:start` and `db:stop` scripts reference docker compose. Verify they still work:

```bash
grep "docker" packages/db/package.json
```

If they reference `mysql` service name, update to `postgres`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/docker-compose.yml apps/server/.env.example packages/env/src/server.test.ts packages/db/package.json
git commit -m "refactor(db): replace MySQL docker service with PostgreSQL"
```

---

### Task 15: Convert test containers to PostgreSQL

**Files:**
- Modify: `apps/server/test/helpers/test-container.ts`
- Modify: `apps/server/package.json`

- [ ] **Step 1: Update `apps/server/package.json` devDependencies**

Remove: `"@testcontainers/mysql": "..."`
Add: `"@testcontainers/postgresql": "^11.13.0"`

- [ ] **Step 2: Rewrite `apps/server/test/helpers/test-container.ts`**

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "@nexa/db/schema/index";
import { product } from "@nexa/db/schema/product";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

type TestDatabase = typeof import("@nexa/db")["db"];

export async function setupTestDatabase(): Promise<{
	db: TestDatabase;
	container: StartedPostgreSqlContainer;
}> {
	const container = await new PostgreSqlContainer("postgres:17-alpine")
		.withDatabase("test_db")
		.withUsername("test")
		.withPassword("test")
		.withStartupTimeout(180_000)
		.start();

	const client = postgres(container.getConnectionUri());
	const db = drizzle({
		client,
		schema,
	}) as TestDatabase;

	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	await migrate(db, {
		migrationsFolder: path.resolve(
			__dirname,
			"../../../../packages/db/src/migrations",
		),
	});

	return { db, container };
}

export async function cleanProductTable(db: TestDatabase) {
	await db.delete(product);
}

export async function teardownTestDatabase(
	container: StartedPostgreSqlContainer,
) {
	await container.stop();
}
```

- [ ] **Step 3: Regenerate lockfile**

```bash
rm bun.lock
bun install
```

- [ ] **Step 4: Delete old MySQL migrations**

Existing migrations are MySQL-specific. They need to be regenerated for PostgreSQL:

```bash
rm -rf packages/db/src/migrations
```

Then generate fresh PG migrations:

```bash
cd packages/db && bunx drizzle-kit generate
```

Note: This requires a running PostgreSQL instance OR can be done without one if drizzle-kit supports schema-only generation. If it fails, skip and revisit after docker-compose is running.

- [ ] **Step 5: Typecheck**

```bash
cd apps/server && bunx tsgo --noEmit
```

Expected: No errors.

- [ ] **Step 6: Run tests**

```bash
cd apps/server && bun test
```

Expected: All tests pass (testcontainers spins up PostgreSQL automatically).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(server): convert test infrastructure from MySQL to PostgreSQL"
```

---

## Stage 4: Documentation cleanup

### Task 16: Delete old plans and update docs

**Files:**
- Delete: `docs/plans/` (all 7 files)
- Modify: `README.md`
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Delete old plans**

```bash
rm -rf docs/plans
```

- [ ] **Step 2: Update README.md**

Rewrite with:
- Project name: `nexa`
- Remove storefront references
- Update DB: PostgreSQL
- Update imports: `@nexa/ui/components/button`
- Update project structure (no storefront, transactional, analytics)
- Update available scripts
- Update ports (only admin on 3001, server on 3000)

- [ ] **Step 3: Update `.claude/CLAUDE.md`**

Update:
- All `@pxbr/*` → `@nexa/*` in Project Map
- Remove storefront, transactional, analytics from map
- Update DB: "ORM is Drizzle (PostgreSQL)"
- Remove PostHog mentions
- Update commands and gotchas

- [ ] **Step 4: Final verification**

```bash
bun install
cd apps/server && bunx tsgo --noEmit
cd apps/server && bun test
bun run check
```

All must pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: update README and CLAUDE.md for nexa project"
```

---

## Post-migration checklist

After all 4 stages:

- [ ] `grep -ri "pxbr" --exclude-dir=node_modules --exclude-dir=.turbo --exclude=bun.lock .` returns nothing
- [ ] `grep -ri "mysql" --include="*.ts" --exclude-dir=node_modules .` returns nothing (except possibly comments)
- [ ] `bun run check-types` passes across all packages
- [ ] `cd apps/server && bun test` all green
- [ ] `bun run check` (biome) passes
