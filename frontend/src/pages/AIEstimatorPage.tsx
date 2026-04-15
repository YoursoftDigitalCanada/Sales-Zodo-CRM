import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Clock3,
  MapPin,
  Radar,
  ArrowRight,
  Calculator,
  Check,
  Sparkles,
} from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadCaptureForm } from "@/components/site/LeadCaptureForm";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { estimatorSteps, media } from "@/data/siteContent";

const techCards = [
  {
    title: "Address-first intake",
    description: "The workflow begins at the property location so the estimate story feels fast and effortless for reps and homeowners.",
    icon: MapPin,
    tone: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
  },
  {
    title: "Roof data analysis",
    description: "ZODO frames the AI layer around roof and property context that matters to the estimating workflow.",
    icon: BrainCircuit,
    tone: "text-brand-orange",
    bg: "bg-brand-orange/10",
  },
  {
    title: "Sales acceleration",
    description: "Faster estimate creation helps roofing teams respond while homeowner interest is still active.",
    icon: Radar,
    tone: "text-brand-green",
    bg: "bg-brand-green/10",
  },
];

const estimateCards = [
  { label: "Roof Area", value: "2,860 sq ft" },
  { label: "Pitch", value: "7/12" },
  { label: "Type", value: "Gable" },
];

function SectionShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export default function AIEstimatorPage() {
  const [searchParams] = useSearchParams();
  const addressFromUrl = searchParams.get("address") || "";
  const [addressInput, setAddressInput] = useState(addressFromUrl);
  const [previewAddress, setPreviewAddress] = useState(addressFromUrl);
  const [monthlyLeads, setMonthlyLeads] = useState(35);

  useEffect(() => {
    setAddressInput(addressFromUrl);
    setPreviewAddress(addressFromUrl);
  }, [addressFromUrl]);

  const hoursSaved = Math.round(monthlyLeads * 0.8);
  const addressSummary = useMemo(
    () => previewAddress || "2488 Yonge Street, Toronto, ON",
    [previewAddress],
  );

  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[8%] top-16 h-64 w-64 rounded-full bg-brand-cyan/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-12 h-72 w-72 rounded-full bg-brand-orange/[0.04] blur-3xl" />

        <SectionShell className="relative grid items-center gap-14 lg:grid-cols-[1fr_1.02fr]">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              <Sparkles className="h-4 w-4" />
              AI Estimator
            </div>

            <div>
              <h1 className="max-w-4xl text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
                Enter the address. Let ZODO turn it into an estimating workflow.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                The estimator story is centered on property address intake: faster quoting, cleaner handoff, and a more premium first interaction for roofing teams.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = addressInput.trim();
                if (!trimmed) return;
                setPreviewAddress(trimmed);
              }}
              className="flex flex-col gap-3 rounded-[1.8rem] border border-border/70 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center"
            >
              <div className="flex items-center gap-3 px-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-brand-cyan" />
                <span className="hidden text-xs font-bold uppercase tracking-[0.22em] md:inline">Property address</span>
              </div>
              <Input
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                placeholder="Enter property address"
                className="h-12 flex-1 rounded-full border-transparent bg-muted/60 px-5 text-sm"
              />
              <Button type="submit" size="xl" variant="accent">
                Generate Estimate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Roof profile identified",
                "Estimate workflow prepared",
                "Ready for sales follow-up",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-4 text-sm ${
                    index === 0
                      ? "bg-brand-cyan/10 text-brand-cyan"
                      : index === 1
                        ? "bg-muted/70 text-muted-foreground"
                        : "bg-brand-green/10 text-brand-green"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="rounded-[2rem] bg-section-dark p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-7"
          >
            <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="overflow-hidden rounded-[1.6rem] border border-white/10">
                <img
                  src={media.estimatorRoof}
                  alt="Aerial roof view"
                  className="h-[320px] w-full object-cover md:h-[420px]"
                />
              </div>
              <div className="flex flex-col justify-between rounded-[1.6rem] bg-white/6 p-5 backdrop-blur">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-section-dark-foreground/80">
                    <Calculator className="h-3.5 w-3.5" />
                    Preview workflow
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{addressSummary}</h2>
                  <p className="mt-2 text-sm leading-7 text-section-dark-foreground/70">
                    ZODO turns this property into a live estimate draft with scope, pricing direction, and next-step sales movement.
                  </p>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    {estimateCards.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[1.5rem] bg-white px-5 py-5">
                    <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                      <span className="text-muted-foreground">Materials</span>
                      <span className="font-medium text-foreground">$8,900 CAD</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border py-3 text-sm">
                      <span className="text-muted-foreground">Labor</span>
                      <span className="font-medium text-foreground">$6,250 CAD</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-base font-semibold">
                      <span className="text-foreground">Projected Total</span>
                      <span className="text-brand-cyan">$15,150 CAD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell>
          <div className="mb-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Workflow</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              The address becomes the start of a faster quoting motion.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {estimatorSteps.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-[2rem] border border-border/60 bg-white/95 p-8 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{item.title}</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell className="grid gap-6 lg:grid-cols-[1fr_0.94fr]">
          <div className="grid gap-6">
            {techCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="rounded-[2rem] border border-border/60 bg-white/96 p-8 shadow-[0_16px_45px_rgba(15,23,42,0.06)]"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}>
                    <Icon className={`h-5 w-5 ${item.tone}`} />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{item.title}</h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">{item.description}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="rounded-[2rem] bg-section-dark p-8 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          >
            <div className="flex items-center gap-3 text-brand-cyan">
              <Clock3 className="h-5 w-5" />
              <p className="text-xs font-bold uppercase tracking-[0.24em]">Time-saved story</p>
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white">
              See how much estimating time your team could get back.
            </h2>
            <div className="mt-8">
              <label className="text-sm text-section-dark-foreground/72" htmlFor="monthly-leads">
                Monthly estimate opportunities:{" "}
                <span className="font-semibold text-white">{monthlyLeads}</span>
              </label>
              <input
                id="monthly-leads"
                type="range"
                min="10"
                max="120"
                step="5"
                value={monthlyLeads}
                onChange={(event) => setMonthlyLeads(Number(event.target.value))}
                className="mt-4 w-full accent-cyan-500"
              />
            </div>
            <div className="mt-8 rounded-[1.5rem] bg-white px-5 py-5">
              <p className="text-sm uppercase tracking-[0.22em] text-brand-cyan">
                Estimated hours saved monthly
              </p>
              <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">{hoursSaved} hrs</p>
            </div>
            <div className="mt-8 grid gap-3">
              {[
                "Address-to-estimate workflow",
                "Less admin between lead and quote",
                "Faster handoff into sales follow-up",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-section-dark-foreground/78">
                  <Check className="h-4 w-4 text-brand-green" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
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

      <LandingFooter />
    </PublicV2Shell>
  );
}
