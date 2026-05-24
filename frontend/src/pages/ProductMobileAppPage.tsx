import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";
import { salesProductFeatureMap } from "@/data/salesProductFeatureContent";
import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";

export default function ProductMobileAppPage() {
  return <ProductFeatureTemplate content={isRoofingPublicMarketingEnabled ? productFeatureMap["mobile-app"] : salesProductFeatureMap["mobile-app"]} />;
}
