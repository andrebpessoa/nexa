# Database Seeds

## Commands

- `bun run db:seed` from the repo root seeds local development data.
- `bun run --cwd packages/db db:seed` runs the package entrypoint directly.

## Folder contract

- `src/seed/index.ts` is the only executable entrypoint.
- `src/seed/tables/*.seed.ts` stores one declarative preset per table.
- Keep preset files free of DB access and application-layer imports.

## Adding a new table seed

1. Create `src/seed/tables/<table>.seed.ts`.
2. Export one preset object with count and allowed values or ranges.
3. Add a small unit test beside it.
4. Register the preset inside `src/seed/index.ts`.
5. Keep unrelated tables out of `refine()` unless the scope explicitly expands.
