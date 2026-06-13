# ReLoop — the intelligent bridge between returns and second-life buyers

> Millions of products. No intelligent bridge. ReLoop turns a return into its best
> next life — **AI-graded in seconds, routed by reasoning, matched to a nearby buyer**,
> then resold with a verified Product Health Card and rewarded with green credits.

Built backend-first, modular, and **test-verified at every phase** (47 automated tests
+ a full end-to-end backend flow test). TypeScript everywhere in `strict` mode.

---

## What it does (the 8 features)

| Feature | Where |
|---|---|
| **Snap & Grade** — AI condition grade (A–D) + flaw detection in <2s | `POST /api/grade`, `/return` |
| **Smart Router** — picks RESELL / REFURBISH / PEER-TO-PEER / DONATE / RECYCLE with plain-English reasoning | `POST /api/route-item` |
| **Auto-Pricing** — config-driven price bands by grade + demand | `POST /api/pricing` |
| **Auto-Listing** — one-click title/description + Product Health Card | `POST /api/listings` |
| **Nearby Buyer Match** — Redis-indexed, distance-ranked, on a live map | `GET /api/match`, Leaflet map |
| **Second-Life Marketplace** — certified pre-owned storefront | `/marketplace` |
| **Green Credits + Impact** — CO₂ & cost saved, reward animation, dashboard | `POST /api/credits`, `/impact` |
| **Return Prevention** — pre-purchase guidance from return history | `GET /api/prevention` |

---

## Architecture

Strict layered architecture — **a layer only talks to the one below it**:

```
API route (HTTP only)  →  Service (business logic)  →  Repository (DB only)  →  Postgres
```

- **Nothing hardcoded.** Secrets live in env vars (Zod-validated at startup — the app
  refuses to boot if config is missing). Every business rule (thresholds, radii, price
  bands, CO₂ factors, credit rates) lives in the **`RoutingConfig` table**, changeable live.
- **Swap by interface.** The grader depends on an `ImageGrader` interface, not on Bedrock —
  so Bedrock ↔ the offline Transformers.js grader is a one-config-value change. Same pattern
  for listing copy (`ListingCopyGenerator`).
- **Resilience.** If Bedrock fails, grading cleanly falls back to the local grader.
- **Type safety end to end.** Prisma types from the schema, Zod at every boundary.

```
src/
├── config/        # Zod-validated env, constants, AI prompts (no magic numbers)
├── lib/           # db (Prisma), redis (Upstash), errors, api-response, validate, geo
├── repositories/  # the ONLY layer that touches the database
├── services/      # grading · routing · pricing · listing · matching · prevention · credits
├── app/api/       # thin Next.js route handlers (validate → service → respond)
├── components/    # design-token UI + domain components + the demo-spine flow
└── tests/         # unit + integration (mirrors src)
```

---

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Prisma + **Neon Postgres** ·
**Upstash Redis** · **AWS Bedrock** (Claude vision) with **Transformers.js** offline fallback ·
Tailwind (Amazon-themed tokens) · Framer Motion · Leaflet + OpenStreetMap · Vitest.

---

## Getting started

### Option A — fully local (Docker), zero cloud accounts

```bash
docker compose up -d            # Postgres + Redis + an Upstash-REST-compatible proxy
cp .env.example .env            # the committed .env already points at the docker stack
npm install
npm run db:migrate              # create the schema
npm run db:seed                 # config rules + demo items/buyers/returns/listing
npm run dev                     # http://localhost:3000 (or next free port)
```

The local grader (`GRADER_PROVIDER=local`) needs **no API keys** — it pulls a small
image model on first use. Set `GRADER_PROVIDER=bedrock` + AWS keys for true vision grading.

### Option B — cloud (Neon + Upstash + Bedrock) for the deployed demo

1. **Neon** (https://neon.tech) → copy the connection string → `DATABASE_URL`.
2. **Upstash** (https://upstash.com) → Redis DB → REST URL + token → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
3. **AWS Bedrock** → IAM access key + request model access for Claude → `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BEDROCK_MODEL_ID`; set `GRADER_PROVIDER=bedrock`.

Put these in `.env` (local) or your Vercel project env (prod), then `npm run db:migrate && npm run db:seed`.

See [`.env.example`](.env.example) for the full list — every variable is validated at startup.

---

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build (prisma generate + next build)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run test         # vitest (47 tests; integration tests need the docker stack/cloud)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed config + demo data
npm run db:studio    # browse the DB
```

---

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel (framework auto-detected as Next.js).
2. Set the production env vars (Neon, Upstash, AWS, `GRADER_PROVIDER=bedrock`,
   `NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app`). **Never commit secrets.**
3. `npm run build` runs `prisma generate` automatically (also via `postinstall`).
4. After first deploy, run the seed against the production DB:
   `DATABASE_URL=<neon-prod-url> npm run db:seed`.

---

## Demo script & roadmap

See [`DEMO.md`](DEMO.md) for the rehearsed spine walkthrough, the fallback plan, and the
"Think Big" roadmap (Return DNA · Carbon Passport · Demand Heatmap · Circular Loop).
