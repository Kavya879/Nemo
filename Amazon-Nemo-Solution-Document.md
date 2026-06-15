# HackOn with Amazon | Solution Document



## HackOn with Amazon

### A Universe of Opportunity

48-Hour Hackathon  |  Solution Document  



| | |
|---|---|
| Team Name | ReLoop |
| Hackathon Theme | Build the Intelligent Bridge |
| Date | June 15, 2026 |



## Team Members

| Name | College / University | Role | Email |
|---|---|---|---|
| [Member 1] | [College] | Full-Stack Lead | [Email] |
| [Member 2] | [College] | AI/ML Engineer | [Email] |
| [Member 3] | [College] | Backend & Data | [Email] |
| [Member 4] | [College] | Frontend & UX | [Email] |



---

## 1. Problem Statement & Relevance

→ Jury focus: Innovativeness (novelty, theme alignment) + Degree of Disruption (global relevance)

### The Problem

India's e-commerce returns exceed ₹40,000 crore annually, with 25–40% of products returned. For the long tail — low-value items, remote sellers, small merchants — **the cost of reverse logistics exceeds the product's recovery value**. A ₹500 shoe returned 600km away costs more to ship back than it's worth. Result: millions of perfectly usable products are liquidated, landfilled, or written off. There is no intelligent system connecting a returned product to the person nearby who actually wants it.

### Why It Matters

- **30% of all returned products globally end up in landfills** — that's 5 billion pounds of waste annually in the US alone.
- **Small sellers lose 10–15% of revenue to return-related costs** — manual inspection, re-photography, guessed pricing, and failed resale attempts.
- **80% of products classified "unsellable" after return are still functionally usable** — they just lack the trust infrastructure for a buyer to feel confident.
- Every unnecessary reverse shipment emits 0.5–2kg CO₂. At scale, circular commerce reduces emissions by 25–50% per unit.

→ This is not a niche problem. It affects every marketplace, every seller, and the planet — across all product categories and geographies.

### Theme Alignment

The challenge states: *"Every returned, unused, or outgrown product automatically finds its next best owner."* Amazon Nemo IS the intelligent bridge. It doesn't just connect returns to buyers — it reasons about the optimal second-life path for every individual item using AI grading, configurable smart routing, geo-aware buyer matching, and real-time feasibility economics. The bridge is not a pipeline; it's a decision engine.

### What Makes This Novel

Existing solutions treat returns as a logistics problem (ship it back, inspect, relist). Amazon Nemo treats returns as a **circular commerce optimization problem**:

1. **No human inspection** — AI grades condition in under 2 seconds with fraud screening, replacing a 24–72 hour manual process.
2. **Decision, not disposition** — a Circular Commerce Decision Engine fuses 10+ signals (condition, demand, distance, cost, CO₂, repairability) into an explainable, configurable route recommendation with confidence scoring.
3. **Sell in transit** — items are offered to nearby buyers while still physically in the return pipeline, before warehouse intake. Zero warehousing cost.
4. **Nothing hardcoded** — every threshold, radius, price band, and CO₂ factor lives in a live database config table. Behavior changes without a deploy.



---

## 2. Customer & Solution

→ Jury focus: Quality of Presentation (clarity) + Quality of Implementation (working prototype)

### Target Customer

**The small Indian seller** — processes 200 returns/month, manually photographs each item on a phone, guesses the resale price, lists on classifieds that attract haggling and strangers, and loses 40% of value to reverse logistics. They need AI, not better logistics. Secondary: **the conscious buyer** who wants verified pre-owned products with full transparency, and **Amazon operations** who need to scale return processing without scaling headcount.

### How We Solve It

Amazon Nemo automates the complete return-to-second-life pipeline:

1. **AI Grading + Verification Gate** — Snap photos → instant condition grade (A–D) + defect detection + product authentication (fraud screen). Under 2 seconds. Falls back to a local model if cloud is unreachable.

2. **Circular Commerce Decision Engine** — Analyzes condition score, defects, product category, original value, nearby demand, refurbishment cost, logistics distance, CO₂ impact, and recovery economics to recommend the highest-value, most sustainable route (Resell / Refurbish / Peer-to-Peer / Donate / Recycle) with confidence scoring and full explainability.

3. **Nearby Buyer Matching + In-Transit Sales** — Redis-indexed geo-matching finds verified buyers within a configurable radius. Good-grade returns are offered at a time-decaying discount while still in the return pipeline — sold before reaching the warehouse.

4. **Trust Layer — Product Health Card** — Every relisted item carries a verified, immutable card: AI grade, confidence, flaw map, ownership history, and warranty status. The next buyer knows exactly what they're getting.

5. **Green Credits + Impact Dashboard** — Every second-life action (resell, donate, recycle) earns ReLoop credits, quantified CO₂ savings, and redeemable rewards. Makes sustainability tangible and rewarding.

### User Workflow

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│  📸 SNAP    │ ──→ │  🤖 AI GRADES    │ ──→ │  ⚡ DECISION ENGINE    │
│  Upload     │     │  + Verifies      │     │  Recommends route +    │
│  photos     │     │  (< 2 seconds)   │     │  confidence + reasons  │
└─────────────┘     └──────────────────┘     └────────────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────┐
                    ▼               ▼                   ▼               ▼
            ┌──────────┐    ┌────────────┐    ┌──────────────┐  ┌──────────┐
            │ 🏷️ Resell │    │ 🤝 P2P     │    │ 🎁 Donate    │  │ ♻️ Recycle│
            │ As-Is    │    │ Nearby     │    │ to Charity   │  │ Material │
            │          │    │ Buyer      │    │              │  │ Recovery │
            └──────────┘    └────────────┘    └──────────────┘  └──────────┘
                    │               │                   │               │
                    └───────────────┴───────────────────┴───────────────┘
                                            │
                                    ┌───────────────┐
                                    │ 🌱 GREEN      │
                                    │ CREDITS +     │
                                    │ CO₂ TRACKED   │
                                    └───────────────┘
```

### Working Prototype

**Fully functional, end-to-end working product** with 60+ API routes, 78 unit tests, production build passing, and every flow exercisable live:

- **Return flow** — upload photos → AI grading → Decision Engine → route applied → Second Life listed → buyer matched → delivery partner verification → refund + credits
- **Marketplace** — certified pre-owned storefront with Health Cards, Return-in-Transit deals with time-decaying discounts, brand-new product catalog
- **Delivery board** — live task management for delivery partners (pickups, deliveries, warehouse runs)
- **Admin console** — Command Center, Delivery Rejections review, AI-verdict Challenges, Listing review, live Config Control
- **Impact dashboard** — running totals of credits, CO₂ avoided, cost saved, redeemable rewards

Demo: [Deployed URL]



---

## 3. Tech Architecture & Scaling

→ Jury focus: Tech Architecture (complexity, algorithms, APIs, code quality) + Scalability (depth, interconnectedness)

### Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js App Router)                          │
│  Pages: storefront · return flow · marketplace · cart · checkout ·       │
│         delivery board · admin console · impact dashboard                │
│  lib/api-client.ts (typed, the ONLY path to the backend)                │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ HTTP /api/*
┌────────────────────────────────────▼─────────────────────────────────────┐
│                     API LAYER (~60 route handlers)                        │
│  Thin: Zod validate → call service → api-response envelope               │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────┐
│                     SERVICE LAYER (business logic, no HTTP, no SQL)       │
│  grading · verification · feasibility · routing · pricing · listing ·    │
│  matching · return-workflow (state machine) · return-deals · delivery ·   │
│  checkout · orders · credits · give · challenge · trust · prevention ·    │
│  intelligence · decision-engine · admin · notifications                   │
└──────────┬───────────────────────────────────────────────────────────────┘
           │                    │                         │
┌──────────▼──────┐  ┌─────────▼─────────┐  ┌───────────▼────────────────┐
│ REPOSITORY      │  │ EXTERNAL SYSTEMS    │  │ LIVE RULES TABLE           │
│ (ONLY Prisma)   │  │ • AWS Bedrock       │  │ RoutingConfig (single row) │
│ item · listing  │  │   (Claude vision)   │  │ Every threshold, radius,   │
│ order · case    │  │ • Transformers.js   │  │ price band, CO₂ factor,    │
│ grade · config  │  │   (offline ONNX)    │  │ credit rate — changeable   │
│ buyer · credit  │  │ • Upstash Redis     │  │ live, no redeploy.         │
│ challenge · …   │  │ • OSM Nominatim     │  │                            │
└────────┬────────┘  └───────────────────┘  └────────────────────────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │
│   (Neon)        │
└─────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind + Framer Motion | SSR/SSG flexibility, type-safe client, Amazon-branded design tokens, fluid animations |
| Backend | Next.js API Routes + TypeScript (strict) + Zod validation | Full-stack type safety, zero runtime crashes from invalid data, thin API handlers |
| Database | Prisma ORM + Neon Postgres (serverless) | Type-safe queries from schema, zero raw SQL, auto-migrations, connection pooling at scale |
| Caching | Upstash Redis (REST API) | Serverless-native buyer geo-index, sub-ms category lookups, automatic scaling |
| AI/Vision | AWS Bedrock (Claude Sonnet) + Transformers.js / MobileNetV3 (offline) | Multi-model grading: cloud for accuracy, local ONNX for resilience & zero-latency fallback |
| Maps | Leaflet + React-Leaflet + OpenStreetMap Nominatim | Live geo-visualization, nearest-buyer display, reverse geocoding — no API keys required |
| Testing | Vitest (78 unit tests) | Fast, ESM-native, coverage reporting, mirrors src structure |
| Infra | Vercel (Edge) + Docker Compose (local) | Zero-config deployment, full local dev without cloud accounts |

### Key Algorithms & Complexity

**1. Circular Commerce Decision Engine (multi-signal fusion)**
- Converts AI grade → condition score (0–100) using configurable mappings
- Runs 5 sub-engines in parallel: feasibility analysis, dynamic pricing, nearby-buyer matching, rule-set routing, green-credits computation
- Fuses 10 signals with weighted confidence: `0.4 × gradeConfidence + 0.35 × ruleAgreement + 0.25 × bandClarity`
- Applies nudge rules (configurable) that can shift the score-band baseline within guardrails
- Outputs: route + confidence (High/Medium/Low) + human-readable reasoning + full factor breakdown

**2. Feasibility Analysis Engine (reverse-logistics cost model)**
- Computes pickup + transport (per-km × haversine distance to nearest FC) + warehouse handling + inspection + grade-scaled repackaging + storage
- Calculates net recovery value and recovery ratio against configurable thresholds
- Proximity-driven: items close to a fulfillment center return normally; far items enter the Second Life marketplace

**3. Nearby Buyer Matching (Redis geo-index + haversine ranking)**
- Buyers indexed by wishlist category in Redis sets
- On query: hydrate buyer coords → compute haversine great-circle distances → filter within config radius → sort by proximity
- Cold-start: auto-rebuilds from Postgres, then serves sub-ms from cache

**4. Smart Routing (rule-based orchestrator)**
- Each routing rule is a pure function: `(context, config) → candidate | null`
- Orchestrator runs all rules, collects candidates, picks the highest-scoring path
- Rules are config-driven: thresholds for peer-to-peer (min buyers), refurbishment (repairability), working grades (donate eligibility)
- Full transparency: all candidates considered are exposed for audit

**5. Return-in-Transit Dynamic Pricing**
- Discount grows with time: configurable tier array `[{ minDays, pct }]`
- Price computed authoritatively at checkout (not cached), so "daily recalculation" is implicit
- Atomic reservation prevents overselling (one-of-a-kind items)

### Scaling Strategy

| Dimension | Approach |
|---|---|
| **Compute** | Serverless (Vercel Edge Functions) — auto-scales to thousands of concurrent returns; no provisioning |
| **Database** | Neon Postgres (serverless, scales to zero, auto-branches) + Prisma connection pooling |
| **Cache** | Upstash Redis (serverless, per-request pricing, global replication) — buyer index scales with demand |
| **AI** | Bedrock handles burst grading load (managed); local fallback ensures zero downtime at any scale |
| **Config** | RoutingConfig table — operators tune behavior for new geographies/categories without engineering |
| **Geo** | The matching system is category-partitioned (not one global scan); each category's buyer set is independent — horizontal by design |
| **Multi-region** | Neon + Upstash both support global replication; the architecture is region-agnostic by separating data plane from compute |

→ The system handles 100x growth without architectural changes. 1000x requires partitioning the buyer index by region (already category-partitioned) and moving the AI grading to a dedicated inference endpoint — both are additive, not rewrites.



---

## 4. Future Vision

→ Jury focus: Futuristic Vision (long-term thinking, multi-segment expansion, value impact)

### Where This Goes

Amazon Nemo becomes the **circular commerce operating system** — every physical product on Amazon has a provable second-life path from the moment it's manufactured. The Decision Engine evolves from rule-based to ML-driven, learning optimal routes from millions of disposition outcomes. The impact dashboard becomes a verified sustainability credential that brands use for ESG reporting and consumers use for conscious purchasing decisions.

### Roadmap

| Horizon | Milestone | Impact |
|---|---|---|
| 0–3 mo | Launch pilot with 50 Indian sellers; integrate with Amazon Easy delivery network; add Hindi/regional language support | 10,000 items routed, 60% recovery rate vs 20% baseline |
| 3–6 mo | ML-trained Decision Engine (learns from outcome data); Carbon Passport per item; brand partnerships for certified refurbishment | 100,000 items/month, measurable CO₂ reduction for ESG reporting |
| 6–12 mo | Multi-country expansion (US, EU); Product DNA (permanent digital history); demand heatmap (aggregate wishlists into live supply/demand visualization) | 1M+ items circulated, marketplace revenue from transaction fees |

### Multi-Segment Expansion

1. **E-commerce returns** (current) → **Electronics refurbishment** (high-value items where the Decision Engine's cost-vs-recovery logic creates the most value)
2. → **Fashion/apparel circular commerce** (the highest-volume return category globally; AI grading detects wear, stains, missing tags)
3. → **Enterprise asset disposition** (IT equipment, office furniture — same Decision Engine, different cost model and buyer base)
4. → **Consumer-to-consumer reuse** (outgrown items, decluttering — not returns, but same intelligent bridge to the next owner)
5. → **Brand-certified pre-owned programs** (luxury, electronics brands partner with Nemo for official certified pre-owned channels with full provenance)

### Value Impact

- **At 1M items/month**: ₹200 crore annual recovery value (vs ₹40 crore without the bridge); 500 tonnes CO₂ avoided; 50,000 sellers saving 15 hours/month on manual inspection
- **At 10M items/month** (pan-India): ₹2,000 crore recovered; circular commerce becomes a revenue stream, not a cost center; Amazon earns a take-rate on every second-life transaction
- **Societal**: Every donated item serves a family in need (tracked and certified); every recycled item feeds verified material recovery; every peer-to-peer sale builds neighborhood trust networks
- **Environmental**: If applied to 10% of India's annual e-commerce returns, Nemo would avoid approximately 25,000 tonnes of CO₂ and divert 15,000 tonnes of products from landfills annually



---

Links: GitHub [URL]  |  Demo Video [URL]  |  Live App [URL]

Confidential — For Jury Evaluation Only
