import { SolutionFeatureTemplate } from "@/components/public-v2/SolutionFeatureTemplate";
import { solutionFeatureMap } from "@/data/solutionFeatureContent";

export default function SolutionResidentialRoofersPage() {
  return <SolutionFeatureTemplate content={solutionFeatureMap["residential-roofers"]} />;
}
