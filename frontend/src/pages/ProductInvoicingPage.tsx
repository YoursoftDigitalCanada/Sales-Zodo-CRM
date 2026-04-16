import { ProductFeatureTemplate } from "@/components/public-v2/ProductFeatureTemplate";
import { productFeatureMap } from "@/data/productFeatureContent";

export default function ProductInvoicingPage() {
  return <ProductFeatureTemplate content={productFeatureMap.invoicing} />;
}
