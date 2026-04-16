import { SolutionFeatureTemplate } from "@/components/public-v2/SolutionFeatureTemplate";
import { solutionFeatureMap } from "@/data/solutionFeatureContent";

export default function SolutionMultiLocationPage() {
  return <SolutionFeatureTemplate content={solutionFeatureMap["multi-location"]} />;
}
