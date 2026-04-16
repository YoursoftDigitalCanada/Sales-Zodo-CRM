import { ComparePageTemplate } from "@/components/public-v2/ComparePageTemplate";
import { comparePages } from "@/data/compareContent";

export default function CompareJobProgressPage() {
  return <ComparePageTemplate content={comparePages.jobprogress} />;
}
