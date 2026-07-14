# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

An expense tracker monorepo, early stage. Dependencies are installed
(lockfile at the root). Implemented so far: backend auth API (JWT —
`POST /auth/register`, `POST /auth/login`, `GET /auth/me`) with CQRS-style
users module, categories module, transactions module (income/expense CRUD +
month/year aggregation), and frontend login/registration pages. The frontend
has no UI for transactions yet.
**No tests exist yet** — do not invent test commands.

## Stack

- **Monorepo:** npm workspaces (no Turborepo/Nx — scripts are plain npm
  workspace commands from the root `package.json`)
- **Frontend:** Next.js 16 (App Router, TypeScript) + Tailwind CSS v4 +
  shadcn/ui (components in `frontend/src/shared/ui`), architecture —
  Feature-Sliced Design (see below)
- **Backend:** Nest.js 11 (TypeScript)
- **Database:** PostgreSQL (via Docker Compose)
- **ORM:** Prisma 7 — schema lives in `backend/prisma/schema.prisma`
- **Shared code:** `packages/shared` — TypeScript types/DTOs used by both apps
- **Lint/format:** ESLint 10 (flat config) + Prettier
- All dependency versions are pinned exactly (no `^`/`~` ranges) across every
  `package.json` in the repo — keep this convention when adding new packages.

## Repository layout

```
frontend/           @expence-tracker/frontend — Next.js app (App Router in src/app)
backend/             @expence-tracker/backend — Nest.js app + Prisma schema
packages/shared/      @expence-tracker/shared — shared TS types/DTOs, no build step (consumed as source)
```

`frontend` and `backend` are workspace packages at the repo root (not nested
under `apps/`) — the root `package.json` workspaces field is
`["frontend", "backend", "packages/*"]`.

`packages/shared` has no build step: its `package.json` points `main`/`types`
directly at `src/index.ts`, and Next.js is configured with
`transpilePackages: ['@expence-tracker/shared']` (see `frontend/next.config.ts`)
so it's consumed as TypeScript source, not compiled output.

## Commands

Once dependencies are installed (`npm install` from the root), these
workspace-aware scripts are defined:

```bash
npm run dev              # frontend + backend in parallel (via concurrently — plain
                         # `npm run --workspaces` runs sequentially and would never
                         # reach the backend)
npm run dev:frontend     # Next.js dev server only
npm run dev:backend      # Nest.js dev server only (--watch)
npm run build            # builds every workspace
npm run lint             # eslint . across the whole repo (flat config, root eslint.config.mjs)
npm run format            # prettier --write .
npm run format:check     # prettier --check .
```

Backend-specific Prisma scripts (run with `--workspace @expence-tracker/backend`):

```bash
npm run prisma:generate --workspace @expence-tracker/backend
npm run prisma:migrate --workspace @expence-tracker/backend
npm run prisma:studio --workspace @expence-tracker/backend
```

Local PostgreSQL via Docker Compose (single `postgres` service; `backend`/
`frontend` services are commented out in `docker-compose.yml` as a future
containerization option):

```bash
cp .env.example .env
docker compose up -d
```

Each app needs its own `.env` copied from `.env.example` (`backend/.env.example`
has `DATABASE_URL` + `PORT`; `frontend/.env.example` has `NEXT_PUBLIC_API_URL`).

## Frontend architecture — Feature-Sliced Design

The frontend follows [Feature-Sliced Design](https://feature-sliced.design)
(FSD). Layers under `frontend/src/`, top → bottom (imports may only point
downward; slices on the same layer must not import each other):

```
app/        Next.js App Router — routing, root layout, globals.css. Route
            files are thin: a page.tsx only sets metadata and re-exports a
            component from views/.
views/      FSD "pages" layer, renamed because src/pages is reserved by
            Next.js (Pages Router). One slice per screen (views/login,
            views/register), page composition only.
features/   User interactions (features/auth — login/registration forms,
            auth API requests, zod schemas).
entities/   Domain models (entities/session — JWT + user persistence in
            localStorage).
shared/     No business logic. shared/ui — shadcn/ui components,
            shared/api — HTTP client (apiFetch/ApiError), shared/lib — cn().
```

Each slice exposes a public API via its `index.ts` — import from
`@/features/auth`, not from deep paths inside another slice. Segments inside
a slice: `ui/` (components), `api/` (requests), `model/` (schemas, storage,
state).

**shadcn/ui:** configured via `frontend/components.json` with aliases mapped
into FSD (`ui` → `@/shared/ui`, `utils` → `@/shared/lib/utils`). Add
components with `npx shadcn@latest add <name>` from `frontend/` — they land
in `src/shared/ui/`. Never edit theme variables outside
`src/app/globals.css`. The CLI installs dependencies with `^` ranges — pin
them to exact versions afterwards (repo convention). Recent shadcn
components import the consolidated `radix-ui` package, not individual
`@radix-ui/react-*` packages.

**Forms:** react-hook-form + zod (v4 — use `z.email()`, not
`z.string().email()`) via `@hookform/resolvers`. Client validation mirrors
backend DTO rules (email, password ≥ 8 chars) — keep them in sync.

## Architecture notes

- **ESLint uses flat config only** (`eslint.config.mjs` at the root, ESM,
  built with `typescript-eslint`'s `tseslint.config()` helper). ESLint 10
  dropped `.eslintrc.*` support entirely — don't add legacy-format config
  files.
- **TypeScript is pinned to 5.9.3**, not the latest major (7.x), because
  `typescript-eslint@8` only supports `typescript >=4.8.4 <6.1.0`. Don't bump
  TypeScript without checking `typescript-eslint` peer range compatibility.
- **Next.js 16 has no `next lint` command** — the frontend's `lint` script
  calls `eslint .` directly instead.
- `tsconfig.base.json` at the root is the shared base config; `frontend` and
  `backend` each have their own `tsconfig.json` with `"extends": "../tsconfig.base.json"`
  plus environment-specific overrides (DOM/React JSX for frontend,
  CommonJS/decorators for backend). `packages/shared` extends it from one
  level deeper (`../../tsconfig.base.json`).
- **Prisma schema** (`backend/prisma/schema.prisma`) currently models `User`,
  `Category`, and `Transaction`, with `Category`/`Transaction` scoped to a
  `User` via cascading foreign keys. `Transaction.amount` uses
  `Decimal @db.Decimal(12, 2)` for currency-safe arithmetic — don't switch it
  to a float type. `amount` is always positive; direction is carried by
  `type` (`TransactionType` enum — `INCOME`/`EXPENSE`).
- Shared domain types in `packages/shared/src/index.ts` (`Category`,
  `Transaction`, `CreateTransactionDto`, …) are meant to stay in sync with the
  Prisma models — when the schema changes, update these types too.
- **Module boundaries are enforced through the CQRS bus.** A module never
  imports another module's service: `transactions` checks category ownership
  via `GetCategoryByIdQuery` (owned by `categories`), `auth` reaches users via
  `GetUserByIdQuery`. `transactions` is fully CQRS — the controller only
  dispatches to `CommandBus`/`QueryBus`, there is no service layer;
  `categories` still uses a plain service over Prisma.
- **`Decimal` never leaves the backend as-is.** `Decimal.toJSON()` serialises
  to a string, so every response path converts through
  `transactions.mapper.ts` (`toPublicTransaction`); sums are computed in
  `Prisma.Decimal` and turned into `number` only at the response boundary.
- Records belonging to another user are reported as **404, not 403**
  (`ForbiddenException` is deliberately unused) — ownership checks scope the
  query by `userId` so a foreign id is indistinguishable from a missing one.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <subject>

[optional body]
```

- **Type** — one of `feat`, `fix`, `refactor`, `perf`, `docs`, `style`,
  `test`, `build`, `ci`, `chore`. A breaking change is marked with `!` after
  the scope (`feat(backend)!: …`) and explained in the body.
- **Scope** — the workspace or area the change belongs to: `frontend`,
  `backend`, `shared`, `auth`, `categories`, `transactions`, `prisma`,
  `deps`, `config`. Omit it only for changes that genuinely span the whole
  repo.
- **Subject** — imperative mood, lower case, no trailing period, ≤ 72
  characters (`add transaction filters`, not `Added transaction filters.`).
- **Body** — optional, explains *why* rather than *what*; wrap at 72
  characters.
- **Language** — commit messages are written in English, like the rest of the
  codebase and this file.
- One logical change per commit: don't mix a feature with unrelated
  formatting or dependency bumps.

Examples:

```
feat(transactions): add month/year aggregation endpoint
fix(auth): reject expired JWT with 401 instead of 500
refactor(categories): move ownership check behind the CQRS bus
chore(deps): pin radix-ui to 1.4.3
```
