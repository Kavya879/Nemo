# Nemo 🐟 — Phased Build Plan

**Companion to:** Nemo 🐟_Project.md
**For use with:** Kiro / Codex / Claude Code
**Approach:** Backend first, then frontend. Modular, scalable, test-verified at every phase.

---

## How to Read This Document

The application is broken into **9 phases**. Phases 0–5 build the entire backend. Phases 6–8 build the frontend on top of it. Phase 9 is deployment and the demo polish.

Every phase has four parts:

1. **Goal** — what this phase delivers in one sentence.
2. **What to build** — the exact modules, files, and logic.
3. **Definition of Done** — the checklist that must be ticked before moving on.
4. **Verification** — the concrete tests/commands that *prove* it works. **You do not start the next phase until verification passes.**

This is a strict rule: a broken foundation costs ten times more to fix later. Each phase is designed to be handed to an AI coding agent (Kiro/Codex/Claude Code) as a single, self-contained task.

---

## Engineering Principles (apply to every phase)

These rules keep the codebase modular, scalable, and clean. The AI agent must follow them in every file it writes.

**Layered architecture.** Code is organized in clear layers, and a layer only talks to the one directly below it: `API route → Service → Repository → Database`. The API route handles HTTP only. The service holds business logic. The repository is the only place that touches the database. This separation means any layer can be tested or swapped without breaking the others.

**One job per module.** Each file and function does one thing. The grading logic doesn't know about HTTP. The routing engine doesn't know about the database. This is the Single Responsibility Principle, and it's what makes the system easy to reason about.

**Depend on interfaces, not implementations.** For example, the grading service depends on an `ImageGrader` interface, not directly on Amazon Bedrock. This is why we can swap Bedrock for Transformers.js (the offline fallback) by changing one file — the rest of the app never notices. This is the strategy pattern, and it's a strong architecture talking point for the jury.

**Nothing hardcoded.** Every secret lives in environment variables (validated with Zod at startup, so the app refuses to run if config is missing). Every business rule (thresholds, rates, radii) lives in a config table in the database. No magic numbers anywhere in the code.

**Type safety end to end.** TypeScript everywhere, in `strict` mode. Prisma generates types from the database schema. Zod validates every input at the boundary. If it compiles, most bugs are already caught.

**Test as you build.** Every service and the routing engine get unit tests. Every API route gets an integration test. We never mark a phase done on "it looked fine when I clicked it" — we mark it done when the tests pass.

**Small, clear commits.** Each phase is one logical unit of work with a clear commit message. The git history should read like a story of how the app was built.

---

## The Folder Structure (set up once, in Phase 0)

```
nemo/
├── prisma/
│   ├── schema.prisma            # database schema (source of truth for data)
│   └── seed.ts                  # seeds config rules + demo data
├── src/
│   ├── config/
│   │   ├── env.ts               # Zod-validated environment variables
│   │   └── constants.ts         # non-secret app constants
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── redis.ts             # Upstash Redis client
│   │   └── errors.ts            # custom error classes + handler
│   ├── repositories/            # ONLY layer that touches the database
│   │   ├── item.repository.ts
│   │   ├── listing.repository.ts
│   │   ├── buyer.repository.ts
│   │   └── config.repository.ts
│   ├── services/                # business logic, no HTTP, no raw DB
│   │   ├── grading/
│   │   │   ├── grading.service.ts
│   │   │   ├── image-grader.interface.ts   # the swappable contract
│   │   │   ├── bedrock-grader.ts           # primary implementation
│   │   │   └── local-grader.ts             # offline fallback
│   │   ├── routing/
│   │   │   ├── routing.service.ts
│   │   │   └── rules/           # one file per routing rule
│   │   ├── pricing/
│   │   │   └── pricing.service.ts
│   │   ├── listing/
│   │   │   └── listing.service.ts
│   │   ├── matching/
│   │   │   └── matching.service.ts
│   │   ├── prevention/
│   │   │   └── prevention.service.ts
│   │   └── credits/
│   │       └── credits.service.ts
│   ├── app/
│   │   └── api/                 # Next.js route handlers (thin HTTP layer)
│   │       ├── grade/route.ts
│   │       ├── route-item/route.ts
│   │       ├── listings/route.ts
│   │       ├── match/route.ts
│   │       └── prevention/route.ts
│   ├── types/                   # shared TypeScript types & Zod schemas
│   │   └── index.ts
│   └── tests/                   # mirrors the src structure
│       ├── unit/
│       └── integration/
├── .env.example                 # shows required env vars, no real secrets
├── .env                         # real secrets (git-ignored)
├── package.json
├── tsconfig.json                # strict mode on
└── vitest.config.ts             # test runner config
```

This structure is the backbone. The AI agent creates it in Phase 0 and fills it in across the later phases.

---

# PART A — BACKEND (Phases 0–5)

---

## Phase 0 — Foundation & Project Setup

**Goal:** A running, type-safe, empty Next.js + TypeScript project with the database connected and config validated — the skeleton everything hangs on.

**What to build:**
- Initialize Next.js 14 (App Router) with TypeScript in `strict` mode.
- Set up the full folder structure above.
- Install and configure: Prisma, Zod, Vitest (testing), ESLint + Prettier (code quality), Upstash Redis SDK.
- Create `src/config/env.ts` — a Zod schema that reads and validates all environment variables (`DATABASE_URL`, `REDIS_URL`, `BEDROCK_*`, etc.) at startup. The app should crash with a clear message if any are missing.
- Create `.env.example` listing every variable (with placeholder values), and a real `.env` (git-ignored).
- Create `src/lib/db.ts` (Prisma client singleton) and `src/lib/redis.ts`.
- Create `src/lib/errors.ts` with custom error classes (`ValidationError`, `NotFoundError`, etc.) and a central error handler.
- Set up a `/api/health` route that returns `{ status: "ok", db: "connected" }` after pinging the database.

**Definition of Done:**
- `npm run dev` starts with no errors.
- `npm run lint` and `npm run typecheck` pass clean.
- Missing an env var produces a clear startup error (not a silent failure).
- The folder structure matches the plan.

**Verification:**
- Run `npm run typecheck` → zero errors.
- Run `npm run lint` → zero errors.
- Visit `/api/health` → returns `{ status: "ok", db: "connected" }`.
- Temporarily remove one env var → app fails loudly with a readable message. Restore it.
- ✅ **Gate:** all four pass before Phase 1.

---

## Phase 1 — Data Layer (Schema, Config Table & Repositories)

**Goal:** A complete, relational database schema with the config-driven rules table, plus the repository layer that is the *only* code allowed to touch the database.

**What to build:**
- Design the Prisma schema with these core models (and their relations):
  - `Item` — the physical product (category, original price, current grade, status, owner history).
  - `Return` — a return event (reason, photos, timestamp, linked item).
  - `GradeResult` — the AI grade for an item (grade A–D, confidence, detected flaws, time taken).
  - `RoutingDecision` — the chosen path + the reasoning text + the inputs used.
  - `Listing` — a second-life listing (price, description, status, Product Health Card data).
  - `Buyer` — a verified buyer (location lat/long, wishlist of wanted items).
  - `GreenCredit` — credits earned + CO₂/cost saved per transaction.
  - `RoutingConfig` — **the rules table**: thresholds, distance radius, grade cutoffs, credit rates, CO₂ factors. This is what makes "nothing hardcoded" real.
- Write `prisma/seed.ts` to populate `RoutingConfig` with sensible default rules and a small set of demo items/buyers.
- Build the repository layer (`src/repositories/`): one repository per model, exposing clean methods like `itemRepository.findById()`, `listingRepository.create()`, `configRepository.getRules()`. No business logic here — just data access.

**Definition of Done:**
- Schema migrates cleanly to Neon Postgres.
- Seed script runs and populates config + demo data.
- Every repository method is typed and has no business logic.
- Repositories are the only files importing the Prisma client.

**Verification:**
- Run `npx prisma migrate dev` → migration succeeds.
- Run `npx prisma db seed` → config and demo rows appear (verify in `npx prisma studio`).
- Write and run unit tests for 2–3 repository methods (create an item, fetch it back, fetch config rules) → pass.
- Grep the codebase: only files in `repositories/` and `lib/db.ts` import Prisma → confirmed.
- ✅ **Gate:** schema + seed + repository tests pass before Phase 2.

---

## Phase 2 — AI Grading Service (Snap & Grade)

**Goal:** A service that takes product photos and returns a structured condition grade in under 2 seconds — built behind a swappable interface so Bedrock and the offline model are interchangeable.

**What to build:**
- Define `image-grader.interface.ts` — the contract: `grade(images): Promise<GradeResult>`. Everything else depends on *this*, not on Bedrock.
- Implement `bedrock-grader.ts` — calls Amazon Bedrock with Claude vision, sends the images with a carefully written prompt that forces a **structured JSON response** (grade A–D, confidence, list of detected flaws with locations). Parse and validate the JSON with Zod.
- Implement `local-grader.ts` — the offline fallback using Transformers.js + a pre-trained image classifier, returning the same shape.
- Build `grading.service.ts` — orchestrates: receives images, picks the grader (from config/env), times the operation, calls the repository to save the `GradeResult`, returns it. Includes a fallback: if Bedrock fails, fall back to local grader (resilience = good architecture).
- All prompts, model IDs, and the grade-cutoff thresholds come from config — nothing hardcoded.

**Definition of Done:**
- The grading service returns a valid, Zod-checked `GradeResult` for sample images.
- Swapping the grader implementation requires changing only one config value.
- Grading time is measured and stored.
- A Bedrock failure cleanly falls back to the local grader.

**Verification:**
- Unit test `bedrock-grader` and `local-grader` with mocked responses → both return the correct shape.
- Unit test that an invalid AI response (bad JSON) is caught by Zod and handled, not crashed.
- Integration test: feed 3 sample product images → get back valid grades, each with confidence and flaws.
- Test the fallback: simulate Bedrock throwing → confirm `local-grader` is used.
- Confirm timing is recorded (should be under ~2s with the real model).
- ✅ **Gate:** grading returns valid structured output and the fallback works before Phase 3.

---

## Phase 3 — Smart Router (Decision Engine with Reasoning)

**Goal:** The decision brain — given a grade and context, it picks the best path in milliseconds and returns plain-English reasoning. Fully rules-driven from the config table.

**What to build:**
- Build the routing engine in `src/services/routing/`, structured as a set of **individual rule modules** in `rules/` (e.g. `cost-vs-value.rule.ts`, `local-demand.rule.ts`, `repairability.rule.ts`, `donation.rule.ts`). Each rule is a small pure function: it takes the context and returns a candidate decision + score + reasoning fragment, or "doesn't apply."
- Build `routing.service.ts` — the orchestrator: loads the rules and thresholds from `RoutingConfig`, runs the item's context (grade, category, re-listing cost, resale value, nearby demand count, repairability) through the rules, and selects the winning path: `RESELL_AS_IS | REFURBISH | PEER_TO_PEER | DONATE | RECYCLE`.
- Critically, it assembles a **human-readable reasoning string** explaining *why* (e.g. "Re-listing costs ₹180 > resale value ₹150, but 3 buyers within 5km → peer-to-peer"). Save the `RoutingDecision` (path + reasoning + inputs) via the repository.
- Because rules and thresholds live in config, you can change behavior live — a powerful demo moment.

**Definition of Done:**
- Each rule is a pure, independently testable function.
- The engine returns one decision plus a clear reasoning string.
- All thresholds load from config, not from code.
- The decision is persisted with its inputs (so it's auditable).

**Verification:**
- Unit test each rule in isolation with crafted inputs → each returns the expected candidate.
- Unit test the orchestrator with several full scenarios:
  - Grade A + cheap + local demand → PEER_TO_PEER (with correct reasoning).
  - Grade D + not repairable → RECYCLE.
  - Grade B + repairable + no local demand → REFURBISH.
  - Working but unwanted → DONATE.
- Change a threshold in config, re-run → confirm the decision changes accordingly (proves config-driven).
- Confirm reasoning text is generated and stored.
- ✅ **Gate:** all routing scenarios produce correct paths + reasoning before Phase 4.

---

## Phase 4 — Pricing, Listing & Matching Services

**Goal:** The three services that turn a routed item into a sellable, discoverable listing — automatic price, auto-generated listing, and nearby-buyer matching.

**What to build:**
- **`pricing.service.ts`** — computes a suggested resale price from grade + original price + category + demand, using price-band rules from config (e.g. Grade A = 80–90% of original). Returns price + the percentage, with reasoning. Pure and testable.
- **`listing.service.ts`** — the auto-listing generator. Takes an item + grade + price and produces a title, a clean description, selects the best photo, and assembles the **Product Health Card** (verified condition, history, warranty). Uses Bedrock/Claude (behind an interface again) for the title/description text; everything else is deterministic. Saves the `Listing`.
- **`matching.service.ts`** — the Nearby Buyer Match. Uses buyer locations + wishlists to find verified buyers within the configured radius who want this item. Uses Redis (Upstash) to keep a fast, queryable index of "who wants what nearby." Returns a ranked list of matches with distances. The radius comes from config.
- Each service is independent and depends only on repositories + interfaces.

**Definition of Done:**
- Pricing returns a sensible price with reasoning, driven by config bands.
- Listing produces a complete, valid listing object with a Product Health Card.
- Matching returns correct nearby buyers within the radius, ranked by distance.
- All three have no HTTP knowledge and no raw DB access.

**Verification:**
- Unit test pricing across grades A–D → prices fall in the configured bands; reasoning present.
- Unit test listing generation → title, description, photo, and Product Health Card all populated and Zod-valid.
- Unit test matching with seeded buyers at known distances → only those within radius are returned, correctly ranked. Change the radius in config → result set changes.
- Integration test the chain: a graded+routed item → priced → listed → matched, end to end → produces a complete listing with nearby buyers.
- ✅ **Gate:** the three services pass unit + chained integration tests before Phase 5.

---

## Phase 5 — Prevention, Credits & API Layer (Backend Complete)

**Goal:** Finish the remaining services (Return Prevention, Green Credits) and expose everything through clean, validated API routes — completing a fully working, testable backend.

**What to build:**
- **`prevention.service.ts`** — given a product + a shopper profile, returns personalized guidance ("customers with your foot profile prefer size 8 in this brand"). For the hackathon this reads from historical return-reason data + simple profile matching (rules from config). Returns the guidance message + confidence.
- **`credits.service.ts`** — calculates Green Credits and the CO₂ + cost saved for a given second-life action, using factors from config. Saves the `GreenCredit` record and updates the user's running total.
- **The API layer** (`src/app/api/.../route.ts`) — thin Next.js route handlers, one per capability:
  - `POST /api/grade` → grading service
  - `POST /api/route-item` → routing service
  - `POST /api/listings` + `GET /api/listings` → listing service
  - `GET /api/match` → matching service
  - `GET /api/prevention` → prevention service
  - `POST /api/credits` → credits service
- Each route does only: validate input with Zod → call the service → handle errors via the central handler → return a typed JSON response. **No business logic in routes.**
- Add consistent API response envelopes and proper HTTP status codes.

**Definition of Done:**
- Prevention and credits services work and are config-driven.
- Every capability is reachable through a clean API route.
- Routes validate input and contain zero business logic.
- The whole backend works end to end via API calls alone.

**Verification:**
- Unit test prevention and credits services → correct outputs from config.
- Integration test every API route with valid input → correct response + status.
- Integration test every API route with *invalid* input → clean 400 with a clear error (not a crash).
- **Full backend flow test (no UI):** using a script or REST client, run the entire journey through the API — submit a return → grade → route → price → list → match → credits → and fetch prevention for a product. Confirm each step returns correct, connected data.
- Run the full test suite: `npm run test` → all green. Check coverage on services is meaningful.
- ✅ **Gate:** the entire backend is provably working through its API before any frontend work begins.

---

# PART B — FRONTEND (Phases 6–8)

The backend is now a solid, tested API. The frontend is built on top of it, screen by screen, each verified against the live API.

---

## Phase 6 — Frontend Foundation & Design System

**Goal:** The frontend skeleton — routing, the Amazon-style design system, shared components, and a typed API client — so every later screen is fast to build and visually consistent.

**What to build:**
- Set up Tailwind CSS with an Amazon-inspired theme (colors, spacing, typography) as reusable design tokens — no inline magic styles.
- Install Framer Motion for animations.
- Build a **typed API client** (`src/lib/api-client.ts`) — one place that calls the backend, fully typed against the API response types. Screens never call `fetch` directly; they use this client. (Single responsibility again.)
- Build the shared component library: `Button`, `Card`, `Badge`, `Spinner`, `GradeBadge`, `ProductHealthCard`, layout shell, navigation. Each component is small, reusable, and prop-typed.
- Set up the app's routing/layout and a consistent page shell.
- Build the **opening/landing screen** (the three personas + "Millions of products. No intelligent bridge." + "Start a Return" button) — this also verifies the design system looks right.

**Definition of Done:**
- Design tokens defined; components use them, not hardcoded styles.
- The typed API client compiles and is the only path to the backend.
- Shared components render in isolation and are reusable.
- The landing screen looks polished and on-brand.

**Verification:**
- `npm run typecheck` + `npm run lint` → clean.
- Render each shared component in isolation (a simple component gallery page) → all display correctly.
- Confirm no screen calls `fetch` directly (only `api-client`) → grep check.
- The landing screen renders correctly on desktop and mobile widths.
- ✅ **Gate:** design system + API client + landing screen verified before building flows.

---

## Phase 7 — The Demo Spine (Return Flow → Grade → Route → Match → List)

**Goal:** The core, must-work-flawlessly user journey, wired to the real backend — the five spine features as one unbroken flow.

**What to build (each screen calls the real API via the typed client):**
- **Return flow screen** — pick an item, upload 2–3 photos, choose a return reason. Submits to `/api/grade`.
- **Grading result screen** — shows the live "AI analyzing…" animation, then the **under-2-second timer** landing on the grade, confidence, and the Damage Detective flaw callouts on the photo.
- **Smart Router screen** — the centerpiece: visualizes the inputs flowing in and displays the chosen path with its **plain-English reasoning** (from `/api/route-item`).
- **Nearby Buyer Match screen** — a Leaflet + OpenStreetMap map showing "3 buyers within 5km want this" (from `/api/match`).
- **Pricing + Auto-Listing screen** — shows the suggested price and the one-click generated listing with its Product Health Card (from pricing/listing APIs).
- Smooth transitions between steps with Framer Motion; proper loading and error states everywhere (no dead ends).

**Definition of Done:**
- The full spine runs end to end against the live backend with real data.
- Every step has a loading state and an error state.
- The grading timer and routing reasoning display correctly from the API.
- The flow is smooth enough to demo live without hesitation.

**Verification:**
- Walk the entire spine in the browser with a real item → grade → route → match → list, end to end → works without errors.
- Kill the backend mid-flow → the UI shows clean error states, not a white screen.
- Verify the displayed grade, reasoning, price, and matches exactly match what the API returns (no fake/hardcoded UI data).
- Test on the actual demo device/screen size → smooth.
- Rehearse the flow 3× → no stumbles.
- ✅ **Gate:** the spine demos flawlessly end-to-end before adding the surrounding features.

---

## Phase 8 — Marketplace, Product Health Card, Green Credits & Prevention

**Goal:** The features that wrap the spine — the second-life marketplace, the trust layer on display, the green-credits payoff, and the prevention banner — completing the full product experience.

**What to build:**
- **Second-Life Marketplace screen** — a clean Amazon-style storefront listing certified pre-owned items (from `GET /api/listings`), each showing its **Product Health Card** (verified condition, history, warranty). A buyer can open an item and feel safe.
- **Green Credits + Impact Dashboard** — the reward animation after a second-life action ("you saved 4.2kg CO₂ and ₹120 · +50 Nemo 🐟 Credits") and a small dashboard of the running total (from `/api/credits`).
- **Return Prevention banner** — on a product page *before* purchase, the personalized guidance ("customers with your foot profile prefer size 8 in this brand") from `/api/prevention`, with the "best return is no return" framing.
- Polish pass: consistent animations, empty states, responsive layout, accessibility basics (labels, contrast, keyboard focus).

**Definition of Done:**
- Marketplace lists real listings with working Product Health Cards.
- Green Credits animate and the dashboard shows the real total from the API.
- The prevention banner shows real personalized guidance.
- The whole app is visually consistent and responsive.

**Verification:**
- Open the marketplace → real listings appear with complete Product Health Cards.
- Complete a second-life action → credits animation fires and the dashboard total updates from the API.
- Visit a product page → the prevention banner shows correct guidance.
- Full app walkthrough on the demo device → consistent, polished, responsive, no broken states.
- Re-run the full backend test suite + a manual full-app pass → all green.
- ✅ **Gate:** the complete application works end-to-end before deployment.

---

# PART C — SHIP IT

---

## Phase 9 — Deployment, Hardening & Demo Prep

**Goal:** A live, deployed, reliable application with a rehearsed demo and a vision-ready pitch.

**What to build / do:**
- Deploy: frontend + backend to **Vercel**, database on **Neon**, Redis on **Upstash** — all production env vars set (never committed).
- Run the seed against the production database so the demo data is live.
- Add a `README.md` with setup steps, architecture overview, and the run/test commands (judges may read it).
- Final hardening: confirm all error states, check the health endpoint, test the live URL on the actual demo network.
- Prepare a **scripted demo** following the spine (the "one line" flow), with a fallback plan if the network misbehaves (e.g. a local backup or recorded clip).
- Prepare the **roadmap slide** content (Return DNA, Carbon Passport, Demand Heatmap, Circular Loop) for the "Think Big" close.

**Definition of Done:**
- The app is live on a public URL and works on the demo network.
- Production data is seeded; the full flow works in production.
- A rehearsed demo script + fallback exists.
- README and roadmap are ready.

**Verification:**
- Open the live URL on the demo device/network → full flow works end to end.
- Run the demo script start to finish on the live app → flawless.
- Trigger the fallback plan once → it works.
- Final checklist against Nemo 🐟_Project.md: all 8 features present, all 4 Amazon pillars covered, all 4 scoring criteria addressed → ticked.
- ✅ **Gate:** ready to present.

---

## Phase Summary (at a glance)

| Phase | Part | Delivers | Verified by |
|-------|------|----------|-------------|
| 0 | Backend | Project skeleton, config, DB connection | typecheck, lint, /health, env-fail test |
| 1 | Backend | Schema, config table, repositories | migrate, seed, repo unit tests |
| 2 | Backend | AI grading (swappable, with fallback) | grader unit + integration tests, fallback test |
| 3 | Backend | Smart Router with reasoning | per-rule + scenario tests, config-change test |
| 4 | Backend | Pricing, listing, matching | unit tests + chained integration test |
| 5 | Backend | Prevention, credits, full API | full-backend API flow test, full suite green |
| 6 | Frontend | Design system, API client, landing | component gallery, no-direct-fetch check |
| 7 | Frontend | The demo spine, wired to backend | end-to-end browser walk, error-state test, 3× rehearsal |
| 8 | Frontend | Marketplace, credits, prevention | full-app walkthrough, suite + manual pass |
| 9 | Ship | Deployment + demo prep | live-URL flow, demo script, fallback test |

---

## The Golden Rules (taped to the monitor)

1. **Never start a phase until the previous one's verification gate is green.** A broken foundation is the most expensive thing in software.
2. **The spine (Phase 7) must be flawless** before anything else. One unbroken demo path beats a dozen half-working features.
3. **Nothing hardcoded** — secrets in env, rules in the config table, always.
4. **Layers stay separate** — routes do HTTP, services do logic, repositories do data. No mixing.
5. **Swap by interface** — Bedrock vs local grader is one config change, because everything depends on the interface.
6. **Test before you trust** — green tests, not "it looked fine," define done.

---

*Build the backend until it's provably correct. Then build a frontend it can be proud of. Then ship the bridge.*
