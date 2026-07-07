# NexaDecide — AI Decision Intelligence Platform

An AI-powered business decision intelligence platform that tells managers not just *what* happened in their business data, but *why* it happened and *what to do next*. Built for a hackathon demo using Arjun General Store (Retail, India) as the sample business.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/nexadecide run dev` — run the frontend (port 19503, served at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `GEMINI_API_KEY` — Google Gemini API key (stored as secret)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Wouter (routing) + Recharts + Framer Motion
- Styling: Tailwind CSS v4 + shadcn/ui components, dark navy theme
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini 2.0 Flash (`@google/generative-ai`)
- Validation: Zod v4 + drizzle-zod
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (metrics, insights, recommendations, alerts, chat_messages, forecasts)
- `artifacts/api-server/src/routes/` — Express route handlers (dashboard, insights, rootcause, forecast, recommendations, alerts, chat, metrics)
- `artifacts/api-server/src/lib/gemini.ts` — Gemini AI client (generateJSON + generateChatResponse)
- `artifacts/api-server/src/lib/seed.ts` — Auto-seed logic (90 days of demo data, pre-baked insights/recommendations/alerts/forecasts)
- `artifacts/nexadecide/src/pages/` — All 8 frontend pages

## Pages

| Route | Page |
|---|---|
| `/` | Dashboard — health score, sub-scores, insights, alerts, sparkline, forecast preview |
| `/insights` | Smart Insights — filterable AI insight feed with severity |
| `/root-cause` | Root Cause Analysis — AI explains metric anomalies |
| `/forecast` | Forecasting — 14-day projections for sales/inventory/expenses/cashflow |
| `/recommendations` | Recommendations — AI action cards with status tracking |
| `/chat` | AI Chat — Gemini-powered business Q&A |
| `/alerts` | Alerts Center — anomaly alerts with mark-as-read |
| `/settings` | Settings — reseed data, regenerate AI insights |

## Architecture decisions

- Auto-seed on startup: if `metrics` table is empty, seed runs automatically on first boot — demo is always ready
- Gemini called server-side only: never from frontend. JSON mode enabled + markdown fence stripping for reliability
- Pre-baked seed data: insights/recommendations/alerts/forecasts are pre-written for demo reliability; AI generation is on-demand
- Single-business prototype: no auth, no multi-tenancy — designed for hackathon judge demo
- Wouter for routing (lightweight, Vite-compatible), no Next.js needed

## User preferences

- Use Gemini AI (user's own GEMINI_API_KEY)
- Dark mode only, no toggle
- INR currency formatting: `₹${value.toLocaleString('en-IN')}`

## Gotchas

- After OpenAPI spec changes: always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend
- The DB is auto-seeded on first boot — call `POST /api/metrics/seed` or use Settings page to reseed
- Gemini model: `gemini-2.0-flash` (via user's API key). Do not switch to Replit AI Integrations models
- `@google/generative-ai` uses `responseMimeType: "application/json"` + markdown fence stripping for reliable JSON parsing
