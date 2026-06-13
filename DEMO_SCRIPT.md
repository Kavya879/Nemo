# ReLoop Demo Script for Judges

> **Pitch**: ReLoop gives returned Amazon products a second life using local AI — no paid APIs, no cloud dependency, zero identity exposure.

---

## 30-Second Elevator Pitch

"Every year, millions of returned products get liquidated or destroyed. ReLoop uses local AI to grade, route, and match these items to their highest-value second life — whether that's resale, donation, refurbishment, or anonymous nearby need. We prevent returns at checkout with fit intelligence, and when returns do happen, we ensure nothing is wasted."

---

## Demo Flow (5 minutes)

### 1. Customer Intake (/) — 60 seconds

**Show the hero**: "Return it. Outgrow it. ReLoop finds its next best owner."

**Submit a demo item**:
- Title: "AeroStride Velocity Running Shoes"
- Brand: "AeroStride"  
- Category: Footwear
- Size: UK7
- Region: North Bengaluru
- Reason: "Doesn't fit" (click the chip)
- Details: "Unused pair, box opened. I usually wear UK7 but this brand feels small."

**Click "Analyze Next Life"** → Watch the loading animation → See results:
- Grade A, Confidence 88%
- Route: Resell now
- +30 Green Credits earned
- Health Card with condition/quality/history scores

**Key talking point**: "The customer uploads once. AI grades in seconds. Amazon handles everything from here."

---

### 2. AI Inspection Dashboard (/inspect) — 90 seconds

**Key demo case** (pre-selected, gold highlighted):  
CloudWalk Canvas Sneakers — ₹2,499 shoes that would typically be liquidated for ₹375 (15%).

**Point out**:
- ReLoop detected anonymous nearby demand (3.4 km, urgency 8/10, exact size UK8 match)
- Routes to PEER_EXCHANGE instead — recovering ₹2,124 (85%)
- +45 green credits, 4.5 kg CO₂ saved
- Zero customer-to-customer contact

**Show the filters**: Filter by route, grade, category. Show the routing priority table.

**Key talking point**: "Low-value items don't get destroyed. ReLoop finds them a second life through anonymous demand matching."

---

### 3. Return Prevention (/fit) — 60 seconds

**The checkout widget**:
- User usually wears UK7
- Select AeroStride brand → Warning fires immediately
- "⚠️ This brand runs small. If you usually wear UK7, choose UK8."
- Click "Check Fit Risk" → 68% return probability shown
- Click "Switch to UK8" → Risk drops to 4%

**Right panel shows impact**:
- ~19 returns prevented per month
- ₹2,850/month saved
- 12% less overstock needed

**Key talking point**: "The best return is the one that never happens. Fit intelligence prevents 68% of size-related returns at checkout."

---

### 4. Seller Intelligence (/seller) — 60 seconds

**Demo case** (gold highlighted): AeroStride shoes with 28 returns, 68% cite size mismatch.

**Show the Before/After comparison**:
- Before: Generic title, no size warning
- After: "AeroStride Velocity Running Shoes — Narrow Fit, Size Up 1 for Relaxed Feel"
- First bullet: "⚠️ RUNS SMALL: If you usually wear UK7, choose UK8"

**Click "Apply Rewrite"** → Badge changes to "Applied"

**Key talking point**: "AI rewrites listings based on actual return data. The seller never has to guess why products come back."

---

### 5. Nearby Matching (/matches) — 45 seconds

**Show the demand pools**:
- "Student nearby needs running shoes" — 3.4 km, High demand, Score 82
- "Library program needs children's books" — Matched and fulfilled
- "Community centre needs home essentials" — Available

**Show the scoring breakdown**: Distance 30%, Urgency 25%, Size 25%, Demand 20%

**Privacy guarantees**: Anonymous pools, city-level only, Amazon-managed pickup.

**Key talking point**: "No customer-to-customer chat. No identity exposure. Just products finding their next best owner automatically."

---

### 6. Product Passport (/passport/pass-003) — 45 seconds

**Show the CloudWalk Sneakers lifecycle**:
- Purchased → Returned → AI Inspected → Routed to Peer Exchange → Matched → Delivered

**Point out**:
- 4.5 kg CO₂ saved
- +65 Green Credits generated  
- City trail: Bengaluru → Bengaluru (stayed local)
- Material composition tracked

**Future Vision section**: Cross-city matching, lifetime digital passport, material recovery tracking.

**Key talking point**: "Every product gets a permanent passport. You can trace its entire second life — from return to reuse."

---

## Closing Statement

"ReLoop turns Amazon's biggest waste problem into a circular economy engine. No paid APIs. No cloud dependency. Local AI that grades, routes, prevents, and matches — all while respecting privacy and rewarding sustainability. Every returned product finds its next best owner."

---

## Technical Questions You Might Get

| Question | Answer |
|----------|--------|
| "Does this need internet?" | No. Ollama runs locally, OpenCV is local, all logic is deterministic. |
| "What if AI is down?" | Every endpoint has fallback logic. The demo never breaks. |
| "How is privacy protected?" | Anonymous pool matching at city level. No names, no addresses, no chat. |
| "What about scale?" | PostgreSQL + Prisma ORM. FastAPI service is stateless and horizontally scalable. |
| "How accurate is grading?" | 87% confidence on brand-specific fit rules from 284 return cases. Vision analysis adds clarity bonuses. |
| "Revenue model?" | Green credits incentivize participation. Reduced liquidation saves Amazon ₹150-₹400 per item. |

---

## Startup Commands

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2 (optional): AI service
cd ai-service && uvicorn main:app --reload --port 8000
```

The app works fully without Terminal 2 — all AI responses have deterministic fallbacks.
