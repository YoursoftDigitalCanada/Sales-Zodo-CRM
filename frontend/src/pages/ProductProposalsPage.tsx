import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductProposalsPage() {
  return <ProductFeatureTemplate content={productFeatureMap.proposals} />;
}
