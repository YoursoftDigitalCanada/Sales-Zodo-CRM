import { SolutionFeatureTemplate } from "@/components/public-v2/SolutionFeatureTemplate";
import { solutionFeatureMap } from "@/data/solutionFeatureContent";

export default function SolutionStormRestorationPage() {
  return <SolutionFeatureTemplate content={solutionFeatureMap["storm-restoration"]} />;
}
