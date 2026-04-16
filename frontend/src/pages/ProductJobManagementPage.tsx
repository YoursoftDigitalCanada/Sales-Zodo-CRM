import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductJobManagementPage() {
  return <ProductFeatureTemplate content={productFeatureMap["job-management"]} />;
}
