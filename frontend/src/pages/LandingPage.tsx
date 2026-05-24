import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import {
  AwardsMarqueeSection,
  CtaSection,
  FeaturesSection,
  HeroSection,
  LandingFooter,
  RoofEstimatorSection,
  SecuritySection,
  StatsSection,
  TabShowcase,
  TrustedBySection,
  type TabItem,
} from "@/components/public-v2/LandingSections";
import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";

import SalesLandingPage from "./SalesLandingPage";

const salesTabs: TabItem[] = [
  { label: "AI Estimation", variant: "estimation" },
  { label: "Proposals", variant: "proposals" },
  { label: "Follow-up", variant: "followup" },
];

const operationsTabs: TabItem[] = [
  { label: "Job Tracking", variant: "jobtracking" },
  { label: "Crews", variant: "team" },
  { label: "Invoicing", variant: "invoicing" },
];

export default function LandingPage() {
  if (!isRoofingPublicMarketingEnabled) {
    return <SalesLandingPage />;
  }

  return (
    <PublicV2Shell>
      <MarketingNavbar />
      <HeroSection />
      <TrustedBySection />
      <RoofEstimatorSection />
      <TabShowcase badge="Sales & Close Faster" badgeIcon="dollar" heading="From estimate to signed proposal in one clean flow" tabs={salesTabs} />
      <TabShowcase badge="Run Every Job Smoothly" badgeIcon="settings" heading="Manage production, crews, and collections without duct-taped tools" tabs={operationsTabs} />
      <FeaturesSection />
      <AwardsMarqueeSection />
      <StatsSection />
      <SecuritySection />
      <CtaSection />
      <LandingFooter />
    </PublicV2Shell>
  );
}
