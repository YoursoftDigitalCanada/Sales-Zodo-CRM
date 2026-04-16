import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductCustomerCrmPage() {
  return <ProductFeatureTemplate content={productFeatureMap["customer-crm"]} />;
}
