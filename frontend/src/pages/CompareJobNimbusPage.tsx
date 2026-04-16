import { ComparePageTemplate } from "@/components/public-v2/ComparePageTemplate";
import { comparePages } from "@/data/compareContent";

export default function CompareJobNimbusPage() {
  return <ComparePageTemplate content={comparePages.jobnimbus} />;
}
