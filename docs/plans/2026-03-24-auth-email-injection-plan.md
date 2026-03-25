# Auth EmailClient Dependency Injection — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the hardcoded `EmailClient` from `@nexa/auth` and inject it via a factory function, eliminating duplication and following dependency inversion.

**Architecture:** Convert `@nexa/auth` from exporting a singleton `auth` instance to exporting a `createAuth()` factory that receives `EmailClient` as a dependency. The server's DI container creates the single `EmailClient` and passes it to `createAuth()`. All server consumers resolve `auth` from the container instead of importing it from the package.

**Tech Stack:** TypeScript, Better Auth, tsyringe DI, nodemailer (via `@nexa/transactional`)

---

### Task 1: Convert `@nexa/auth` to factory function

**Files:**
- Modify: `packages/auth/src/index.ts` (lines 1-57, full rewrite)

**Step 1: Rewrite `packages/auth/src/index.ts` to export `createAuth` factory**

Replace the entire file with:

```ts
import type { EmailClient } from "@nexa/transactional";
import { pretty, render } from "@nexa/transactional";
import { ResetPasswordEmail } from "@nexa/transactional/emails/reset-password";
import { db } from "@nexa/db";
import * as schema from "@nexa/db/schema/index";
import { env } from "@nexa/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { ac, admin, member } from "./permissions.ts";

export interface AuthDependencies {
	emailClient: EmailClient;
}

export function createAuth({ emailClient }: AuthDependencies) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "mysql",
			schema,
		}),
		trustedOrigins: env.CORS_ORIGIN,
		emailAndPassword: {
			enabled: true,
			sendResetPassword: async ({ user, url }) => {
				const html = await pretty(
					await render(ResetPasswordEmail({ url, userName: user.name })),
				);
				await emailClient.send({
					to: user.email,
					subject: "Redefina sua senha — PXBR",
					html,
				});
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

Key changes:
- Removed `createEmailClient` import and local instantiation
- Added `import type { EmailClient }` from `@nexa/transactional`
- `export const auth` → `export function createAuth({ emailClient })`
- Added `export type Auth` for consumers that need the type
- `@nexa/transactional` stays as a dependency (still needed for `pretty`, `render`, and email templates)

**Step 2: Run typecheck on auth package**

Run: `cd packages/auth && bunx tsgo --noEmit`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "refactor(auth): convert to factory function accepting EmailClient dependency"
```

---

### Task 2: Register `auth` in the DI container

**Files:**
- Modify: `apps/server/src/container.ts` (lines 1-27)

**Step 1: Update `container.ts` to create and register the `auth` instance**

Replace the full file with:

```ts
import "reflect-metadata";
import { createPostHogServerErrorTracker } from "@nexa/analytics/posthog/server";
import { createAuth } from "@nexa/auth";
import { db } from "@nexa/db";
import { env } from "@nexa/env/server";
import { createEmailClient } from "@nexa/transactional";
import { container } from "tsyringe";
import { redisClient } from "./shared/infra/cache/redis-client.ts";

container.register("Database", { useValue: db });
container.register("CacheClient", { useValue: redisClient });
container.register("ErrorTracker", {
	useValue: createPostHogServerErrorTracker({
		apiKey: env.POSTHOG_KEY,
		host: env.POSTHOG_HOST,
	}),
});

const emailClient = createEmailClient({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
	from: env.EMAIL_FROM,
});

container.register("EmailClient", { useValue: emailClient });

const auth = createAuth({ emailClient });
container.register("Auth", { useValue: auth });

export { container };
```

Key changes:
- Import `createAuth` from `@nexa/auth` instead of the old `auth` singleton
- Extract `emailClient` into a variable so it can be shared
- Create `auth` via factory, register as `"Auth"` token in the container

**Step 2: Commit**

```bash
git add apps/server/src/container.ts
git commit -m "refactor(server): create auth via factory and register in DI container"
```

---

### Task 3: Update `apps/server/src/index.ts` to resolve auth from container

**Files:**
- Modify: `apps/server/src/index.ts` (line 4, line 65)

**Step 1: Replace the auth import and usage**

Change line 4 from:
```ts
import { auth } from "@nexa/auth";
```
to:
```ts
import type { Auth } from "@nexa/auth";
```

Add after line 9 (`import { container }...`), resolve auth from the container:
```ts
const auth = container.resolve<Auth>("Auth");
```

The rest of the file stays unchanged — `auth.handler(request)` on line 65 works the same.

**Step 2: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "refactor(server): resolve auth from DI container in index"
```

---

### Task 4: Update authorization module to receive auth as parameter

**Files:**
- Modify: `apps/server/src/modules/authorization/module.ts` (lines 1, 23-27)

**Step 1: Replace the auth import with a parameter**

Change line 1 from:
```ts
import { auth } from "@nexa/auth";
```
to:
```ts
import type { Auth } from "@nexa/auth";
```

Change the factory signature on line 23 from:
```ts
export const createAuthorizationModule = () => {
```
to:
```ts
export const createAuthorizationModule = ({ auth }: { auth: Auth }) => {
```

The rest of the function body stays unchanged — `auth.api.getSession(...)` on line 27 works the same.

**Step 2: Update the call site in `apps/server/src/index.ts`**

Change line 15 from:
```ts
const authorizationModule = createAuthorizationModule();
```
to:
```ts
const authorizationModule = createAuthorizationModule({ auth });
```

(This works because `auth` was already resolved from container in Task 3.)

**Step 3: Commit**

```bash
git add apps/server/src/modules/authorization/module.ts apps/server/src/index.ts
git commit -m "refactor(authorization): receive auth instance as parameter"
```

---

### Task 5: Update BetterAuthPermissionPolicyGateway to receive auth via DI

**Files:**
- Modify: `apps/server/src/modules/authorization/infra/gateways/better-auth-permission-policy.gateway.ts` (lines 1, 15-18)

**Step 1: Replace the auth import with DI injection**

Change line 1 from:
```ts
import { auth } from "@nexa/auth";
```
to:
```ts
import type { Auth } from "@nexa/auth";
```

Update the class to inject auth via tsyringe. Change lines 15-18 from:
```ts
@injectable()
export class BetterAuthPermissionPolicyGateway
	implements PermissionPolicyGateway
{
```
to:
```ts
@injectable()
export class BetterAuthPermissionPolicyGateway
	implements PermissionPolicyGateway
{
	constructor(@inject("Auth") private readonly auth: Auth) {}
```

Add the import for `inject`:
```ts
import { inject, injectable } from "tsyringe";
```
(was previously just `import { injectable } from "tsyringe";`)

Update line 36 from `auth.api.userHasPermission(...)` to `this.auth.api.userHasPermission(...)`.

**Step 2: Commit**

```bash
git add apps/server/src/modules/authorization/infra/gateways/better-auth-permission-policy.gateway.ts
git commit -m "refactor(authorization): inject auth via DI in permission policy gateway"
```

---

### Task 6: Update seed-admin script

**Files:**
- Modify: `apps/server/src/scripts/seed-admin.ts` (lines 1-2)

**Step 1: Replace the auth import with container resolution**

Change lines 1-2 from:
```ts
import { auth } from "@nexa/auth";
import { db } from "@nexa/db";
```
to:
```ts
import type { Auth } from "@nexa/auth";
import { db } from "@nexa/db";
import { container } from "../container.ts";

const auth = container.resolve<Auth>("Auth");
```

The rest of the script stays unchanged.

**Step 2: Commit**

```bash
git add apps/server/src/scripts/seed-admin.ts
git commit -m "refactor(scripts): resolve auth from DI container in seed-admin"
```

---

### Task 7: Verify everything works

**Step 1: Run typecheck on the entire project**

Run: `bun run check-types`
Expected: PASS across all packages

**Step 2: Run server tests**

Run: `cd apps/server && bun test`
Expected: All tests pass (currently 62 tests)

**Step 3: Run linter**

Run: `bun run check`
Expected: No errors

**Step 4: Commit any remaining fixes if needed**

---

### Task 8: Clean up — remove `@nexa/transactional` from auth's dependencies if possible

**Files:**
- Check: `packages/auth/package.json` (line 19)

**Step 1: Verify if auth still needs `@nexa/transactional`**

After the refactor, `packages/auth/src/index.ts` still imports:
- `import type { EmailClient } from "@nexa/transactional"` — type-only, erased at runtime
- `import { pretty, render } from "@nexa/transactional"` — runtime, needed for email rendering
- `import { ResetPasswordEmail } from "@nexa/transactional/emails/reset-password"` — runtime, needed for template

The auth package still needs `@nexa/transactional` as a dependency because it renders the email templates. This is acceptable — auth knows **what** to send (template + rendering), but not **how** to send (transport). No change needed here.

**Step 2: Verify no stale `createEmailClient` import remains in auth**

Run: `grep -r "createEmailClient" packages/auth/`
Expected: No matches
