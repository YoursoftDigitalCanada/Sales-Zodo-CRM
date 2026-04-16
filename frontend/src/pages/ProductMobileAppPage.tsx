import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductMobileAppPage() {
  return <ProductFeatureTemplate content={productFeatureMap["mobile-app"]} />;
}
