# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

CRM web app for individual real estate agents in Taiwan (台灣房屋仲介個人業務員).
**Auth is on Supabase (`@supabase/ssr`); data layer is still on zustand+mock-data.**
OpenAI and LINE wiring are still deferred. All UI strings are Traditional Chinese;
TypeScript is strict and `any` is forbidden by convention.

> **Heads up:** the app cannot boot without `NEXT_PUBLIC_SUPABASE_URL` and
> `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Middleware throws on missing envs by design.
> Run `vercel link` (creates the Vercel project), install the Supabase Marketplace
> integration in the Vercel dashboard, then `vercel env pull .env.local`.

## Commands

```bash
npm run dev      # Next.js dev server (http://localhost:3000)
npm run build    # production build
npm run start    # production start (after build)
npm run lint     # next lint (ESLint, Next + TS rules)
npx tsc --noEmit # type-check without emitting (no dedicated script)
```

There is no test runner installed yet. If you add one, prefer Vitest + RTL and wire it
up in `package.json`.

## Architecture

### Data flow (MVP)

```
lib/mock-data.ts ──seed──▶ hooks/use-{properties,clients,reminders}.ts (zustand)
                                    │
                                    ▼
                  components/{properties,clients,reminders}/* (UI)
                                    │
                                    ▼
                              app/(dashboard)/**
```

- **State lives in zustand stores**, not React Query / SWR / Server Components data
  fetching. The dashboard pages are `"use client"` and read from the store directly.
  When Supabase comes online, replace each store's seed array with a fetch + subscribe
  on mount; the component API does not need to change.
- **`app/api/*/route.ts` are stubs** that return mock data and respond `501` for POST.
  They exist so the wire format is documented and so external integrations
  (LINE bot, n8n) can hit a stable endpoint while we swap the body in.
- The folder structure under `app/` uses **two route groups**: `(auth)` for the login
  page (no chrome) and `(dashboard)` for everything else (sidebar + header + bottom
  tabs). The dashboard route group **owns `/`** — there is no top-level `app/page.tsx`.

### Layout

`components/layout/` contains:
- `nav-config.ts` — single source of truth for nav items (used by both sidebar and bottom tabs)
- `sidebar.tsx` — 240px deep-blue (`bg-slate-900` + `bg-blue-600` active), desktop only
- `bottom-tabs.tsx` — fixed bottom bar, mobile only (`md:hidden`)
- `header.tsx` — top bar with notification bell badge driven from `useReminders`

Pages opt into a normal `space-y-*` flow under `app/(dashboard)/layout.tsx` which adds
`pb-24 md:pb-6` to the main element so content clears the mobile tab bar.

### Domain types — `lib/types.ts`

All Chinese-literal union types (`PropertyStatus`, `ClientStatus`, `ClientType`,
`InteractionType`, `ReminderType`, `PropertyType`). Keep these as the source of truth;
constants for iteration order and badge color mappings live in `lib/constants.ts`
(`PROPERTY_STATUSES`, `PROPERTY_STATUS_COLOR`, etc.). When adding a new status, update
both the type and the color map — TypeScript will fail compilation if the map is
incomplete because they are typed as `Record<Status, string>`.

### Conventions

- **Strict TS, no `any`.** Forms cast `Select.onValueChange` strings back to the
  domain union (`v as ClientType`). If you add a new field, model it in
  `lib/types.ts` first.
- **Currency in 萬元** (ten-thousand-NTD) is the canonical unit on `Property.price`
  and `Client.budgetMin/Max`. Use `formatPriceWan` / `formatBudgetRange` from
  `lib/utils.ts` — never inline `${n} 萬`. Values ≥ 10000 萬 auto-format as 億.
- **Dates** are real `Date` objects in stores and mock data. When binding to
  `<input type="date">`, slice via `.toISOString().slice(0, 10)`.
- **Loading states** are `loading.tsx` files per route segment (skeleton placeholders,
  not text). Add one whenever a route does meaningful work.
- **shadcn/ui is pinned to v2.3.x** (Tailwind v3 era). The newer `shadcn@latest` CLI
  requires Tailwind v4 and will fail. Add components with:
  `npx shadcn@2.3.0 add <name>`.
- **Toasts** use `sonner` via the root `<Toaster />` in `app/layout.tsx`. Import
  `{ toast }` from `"sonner"` directly.
- **Path alias `@/*`** is configured in `tsconfig.json` and points to the repo root.

### Auth — Supabase Auth via `@supabase/ssr`

The wiring lives in three layers:

1. **`lib/supabase/{client,server,middleware}.ts`** — three creators, one per Next
   runtime. Always import `createClient` from the matching file:
   - `client.ts` → React client components (`"use client"`)
   - `server.ts` → Server Components, Server Actions, Route Handlers
   - `middleware.ts` → Edge middleware only (don't import elsewhere)

   They share `lib/supabase/env.ts`, which throws a clear "run `vercel env pull`"
   error if envs are missing. **Do not soften that throw** — it's the contract that
   forces dev environments to be configured before booting.

2. **Root `middleware.ts`** calls `updateSession`, which:
   - refreshes the auth cookie on every request via `supabase.auth.getUser()`
   - redirects unauthenticated requests to `/login?next=<path>`
   - bounces authenticated users away from `/login` and `/signup`

   The matcher excludes static assets and `/api/*` — API routes do their own
   auth checks (none today, since stubs return mock data).

3. **`app/(auth)/actions.ts`** — `signInAction`, `signUpAction`, `signOutAction`
   are Server Actions used by `app/(auth)/login/page.tsx`,
   `app/(auth)/signup/page.tsx`, and `components/layout/user-menu.tsx`.
   Auth errors are translated to zh-TW via `translateAuthError`.

The dashboard layout (`app/(dashboard)/layout.tsx`) is a Server Component that
fetches `auth.getUser()` and passes `{ email, displayName }` down. Display name
comes from `user_metadata.display_name` (set at signup) with email-prefix fallback.

> **Mock-data placeholder:** `CURRENT_USER` in `lib/constants.ts` is still used
> when forms create new properties / clients / interactions / reminders. The data
> layer migration replaces these with the real `auth.uid()` from a Server Action.

### Database — Supabase Postgres

Schema lives in `supabase/migrations/`. The initial migration creates four tables
(`properties`, `clients`, `interactions`, `reminders`) plus enums that mirror the
TS unions in `lib/types.ts`. **Single-agent RLS** is enabled: each row is visible
and mutable only by its owner (`owner_id` / `assigned_to` / `created_by`).

To push schema to the Vercel-Marketplace Supabase project:

```bash
npx supabase login
npx supabase link --project-ref <ref-from-vercel-supabase-dashboard>
npx supabase db push
```

When iterating on the schema locally:

1. Edit the database directly via MCP `execute_sql` or `supabase db query`
2. When happy, generate a migration: `npx supabase db pull <name> --local --yes`
3. Commit the new file under `supabase/migrations/`

There is **no `seed.sql` yet** — porting `lib/mock-data.ts` is part of the data
layer migration in the next wave (it requires an `auth.users` row, so we do it
via a TS seed script after the first user signs up).

## Environment variables

`.env.example` lists the keys. After installing the Supabase Marketplace
integration in Vercel, `vercel env pull .env.local` populates everything below.

| Var | Owner | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth + REST (browser-safe) | yes — app won't boot without them |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations | for migration scripts / cron |
| `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` | `supabase` CLI + raw psql | for schema work |
| `OPENAI_API_KEY` | (planned) AI assist on notes | no |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | (planned) LINE bot | no |

Never commit `.env*.local` — already gitignored.

## When extending the app

- **Adding a domain entity**: type in `lib/types.ts` → seed in `lib/mock-data.ts`
  → store in `hooks/use-<entity>.ts` → form/card components in
  `components/<entity>/` → list+detail+new pages under `app/(dashboard)/<entity>/`
  → API stub under `app/api/<entity>/route.ts`.
- **Replacing mock data with Supabase** (next wave): keep the store interface
  identical; replace the seed with a `useEffect`-triggered fetch via
  `createClient()` from `lib/supabase/client.ts`, and optionally a
  `supabase.channel(...).on("postgres_changes", ...)` subscription. Components
  read `useStore((s) => s.items)` and need no changes. Mutation actions
  (currently writing `CURRENT_USER.id`) should switch to Server Actions that
  call `createClient()` from `lib/supabase/server.ts` so RLS sees `auth.uid()`.
- **i18n**: app is zh-TW only; if adding English, route through `next-intl` with
  zh-TW as the default locale (do not hand-roll a translator).
