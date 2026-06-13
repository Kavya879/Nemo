# Implementation Plan: ReLoop Circular Economy Platform

## Overview

Build the full ReLoop platform following the design document's phased approach: database foundation, AI grading core, feature pages, social/matching features, and admin polish. The Next.js frontend (TypeScript) communicates with a Python FastAPI AI service and PostgreSQL via Prisma. All AI runs locally via Ollama and OpenCV/YOLO.

## Tasks

- [ ] 1. Database schema, Prisma setup, and core types
  - [ ] 1.1 Expand Prisma schema with missing models and fields
    - Add `User` model with id, email, name, region, totalCredits, createdAt
    - Add `MarketplaceListing` model with price, originalPrice, description, images, sold, buyerId
    - Add `ReturnStatus.LISTED` enum value
    - Add `originalPrice` and `userId` fields to `Product` model
    - Add `GreenCredit.category` field and update relation to support multiple credits per return case
    - Add `GradeSnapshot` and `RepairEvent` JSON fields to `ProductPassport`
    - Add `carbonSaved` field to `ProductPassport`
    - Run `prisma migrate dev` to apply changes
    - _Requirements: 6.1, 6.2, 6.3, 7.6, 8.1_

  - [ ] 1.2 Create shared TypeScript types and Prisma client singleton
    - Create `src/types/index.ts` with all shared interfaces (HealthCardResponse, RoutingInput, RoutingOutput, PricingFactors, PriceEstimate, MatchScoring, ProductPassport, GreenCredit, CreditSummary, MarketplaceQuery, MarketplaceResponse)
    - Create `src/lib/prisma.ts` with Prisma client singleton (connection pooling, global dev reuse)
    - _Requirements: 3.8, 4.1, 5.3, 8.5_

  - [ ] 1.3 Create database seed script with sample data
    - Create `prisma/seed.ts` with sample users, products, need signals, return cases, and marketplace listings
    - Add seed script to package.json
    - Include at least 2 NeedSignals per category for matching tests
    - _Requirements: 5.1, 8.1_

- [ ] 2. File upload system and image validation
  - [ ] 2.1 Implement file upload API route
    - Create `src/app/api/upload/route.ts` with POST handler
    - Accept multipart form data with up to 6 images
    - Validate file type (JPEG, PNG, WebP) and size (max 5 MB each)
    - Store files to `public/uploads/` with unique filenames (UUID prefix)
    - Return array of stored file paths
    - Return descriptive error messages for invalid format or size
    - _Requirements: 1.3, 1.4, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 2.2 Write property test for file upload validation
    - **Property 17: Input Validation Rejection**
    - **Validates: Requirements 1.2, 12.2, 12.3**

  - [ ] 2.3 Create upload utility library
    - Create `src/lib/upload.ts` with helper functions for file validation, unique filename generation, and path management
    - _Requirements: 12.1, 12.4_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. AI Grading Engine (server-side)
  - [ ] 4.1 Refactor and expand the grading scoring engine in reloop.ts
    - Update `gradeReturn` function to match design scoring formula exactly (base 88, imageSignal, unused +4, severe -22, mild -7, yolo -10)
    - Add proper clamping: conditionScore [12,98], qualityScore [18,96], historyScore [20,94]
    - Add clarity bonus of 8 to qualityScore when image is clear
    - Add YOLO defect penalty: -10 per defect for condition, -8 for quality
    - Ensure confidence = Math.round(average of 3 scores)
    - Ensure grade thresholds: A>=86, B>=70, C>=52, D<52
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.14_

  - [ ]* 4.2 Write property test for grading score bounds
    - **Property 1: Grading Score Bounds**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 4.3 Write property test for score term impact
    - **Property 2: Score Term Impact (Metamorphic)**
    - **Validates: Requirements 2.4, 2.5, 2.6**

  - [ ]* 4.4 Write property test for grade threshold assignment
    - **Property 3: Grade Threshold Assignment**
    - **Validates: Requirements 2.7**

  - [ ]* 4.5 Write property test for grading determinism
    - **Property 4: Grading Determinism**
    - **Validates: Requirements 2.13**

  - [ ] 4.6 Implement AI service client with fallback
    - Create `src/lib/ai-client.ts` with a client that calls the FastAPI `/grade` endpoint
    - Implement 5-second timeout for the FastAPI call
    - On timeout or connection error, fall back to client-side `reloop.ts` text-only grading
    - Include `degradedServices` field in response indicating which services were unavailable
    - _Requirements: 2.12, 11.1, 11.3, 11.6_

- [ ] 5. Routing decision algorithm
  - [ ] 5.1 Implement routing decision as a standalone function
    - Create or update routing logic in `src/lib/reloop.ts` to strictly follow priority order: PEER_EXCHANGE → RESALE → REFURBISH → DONATE → LIQUIDATE
    - Conditions: PEER_EXCHANGE (need match AND conditionScore > 74 AND category != ELECTRONICS), RESALE (grade A OR grade B with conditionScore > 78), REFURBISH (ELECTRONICS AND qualityScore > 48 AND severe < 2), DONATE (grade C), LIQUIDATE (default)
    - Ensure exactly one route is always produced
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 5.2 Write property test for routing decision correctness
    - **Property 5: Routing Decision Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

- [ ] 6. Pricing algorithm
  - [ ] 6.1 Implement pricing estimation logic
    - Create `src/lib/pricing.ts` with `estimatePrice` function
    - Apply grade multipliers (A: 0.70, B: 0.50, C: 0.30, D: 0.15)
    - Apply category demand multipliers (ELECTRONICS: 1.15, FOOTWEAR: 1.05, APPAREL: 0.90, HOME: 1.00, BOOKS: 0.85, TOYS: 0.95, OTHER: 1.00)
    - Apply age decay of 2% per month with minimum multiplier 0.60
    - Enforce price floor of 15% of original/estimated price
    - Return price range ±15% rounded to 2 decimal places
    - Return confidence 82 (known price) or 60 (Ollama estimate)
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ] 6.2 Add Ollama price estimation fallback
    - In `src/lib/pricing.ts`, implement Ollama call for unknown original price with 12-second timeout
    - Return error indication if Ollama fails or times out (do not display price)
    - _Requirements: 4.2, 4.3_

  - [ ]* 6.3 Write property test for price floor invariant
    - **Property 6: Price Floor Invariant**
    - **Validates: Requirements 4.5**

  - [ ]* 6.4 Write property test for price range symmetry
    - **Property 7: Price Range Symmetry**
    - **Validates: Requirements 4.6**

  - [ ]* 6.5 Write property test for pricing calculation correctness
    - **Property 8: Pricing Calculation Correctness**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.7**

- [ ] 7. Nearby need matching
  - [ ] 7.1 Implement matching engine
    - Create `src/lib/matching.ts` with `scoreNeedPool` and `findBestMatch` functions
    - Query active NeedSignals from DB matching category and region
    - Compute composite score: distanceScore×0.30 + urgencyScore×0.25 + sizeScore×0.25 + demandScore×0.20
    - Distance: max(0, 100 - distanceKm×10)
    - Urgency: urgency × 10 (1-10 scale → 10-100)
    - Size: 100 (exact match), 60 (no requirement), 20 (mismatch)
    - Demand: High=100, Medium=65, Low=30
    - Select NeedSignal with highest composite score
    - Recommend PEER_EXCHANGE only when score > 55
    - Return score bounded [0, 100]
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12_

  - [ ]* 7.2 Write property test for match score bounds and computation
    - **Property 9: Match Score Bounds and Computation**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.7**

  - [ ]* 7.3 Write property test for match threshold gate
    - **Property 10: Match Threshold Gate**
    - **Validates: Requirements 5.5**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Item submission API and wizard
  - [ ] 9.1 Implement item submission API route
    - Create `src/app/api/items/route.ts` with POST handler
    - Accept title, brand, category, sku, size, region, returnReason, details, images
    - Validate required fields (title 1-200 chars, category, region, returnReason, at least 1 image)
    - Create Product and ReturnCase in DB with status DRAFT
    - Trigger grading via AI client, update case to GRADED on success
    - On grading failure, keep case in DRAFT and return error message
    - Return HealthCard data on successful grading
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_

  - [ ] 9.2 Implement item list and detail API routes
    - Create `src/app/api/items/route.ts` GET handler for listing user's items
    - Create `src/app/api/items/[id]/route.ts` with GET handler returning item + health card
    - _Requirements: 1.7_

  - [ ] 9.3 Build item submission wizard page
    - Create `src/app/submit/page.tsx` with multi-step wizard: product details → image upload → return reason → grade result
    - Use existing shadcn/ui components (Card, Input, Button, Label, Textarea)
    - Create `src/components/items/submit-wizard.tsx` orchestrating the steps
    - Create `src/components/items/image-upload.tsx` with drag-and-drop, preview, and validation
    - _Requirements: 1.1, 1.3, 1.4_

  - [ ] 9.4 Build health card display component
    - Create `src/components/items/health-card.tsx` (extracted from page.tsx inline component)
    - Show grade (A-D), condition score, quality score, history score, route, reasoning, risk flags, green credits
    - _Requirements: 1.7_

- [ ] 10. Product Passport
  - [ ] 10.1 Implement product passport creation and update logic
    - Create `src/lib/passport.ts` with functions: createPassport, addGradeSnapshot, recordTransfer, addRepairEvent, calculateCarbonSaved
    - On first submission: create passport with serialHash (SHA-256), materialNotes from details, ownerCount=1, empty arrays
    - On grading: append GradeSnapshot (date ISO 8601, grade, conditionScore, route)
    - On transfer: increment ownerCount +1, append city to cityTrail
    - On repair: append RepairEvent (date, type, description max 500 chars, gradeAfter)
    - Carbon saved per route: PEER_EXCHANGE 4.5, RESALE 4.2, DONATE 3.8, REFURBISH 3.1, LIQUIDATE 1.2
    - Store location at city-level only
    - Reject appends when repairEvents reaches 50 or cityTrail reaches 100
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 10.2 Write property test for passport transfer consistency
    - **Property 11: Passport Transfer Consistency**
    - **Validates: Requirements 6.3**

  - [ ]* 10.3 Write property test for carbon savings calculation
    - **Property 12: Carbon Savings Calculation**
    - **Validates: Requirements 6.5**

  - [ ] 10.4 Implement passport API route and page
    - Create `src/app/api/passport/[id]/route.ts` GET handler returning full passport data
    - Create `src/app/passport/[id]/page.tsx` with timeline view of lifecycle events
    - Create `src/components/passport/passport-timeline.tsx`
    - _Requirements: 6.1, 6.2_

- [ ] 11. Green Credits system
  - [ ] 11.1 Implement green credits award logic
    - Create `src/lib/credits.ts` with functions: awardRouteCredits, checkAndAwardBonuses, revokeAndReaward
    - Base credits: PEER_EXCHANGE 45, DONATE 40, RESALE 30, REFURBISH 30, LIQUIDATE 10
    - Bonus: +5 (bonus_quality) when 3+ images with QualityScore >= 50
    - Bonus: +10 (bonus_speed) when submitted within 7 days of purchase date
    - Bonus: +15 (bonus_repeat) when user has 3+ previously routed items beyond DRAFT
    - Bonus: +20 (bonus_local) when peer exchange within 5km
    - Store each award as separate record with points, reason, timestamp, category
    - Award amounts must be positive integers between 1 and 95
    - Update user totalCredits atomically
    - On admin route override: revoke original route credit, create new credit for updated route
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 11.2 Write property test for green credits positive integer invariant
    - **Property 13: Green Credits Positive Integer Invariant**
    - **Validates: Requirements 7.1, 7.7**

  - [ ]* 11.3 Write property test for user credit balance consistency
    - **Property 14: User Credit Balance Consistency**
    - **Validates: Requirements 7.8**

  - [ ] 11.4 Implement credits API and page
    - Create `src/app/api/credits/route.ts` GET handler returning balance, history, breakdown
    - Create `src/app/api/credits/leaderboard/route.ts` GET handler for regional leaderboard
    - Create `src/app/credits/page.tsx` with credit dashboard
    - Create `src/components/credits/credit-dashboard.tsx` and `src/components/credits/leaderboard.tsx`
    - _Requirements: 7.6, 7.8_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Marketplace
  - [ ] 13.1 Implement marketplace API routes
    - Create `src/app/api/marketplace/route.ts` GET handler with filters (category, region, price range, grade)
    - Only return items with route RESALE and status LISTED
    - Support pagination: default page size 20, configurable 1-100, return total count and hasMore
    - Create `src/app/api/marketplace/[id]/route.ts` GET for listing detail
    - Create `src/app/api/marketplace/[id]/buy/route.ts` POST for purchase
    - On purchase: mark listing SOLD, record buyer, increment passport ownerCount, append buyer region to cityTrail
    - Reject purchase if already SOLD with descriptive error
    - Show empty-state message when no results match filters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 13.2 Write property test for marketplace filter invariant
    - **Property 15: Marketplace Filter Invariant**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 13.3 Write property test for pagination correctness
    - **Property 16: Pagination Correctness**
    - **Validates: Requirements 8.4**

  - [ ] 13.4 Build marketplace pages
    - Create `src/app/marketplace/page.tsx` with search, filter sidebar, and listing grid
    - Create `src/app/marketplace/[id]/page.tsx` with listing detail, passport link, and buy button
    - Create `src/components/marketplace/listing-card.tsx` and `src/components/marketplace/marketplace-grid.tsx`
    - Show product title, price, original price, condition grade, images, description, passport link
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 14. Seller insights
  - [ ] 14.1 Implement seller insights API routes
    - Create `src/app/api/seller/insights/route.ts` GET handler returning return patterns per listing (most frequent reason, return count)
    - Only show listings with at least 1 return
    - Display empty state when no return data exists
    - Create `src/app/api/seller/rewrite/route.ts` POST handler that sends title, description, and return reasons to Ollama
    - Return revised title (max 200 chars), revised description (max 2000 chars), prevention tip (max 500 chars), detected issue
    - On Ollama failure/timeout (12s): return error message, preserve original listing
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 14.2 Build seller dashboard pages
    - Create `src/app/seller/page.tsx` with return pattern overview and listing insights
    - Create `src/app/seller/listings/page.tsx` for listing management with rewrite requests
    - Create `src/components/seller/insights-panel.tsx` and `src/components/seller/rewrite-card.tsx`
    - _Requirements: 9.1, 9.2_

- [ ] 15. Admin panel
  - [ ] 15.1 Implement admin API routes
    - Create `src/app/api/admin/metrics/route.ts` GET handler returning total items processed, route distribution (% rounded to 1 decimal), total carbon saved, total green credits
    - Create `src/app/api/items/[id]/route.ts` PATCH handler for route override (admin only)
    - Accept valid routes only for items with status GRADED or ROUTED
    - Reject override for COMPLETED items with error message
    - Record override: admin id, previous route, new route, timestamp
    - Trigger green credits revoke-and-reaward on override
    - Implement health check endpoint that pings AI service, database, and Ollama with 5-second timeout
    - Return 503 with service-unavailable indicator if database unreachable
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 15.2 Build admin panel page
    - Create `src/app/admin/page.tsx` with metrics dashboard, route distribution chart, health indicators, and route override controls
    - Display aggregate metrics and system health status (available/unavailable per service)
    - _Requirements: 10.1, 10.4, 10.5_

- [ ] 16. Nearby matches page and peer exchange flow
  - [ ] 16.1 Implement matches API routes
    - Create `src/app/api/matches/route.ts` GET handler returning nearby anonymous matches for user's items
    - Create `src/app/api/matches/accept/route.ts` POST handler for accepting a peer exchange
    - On acceptance: update item route, award green credits (including bonus_local if within 5km), update passport
    - _Requirements: 5.1, 5.9, 5.10, 5.11, 7.5_

  - [ ] 16.2 Build matches page
    - Create `src/app/matches/page.tsx` showing anonymous need pool matches
    - Display pool name, distance, demand level, match note
    - No identity exposure — pool-level only
    - _Requirements: 5.11_

- [ ] 17. FastAPI AI service modularization
  - [ ] 17.1 Refactor FastAPI service into modules
    - Create `ai-service/grading/__init__.py`, `vision.py`, `yolo.py`, `text_analysis.py`, `scorer.py`
    - Create `ai-service/routing/__init__.py`, `decision.py`, `matching.py`
    - Create `ai-service/pricing/__init__.py`, `estimator.py`
    - Create `ai-service/llm/__init__.py`, `ollama.py`
    - Create `ai-service/models/__init__.py`, `schemas.py` with Pydantic models
    - Move existing logic from monolithic `main.py` into appropriate modules
    - Add `/price-estimate` and `/nearby-match` endpoints to `main.py`
    - Implement graceful degradation: Ollama unavailable → keyword scoring only; YOLO missing → OpenCV only; image decode failure → text-only
    - Include `degradedServices` field in grade response when services are unavailable
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 11.1, 11.2, 11.4, 11.6_

- [ ] 18. Graceful degradation and error handling
  - [ ] 18.1 Implement system-wide graceful degradation
    - In AI client: 5-second timeout for FastAPI, fallback to reloop.ts client-side grading
    - In FastAPI: Ollama unavailable → use hardcoded templates; YOLO missing → skip detection; image decode failure → text signals only
    - Database unreachable → return HTTP 503 with retry-after-30s message
    - Include degraded services indicator in all degraded responses
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 19. Navigation, layout, and settings
  - [ ] 19.1 Implement navigation and layout components
    - Create `src/components/layout/navigation.tsx` with links to all pages (Home, Submit, Items, Marketplace, Matches, Credits, Seller, Admin)
    - Create `src/components/layout/footer.tsx`
    - Update `src/app/layout.tsx` to include navigation and footer
    - Create `src/app/settings/page.tsx` for user profile and region settings
    - _Requirements: 1.1_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The TypeScript frontend and Python AI service are developed in parallel where possible
- All AI runs locally via Ollama — no cloud APIs or paid services
- fast-check is recommended for TypeScript property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.3"] },
    { "id": 3, "tasks": ["2.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 5, "tasks": ["5.1", "6.1", "7.1"] },
    { "id": 6, "tasks": ["5.2", "6.2", "6.3", "6.4", "6.5", "7.2", "7.3"] },
    { "id": 7, "tasks": ["9.1", "9.2", "10.1", "11.1"] },
    { "id": 8, "tasks": ["9.3", "9.4", "10.2", "10.3", "10.4", "11.2", "11.3", "11.4"] },
    { "id": 9, "tasks": ["13.1", "14.1", "16.1"] },
    { "id": 10, "tasks": ["13.2", "13.3", "13.4", "14.2", "15.1", "16.2"] },
    { "id": 11, "tasks": ["15.2", "17.1"] },
    { "id": 12, "tasks": ["18.1", "19.1"] }
  ]
}
```
