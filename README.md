# nexa

A TypeScript monorepo with a DDD/Clean Architecture backend, React admin SPA, and shared UI primitives.

## Stack

- **TypeScript** — end-to-end type safety
- **Elysia** — type-safe, high-performance API framework
- **Drizzle ORM** — TypeScript-first ORM with PostgreSQL
- **Better Auth** — authentication (email/password + admin plugin)
- **Redis** — caching (`@Cacheable` / `@CacheInvalidate` decorators)
- **TanStack Router** — file-based routing in the admin SPA
- **Tailwind CSS + shadcn/ui** — shared component library in `@nexa/ui`
- **Bun** — runtime and package manager
- **Turbo** — monorepo build orchestration
- **Biome** — linting and formatting

## Getting Started

```bash
bun install
```

Copy the server env file and fill in values:

```bash
cp apps/server/.env.example apps/server/.env
```

Start the database and Redis:

```bash
bun run db:start
```

Push the schema to your database:

```bash
bun run db:push
```

Start all apps in development mode:

```bash
bun run dev
```

The API runs at `http://localhost:3000` and the admin app at `http://localhost:3001`.

## Project Structure

```
nexa/
├── apps/
│   ├── admin/    # React SPA (TanStack Router + Vite)
│   └── server/   # Elysia API (DDD, Clean Architecture)
└── packages/
    ├── auth/     # Better Auth config and permissions
    ├── db/       # Drizzle schema, migrations, docker-compose
    ├── env/      # t3-env typed environment variables
    ├── ui/       # Shared shadcn/ui components (@nexa/ui)
    └── config/   # Shared tsconfig base
```

## Available Scripts

- `bun run dev` — start all apps
- `bun run dev:admin` / `bun run dev:server` — start individual apps
- `bun run build` — build all apps
- `bun run check-types` — typecheck all packages
- `bun run test` — run all tests
- `bun run check` — lint and format with Biome
- `bun run db:start` — start PostgreSQL + Redis via Docker Compose
- `bun run db:push` — push schema changes (no migration file)
- `bun run db:generate` / `bun run db:migrate` — generate and run migrations
- `bun run db:studio` — open Drizzle Studio

## UI Components

Shared shadcn/ui primitives live in `packages/ui`. Import them as:

```tsx
import { Button } from "@nexa/ui/components/button";
```

To add more primitives:

```bash
npx shadcn@latest add accordion dialog sheet table -c packages/ui
```
