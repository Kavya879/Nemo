import { PageShell } from "@/components/PageShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import type { Grade } from "@/types";

/** Component gallery — visual verification that every shared component renders. */
export default function GalleryPage() {
  const grades: Grade[] = ["A", "B", "C", "D"];
  return (
    <PageShell>
      <h1 className="mb-6 text-2xl font-bold">Component Gallery</h1>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-storm">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-storm">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>neutral</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="warn">warn</Badge>
          <Badge tone="danger">danger</Badge>
          <Badge tone="info">info</Badge>
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-storm">Grade badges</h2>
        <div className="flex flex-wrap items-center gap-4">
          {grades.map((g) => (
            <GradeBadge key={g} grade={g} showLabel />
          ))}
        </div>
      </section>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-storm">Spinner</h2>
        <Spinner />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>Card header</CardHeader>
          <CardBody>Card body content goes here.</CardBody>
        </Card>
        <ProductHealthCard
          card={{
            verifiedCondition: "A",
            confidence: 0.94,
            flaws: [{ type: "sole-wear", severity: "minor", location: "outsole" }],
            history: ["Returned: size too small", "AI-graded A (94%)", "Amazon Nemo certified"],
            warranty: "30-day Amazon Nemo guarantee",
          }}
        />
      </section>
    </PageShell>
  );
}
