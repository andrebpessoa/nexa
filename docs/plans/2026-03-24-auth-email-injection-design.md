# Design: Injetar EmailClient no package auth

**Data**: 2026-03-24
**Status**: Aprovado

## Problema

O package `@nexa/auth` instancia internamente um `emailClient` via `createEmailClient()` para enviar emails transacionais (ex: reset de senha). Isso causa:

1. **Acoplamento**: auth gerencia infraestrutura de email em vez de apenas receber a dependência
2. **Duplicação**: `emailClient` é criado duas vezes — dentro do auth e no DI container (`container.ts`)
3. **Violação de DIP**: auth depende de uma implementação concreta em vez de receber a abstração

## Solução

Converter `@nexa/auth` de exportação direta (`export const auth`) para uma factory function que recebe `EmailClient` como dependência.

## Mudanças

### 1. `packages/auth/src/index.ts`

- Substituir `export const auth = betterAuth(...)` por `export function createAuth({ emailClient }: AuthDependencies)`
- Exportar tipo `Auth = ReturnType<typeof createAuth>` para consumidores que precisam do tipo
- Remover instanciação interna do `emailClient`
- Interface `AuthDependencies` extensível para futuras dependências

### 2. `apps/server/src/container.ts`

- Criar instância do auth via `createAuth({ emailClient })` usando o `EmailClient` já registrado no container
- Registrar a instância do auth no container DI para consumo pelos módulos

### 3. Consumidores no server (4 arquivos)

Arquivos que importam `auth` de `@nexa/auth`:

- `apps/server/src/index.ts` — handler de rotas auth
- `apps/server/src/modules/authorization/module.ts` — módulo de autorização
- `apps/server/src/modules/authorization/infra/gateways/better-auth-permission-policy.gateway.ts` — gateway
- `apps/server/src/scripts/seed-admin.ts` — script de seed

Todos passam a resolver `auth` do container DI ou recebê-lo como parâmetro.

### 4. Frontends (zero mudanças)

`admin` e `storefront` importam apenas `@nexa/auth/permissions` (access control statements) — não são afetados.

## Resultado

- Uma única instância de `EmailClient` compartilhada
- Auth recebe dependências por injeção, seguindo DIP
- Fácil adicionar novos emails ao Better Auth sem mudar a arquitetura
- `AuthDependencies` extensível para futuras dependências (logger, etc.)
