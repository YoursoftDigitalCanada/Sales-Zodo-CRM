import { ComparePageTemplate } from "@/components/public-v2/ComparePageTemplate";
import { comparePages } from "@/data/compareContent";

export default function CompareLeapPage() {
  return <ComparePageTemplate content={comparePages.leap} />;
}
