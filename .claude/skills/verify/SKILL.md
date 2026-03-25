---
name: verify
description: Run the full verification pipeline (tests + typecheck + lint) before marking work as done
---

Run all verification steps sequentially. Stop at the first failure and report the issue.

## Steps

1. **Server tests**: `cd apps/server && bun test`
2. **Server typecheck**: `cd apps/server && bunx tsgo --noEmit`
3. **Lint + format check**: `cd /home/upvendas/projetos/pxbr && bun run check`

## Reporting

- If all steps pass, report: "All checks passed (tests, typecheck, lint)."
- If a step fails, stop immediately, report which step failed, and show the relevant error output.
- Always include the test count and pass/fail breakdown from step 1.
