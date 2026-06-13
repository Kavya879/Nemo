import { ProductDetail } from "@/components/ProductDetail";

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetail id={params.id} />;
}
