import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/GradeBadge";
import type { ListingDTO } from "@/types/dto";

export function ListingCard({ listing }: { listing: ListingDTO }) {
  const grade = listing.healthCard.verifiedCondition;
  return (
    <Link href={`/marketplace/${listing.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-cardHover">
        <div className="flex h-40 items-center justify-center rounded-t-card bg-mist text-5xl">
          {listing.item?.category === "Footwear"
            ? "👟"
            : listing.item?.category === "Electronics"
              ? "🎧"
              : listing.item?.category === "Apparel"
                ? "🧥"
                : "📦"}
        </div>
        <CardBody className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge tone="success">Certified Pre-Owned</Badge>
            <GradeBadge grade={grade} size="sm" />
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{listing.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-ink">
              ₹{listing.price.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-storm">
              {Math.round(listing.pricePct * 100)}% of original
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
