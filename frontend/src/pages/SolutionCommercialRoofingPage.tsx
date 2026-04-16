import { SolutionFeatureTemplate } from "@/components/public-v2/SolutionFeatureTemplate";
import { solutionFeatureMap } from "@/data/solutionFeatureContent";

export default function SolutionCommercialRoofingPage() {
  return <SolutionFeatureTemplate content={solutionFeatureMap["commercial-roofing"]} />;
}
