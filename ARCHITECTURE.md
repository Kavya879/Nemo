# Amazon Nemo — Technical Architecture

This document covers the **system architecture**, **data model**, and the key
**workflows** (return-decision state machine, in-transit deal lifecycle, the delivery-partner
board, and delivery-rejection review). Diagrams are [Mermaid](https://mermaid.js.org/) — they
render on GitHub and in most Markdown viewers.

---

## 1. Layered architecture

A strict layered architecture — **a layer only ever talks to the one below it**. The API is
thin HTTP, services hold all business logic, repositories are the only code that touches the
database, and external systems are reached behind interfaces so they're swappable.

```mermaid
flowchart TD
  subgraph Client["Client (Next.js App Router, RSC + client components)"]
    UI["Pages & components<br/>storefront · return flow · marketplace · cart ·<br/>checkout · /delivery · /admin · /impact"]
    AC["lib/api-client.ts<br/>(only path to the backend)"]
    SESS["lib/session.ts + lib/cart.tsx<br/>(per-user role + per-user cart)"]
    UI --> AC
    UI --> SESS
  end

  subgraph API["API layer — app/api/**/route.ts (~60 routes)"]
    R["Thin handlers:<br/>Zod validate → call service → api-response envelope"]
  end

  subgraph SVC["Service layer — business logic, no HTTP, no raw SQL"]
    direction LR
    S1["grading · verification · feasibility<br/>routing · pricing · listing · matching"]
    S2["return-workflow · return-deals · delivery<br/>checkout · orders · credits · give"]
    S3["challenge · trust · prevention<br/>intelligence · admin · notifications"]
  end

  subgraph REPO["Repository layer — the ONLY code that imports Prisma"]
    RP["item · listing · order · return-case · grade ·<br/>verification · challenge · buyer · credit · config · product"]
  end

  subgraph EXT["External systems (behind interfaces)"]
    PG[("Postgres<br/>(Neon / local)")]
    REDIS[("Redis<br/>(Upstash) — nearby-buyer index")]
    BEDROCK["AWS Bedrock (Claude vision)<br/>⇄ local grader (Transformers.js / MobileNetV3)"]
    OSM["OpenStreetMap Nominatim<br/>(reverse geocoding)"]
  end

  AC -->|HTTP /api/*| R
  R --> SVC
  SVC --> REPO
  RP --> PG
  S1 -. ImageGrader / CopyGenerator interface .-> BEDROCK
  S1 -. wishlist index .-> REDIS
  S2 -. addresses .-> OSM
```

### Principles
- **Nothing hardcoded.** Secrets in Zod-validated env (app refuses to boot if missing). Every
  business rule lives in the **`RoutingConfig`** table — thresholds, radii, price bands,
  discount tiers, the 7-day transit window, CO₂ factors, credit rates — changeable live.
- **Swap by interface.** Grading depends on an `ImageGrader` contract, not Bedrock; listing
  copy on a `ListingCopyGenerator`. Switching providers is one config value.
- **Resilience.** Bedrock failure → automatic fall-back to the local grader (the demo never
  dead-ends).
- **Type safety end to end.** Prisma types from the schema; Zod at every boundary.

---

## 2. Data model (core entities)

```mermaid
erDiagram
  Product ||--o{ Order : "brand-new line"
  Item ||--o{ Order : "resold line"
  Item ||--o| Listing : "second-life listing"
  Item ||--o{ ReturnCase : "has returns"
  ReturnCase ||--o{ ReturnEvent : "append-only audit trail"
  ReturnCase ||--o{ Challenge : "disputes / verification"
  Item ||--o{ GradeResult : "AI grades"
  Item ||--o{ VerificationResult : "match + fraud checks"
  Buyer ||--o{ WishlistItem : "wants (Redis-indexed)"
  GreenCredit }o--|| Item : "earned on action"

  Product {
    string id
    int stock
    int soldCount
    bool active
  }
  Item {
    string id
    string status "RETURNED|GRADED|ROUTED|LISTED|SOLD|DONATED|RECYCLED"
    float originalPrice
    string category
  }
  Order {
    string id
    string userId
    string itemId "resold (nullable)"
    string productId "brand-new (nullable)"
    int quantity
    string status "PLACED|SHIPPED|DELIVERED|RETURN_REQUESTED|RETURNED|CANCELLED"
    datetime deliveredAt
  }
  ReturnCase {
    string id
    string status "ReturnStatus state machine"
    grade grade "A|B|C|D"
    bool transitSold
    string secondLifeListingId
    string rejectionReason
  }
```

> The **`Order`** row is the hinge between the two ecosystems and the delivery board: an
> item-backed order that is `PLACED`/`SHIPPED` becomes a *buyer delivery*; one that is
> `DELIVERED` recently shows as *completed*.

---

## 3. Return-decision workflow (state machine)

The brain of the product. Each transition is persisted with an audit `ReturnEvent`. Decisions
come only from the grading / verification / feasibility / routing / matching engines.

```mermaid
stateDiagram-v2
  [*] --> INITIATED : customer starts return (within window)

  INITIATED --> EVIDENCE_REQUESTED : product match too low
  INITIATED --> MANUAL_REVIEW : fraud risk / low confidence
  EVIDENCE_REQUESTED --> GRADED : re-submit verified
  MANUAL_REVIEW --> GRADED : admin vouches (bypass gate)
  MANUAL_REVIEW --> DISCARDED : admin rejects
  INITIATED --> GRADED : verified & graded

  GRADED --> FEASIBILITY_ANALYZED : net-recovery math

  FEASIBILITY_ANALYZED --> RETURN_APPROVED : FEASIBLE
  RETURN_APPROVED --> RETURN_PICKUP_SCHEDULED
  RETURN_PICKUP_SCHEDULED --> RETURNED_TO_SELLER : partner collects
  RETURN_PICKUP_SCHEDULED --> DELIVERY_REJECTED_REVIEW : partner rejects

  FEASIBILITY_ANALYZED --> SECOND_LIFE_LISTED : NOT_FEASIBLE (auto-listed)
  SECOND_LIFE_LISTED --> BUYER_RESERVED : nearby buyer found
  BUYER_RESERVED --> SL_PICKUP_SCHEDULED
  SL_PICKUP_SCHEDULED --> DELIVERY_VERIFICATION
  DELIVERY_VERIFICATION --> TRANSFER_APPROVED : partner verifies OK
  DELIVERY_VERIFICATION --> DELIVERY_REJECTED_REVIEW : partner rejects
  TRANSFER_APPROVED --> REFUND_INITIATED
  REFUND_INITIATED --> COMPLETED

  SECOND_LIFE_LISTED --> WINDOW_EXPIRED : no buyer in window
  WINDOW_EXPIRED --> DONATION_PENDING : routing = DONATE
  WINDOW_EXPIRED --> LIQUIDATION_PICKUP
  LIQUIDATION_PICKUP --> LIQUIDATED
  DONATION_PENDING --> LIQUIDATION_PICKUP : donate
  DONATION_PENDING --> DISCARDED : keep item

  DELIVERY_REJECTED_REVIEW --> SECOND_LIFE_LISTED : admin KEEPS (relist)
  DELIVERY_REJECTED_REVIEW --> TRANSFER_REJECTED : admin REMOVES from store
```

**Delivery-rejection review** (new): when a delivery partner rejects a second-hand item — at
return pickup *or* at second-life verification — the case parks in `DELIVERY_REJECTED_REVIEW`
instead of terminally rejecting. An admin (Operations Console → **Rejections**) then chooses:
- **Keep in inventory** → relist (reactivate or recreate the listing, item → `LISTED`, reopen
  the Second Life window).
- **Remove from store** → deactivate the listing and route the item out of inventory
  (item → `ROUTED`), so it can't be sold again.

---

## 4. Return-in-Transit deal lifecycle

A good-grade return is sold *before* warehouse intake — at a discount that grows with days in
the pipeline — for a **7-day** window (`config.returnTransitArrivalDays`).

```mermaid
flowchart LR
  A["Return graded A/B<br/>(good quality)"] --> B{"In 7-day<br/>window?"}
  B -- "yes, unsold" --> C["Listed in In-Transit section<br/>discount grows daily (config tiers)"]
  C -->|"buyer clicks Add to cart → checkout"| D["reserve() — atomic<br/>transitSold=true, item SOLD,<br/>PLACED order created"]
  D --> E["Delivery board: BUYER_DELIVERY<br/>sender = returning customer<br/>buyer = purchaser"]
  E -->|"partner: Mark delivered"| F["Order DELIVERED ✅<br/>+ green credits"]
  B -- "no — >7 days, unsold" --> G["Delivery board: WAREHOUSE_PICKUP<br/>destination = nearest Amazon FC"]
  G -->|"partner: Collect → warehouse"| H["item ROUTED<br/>case RETURNED_TO_SELLER"]
```

The discount is derived from elapsed days **at read time**, so the "daily recalculation"
happens implicitly on every request. The price is re-computed authoritatively at checkout.

---

## 5. Delivery-partner board (`/delivery`)

The board (`delivery.service.board()`) composes three task families from live data — return
cases **and** orders — and reverse-geocodes real street addresses (with safe fallbacks).

```mermaid
flowchart TD
  subgraph Sources
    RC["ReturnCases (listAll)"]
    OO["Open item orders<br/>(PLACED / SHIPPED)"]
    RD["Recently delivered<br/>item orders"]
  end

  RC -->|"RETURN_PICKUP_SCHEDULED / DELIVERY_VERIFICATION"| P1["PICKUPS:<br/>RETURN_PICKUP · VERIFY_EXCHANGE<br/>→ accept / reject"]
  RC -->|"good grade, unsold, >7 days"| P2["PICKUPS:<br/>WAREHOUSE_PICKUP → nearest FC"]
  OO -->|"every sold second-hand item, immediately"| D1["DELIVERIES:<br/>BUYER_DELIVERY<br/>sender + buyer addresses"]
  RC -->|"terminal/recent"| C1["COMPLETED (drops)"]
  RD --> C1

  P1 --> ACT["Actions → services:<br/>completeReturnPickup · verify ·<br/>rejectReturnPickup → DELIVERY_REJECTED_REVIEW"]
  P2 --> ACT2["collectExpiredToWarehouse"]
  D1 --> ACT3["markDelivered (orders)"]
```

**Address resolution (deterministic for the demo):** buyer = `pointFromSeed(userId)`; sender
= the returning customer's pickup origin for an in-transit sale, else
`pointFromSeed(itemId:seller)`; all reverse-geocoded via Nominatim (cached, timeout-tolerant).

---

## 6. End-to-end purchase + delivery sequence

```mermaid
sequenceDiagram
  actor Buyer
  participant UI as Storefront
  participant API as /api/checkout
  participant CO as checkout.service
  participant RD as return-deals.service
  participant DB as Postgres
  participant DEL as Delivery board
  actor Partner as Delivery partner

  Buyer->>UI: Add second-hand item / in-transit deal to cart
  Buyer->>API: place order (lines)
  API->>CO: placeOrder
  alt In-transit deal
    CO->>RD: reserve(returnCaseId)  %% atomic, one winner
    RD->>DB: transitSold=true, item SOLD
  else Resold listing
    CO->>DB: listing+item SOLD
  end
  CO->>DB: create Order (PLACED) + green credits
  Note over DEL: Order appears immediately as BUYER_DELIVERY
  Partner->>DEL: open /delivery (sender + buyer addresses)
  Partner->>API: Mark delivered
  API->>DB: Order DELIVERED + deliveredAt
```

---

## 7. Where things live

| Concern | File(s) |
|---|---|
| Per-user cart | `src/lib/cart.tsx` (storage key `nemo-cart-v2::<userId>`) |
| Roles / session | `src/lib/session.ts`, `src/lib/user-context.tsx` |
| Return state machine | `src/services/return-workflow/return-workflow.service.ts` |
| In-transit deals | `src/services/return-deals/return-deals.service.ts` |
| Delivery board | `src/services/delivery/delivery.service.ts` |
| Checkout (both ecosystems) | `src/services/checkout/checkout.service.ts` |
| Grading (swappable) | `src/services/grading/*` (bedrock · local · clip · kaputt) |
| Live business rules | `RoutingConfig` table + `config.repository.ts` |
| Admin Operations Console | `src/app/admin/page.tsx` + `src/components/admin/*` |

---

*Build the backend until it's provably correct. Then build a frontend it can be proud of.
Then ship the bridge.*
