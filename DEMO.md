# Amazon Nemo — Demo Script & Roadmap

## The one-line story

> "A customer returns running shoes. In two seconds our AI grades them, our Smart Router
> reasons that 3 buyers within 5km want them, it auto-prices and auto-lists with a verified
> Product Health Card, the buyer purchases with confidence, and everyone earns green credits.
> **That's the intelligent bridge between a return and its second life.**"

---

## Scripted walkthrough (the spine — must be flawless)

Open the deployed URL (or `npm run dev`). Have the seed data loaded.

1. **Landing** (`/`) — "Millions of products. No intelligent bridge." Click **Start a Return**.
2. **Return flow** (`/return`) — pick **Nimbus Running Shoes**, add 2–3 photos, choose a
   reason ("Size too small"), click **Submit return & grade**.
3. **Grading result** — watch the "AI analyzing…" animation land on a **grade + confidence**,
   with the **Damage Detective** flaw callouts on the photo and the **sub-2s timer**. Say:
   *"Real condition assessment, not a guess."*
4. **Smart Router** — inputs animate in; the decision + **plain-English reasoning** appears
   (e.g. *"3 buyers within 5km want this → peer-to-peer"*). Say: *"This is the brain — and
   the rules live in a config table, so we can change behavior live."*
5. **Nearby Buyer Match** — the **Leaflet map** shows the radius and the matched buyers with
   distances. *"Local-first: less shipping, less CO₂."*
6. **Pricing + Auto-Listing** — the suggested price appears; click **Generate listing** →
   the listing + **Product Health Card** render. *"One click, fully listed and trustworthy."*
7. **Marketplace** (`/marketplace`) — open the item → the **Product Health Card** + the
   **Return Prevention banner** ("the best return is no return"). Click **Give it a second
   life** → the **Green Credits reward animation** fires.
8. **Impact** (`/impact`) — the running totals (credits · CO₂ avoided · cost saved) — live
   from the API.

**Killer line for the config-driven moment:** open the DB / change `peerToPeerMinBuyers`
in `RoutingConfig`, re-run the router, and the decision flips — *no redeploy*.

---

## Fallback plan (if the network misbehaves)

- **Local backup:** run the whole stack offline — `docker compose up -d` + `npm run dev`
  with `GRADER_PROVIDER=local`. No cloud, no AWS, fully self-contained.
- **Resilience built-in:** if Bedrock is unreachable, grading auto-falls-back to the local
  grader — the demo never dead-ends.
- **Recorded clip:** keep a screen recording of the spine as a last resort.

---

## Verification status (proof it works)

- `npm run typecheck` + `npm run lint` → clean.
- `npm run test` → **47 tests** green (unit + integration), including the **full backend
  journey** test (return → grade → route → price → list → match → credits → prevention).
- `npm run build` → production build succeeds.
- Live `/api/*` verified over HTTP; the spine runs end-to-end against the real backend.

---

## "Think Big" roadmap

- **Return DNA** — a permanent, portable history for every physical product (every owner,
  grade, repair) so condition is always provable.
- **Carbon Passport** — per-item lifetime CO₂ ledger; the Impact dashboard scaled to a
  verifiable sustainability credential.
- **Demand Heatmap** — aggregate nearby wishlists into a live map of *what the planet wants
  reused where*, routing returns toward real demand.
- **Circular Loop** — close the loop: refurbed/peer-sold items re-enter grading on their
  next return, compounding value each cycle.

### Amazon pillars covered
Customer obsession (trust via Health Card + prevention) · Invent & simplify (one-click
relisting) · Frugality (reuse > new) · Think big (the circular roadmap above).
