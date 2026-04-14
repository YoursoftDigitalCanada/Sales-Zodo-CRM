import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LeadCaptureForm } from "@/components/site/LeadCaptureForm";
import {
  CardSurface,
  FadeIn,
  PrimaryAction,
  SecondaryAction,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { contactBullets, media } from "@/data/siteContent";

export default function ContactPage() {
  const navigate = useNavigate();
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
    <SitePageShell>
      <section className="relative overflow-hidden py-16 md:py-24" style={{ background: T.heroBg }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(8,145,178,0.12), transparent 24%), radial-gradient(circle at top right, rgba(34,211,238,0.10), transparent 22%)",
          }}
        />
        <SectionShell className="relative grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <FadeIn className="space-y-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
                Contact
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.05em] md:text-6xl" style={{ color: T.textPrimary }}>
                Turn site interest into real roofing pipeline movement.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
                This page is structured to convert trial interest and estimate requests without breaking the
                premium brand story.
              </p>
            </div>

            <img
              src={media.contractorTablet}
              alt="Contractor with tablet"
              className="h-[340px] w-full rounded-[1.8rem] object-cover shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
            />

            <CardSurface className="p-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                What this conversation can cover
              </p>
              <div className="mt-5 grid gap-4">
                {contactBullets.map((item, index) => (
                  <div key={item} className="flex items-start gap-3 text-sm" style={{ color: T.textSecondary }}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4" style={{ color: index % 2 === 0 ? T.primary : T.accent }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardSurface>

            <div className="flex flex-col gap-4 sm:flex-row">
              <SecondaryAction onClick={() => navigate("/pricing")} className="px-7 py-3.5">
                View Pricing
              </SecondaryAction>
              <PrimaryAction onClick={() => navigate("/ai-estimator")} className="px-7 py-3.5">
                Explore AI Estimator
                <ArrowRight className="h-4 w-4" />
              </PrimaryAction>
            </div>
          </FadeIn>

          <FadeIn delay={120}>
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
          </FadeIn>
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
