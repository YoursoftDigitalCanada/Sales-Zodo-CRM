import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, MessageSquareText, PhoneCall, Radar } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/site/LeadCaptureForm";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { contactBullets, media } from "@/data/siteContent";

function SectionShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const intent = searchParams.get("intent") || "trial";
  const initialAddress = searchParams.get("address") || "";

  const isEstimate = intent === "estimate" || Boolean(initialAddress);
  const title = isEstimate ? "Request your address-based estimate workflow" : "Start your ZODO free-trial conversation";
  const description = isEstimate
    ? "Share the property and your team context so ZODO can continue the AI estimator story into a real sales conversation."
    : "Use this page to capture serious roofing interest, start a trial conversation, or move toward a tailored walkthrough.";
  const submitLabel = isEstimate ? "Request Estimate" : "Start Free Trial";

  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[6%] top-12 h-64 w-64 rounded-full bg-brand-cyan/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-20 h-72 w-72 rounded-full bg-brand-orange/[0.04] blur-3xl" />

        <SectionShell className="relative grid gap-10 lg:grid-cols-[0.96fr_1.04fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Contact</p>
              <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
                Turn site interest into real roofing pipeline movement.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                The page is now styled to match the new ZODO marketing system while still converting both trial requests and estimator-driven contact flows.
              </p>
            </div>

            <img
              src={media.contractorTablet}
              alt="Contractor with tablet"
              className="h-[340px] w-full rounded-[1.8rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
            />

            <div className="rounded-[2rem] border border-border/60 bg-white/96 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">
                What this conversation can cover
              </p>
              <div className="mt-5 grid gap-4">
                {contactBullets.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 ${index % 2 === 0 ? "text-brand-cyan" : "text-brand-orange"}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Trial planning",
                  description: "Map the fastest route into CRM adoption.",
                  icon: MessageSquareText,
                },
                {
                  title: "Estimator fit",
                  description: "Position address-based quoting in your sales motion.",
                  icon: Radar,
                },
                {
                  title: "Team rollout",
                  description: "Align office and field workflows from day one.",
                  icon: PhoneCall,
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-[1.6rem] border border-border/60 bg-white/96 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-cyan/10">
                    <item.icon className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/pricing">View Pricing</Link>
              </Button>
              <Button asChild size="xl" variant="accent">
                <Link to="/ai-estimator">
                  Explore AI Estimator
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <LeadCaptureForm
              title={title}
              description={description}
              submitLabel={submitLabel}
              requestType={isEstimate ? "estimate" : "trial"}
              initialAddress={initialAddress}
              showAddress={isEstimate}
              showRevenue
              messageLabel={isEstimate ? "Project details" : "What are you trying to improve?"}
              messagePlaceholder={
                isEstimate
                  ? "Share the address context, roof type, or how quickly you need the estimate workflow to move."
                  : "Tell us about your estimating, follow-up, invoicing, or overall roofing workflow goals."
              }
              testIdPrefix="contact-lead"
            />
          </motion.div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
