import { TrustPageTemplate } from "@/components/public-v2/TrustPageTemplate";
import { trustPages } from "@/data/trustContent";

export default function SecurityInfoPage() {
  return <TrustPageTemplate content={trustPages.security} />;
}
