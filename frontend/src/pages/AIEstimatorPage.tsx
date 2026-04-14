import { useEffect, useState } from "react";
import { BrainCircuit, Clock3, MapPinned, Radar } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { HeroAddressBar } from "@/components/site/HeroAddressBar";
import { LeadCaptureForm } from "@/components/site/LeadCaptureForm";
import {
  CardSurface,
  FadeIn,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { estimatorSteps, media } from "@/data/siteContent";

const techCards = [
  {
    title: "Address-first intake",
    description: "The workflow begins at the property location so the estimate story feels fast and effortless.",
    icon: MapPinned,
  },
  {
    title: "Roof data analysis",
    description: "ZODO frames the AI layer as analyzing relevant roof and property context needed for estimating workflow.",
    icon: BrainCircuit,
  },
  {
    title: "Sales acceleration",
    description: "Faster estimate creation helps reps respond while homeowner interest is still active.",
    icon: Radar,
  },
];

export default function AIEstimatorPage() {
  const [searchParams] = useSearchParams();
  const addressFromUrl = searchParams.get("address") || "";
  const [previewAddress, setPreviewAddress] = useState(addressFromUrl);
  const [monthlyLeads, setMonthlyLeads] = useState(35);

  useEffect(() => {
    setPreviewAddress(addressFromUrl);
  }, [addressFromUrl]);

  const hoursSaved = Math.round(monthlyLeads * 0.8);

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
        <SectionShell className="relative grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
          <FadeIn className="space-y-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                AI Estimator
              </p>
              <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.05em] md:text-6xl" style={{ color: T.textPrimary }}>
                Enter the address. Let ZODO turn it into an estimating workflow.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
                The estimator story is now centered on property address input - a cleaner, faster experience
                for roofing teams who need momentum at the top of the pipeline.
              </p>
            </div>

            <HeroAddressBar
              defaultValue={previewAddress}
              onSubmit={setPreviewAddress}
              buttonLabel="Generate Estimate"
              testIdPrefix="ai-estimator-address"
              accent="blue"
            />

            {previewAddress ? (
              <CardSurface className="p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                    Preview workflow
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                    {previewAddress}
                  </h2>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl px-4 py-4 text-sm" style={{ background: T.accentSoft, color: T.primaryDark }}>
                    Roof profile identified
                  </div>
                  <div className="rounded-2xl px-4 py-4 text-sm" style={{ background: T.surfaceMuted, color: T.textSecondary }}>
                    Estimate workflow prepared
                  </div>
                  <div className="rounded-2xl px-4 py-4 text-sm" style={{ background: "rgba(8,145,178,0.10)", color: T.primaryDark }}>
                    Ready for sales follow-up
                  </div>
                </div>
              </CardSurface>
            ) : null}
          </FadeIn>

          <FadeIn delay={120}>
            <CardSurface className="p-5 md:p-7">
              <img
                src={media.estimatorRoof}
                alt="Aerial roof view"
                className="h-[420px] w-full rounded-[1.8rem] object-cover md:h-[520px]"
              />
            </CardSurface>
          </FadeIn>
        </SectionShell>
      </section>

      <section className="py-20 md:py-28">
        <SectionShell>
          <div className="grid gap-6 md:grid-cols-3">
            {estimatorSteps.map((item, index) => (
              <FadeIn key={item.title} delay={index * 70}>
                <CardSurface className="h-full p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.accent }}>
                    Step {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-6 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                    {item.title}
                  </h2>
                  <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                    {item.description}
                  </p>
                </CardSurface>
              </FadeIn>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="relative py-20 md:py-28" style={{ background: T.surfaceTint }}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #94A3B8 1px, transparent 1px), linear-gradient(#94A3B8 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <SectionShell className="relative">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
            <div className="grid gap-6">
              {techCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <FadeIn key={item.title} delay={index * 70}>
                    <CardSurface className="h-full p-8">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                        style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-6 text-2xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                        {item.title}
                      </h2>
                      <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                        {item.description}
                      </p>
                    </CardSurface>
                  </FadeIn>
                );
              })}
            </div>

            <FadeIn delay={120}>
              <CardSurface className="p-8">
                <div className="flex items-center gap-3" style={{ color: T.accent }}>
                  <Clock3 className="h-5 w-5" />
                  <p className="text-xs font-bold uppercase tracking-[0.24em]">Time-saved story</p>
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight" style={{ color: T.textPrimary }}>
                  See how much estimating time your team could get back.
                </h2>
                <div className="mt-8">
                  <label className="text-sm" style={{ color: T.textSecondary }} htmlFor="monthly-leads">
                    Monthly estimate opportunities:{" "}
                    <span className="font-semibold" style={{ color: T.textPrimary }}>
                      {monthlyLeads}
                    </span>
                  </label>
                  <input
                    id="monthly-leads"
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={monthlyLeads}
                    onChange={(event) => setMonthlyLeads(Number(event.target.value))}
                    className="mt-4 w-full accent-cyan-600"
                  />
                </div>
                <div className="mt-8 rounded-[1.5rem] px-5 py-5" style={{ background: T.accentSoft }}>
                  <p className="text-sm uppercase tracking-[0.22em]" style={{ color: T.primaryDark }}>
                    Estimated hours saved monthly
                  </p>
                  <p className="mt-3 text-4xl font-bold tracking-tight" style={{ color: T.textPrimary }}>
                    {hoursSaved} hrs
                  </p>
                </div>
              </CardSurface>
            </FadeIn>
          </div>
        </SectionShell>
      </section>

      <section className="py-20 md:py-28">
        <SectionShell className="max-w-5xl">
          <LeadCaptureForm
            title="Request an address-based estimate walkthrough"
            description="Use this form to turn estimator interest into a real sales conversation. The property address is included so the team can continue the workflow."
            submitLabel="Request Estimate"
            requestType="estimate"
            initialAddress={previewAddress}
            showAddress
            showRevenue={false}
            messageLabel="Project notes"
            messagePlaceholder="Share the property, job type, or what you want the estimate flow to solve."
            testIdPrefix="estimate-request"
          />
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
