# `@nexa/email` Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a shared `packages/email` package providing React Email templates, Nodemailer SMTP transport (Amazon SES), and a dev server for template preview.

**Architecture:** Single package (`@nexa/email`) with multiple exports — `createEmailClient` + `render` from root, templates from `@nexa/email/templates/*`. Registered in DI container as `"EmailClient"`. Follows the same pattern as `@nexa/analytics`.

**Tech Stack:** React Email, Nodemailer, Amazon SES (SMTP), Zod (env validation), tsyringe (DI)

**Design doc:** `docs/plans/2026-03-24-email-package-design.md`

---

### Task 1: Scaffold package — `package.json` + `tsconfig.json`

**Files:**
- Create: `packages/email/package.json`
- Create: `packages/email/tsconfig.json`

**Step 1: Create `packages/email/package.json`**

```json
{
	"name": "@nexa/email",
	"version": "0.0.0",
	"private": true,
	"type": "module",
	"exports": {
		".": "./src/index.ts",
		"./templates/*": "./src/templates/*.tsx"
	},
	"scripts": {
		"dev": "email dev -p 3001",
		"check-types": "bunx tsgo --noEmit",
		"lint": "biome check ."
	},
	"dependencies": {
		"@react-email/components": "^0.0.41",
		"@react-email/render": "^1.1.2",
		"nodemailer": "^7.0.5",
		"react": "catalog:",
		"react-dom": "catalog:"
	},
	"devDependencies": {
		"@nexa/config": "workspace:*",
		"@types/nodemailer": "^6.4.17",
		"@types/react": "catalog:",
		"@types/react-dom": "catalog:",
		"@typescript/native-preview": "latest",
		"react-email": "^4.0.13"
	}
}
```

**Step 2: Create `packages/email/tsconfig.json`**

```json
{
	"extends": "@nexa/config/tsconfig.base.json",
	"compilerOptions": {
		"jsx": "react-jsx",
		"outDir": "dist"
	},
	"include": ["src"]
}
```

**Step 3: Run `bun install` from monorepo root**

Run: `cd /home/upvendas/projetos/pxbr && bun install`
Expected: lockfile updates, no errors

**Step 4: Commit**

```bash
git add packages/email/package.json packages/email/tsconfig.json bun.lock
git commit -m "chore(email): scaffold @nexa/email package with dependencies"
```

---

### Task 2: Email client — `createEmailClient()` + types

**Files:**
- Create: `packages/email/src/client.ts`
- Create: `packages/email/src/index.ts`

**Step 1: Create `packages/email/src/client.ts`**

```typescript
import nodemailer from "nodemailer";

export interface EmailClientConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
	from: string;
}

export interface EmailMessage {
	to: string | string[];
	subject: string;
	html: string;
}

export interface EmailClient {
	send(message: EmailMessage): Promise<void>;
}

export function createEmailClient(config: EmailClientConfig): EmailClient {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.auth,
	});

	return {
		async send(message) {
			await transport.sendMail({
				from: config.from,
				to: message.to,
				subject: message.subject,
				html: message.html,
			});
		},
	};
}
```

**Step 2: Create `packages/email/src/index.ts`**

```typescript
export {
	createEmailClient,
	type EmailClient,
	type EmailClientConfig,
	type EmailMessage,
} from "./client.ts";
export { render } from "@react-email/render";
```

**Step 3: Verify typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bunx tsgo --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add packages/email/src/client.ts packages/email/src/index.ts
git commit -m "feat(email): add createEmailClient with Nodemailer SMTP transport"
```

---

### Task 3: Template components — layout + button

**Files:**
- Create: `packages/email/src/templates/components/layout.tsx`
- Create: `packages/email/src/templates/components/button.tsx`

**Step 1: Create `packages/email/src/templates/components/layout.tsx`**

```tsx
import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	type ReactEmailComponent,
} from "@react-email/components";

interface LayoutProps {
	preview: string;
	children: React.ReactNode;
}

export const Layout: ReactEmailComponent<LayoutProps> = ({
	preview,
	children,
}) => (
	<Html>
		<Head />
		<Preview>{preview}</Preview>
		<Body
			style={{
				fontFamily:
					'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
				backgroundColor: "#f4f4f5",
				margin: 0,
				padding: "32px 0",
			}}
		>
			<Container
				style={{
					backgroundColor: "#ffffff",
					padding: "32px",
					borderRadius: "8px",
					maxWidth: "560px",
					margin: "0 auto",
				}}
			>
				{children}
			</Container>
		</Body>
	</Html>
);
```

**Step 2: Create `packages/email/src/templates/components/button.tsx`**

```tsx
import { Button as REButton } from "@react-email/components";

interface EmailButtonProps {
	href: string;
	children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
	return (
		<REButton
			href={href}
			style={{
				backgroundColor: "#18181b",
				color: "#ffffff",
				padding: "12px 24px",
				borderRadius: "6px",
				fontSize: "14px",
				fontWeight: 600,
				textDecoration: "none",
				display: "inline-block",
			}}
		>
			{children}
		</REButton>
	);
}
```

**Step 3: Verify typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bunx tsgo --noEmit`
Expected: no errors

**Step 4: Commit**

```bash
git add packages/email/src/templates/components/
git commit -m "feat(email): add shared Layout and EmailButton template components"
```

---

### Task 4: Reset password template

**Files:**
- Create: `packages/email/src/templates/reset-password.tsx`

**Step 1: Create `packages/email/src/templates/reset-password.tsx`**

```tsx
import { Heading, Hr, Text } from "@react-email/components";
import { EmailButton } from "./components/button.tsx";
import { Layout } from "./components/layout.tsx";

interface ResetPasswordEmailProps {
	url: string;
	userName: string;
}

export function ResetPasswordEmail({ url, userName }: ResetPasswordEmailProps) {
	return (
		<Layout preview="Redefina sua senha">
			<Heading as="h1" style={{ fontSize: "24px", color: "#18181b" }}>
				Olá, {userName}
			</Heading>
			<Text style={{ fontSize: "14px", color: "#3f3f46", lineHeight: "24px" }}>
				Recebemos uma solicitação para redefinir a senha da sua conta. Clique no
				botão abaixo para criar uma nova senha:
			</Text>
			<EmailButton href={url}>Redefinir senha</EmailButton>
			<Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
			<Text style={{ fontSize: "12px", color: "#a1a1aa" }}>
				Se você não solicitou a redefinição de senha, ignore este email. O link
				expira em 1 hora.
			</Text>
		</Layout>
	);
}
```

**Step 2: Verify typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bunx tsgo --noEmit`
Expected: no errors

**Step 3: Verify template renders (quick manual test)**

Run: `cd /home/upvendas/projetos/pxbr && bun -e "const { render } = await import('@react-email/render'); const { ResetPasswordEmail } = await import('./packages/email/src/templates/reset-password.tsx'); const html = await render(ResetPasswordEmail({ url: 'https://example.com/reset', userName: 'Test' })); console.log(html.substring(0, 100))"`
Expected: outputs HTML starting with `<!DOCTYPE html>`

**Step 4: Commit**

```bash
git add packages/email/src/templates/reset-password.tsx
git commit -m "feat(email): add reset password email template"
```

---

### Task 5: Order confirmation template (transactional placeholder)

**Files:**
- Create: `packages/email/src/templates/order-confirmation.tsx`

**Step 1: Create `packages/email/src/templates/order-confirmation.tsx`**

```tsx
import { Heading, Hr, Text } from "@react-email/components";
import { Layout } from "./components/layout.tsx";

interface OrderConfirmationEmailProps {
	orderId: string;
	userName: string;
}

export function OrderConfirmationEmail({
	orderId,
	userName,
}: OrderConfirmationEmailProps) {
	return (
		<Layout preview={`Pedido ${orderId} confirmado`}>
			<Heading as="h1" style={{ fontSize: "24px", color: "#18181b" }}>
				Pedido confirmado!
			</Heading>
			<Text style={{ fontSize: "14px", color: "#3f3f46", lineHeight: "24px" }}>
				Olá, {userName}. Seu pedido <strong>#{orderId}</strong> foi confirmado
				com sucesso.
			</Text>
			<Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />
			<Text style={{ fontSize: "12px", color: "#a1a1aa" }}>
				Você receberá atualizações sobre o status do seu pedido por email.
			</Text>
		</Layout>
	);
}
```

**Step 2: Verify typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bunx tsgo --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add packages/email/src/templates/order-confirmation.tsx
git commit -m "feat(email): add order confirmation email template"
```

---

### Task 6: Add SMTP env vars to `@nexa/env`

**Files:**
- Modify: `packages/env/src/server.ts`

**Step 1: Add SMTP env vars to the server env schema**

In `packages/env/src/server.ts`, add these fields inside the `server: { ... }` object, after the `PORT` field:

```typescript
SMTP_HOST: z.string().min(1),
SMTP_PORT: z.coerce.number().int().positive().default(465),
SMTP_SECURE: z
	.enum(["true", "false"])
	.transform((v) => v === "true")
	.default("true"),
SMTP_USER: z.string().min(1),
SMTP_PASS: z.string().min(1),
EMAIL_FROM: z.string().min(1),
```

**Step 2: Add placeholder values to `.env`**

Append to the root `.env` file:

```
# Email (Amazon SES SMTP)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-ses-smtp-user
SMTP_PASS=your-ses-smtp-pass
EMAIL_FROM=PXBR <noreply@pxbr.com>
```

**Step 3: Verify server typecheck still passes**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bunx tsgo --noEmit`
Expected: no errors

**Step 4: Commit** (do NOT commit `.env`)

```bash
git add packages/env/src/server.ts
git commit -m "feat(env): add SMTP email environment variables for Amazon SES"
```

---

### Task 7: Register `EmailClient` in DI container

**Files:**
- Modify: `apps/server/src/container.ts`
- Modify: `apps/server/package.json`

**Step 1: Add `@nexa/email` dependency to server**

In `apps/server/package.json`, add to `dependencies`:

```json
"@nexa/email": "workspace:*",
```

**Step 2: Run `bun install`**

Run: `cd /home/upvendas/projetos/pxbr && bun install`

**Step 3: Register EmailClient in `apps/server/src/container.ts`**

Add imports at top:

```typescript
import { createEmailClient } from "@nexa/email";
```

Add registration after the existing `container.register("ErrorTracker", ...)` block:

```typescript
container.register("EmailClient", {
	useValue: createEmailClient({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
		from: env.EMAIL_FROM,
	}),
});
```

**Step 4: Verify server typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bunx tsgo --noEmit`
Expected: no errors

**Step 5: Verify server tests pass**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bun test`
Expected: all tests pass

**Step 6: Commit**

```bash
git add apps/server/package.json apps/server/src/container.ts bun.lock
git commit -m "feat(server): register EmailClient in DI container"
```

---

### Task 8: Wire Better Auth `sendResetPassword`

**Files:**
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/auth/package.json`

**Step 1: Add `@nexa/email` dependency to auth package**

In `packages/auth/package.json`, add to `dependencies`:

```json
"@nexa/email": "workspace:*",
```

**Step 2: Run `bun install`**

Run: `cd /home/upvendas/projetos/pxbr && bun install`

**Step 3: Update `packages/auth/src/index.ts`**

Add imports:

```typescript
import { createEmailClient, render } from "@nexa/email";
import { ResetPasswordEmail } from "@nexa/email/templates/reset-password";
```

Create email client before the `betterAuth()` call:

```typescript
const emailClient = createEmailClient({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
	from: env.EMAIL_FROM,
});
```

Update the `emailAndPassword` config inside `betterAuth()`:

```typescript
emailAndPassword: {
	enabled: true,
	sendResetPassword: async ({ user, url }) => {
		const html = await render(
			ResetPasswordEmail({ url, userName: user.name }),
		);
		await emailClient.send({
			to: user.email,
			subject: "Redefina sua senha — PXBR",
			html,
		});
	},
},
```

**Step 4: Add SMTP env vars to auth's env import**

The auth package already imports `env` from `@nexa/env/server` — the new SMTP vars are already available since we added them in Task 6.

**Step 5: Verify typecheck passes**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bunx tsgo --noEmit`
Expected: no errors

**Step 6: Verify server tests pass**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bun test`
Expected: all tests pass

**Step 7: Commit**

```bash
git add packages/auth/package.json packages/auth/src/index.ts bun.lock
git commit -m "feat(auth): wire sendResetPassword with React Email template"
```

---

### Task 9: Add `dev:email` script to root and verify dev server

**Files:**
- Modify: `packages/email/package.json` (already has `dev` script)
- Modify: `package.json` (root)

**Step 1: Add `dev:email` script to root `package.json`**

In the root `package.json` scripts section, add:

```json
"dev:email": "turbo run dev --filter=@nexa/email",
```

**Step 2: Verify dev server starts**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bun run dev`
Expected: React Email dev server starts on `http://localhost:3001`, shows templates in browser. Stop with Ctrl+C after verifying.

**Step 3: Run full lint check**

Run: `cd /home/upvendas/projetos/pxbr && bun run check`
Expected: no errors

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add dev:email script for React Email preview server"
```

---

### Task 10: Final verification

**Step 1: Run server tests**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bun test`
Expected: all tests pass

**Step 2: Run server typecheck**

Run: `cd /home/upvendas/projetos/pxbr/apps/server && bunx tsgo --noEmit`
Expected: no errors

**Step 3: Run email package typecheck**

Run: `cd /home/upvendas/projetos/pxbr/packages/email && bunx tsgo --noEmit`
Expected: no errors

**Step 4: Run full lint**

Run: `cd /home/upvendas/projetos/pxbr && bun run check`
Expected: no errors
