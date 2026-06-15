# Amazon Nemo — the intelligent bridge between returns and second-life buyers

> Millions of products. No intelligent bridge. Amazon Nemo turns a return into its best
> next life — **AI-graded in seconds, routed by reasoning, sold in transit or relisted,
> matched to a nearby buyer, delivered by a partner**, then rewarded with green credits.

Built backend-first, modular, and **test-verified** (78 unit tests + an end-to-end backend
flow test). TypeScript everywhere in `strict` mode. Every business rule lives in a live
config table — **nothing hardcoded**.

> 📐 Architecture, diagrams & workflows: see [`ARCHITECTURE.md`](ARCHITECTURE.md).
> 🎬 Demo script & roadmap: see [`DEMO.md`](DEMO.md).

---

## Two product ecosystems

Amazon Nemo models **two distinct inventories** in one storefront:

| | **Brand-New** | **Resold (second-life)** |
|---|---|---|
| Model | `Product` (`stock`, `soldCount`) | `Item` → `Listing` (qty always 1) |
| Inventory | atomic stock decrement, oversell-guarded | one-of-a-kind; `status=SOLD` once bought |
| Returns | not returnable (cancel restores stock) | full return-decision workflow |
| UI | `ProductCard`, `/products/[id]` | `ListingCard`, `/marketplace/[id]` |

`Order` is type-aware (`productId`+`quantity` **or** `itemId`). The **cart is per-user**
(`localStorage` keyed by signed-in user) and re-validated server-side at checkout.

---

## What it does

### The return → second-life brain
| Capability | Where |
|---|---|
| **Snap & Grade** — AI condition grade (A–D) + flaw detection, sub-2s, with offline fallback | `POST /api/return-cases/:id/grade` |
| **Product Verification gate** — confirms the returned item matches the original + fraud screen; escalates to manual review when unsure | `verification.service` |
| **Feasibility Engine** — net-recovery math decides *return-to-seller* vs *second life* | `POST /api/return-cases/:id/analyze` |
| **Smart Router** — RESELL / REFURBISH / PEER-TO-PEER / DONATE / RECYCLE with plain-English reasoning | `routing.service` |
| **Auto-Pricing & Auto-Listing** — config-driven price bands + one-click listing with a Product Health Card | `pricing.service`, `listing.service` |
| **Nearby Buyer Match** — Redis-indexed, distance-ranked, on a live Leaflet map | `GET /api/match` |

### Selling returns faster
| Capability | Where |
|---|---|
| **Return-in-Transit Deals** — good-grade (A/B) returns are offered to nearby buyers for a **7-day** window at a discount that **grows with days in pipeline**; "Add to cart" → checkout | `/api/return-deals`, `TransitDealCard` |
| **Second-Life Marketplace** — certified pre-owned storefront with Health Cards | `/marketplace` |
| **Green Credits + Impact** — CO₂ & cost saved, reward animation, dashboard, redeemable rewards/coupons | `/api/credits`, `/impact` |
| **Return Prevention** — pre-purchase guidance from return history | `GET /api/prevention` |
| **Shopping Intelligence** — product passport, alternatives, cart advisor, return-risk | `/api/intelligence/*` |

### The physical layer — Delivery Partner board (`/delivery`)
The day's tasks in three families:
- **Deliveries** — *every sold second-hand item* (a marketplace sale **or** an in-transit
  deal) appears immediately, with reverse-geocoded **buyer + sender addresses**; partner
  taps **Mark delivered**.
- **Pickups** — return pickups & second-life exchange verifications (accept/reject after
  inspecting against the original), plus **warehouse pickups** for in-transit items whose
  7-day window expired unsold (routed to the nearest real Amazon FC).
- **Completed** — recent drops & deliveries.

### Trust, disputes & operations
| Capability | Where |
|---|---|
| **AI-verdict Challenges** — sellers dispute a grade or request human verification | `/api/return-cases/:id/challenge`, `/challenges` |
| **Operations Console** (admin-only) — live Returns Command Center, **Delivery Rejections** (keep-in-store vs remove), Challenges, Listings, live Config Control | `/admin` |
| **Delivery-rejection review** — a partner rejecting a second-hand item escalates to an admin who **keeps it (relist)** or **removes it from the store** | `resolveDeliveryRejection` |
| **TrustPass** — seller reputation from grading accuracy | `/api/trust` |
| **Roles & sessions** — buyer / owner / admin / delivery quick-switch (auth placeholder) | `lib/session.ts` |

---

## Architecture (in one line)

```
API route (HTTP only)  →  Service (business logic)  →  Repository (DB only)  →  Postgres
                                     ↘ Redis (nearby-buyer index) · Bedrock/local (vision)
```

- **Nothing hardcoded.** Secrets in Zod-validated env (the app refuses to boot if missing).
  Every business rule (thresholds, radii, price bands, discount tiers, CO₂ factors, credit
  rates, the 7-day transit window) lives in the **`RoutingConfig` table**, changeable live.
- **Swap by interface.** The grader depends on an `ImageGrader` interface, not on Bedrock —
  so Bedrock ↔ offline (Transformers.js / MobileNetV3 "kaputt") is one config value. Same
  pattern for listing copy.
- **Resilience.** If Bedrock fails, grading cleanly falls back to a local grader.
- **Type safety end to end.** Prisma types from the schema, Zod at every boundary.

```
src/
├── config/        # Zod-validated env, constants, AI prompts (no magic numbers)
├── lib/           # db (Prisma), redis, errors, api-response, validate, geo, geocode, cart, session
├── repositories/  # the ONLY layer that touches the database
├── services/      # grading · verification · feasibility · routing · pricing · listing ·
│                  #   matching · return-workflow · return-deals · delivery · orders · checkout ·
│                  #   credits · give · challenge · trust · prevention · intelligence · admin · …
├── app/api/       # ~60 thin Next.js route handlers (validate → service → respond)
├── app/           # storefront, return flow, marketplace, cart, checkout, delivery, admin, impact …
├── components/    # design-token UI + domain components + the demo-spine flow
└── tests/         # unit + integration (mirrors src)
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full diagrams, data model, and the
return-workflow state machine.

---

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Prisma + **Neon Postgres** ·
**Upstash Redis** · **AWS Bedrock** (Claude vision) with **Transformers.js / MobileNetV3**
offline fallback · Tailwind (Amazon-themed tokens) · Framer Motion · Leaflet +
OpenStreetMap (Nominatim reverse-geocoding) · Vitest.

---

## Getting started

### Option A — fully local (Docker), zero cloud accounts

```bash
docker compose up -d            # Postgres + Redis + an Upstash-REST-compatible proxy
cp .env.example .env            # the committed .env already points at the docker stack
npm install
npm run db:migrate              # create the schema
npm run db:seed                 # config rules + demo products/items/buyers/returns/listing
npm run dev                     # http://localhost:3000 (or next free port)
```

The local grader (`GRADER_PROVIDER=local`) needs **no API keys** — it pulls a small image
model on first use. Set `GRADER_PROVIDER=bedrock` + AWS keys for true vision grading.

### Option B — cloud (Neon + Upstash + Bedrock) for the deployed demo

1. **Neon** → connection string → `DATABASE_URL`.
2. **Upstash** → Redis REST URL + token → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
3. **AWS Bedrock** → IAM keys + model access → `AWS_*`, `BEDROCK_MODEL_ID`; set `GRADER_PROVIDER=bedrock`.

Put these in `.env` (local) or your Vercel env (prod), then `npm run db:migrate && npm run db:seed`.
See [`.env.example`](.env.example) — every variable is validated at startup.

---

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build (prisma generate + next build)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run test         # vitest (78 unit tests; integration tests need the docker stack/cloud)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed config + demo data
npm run db:studio    # browse the DB
```

> **Windows note:** stop the `next dev` server before `prisma generate` — a running server
> holds the Prisma query-engine DLL (`EPERM ... rename query_engine-windows.dll.node`).
> Integration tests target a local Postgres at `localhost:55432`; without it they self-skip.

---

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel (Next.js auto-detected).
2. Set production env vars (Neon, Upstash, AWS, `GRADER_PROVIDER=bedrock`,
   `NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app`). **Never commit secrets.**
3. `npm run build` runs `prisma generate` automatically (also via `postinstall`).
4. After first deploy, seed the production DB: `DATABASE_URL=<neon-prod-url> npm run db:seed`.
