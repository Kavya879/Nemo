# ReLoop — Circular Economy Platform

> AI-powered circular commerce that gives returned and unused products a second life.  
> Grade, route, and match items to their highest-value destination — resale, refurbishment, donation, or anonymous nearby need.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Set up database (generates Prisma client, runs migrations, seeds data)
npm run db:setup

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Optional: AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The app works fully without the AI service — all endpoints have deterministic fallbacks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui, lucide-react |
| Database | PostgreSQL, Prisma ORM |
| AI Service | FastAPI, OpenCV, Ollama (local LLM) |
| Routing | Deterministic priority-based algorithm |
| Matching | Composite scoring (distance, urgency, size, demand) |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Customer intake — submit items, get Health Card |
| `/inspect` | Operator AI inspection dashboard with queue and filters |
| `/seller` | Seller return intelligence — pattern detection, listing rewrites |
| `/matches` | Nearby need matching — anonymous demand pools |
| `/fit` | Return prevention widget — pre-purchase fit intelligence |
| `/passport/[id]` | Product lifetime passport — timeline, condition, sustainability |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/items/intake` | Submit a new return case |
| GET | `/api/items` | List all returns (filterable) |
| GET | `/api/items/[id]` | Get return case details |
| POST | `/api/ai/inspect` | Run AI inspection (fallback safe) |
| POST | `/api/ai/route` | Run routing decision |
| GET | `/api/items/[id]/health-card` | Get health card |
| POST | `/api/matches/nearby` | Find nearby demand matches |
| POST | `/api/listings/rewrite` | AI listing rewrite |
| POST | `/api/pricing/suggest` | Price estimation |
| POST | `/api/fit/recommend` | Brand fit recommendation |
| GET | `/api/green-credits/[userId]` | User credit balance |
| GET | `/api/passport/[passportId]` | Product passport |

## Key Design Decisions

1. **No paid APIs** — Everything runs locally (Ollama, OpenCV, YOLO placeholder)
2. **Demo-safe fallbacks** — Every AI endpoint returns deterministic results when services are unavailable
3. **Privacy by design** — Anonymous pool matching, city-level location only, no customer-to-customer contact
4. **Amazon handles logistics** — No direct user interaction between parties
5. **Green credits** — Reward circular behavior with auditable credits

## Database

```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed demo data
npm run prisma:reset     # Reset and re-seed
```

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reloop?schema=public"
AI_SERVICE_URL="http://localhost:8000"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1"
YOLO_MODEL_PATH=""
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm run db:setup     # Full database setup
```
