import { TrustPageTemplate } from "@/components/public-v2/TrustPageTemplate";
import { trustPages } from "@/data/trustContent";

export default function PrivacyPolicyPage() {
  return <TrustPageTemplate content={trustPages["privacy-policy"]} />;
}
