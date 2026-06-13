# Requirements Document

## Introduction

ReLoop is a locally-hosted circular economy platform that gives returned and unused products a second life. The system combines a Next.js frontend with a Python-based AI service powered by Ollama (local LLM) and YOLO/OpenCV (visual grading) to grade returned items, route them to their best destination (resell, refurbish, donate, liquidate, or peer exchange), match surplus goods to anonymous nearby demand, and track product lifecycles via digital passports. All processing runs on local or self-hosted infrastructure with no paid APIs, no cloud storage, and no third-party AI services.

## Glossary

- **Grading_Engine**: The AI-powered subsystem combining text analysis, OpenCV vision analysis, and optional YOLO object detection to produce a condition assessment for returned items.
- **Routing_Algorithm**: The decision subsystem that assigns a return route (RESALE, REFURBISH, DONATE, LIQUIDATE, PEER_EXCHANGE) based on grade, scores, category, and nearby demand.
- **Pricing_Algorithm**: The subsystem that estimates resale price based on grade multipliers, category demand, brand premium, and item age decay.
- **Matching_Engine**: The subsystem that scores NeedSignal pools against returned items using distance, urgency, size match, and demand weighting.
- **Product_Passport**: A digital record tracking a product's full lifecycle including ownership history, repair events, city trail, grade history, and carbon savings.
- **Green_Credits_System**: The reward subsystem that awards points for sustainability actions based on route type and bonus conditions.
- **Submission_Wizard**: The multi-step frontend form for item submission including product details, image upload, return reason, and AI grading result.
- **Marketplace**: The browsing interface for items routed to RESALE, with search, filter, and purchase capability.
- **Seller_Insights**: The analytics and AI-powered subsystem that detects return patterns and generates listing rewrites to prevent future returns.
- **Admin_Panel**: The operator interface showing circular economy metrics, route distribution, and queue management.
- **Health_Card**: The output of the Grading_Engine containing condition score, quality score, history score, grade, route, reasoning, risk flags, and green credits awarded.
- **NeedSignal**: An anonymous demand signal from a region-level pool indicating need for a specific product category and optional size.
- **ConditionScore**: An integer 0-100 representing physical item condition, derived from text and vision signals.
- **QualityScore**: An integer 0-100 representing image quality and item presentation.
- **HistoryScore**: An integer 0-100 representing the item's usage history signals.

## Requirements

### Requirement 1: Item Submission

**User Story:** As a consumer, I want to submit returned or unused items through a guided wizard, so that the platform can assess and route them to their best next destination.

#### Acceptance Criteria

1. WHEN a user submits an item with a title (1–200 characters), category, region, return reason, and between 1 and 6 images, THEN THE Submission_Wizard SHALL create a new return case with status DRAFT and store all provided data.
2. IF a user attempts to submit an item without a title, category, region, return reason, or at least one image, THEN THE Submission_Wizard SHALL reject the submission and display a validation error indicating which required fields are missing.
3. WHEN images are uploaded during submission, THEN THE Submission_Wizard SHALL accept only JPEG or PNG files each no larger than 5 MB, store them to local filesystem under the uploads directory, and record their paths against the return case.
4. IF an uploaded image strictly exceeds 5 MB or is not in JPEG or PNG format, THEN THE Submission_Wizard SHALL reject that image and display a validation error indicating the accepted formats and size limit. Images exactly 5 MB in size with a valid format SHALL be accepted.
5. WHEN item submission is complete, THEN THE Submission_Wizard SHALL trigger the Grading_Engine to produce a Health_Card for the item.
6. IF the Grading_Engine fails to produce a Health_Card, THEN THE Submission_Wizard SHALL retain the return case in DRAFT status and display an error message indicating that grading is temporarily unavailable.
7. WHEN the Grading_Engine successfully produces a Health_Card, THEN THE Submission_Wizard SHALL display the resulting Health_Card showing the condition grade (A–D), assigned route, routing reasoning, and green credits to the user.

### Requirement 2: AI Grading

**User Story:** As a consumer, I want returned items to be graded by AI analysis of my images and text description, so that routing decisions are consistent and explainable.

#### Acceptance Criteria

1. WHEN the Grading_Engine receives an item with images and text metadata, THEN THE Grading_Engine SHALL produce a ConditionScore between 12 and 98 inclusive, clamping any computed value that falls outside this range to the nearest bound.
2. WHEN the Grading_Engine receives an item with images and text metadata, THEN THE Grading_Engine SHALL produce a QualityScore between 18 and 96 inclusive, clamping any computed value that falls outside this range to the nearest bound.
3. WHEN the Grading_Engine receives an item with images and text metadata, THEN THE Grading_Engine SHALL produce a HistoryScore between 20 and 94 inclusive, clamping any computed value that falls outside this range to the nearest bound.
4. WHEN severe defect terms (broken, cracked, dead, missing, fake, torn) are detected in text, THEN THE Grading_Engine SHALL reduce the ConditionScore by 22 points per term detected, subject to the ConditionScore floor of 12.
5. WHEN mild defect terms (opened, scratch, loose, box, minor) are detected in text, THEN THE Grading_Engine SHALL reduce the ConditionScore by 7 points per term detected, subject to the ConditionScore floor of 12.
6. WHEN unused indicators (unused, new, sealed, wrong, duplicate, gift) are detected in text, THEN THE Grading_Engine SHALL increase the ConditionScore by 4 points per indicator detected, subject to the ConditionScore ceiling of 98.
7. WHEN the Grading_Engine has computed ConditionScore, QualityScore, and HistoryScore, THEN THE Grading_Engine SHALL calculate confidence as the arithmetic mean of the three scores rounded to the nearest integer, and assign grade A when confidence is 86 or above, grade B when confidence is between 70 and 85 inclusive, grade C when confidence is between 52 and 69 inclusive, and grade D when confidence is below 52.
8. WHEN an image is provided, THEN THE Grading_Engine SHALL perform OpenCV analysis including blur detection via Laplacian variance, brightness check via grayscale mean, and edge density via Canny edge detection, and SHALL classify the image as clear when Laplacian variance exceeds 80 and grayscale mean is between 45 and 220 inclusive.
9. WHEN a YOLO model is configured and running, THEN THE Grading_Engine SHALL run object detection to identify defects and reduce scores by 10 points per defect for ConditionScore and 8 points per defect for QualityScore, subject to each score's defined floor. YOLO-based score penalties SHALL only apply when YOLO is actively processing.
10. WHEN Ollama is available, THEN THE Grading_Engine SHALL generate a natural language reasoning explanation for the grade assessment.
11. IF Ollama is unavailable, THEN THE Grading_Engine SHALL use hardcoded reasoning templates instead of LLM-generated text.
12. IF the FastAPI AI service does not respond within 5 seconds, THEN THE Grading_Engine SHALL fall back to client-side text-only grading using the reloop.ts logic.
13. THE Grading_Engine SHALL produce the same grade and route for identical inputs, excluding the natural language reasoning text which may vary between invocations when generated by LLM.
14. WHEN an image is classified as clear, THEN THE Grading_Engine SHALL add a clarity bonus of 8 points to the QualityScore before clamping.

### Requirement 3: Routing Decision

**User Story:** As a platform operator, I want items to be automatically routed to the optimal destination based on their grade and context, so that returned products find their highest-value second life.

#### Acceptance Criteria

1. WHEN a nearby NeedSignal match exists AND ConditionScore is strictly greater than 74 AND the category is not ELECTRONICS, THEN THE Routing_Algorithm SHALL assign the route PEER_EXCHANGE.
2. WHEN the grade is A, OR the grade is B with ConditionScore strictly greater than 78, THEN THE Routing_Algorithm SHALL assign the route RESALE.
3. WHEN the category is ELECTRONICS AND QualityScore is strictly greater than 48 AND severe defect count is strictly less than 2, THEN THE Routing_Algorithm SHALL assign the route REFURBISH.
4. WHEN the grade is C AND no higher-priority route (PEER_EXCHANGE, RESALE, or REFURBISH) applies, THEN THE Routing_Algorithm SHALL assign the route DONATE.
5. WHEN the grade is D AND no higher-priority route applies, THEN THE Routing_Algorithm SHALL assign the route LIQUIDATE.
6. THE Routing_Algorithm SHALL evaluate routing conditions in strict priority order: PEER_EXCHANGE (priority 1), RESALE (priority 2), REFURBISH (priority 3), DONATE (priority 4), LIQUIDATE (priority 5). The first condition satisfied determines the route.
7. THE Routing_Algorithm SHALL produce exactly one route for each graded item.
8. THE Routing_Algorithm SHALL accept inputs with ConditionScore in range [12, 98], QualityScore in range [18, 96], grade in {A, B, C, D}, category in {APPAREL, FOOTWEAR, ELECTRONICS, HOME, TOYS, BOOKS, OTHER}, and severe defect count as a non-negative integer.

### Requirement 4: Pricing Estimation

**User Story:** As a consumer browsing the marketplace, I want accurate price estimates for resale items, so that I can make informed purchase decisions.

#### Acceptance Criteria

1. WHEN an item has a known original price, THEN THE Pricing_Algorithm SHALL compute the base price as originalPrice multiplied by the grade multiplier (A: 0.70, B: 0.50, C: 0.30, D: 0.15).
2. WHEN an item has no original price, THEN THE Pricing_Algorithm SHALL request a base price estimate from Ollama using title, brand, and category, with a request timeout of 12 seconds.
3. IF an item has no original price AND the Ollama request fails or times out, THEN THE Pricing_Algorithm SHALL return an error indication stating that pricing is unavailable, and SHALL NOT display a price estimate to the consumer.
4. THE Pricing_Algorithm SHALL apply category demand multipliers (ELECTRONICS: 1.15, FOOTWEAR: 1.05, APPAREL: 0.90, HOME: 1.00, BOOKS: 0.85, TOYS: 0.95, OTHER: 1.00) to the base price.
5. THE Pricing_Algorithm SHALL apply age decay of 2% per month calculated from the product's original purchase date to the current date, with a minimum multiplier floor of 0.60. The age multiplier SHALL be computed as max(0.60, 1.0 minus 0.02 multiplied by the number of full months elapsed).
6. WHEN original price is known, THEN THE Pricing_Algorithm SHALL enforce a minimum price floor of 15% of the original price. WHEN original price is unknown, THEN THE Pricing_Algorithm SHALL enforce a minimum price floor of 15% of the Ollama-estimated base price.
7. THE Pricing_Algorithm SHALL return a price range of plus or minus 15% around the estimated price, with all price values rounded to 2 decimal places.
8. WHEN original price is known, THEN THE Pricing_Algorithm SHALL report a confidence value of 82.
9. WHEN original price is unknown AND Ollama returns a base price estimate, THEN THE Pricing_Algorithm SHALL report a confidence value of 60.

### Requirement 5: Nearby Need Matching

**User Story:** As a consumer, I want my returned items to be matched to anonymous nearby demand when appropriate, so that products go directly to people who need them without exposing personal information.

#### Acceptance Criteria

1. WHEN an item is graded, THEN THE Matching_Engine SHALL query active NeedSignals matching the item category and region.
2. IF no active NeedSignals match the item category and region, THEN THE Matching_Engine SHALL return a composite match score of 0 and no PEER_EXCHANGE recommendation.
3. THE Matching_Engine SHALL compute a composite match score using weighted factors: distance (weight 0.30), urgency (weight 0.25), size match (weight 0.25), and demand level (weight 0.20).
4. THE Matching_Engine SHALL normalize urgency from the NeedSignal 1-10 scale to a 0-100 score by multiplying the urgency value by 10 (e.g., urgency 7 yields urgency score 70).
5. WHEN a size match is exact, THEN THE Matching_Engine SHALL assign a size score of 100.
6. IF the NeedSignal has no size requirement, THEN THE Matching_Engine SHALL assign a size score of 60.
7. IF the NeedSignal has a size requirement that does not exactly match the item size, THEN THE Matching_Engine SHALL assign a size score of 20.
8. THE Matching_Engine SHALL compute distance score as max(0, 100 minus distanceKm multiplied by 10) using full fractional precision for the distance value, giving a score of 0 for distances of 10 km or more, and SHALL convert the final composite score to an integer only after all weighted factors are summed.
9. IF multiple NeedSignals match the item category and region, THEN THE Matching_Engine SHALL select the NeedSignal with the highest composite match score.
10. THE Matching_Engine SHALL recommend PEER_EXCHANGE only when the composite match score exceeds the threshold of 55.
11. THE Matching_Engine SHALL never expose individual identities; matching operates at the anonymous pool level only.
12. THE Matching_Engine SHALL produce match scores bounded between 0 and 100 inclusive.

### Requirement 6: Product Passport

**User Story:** As a consumer, I want a digital passport for each product tracking its full lifecycle, so that I can see ownership history, repairs, environmental impact, and provenance.

#### Acceptance Criteria

1. WHEN a product is first submitted, THEN THE Product_Passport SHALL be created with a unique serial hash, initial material notes derived from the product submission details, owner count of 1, and empty repair events and city trail arrays.
2. WHEN an item is graded, THEN THE Product_Passport SHALL append a grade snapshot to the grade history recording the date (ISO 8601), condition grade (A/B/C/D), condition score (0–100), and assigned route.
3. WHEN an item changes hands (resale, donation, or peer exchange), THEN THE Product_Passport SHALL increment the owner count by 1 and append the destination city (city-level only) to the city trail.
4. WHEN an item is refurbished, THEN THE Product_Passport SHALL append a repair event to the repair events array with the date (ISO 8601), repair type, description (max 500 characters), and post-repair condition grade (A/B/C/D).
5. THE Product_Passport SHALL calculate cumulative carbon saved by summing route-based values across all lifecycle events: PEER_EXCHANGE 4.5 kg, RESALE 4.2 kg, DONATE 3.8 kg, REFURBISH 3.1 kg, LIQUIDATE 1.2 kg. WHEN no qualifying lifecycle events have occurred, THE Product_Passport SHALL display zero carbon saved.
6. THE Product_Passport SHALL store location data at city-level granularity only, never at address or neighborhood precision for the city trail.
7. IF the repair events array reaches 50 entries or the city trail array reaches 100 entries, THEN THE Product_Passport SHALL reject further appends to the respective array and return an error indicating the passport history limit has been reached. These limits are independent; reaching the repair events limit SHALL NOT prevent city trail appends, and vice versa.

### Requirement 7: Green Credits

**User Story:** As a consumer, I want to earn green credits for circular economy actions, so that I am rewarded for sustainable behavior.

#### Acceptance Criteria

1. WHEN an item is routed, THEN THE Green_Credits_System SHALL award base credits according to route: PEER_EXCHANGE 45, DONATE 40, RESALE 30, REFURBISH 30, LIQUIDATE 10.
2. WHEN the user uploads 3 or more images that each achieve a QualityScore of 50 or above, THEN THE Green_Credits_System SHALL award a bonus of 5 credits categorized as bonus_quality.
3. WHEN the item is submitted within 7 days of the purchase date provided by the user, THEN THE Green_Credits_System SHALL award a bonus of 10 credits categorized as bonus_speed.
4. WHEN the user has completed 3 or more previously routed items with status beyond DRAFT, THEN THE Green_Credits_System SHALL award a bonus of 15 credits categorized as bonus_repeat.
5. WHEN a peer exchange occurs within 5km distance, THEN THE Green_Credits_System SHALL award a bonus of 20 credits categorized as bonus_local.
6. THE Green_Credits_System SHALL store each credit award as a separate record with points, reason, timestamp, and category (route, bonus_quality, bonus_speed, bonus_repeat, bonus_local).
7. THE Green_Credits_System SHALL award only positive integer credit amounts between 1 and 95 inclusive per individual award record.
8. THE Green_Credits_System SHALL update the user total credits balance atomically after each award, ensuring the balance reflects the sum of all award records for that user.
9. WHEN multiple bonus conditions are satisfied for a single submission, THEN THE Green_Credits_System SHALL award each applicable bonus as a separate record independently.
10. IF an administrator overrides an item route, THEN THE Green_Credits_System SHALL revoke the original route credit record and create a new route credit record matching the updated route.

### Requirement 8: Marketplace

**User Story:** As a consumer, I want to browse and purchase items routed to resale, so that I can buy quality second-hand products at fair prices.

#### Acceptance Criteria

1. THE Marketplace SHALL display only items with route RESALE and status LISTED.
2. WHEN a user searches or filters the marketplace, THE Marketplace SHALL support filtering by category (APPAREL, FOOTWEAR, ELECTRONICS, HOME, TOYS, BOOKS, OTHER), region, price range (minimum 0.01, maximum 999,999.99), and condition grade (A, B, C, or D).
3. WHEN no listings match the applied filters, THE Marketplace SHALL display an empty-state message indicating no results were found and retain the active filter selections.
4. WHEN displaying a marketplace listing, THE Marketplace SHALL show the product title, price, original price, condition grade, images, description, and a link to the associated Product Passport.
5. THE Marketplace SHALL support pagination with a default page size of 20, a configurable page size between 1 and 100, and return the total result count and a hasMore indicator in each response.
6. WHEN a buyer initiates a purchase, THE Marketplace SHALL atomically mark the listing status as SOLD, record the buyer identity, increment the Product Passport ownerCount, and append the buyer's region to the cityTrail. IF any step in the purchase transaction fails, THEN THE Marketplace SHALL roll back all changes and return the listing to its previous state.
7. IF a buyer initiates a purchase for a listing that is already SOLD, THEN THE Marketplace SHALL reject the purchase, return an error message indicating the item is no longer available, and leave all existing data unchanged. The purchase interface SHALL remain accessible for all listed items regardless of current status.

### Requirement 9: Seller Insights

**User Story:** As a seller, I want AI-powered insights about return patterns and listing improvements, so that I can reduce future returns.

#### Acceptance Criteria

1. WHEN a seller views insights, THE Seller_Insights SHALL display return pattern data for each listing that has at least 1 return, including the most frequently occurring return reason and total return count for that listing.
2. WHEN a seller requests a listing rewrite by providing a listing identifier, THE Seller_Insights SHALL send the listing title, description, and aggregated return reasons to Ollama and return a revised title (maximum 200 characters), a revised description (maximum 2000 characters), and a prevention tip (maximum 500 characters).
3. IF Ollama is unavailable or does not respond within 12 seconds during a rewrite request, THEN THE Seller_Insights SHALL return an error message indicating the AI service is temporarily unavailable and preserve the original listing unchanged.
4. WHEN a seller requests a listing rewrite, THE Seller_Insights SHALL identify the detected issue from the aggregated return reasons for that listing and include it in the rewrite response alongside the revised title, revised description, and prevention tip.
5. IF a seller views insights and has no listings with return history, THEN THE Seller_Insights SHALL display an empty state indicating no return data is available yet.

### Requirement 10: Admin Panel

**User Story:** As a platform operator, I want a dashboard showing circular economy metrics and system health, so that I can monitor platform performance and intervene when needed.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display aggregate metrics including total items processed, route distribution as percentages rounded to one decimal place, total carbon saved in kilograms, and total green credits awarded.
2. WHEN an administrator overrides a routing decision for an item with status GRADED or ROUTED, THEN THE Admin_Panel SHALL update the item route to the selected valid route (RESALE, REFURBISH, DONATE, LIQUIDATE, or PEER_EXCHANGE) and record the override action including the administrator identifier, previous route, new route, and timestamp.
3. IF an administrator attempts to override a routing decision for an item with status COMPLETED, THEN THE Admin_Panel SHALL reject the override and display an error message indicating the item has already been fulfilled.
4. THE Admin_Panel SHALL display system health status indicating each monitored service (AI service, database, and Ollama) as either available or unavailable. A service SHALL be marked as available if it returns a successful response to a connectivity check, regardless of response time. The 5-second target is a performance goal, not an availability threshold.
5. IF the Admin_Panel cannot reach the database to retrieve metrics, THEN THE Admin_Panel SHALL display a service-unavailable indicator instead of stale or partial data.

### Requirement 11: Graceful Degradation

**User Story:** As a platform operator, I want the system to continue functioning when AI services are partially unavailable, so that users are not blocked by infrastructure failures.

#### Acceptance Criteria

1. IF Ollama is unavailable (connection refused or no response within 12 seconds), THEN THE Grading_Engine SHALL produce a grading result using keyword-based text scoring (severe/mild term matching) while vision and YOLO analysis continue to function independently.
2. IF the YOLO model file is missing or unreadable, THEN THE Grading_Engine SHALL skip object detection and return a vision result containing only OpenCV-derived metrics (blur, brightness, edge density).
3. IF the FastAPI service does not respond within 10 seconds or returns a connection error, THEN THE system SHALL fall back to client-side text-only grading using the reloop.ts scoring logic and include an indicator in the response that results are from the client-side fallback. Client-side grading MAY also be used when FastAPI is available, at the system's discretion.
4. IF image decoding fails for a submitted image, THEN THE Grading_Engine SHALL set the vision result to is_clear=false with an error description, and compute the condition score using text signals only (excluding image-based scoring adjustments).
5. IF the database is unreachable, THEN THE system SHALL return HTTP 503 with a response body containing a message indicating the service is temporarily unavailable and suggesting the user retry after 30 seconds. Other infrastructure failures (Ollama or YOLO unavailability) SHALL NOT trigger HTTP 503 and are handled by the degradation rules in this requirement.
6. WHEN the system operates in any degraded mode (Ollama unavailable, YOLO missing, or FastAPI unreachable), THE system SHALL include a field in the grading response identifying which services were unavailable during that request.

### Requirement 12: Image Upload and Storage

**User Story:** As a consumer, I want to upload product images during submission, so that the AI can visually assess item condition.

#### Acceptance Criteria

1. WHEN a user uploads images, THE system SHALL store files to the local filesystem under the public/uploads directory with unique filenames to prevent collisions.
2. THE system SHALL accept JPEG, PNG, and WebP image formats for upload, with a maximum file size of 5 MB per image and a maximum of 6 images per return case.
3. IF an uploaded file is not one of the accepted image formats (JPEG, PNG, WebP) or exceeds the 5 MB size limit, THEN THE system SHALL reject the upload with an error message indicating the specific validation failure (unsupported format or file too large).
4. WHEN images are successfully stored, THE system SHALL record the stored file paths in the return case imageUrls array.
5. IF the file storage operation fails, THEN THE system SHALL reject the upload with an error message indicating that the file could not be saved and SHALL NOT add any path to the return case imageUrls array.
