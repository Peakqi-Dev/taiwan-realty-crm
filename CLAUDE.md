# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

CRM web app for individual real estate agents in Taiwan (台灣房屋仲介個人業務員).
The MVP is intentionally **front-end only with mock data** — Supabase, NextAuth, OpenAI,
and LINE wiring are deferred until the data flow stabilizes. All UI strings are in
Traditional Chinese; TypeScript is strict and `any` is forbidden by convention.

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

### Auth (deferred)

`/login` is currently a fake form that pushes to `/`. There is **no middleware**
guarding routes. When NextAuth is added, put the route guard in `middleware.ts` at
the repo root and protect everything except `(auth)/*` and `/api/auth/*`.

## Environment variables

`.env.example` lists the keys the app expects but does not yet read at runtime.
Required when each integration is wired:

| Var | Owner |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase data layer |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth.js |
| `OPENAI_API_KEY` | (planned) AI assist on client/property notes |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` | (planned) LINE bot inbound |

Copy to `.env.local` (gitignored) — do not commit `.env*.local`.

## When extending the app

- **Adding a domain entity**: type in `lib/types.ts` → seed in `lib/mock-data.ts`
  → store in `hooks/use-<entity>.ts` → form/card components in
  `components/<entity>/` → list+detail+new pages under `app/(dashboard)/<entity>/`
  → API stub under `app/api/<entity>/route.ts`.
- **Replacing mock data with Supabase**: keep the store interface identical; replace
  the seed with a `useEffect`-triggered fetch and (optionally) a realtime
  subscription. Components read `useStore((s) => s.items)` and need no changes.
- **i18n**: app is zh-TW only; if adding English, route through `next-intl` with
  zh-TW as the default locale (do not hand-roll a translator).
