import { BrandNewDetail } from "@/components/BrandNewDetail";

export default function BrandNewProductPage({ params }: { params: { id: string } }) {
  return <BrandNewDetail id={params.id} />;
}
