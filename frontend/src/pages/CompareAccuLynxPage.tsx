import { ComparePageTemplate } from "@/components/public-v2/ComparePageTemplate";
import { comparePages } from "@/data/compareContent";

export default function CompareAccuLynxPage() {
  return <ComparePageTemplate content={comparePages.acculynx} />;
}
