# Drizzle Seed Products Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable `drizzle-seed` foundation in `packages/db` that resets the local MySQL database and seeds 10 products, with a file structure that makes future table seeds easy to add.

**Architecture:** Keep all seed infrastructure inside `packages/db`, next to the Drizzle schema and connection. Use one entrypoint that calls `reset()` and `seed().refine(...)`, while each table owns a small preset module under `src/seed/tables/` so adding another table later is just “create one preset file and register it”.

**Tech Stack:** Bun workspaces, Turborepo, Drizzle ORM beta `1.0.0-beta.18-7eb39f0`, `drizzle-seed` beta, Vitest, MySQL.

---

**Assumption:** Scope v1 to development/demo data only. Do not fold this into integration-test setup yet. Leave [seed-admin.ts](/home/upvendas/projetos/pxbr/apps/server/src/scripts/seed-admin.ts) unchanged.

**Execution notes:**
- Follow `@test-driven-development` for any executable logic.
- Follow `@verification-before-completion` before claiming the seed works.
- Use the existing project style: Bun scripts, `vitest`, and `.ts` import suffixes.
- Match the current beta line already used by `drizzle-orm` and `drizzle-kit`; do not install `drizzle-seed@latest`.

### Task 1: Wire `drizzle-seed` Into The Workspace

**Files:**
- Modify: `packages/db/package.json`
- Modify: `package.json`
- Modify: `turbo.json`

**Step 1: Confirm the root script does not exist yet**

Run:

```bash
bun run db:seed
```

Expected: FAIL with a root-level script-not-found error for `db:seed`.

**Step 2: Add the package-level and root-level script wiring**

Update `packages/db/package.json`:

```json
{
  "scripts": {
    "check-types": "bunx tsgo --noEmit",
    "lint": "biome check .",
    "test": "vitest run",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "bun run src/seed/index.ts",
    "db:start": "docker compose up -d",
    "db:watch": "docker compose up",
    "db:stop": "docker compose stop",
    "db:down": "docker compose down"
  },
  "devDependencies": {
    "@nexa/config": "workspace:*",
    "drizzle-kit": "^1.0.0-beta.18-7eb39f0",
    "drizzle-seed": "1.0.0-beta.18-7eb39f0",
    "typescript": "^5.9.3",
    "vitest": "^4.1.0"
  }
}
```

Update the root `package.json`:

```json
{
  "scripts": {
    "db:push": "turbo run db:push --filter=@nexa/db",
    "db:seed": "turbo run db:seed --filter=@nexa/db",
    "db:studio": "turbo run db:studio --filter=@nexa/db"
  }
}
```

Update `turbo.json`:

```json
{
  "tasks": {
    "db:seed": {
      "cache": false
    }
  }
}
```

**Step 3: Install the new dependency**

Run:

```bash
bun install
```

Expected: PASS and the lockfile updates with `drizzle-seed@1.0.0-beta.18-7eb39f0`.

**Step 4: Re-run the new script to verify the wiring is live**

Run:

```bash
bun run db:seed
```

Expected: FAIL again, but now because `packages/db/src/seed/index.ts` does not exist yet. That proves the script path is wired correctly.

**Step 5: Commit**

```bash
git add package.json packages/db/package.json turbo.json bun.lock
git commit -m "chore: wire drizzle seed scripts"
```

### Task 2: Create A Testable Product Seed Preset

**Files:**
- Create: `packages/db/src/seed/tables/product.seed.ts`
- Create: `packages/db/src/seed/tables/product.seed.test.ts`

**Step 1: Write the failing preset test**

Create `packages/db/src/seed/tables/product.seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { productSeedPreset } from "./product.seed.ts";

describe("productSeedPreset", () => {
	it("defines a 10-product catalog with unique names and a valid price range", () => {
		expect(productSeedPreset.count).toBe(10);
		expect(productSeedPreset.names).toHaveLength(10);
		expect(new Set(productSeedPreset.names).size).toBe(10);
		expect(productSeedPreset.defaultActive).toBe(true);
		expect(productSeedPreset.minPriceInCents).toBeGreaterThan(0);
		expect(productSeedPreset.maxPriceInCents).toBeGreaterThan(
			productSeedPreset.minPriceInCents,
		);
	});
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
bunx vitest run packages/db/src/seed/tables/product.seed.test.ts
```

Expected: FAIL with a module-not-found error for `./product.seed.ts`.

**Step 3: Add the minimal preset module**

Create `packages/db/src/seed/tables/product.seed.ts`:

```ts
export const productSeedPreset = {
	count: 10,
	defaultActive: true,
	minPriceInCents: 3990,
	maxPriceInCents: 19990,
	names: [
		"Camiseta Basic",
		"Moletom Essentials",
		"Boné Classic",
		"Jaqueta Wind",
		"Calça Cargo",
		"Short Sport",
		"Polo Prime",
		"Regata Move",
		"Meia Performance",
		"Tênis Street",
	],
	descriptions: [
		"Produto de seed para desenvolvimento local.",
		"Item de catálogo para validar listagens e detalhes.",
		"Registro de demonstração para o painel administrativo.",
	],
} as const;
```

Keep this file intentionally dumb and declarative. Future table seeds should follow the same pattern: one preset object per table, no DB calls, no app-layer rules.

**Step 4: Run the test again**

Run:

```bash
bunx vitest run packages/db/src/seed/tables/product.seed.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/db/src/seed/tables/product.seed.ts packages/db/src/seed/tables/product.seed.test.ts
git commit -m "test: add product seed preset"
```

### Task 3: Build The Seed Entrypoint

**Files:**
- Create: `packages/db/src/seed/index.ts`

**Step 1: Run the seed script and confirm the entrypoint is still missing**

Run:

```bash
bun run db:seed
```

Expected: FAIL because `packages/db/src/seed/index.ts` does not exist yet.

**Step 2: Write the seed entrypoint**

Create `packages/db/src/seed/index.ts`:

```ts
import { reset, seed } from "drizzle-seed";
import { db } from "../index.ts";
import * as schema from "../schema/index.ts";
import { productSeedPreset } from "./tables/product.seed.ts";

async function main() {
	await reset(db, schema);

	await seed(db, schema).refine((funcs) => ({
		user: { count: 0 },
		session: { count: 0 },
		account: { count: 0 },
		verification: { count: 0 },
		userPermission: { count: 0 },
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
}

main().catch((error) => {
	console.error("Seed failed.");
	console.error(error);
	process.exit(1);
});
```

Important details:
- Keep the unrelated tables at `count: 0` so the seed only produces product catalog data in v1.
- Keep `reset(db, schema)` first so re-running the seed is deterministic for local development.
- Do not import application-layer code from `apps/server`.

**Step 3: Prepare the local database**

Run:

```bash
bun run db:start
bun run db:push
```

Expected: PASS. The MySQL container is up and the current schema is applied.

**Step 4: Run the seed and verify the product count**

Run:

```bash
bun run db:seed
```

Expected: PASS with a success message similar to `Seed completed with 10 products.`

Then verify the count directly from `packages/db`:

```bash
bun --cwd packages/db -e 'import { count } from "drizzle-orm"; import { db } from "./src/index.ts"; import { product } from "./src/schema/product.ts"; const [{ total }] = await db.select({ total: count() }).from(product); console.log(total); process.exit(0);'
```

Expected: PASS and print `10`.

**Step 5: Commit**

```bash
git add packages/db/src/seed/index.ts
git commit -m "feat: add drizzle seed entrypoint"
```

### Task 4: Document The Seed Convention For Future Tables

**Files:**
- Create: `packages/db/src/seed/README.md`

**Step 1: Write the seed README**

Create `packages/db/src/seed/README.md`:

```md
# Database Seeds

## Commands

- `bun run db:seed` from the repo root seeds local development data.
- `bun --cwd packages/db run db:seed` runs the package entrypoint directly.

## Folder contract

- `src/seed/index.ts` is the only executable entrypoint.
- `src/seed/tables/*.seed.ts` stores one declarative preset per table.
- Keep preset files free of DB access and application-layer imports.

## Adding a new table seed

1. Create `src/seed/tables/<table>.seed.ts`.
2. Export one preset object with count and allowed values/ranges.
3. Add a small unit test beside it.
4. Register the preset inside `src/seed/index.ts`.
5. Keep unrelated tables at `count: 0` unless the story explicitly expands scope.
```

**Step 2: Run focused verification**

Run:

```bash
bunx vitest run packages/db/src/seed/tables/product.seed.test.ts
bun run db:seed
```

Expected: PASS for both commands.

**Step 3: Run lint and type checks on the touched package**

Run:

```bash
bun --cwd packages/db run lint
bun --cwd packages/db run check-types
```

Expected: PASS.

**Step 4: Commit**

```bash
git add packages/db/src/seed/README.md
git commit -m "docs: document seed conventions"
```

### Task 5: Final Verification And Handoff

**Files:**
- Review: `packages/db/package.json`
- Review: `package.json`
- Review: `turbo.json`
- Review: `packages/db/src/seed/index.ts`
- Review: `packages/db/src/seed/tables/product.seed.ts`
- Review: `packages/db/src/seed/tables/product.seed.test.ts`
- Review: `packages/db/src/seed/README.md`

**Step 1: Run the full verification set from the repo root**

```bash
bunx vitest run packages/db/src/seed/tables/product.seed.test.ts
bun --cwd packages/db run lint
bun --cwd packages/db run check-types
bun run db:start
bun run db:push
bun run db:seed
bun --cwd packages/db -e 'import { count } from "drizzle-orm"; import { db } from "./src/index.ts"; import { product } from "./src/schema/product.ts"; const [{ total }] = await db.select({ total: count() }).from(product); console.log(total); process.exit(0);'
```

Expected:
- tests PASS
- lint PASS
- type-check PASS
- seed command PASS
- final count command prints `10`

**Step 2: Sanity-check repo status**

Run:

```bash
git status --short
```

Expected: only the planned files are modified, plus any lockfile updates from Task 1.

**Step 3: Final commit**

```bash
git add packages/db/package.json package.json turbo.json packages/db/src/seed packages/db/src/seed/tables bun.lock
git commit -m "feat: add reusable drizzle seed foundation"
```

**Step 4: Report outcome**

In the handoff, mention:
- `db:seed` now resets and seeds only the product catalog.
- the seed count is `10` products.
- future tables should add one preset file under `packages/db/src/seed/tables/`.
