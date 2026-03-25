# Design: `@nexa/email` — React Email + Nodemailer Package

**Date:** 2026-03-24
**Status:** Approved

## Goal

Create a shared `packages/email` package for the monorepo that provides:
- Email templates using React Email components
- Email sending via Nodemailer (SMTP) targeting Amazon SES
- Dev server for template preview during development
- Integration with Better Auth (reset password) and future transactional/marketing emails

## Architecture Decision

**Single package approach** — one `packages/email` package contains templates, send service, and dev server config. Follows the same pattern as `@nexa/analytics` (multiple exports from one package).

## Package Structure

```
packages/email/
├── src/
│   ├── client.ts              # createEmailClient() — Nodemailer transport factory
│   ├── render.ts              # Re-export of render() from @react-email/render
│   ├── templates/
│   │   ├── reset-password.tsx # Reset password email
│   │   ├── order-confirmation.tsx  # Transactional example
│   │   └── components/
│   │       ├── layout.tsx     # Shared base layout (header, footer, branding)
│   │       └── button.tsx     # Reusable styled button
│   └── index.ts               # Public re-exports
├── package.json
└── tsconfig.json
```

## Package Exports

- `@nexa/email` → `createEmailClient`, `render`, types (`EmailClient`, `EmailMessage`, `EmailClientConfig`)
- `@nexa/email/templates/*` → individual template components

## API Design

### Email Client

```typescript
interface EmailClientConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
}

interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
}

interface EmailClient {
  send(message: EmailMessage): Promise<void>;
}

function createEmailClient(config: EmailClientConfig): EmailClient;
```

### Usage Pattern

```typescript
import { render } from "@nexa/email";
import { ResetPasswordEmail } from "@nexa/email/templates/reset-password";

const html = await render(ResetPasswordEmail({ url, userName }));
await emailClient.send({ to: user.email, subject: "Reset sua senha", html });
```

## DI Integration

Register `EmailClient` in `apps/server/src/container.ts`:

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

## Better Auth Integration

Wire `sendResetPassword` in `packages/auth/src/index.ts`:

```typescript
emailAndPassword: {
  enabled: true,
  sendResetPassword: async ({ user, url }) => {
    const html = await render(ResetPasswordEmail({ url, userName: user.name }));
    await emailClient.send({
      to: user.email,
      subject: "Redefina sua senha — PXBR",
      html,
    });
  },
},
```

## Environment Variables

Add to `packages/env/src/server.ts`:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SES SMTP endpoint | `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_SECURE` | Use TLS | `true` |
| `SMTP_USER` | SES SMTP username | (IAM credential) |
| `SMTP_PASS` | SES SMTP password | (IAM credential) |
| `EMAIL_FROM` | Default sender | `PXBR <noreply@pxbr.com>` |

## Dependencies

- `@react-email/components` — React Email UI components
- `@react-email/render` — render React components to HTML string
- `react-email` (devDependency) — dev server for preview
- `nodemailer` — SMTP transport
- `@types/nodemailer` (devDependency) — TypeScript types

## Dev Server

- Script: `"dev": "email dev -p 3001"` (port 3001 to avoid conflict with server on 3000)
- Root script: `bun run dev:email` via Turbo
- Preview templates at `http://localhost:3001`

## Consumers

- `apps/server` — use cases, Better Auth hooks
- Future workers/cron jobs — batch emails, marketing campaigns

## Email Types (initial)

1. **Reset password** — triggered by Better Auth `sendResetPassword` hook
2. **Order confirmation** — transactional template (placeholder for future use)
3. **Marketing** — future templates, same infrastructure
