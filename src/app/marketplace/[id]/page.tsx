import { PageShell } from "@/components/PageShell";
import { ProductDetail } from "@/components/ProductDetail";

export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <PageShell>
      <ProductDetail id={params.id} />
    </PageShell>
  );
}
