import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductAiRoofEstimatorPage() {
  return <ProductFeatureTemplate content={productFeatureMap["ai-roof-estimator"]} />;
}
