import { reviewRepository } from "@/repositories/review.repository";
import { CreateReviewSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ValidationError } from "@/lib/errors";
import { ok, fail } from "@/lib/api-response";
import type { ReviewDTO } from "@/types/dto";

export const dynamic = "force-dynamic";

const toDTO = (r: {
  id: string;
  authorName: string | null;
  rating: number;
  title: string | null;
  body: string;
  sentiment: number | null;
  createdAt: Date;
}): ReviewDTO => ({
  id: r.id,
  authorName: r.authorName,
  rating: r.rating,
  title: r.title,
  body: r.body,
  sentiment: r.sentiment,
  createdAt: r.createdAt.toISOString(),
});

/** GET /api/reviews?itemId=… — reviews + aggregate for an item. */
export async function GET(request: Request) {
  try {
    const itemId = new URL(request.url).searchParams.get("itemId");
    if (!itemId) throw new ValidationError("itemId is required.");
    const [reviews, aggregate] = await Promise.all([
      reviewRepository.listForItem(itemId),
      reviewRepository.aggregateForItem(itemId),
    ]);
    return ok({ reviews: reviews.map(toDTO), aggregate });
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/reviews — add a review (sentiment is scored + cached on write). */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, CreateReviewSchema);
    const review = await reviewRepository.create({
      item: { connect: { id: body.itemId } },
      userId: body.userId ?? "demo-user",
      authorName: body.authorName ?? null,
      rating: body.rating,
      title: body.title ?? null,
      body: body.body,
    });
    return ok(toDTO(review), 201);
  } catch (error) {
    return fail(error);
  }
}
