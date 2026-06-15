<div align="center">

# 🐟 Nemo

### The intelligent bridge between product returns and their best second life.

**AI-graded in seconds · routed by reasoning · sold in transit or relisted · matched to a nearby buyer · rewarded with green credits.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-Postgres-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/tests-102%20passing-success)](#testing--quality)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

</div>

---

## The Problem

A ₹500 pair of shoes is returned 600 km from the nearest warehouse. Shipping it back costs more than the shoes are worth — so it gets **written off and landfilled**. Multiply that across millions of returns a year. The premium-product system works; the long tail breaks.

**Nemo fixes the long tail.** It turns every returned, unused, or outgrown product into its highest-value, most sustainable second life — automatically, with full transparency, and nothing hardcoded.

---

## ✨ Key Features

### 🧠 Circular Commerce Decision Engine
The brain. For every graded return it fuses **10 signals** — AI condition score, detected defects, category, original value, nearby demand, refurbishment cost, logistics distance, CO₂ impact, recovery economics, and a rule-engine cross-check — into one explainable recommendation:

> **Route · Confidence (High/Medium/Low) · plain-English reasoning · estimated selling price · recovery % · CO₂ saved · ReLoop credits**

Five routes: **Resell As-Is · Refurbish & Resell · Peer-to-Peer · Donate · Recycle.** Users can accept, **override**, or **escalate to a human** — and a "Why did Nemo choose this?" breakdown shows every factor behind the call.

### 📸 AI Grading + Verification Gate
Snap a photo → a condition grade (A–D) + defect detection in **under 2 seconds**, using a MobileNetV3 model fine-tuned on a product-damage dataset (ONNX), with graceful fallbacks. A pre-grade gate first verifies the item matches what was purchased and screens for fraud — so nobody returns a brick in a shoebox.

### 🚚 Return-in-Transit Deals
Good-grade returns are offered to nearby buyers **while still in the return pipeline** — before warehouse intake. The discount **grows in tiers the longer it waits** (0% → 5% → 10%), recalculated live on every page load. Zero storage cost; it usually sells before it ever reaches a shelf.

### 📍 Nearby-Buyer Matching
A Redis-indexed, distance-ranked match engine routes each item to the closest interested buyer within a configurable radius — minimizing reverse-logistics cost and CO₂, visualized on a live Leaflet map.

### 🛡️ Trust Layer — Product Health Card
Every relisted item carries a verified card: AI-confirmed condition, flaw map, ownership history, and warranty — so buying pre-owned feels as safe as buying new.

### 🌱 Green Credits & Impact
Every second-life action earns ReLoop Credits, quantifies CO₂ avoided and cost saved, and is redeemable for rewards — turning sustainability into a loyalty program.

### 🛠️ Operations Console (admin)
A live Returns Command Center, delivery-rejection review (keep vs remove from store), AI-verdict challenge adjudication, listing approval, and **live Config Control** — tune fraud thresholds, price bands, radii, and CO₂ factors and watch routing change in real time, no redeploy.

---

## 🏗️ Architecture

A strict layered architecture — each layer only talks to the one below it.

```
 Client (Next.js App Router, RSC + client components)
   │   storefront · return flow · marketplace · cart · checkout · /delivery · /admin · /impact
   │   lib/api-client.ts  ── the single path to the backend
   ▼
 API layer  (app/api/**/route.ts — thin handlers)
   │   Zod validate → call service → consistent { ok, data } | { ok, error } envelope
   ▼
 Service layer  (all business logic — no HTTP, no SQL)
   │   grading · verification · feasibility · decision-engine · routing · pricing ·
   │   matching · return-workflow · return-deals · delivery · checkout · credits · …
   ▼
 Repository layer  (the ONLY code that touches the database)
   ▼
 Postgres (Neon)   ·   Redis (Upstash, buyer index)   ·   AI: ONNX / Transformers.js / Bedrock
```

**Principles**
- **Nothing hardcoded.** Every business rule — thresholds, radii, price bands, discount tiers, CO₂ factors, credit rates — lives in the `RoutingConfig` table and is changeable live.
- **Swap by interface.** Grading depends on an `ImageGrader` contract, not a vendor; switching providers (ONNX ↔ Transformers.js ↔ AWS Bedrock) is one config value.
- **Resilient by design.** Every AI path degrades gracefully — a failed grader falls back to a local heuristic; a failed verifier proceeds with a neutral assessment. The flow never dead-ends.
- **Type-safe end to end.** Prisma types from the schema, Zod at every boundary, `strict` TypeScript throughout.

> 📐 Full diagrams, data model, and the return-decision state machine: see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) · React 18 · TypeScript (strict) |
| **Styling** | Tailwind CSS · Framer Motion |
| **Database** | Prisma ORM · PostgreSQL (Neon) |
| **Cache / Index** | Redis (Upstash REST) — nearby-buyer matching |
| **AI / Vision** | ONNX Runtime (MobileNetV3) · Transformers.js (CLIP) · AWS Bedrock (Claude vision) |
| **Maps** | Leaflet · OpenStreetMap (Nominatim) |
| **Validation** | Zod |
| **Testing** | Vitest |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18–20** (Next.js 14 does not support Node 21+)
- A PostgreSQL database (local or [Neon](https://neon.tech))
- A Redis instance (local or [Upstash](https://upstash.com))

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in DATABASE_URL, UPSTASH_*, etc.

# 3. Set up the database
npm run db:migrate          # apply the schema
npm run db:seed             # load demo products, items, buyers, returns, listings

# 4. Run
npm run dev                 # http://localhost:3000
```

The default grader needs **no API keys** — set `GRADER_PROVIDER=local` for a zero-dependency heuristic, or `GRADER_PROVIDER=bedrock` (+ AWS keys) for true vision grading.

---

## ⚙️ Environment Variables

Every variable is validated at startup (`src/config/env.ts`) — the app refuses to boot with a clear message if a required one is missing.

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | ✅ | Redis REST URL (nearby-buyer index) |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Redis REST token |
| `GRADER_PROVIDER` | ✅ | `kaputt` · `clip` · `bedrock` · `local` |
| `NODE_ENV` | ✅ | `production` for builds/deploys |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | ⛔️* | Only when `GRADER_PROVIDER=bedrock` |
| `NEXT_PUBLIC_API_BASE_URL` | – | Public base URL (defaults to localhost) |

\* Optional unless Bedrock grading is selected.

---

## 📜 Scripts

```bash
npm run dev          # start the dev server
npm run build        # production build (prisma generate + next build)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run test         # vitest (102 tests)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed config + demo data
npm run db:studio    # browse the database
```

---

## ✅ Testing & Quality

- **102 tests** across 22 suites (unit + an end-to-end backend journey: return → grade → route → price → list → match → credits).
- `npm run typecheck` and `npm run lint` run clean.
- Pure decision cores (feasibility, pricing, routing, credits) are deterministic and unit-tested in isolation.

```bash
npm run test
```

---

## 🌐 Deployment

Nemo builds to a self-contained server (`output: "standalone"`) and deploys cleanly on **Railway, Render, Vercel, or Docker**.

**Build:** `npm install` → `npm run build`  ·  **Start:** `npm start`

Set the environment variables above in your platform's dashboard. Ensure **Node 18–20** (a `.node-version` file pins 20.18.0). On Linux containers the ONNX/CLIP runtimes load natively, so full AI grading runs in production.

---

## 📁 Project Structure

```
src/
├── config/        # Zod-validated env, constants, AI prompts
├── lib/           # db, redis, errors, api-response, validate, geo, session, cart
├── repositories/  # the ONLY layer that touches the database
├── services/      # grading · verification · feasibility · decision-engine · routing ·
│                  #   pricing · matching · return-workflow · return-deals · delivery · …
├── app/api/       # thin Next.js route handlers (validate → service → respond)
├── app/           # storefront, return flow, marketplace, cart, checkout, delivery, admin, impact
├── components/    # design-system UI + domain components
└── tests/         # unit + integration (mirrors src)
```

---

## 🗺️ Roadmap

- **Return DNA** — a permanent, portable history for every physical product (owners, grades, repairs).
- **Carbon Passport** — a per-item lifetime CO₂ ledger as a verifiable sustainability credential.
- **Demand Heatmap** — aggregate nearby wishlists into a live map of what the planet wants reused, where.
- **ML feedback loop** — the Decision Engine learns optimal routes from millions of real disposition outcomes.

---

## 📄 License

Released under the [MIT License](LICENSE).

<div align="center">

**Nemo** — every returned product finds its next best owner. Maximum value recovered, minimum waste.

</div>
