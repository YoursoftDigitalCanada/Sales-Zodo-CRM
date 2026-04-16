import { TrustPageTemplate } from "@/components/public-v2/TrustPageTemplate";
import { trustPages } from "@/data/trustContent";

export default function TermsOfServicePage() {
  return <TrustPageTemplate content={trustPages["terms-of-service"]} />;
}
