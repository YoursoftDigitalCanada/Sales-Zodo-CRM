import { ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CardSurface,
  FadeIn,
  PrimaryAction,
  SectionShell,
  SitePageShell,
  T,
} from "@/components/site/site-system";
import { pricingFaqs, pricingTiers } from "@/data/siteContent";

const comparisonRows = [
  ["Roofing CRM", true, true, true],
  ["Address-based AI estimator", false, true, true],
  ["Action Center", true, true, true],
  ["Revenue alerts", false, true, true],
  ["Advanced team controls", false, false, true],
];

export default function PricingPage() {
  const navigate = useNavigate();

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
        <SectionShell className="relative max-w-4xl text-center">
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: T.primary }}>
              Pricing
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-none tracking-[-0.05em] md:text-6xl" style={{ color: T.textPrimary }}>
              Placeholder pricing that still feels premium, clear, and conversion-focused.
            </h1>
            <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: T.textSecondary }}>
              These pricing tiers are ready for presentation now and can be replaced with your exact commercial
              model later.
            </p>
          </FadeIn>
        </SectionShell>
      </section>

      <section className="py-10 md:py-16">
        <SectionShell className="grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier, index) => (
            <FadeIn key={tier.name} delay={index * 70}>
              <CardSurface bordered={tier.highlight} className="h-full p-8">
                <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: T.textMuted }}>
                  {tier.name}
                </p>
                <h2 className="mt-4 text-4xl font-bold tracking-tight" style={{ color: T.textPrimary }}>
                  {tier.price}
                </h2>
                <p className="mt-4 text-base leading-7" style={{ color: T.textSecondary }}>
                  {tier.description}
                </p>
                <div className="mt-6 grid gap-3">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm" style={{ color: T.textSecondary }}>
                      <Check className="h-4 w-4" style={{ color: T.primary }} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <PrimaryAction onClick={() => navigate("/contact?intent=trial")} className="mt-8 w-full px-6 py-3.5">
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </PrimaryAction>
              </CardSurface>
            </FadeIn>
          ))}
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
          <FadeIn>
            <div className="overflow-hidden rounded-[2rem] border bg-white" style={{ borderColor: T.border }}>
              <div
                className="grid grid-cols-4 border-b px-5 py-4 text-sm font-semibold md:px-8"
                style={{ borderColor: T.border, background: T.surfaceMuted, color: T.textSecondary }}
              >
                <div>Feature</div>
                <div>Starter</div>
                <div>Pro</div>
                <div>Enterprise</div>
              </div>
              {comparisonRows.map((row, index) => (
                <div
                  key={row[0]}
                  className="grid grid-cols-4 border-b px-5 py-4 text-sm md:px-8"
                  style={{
                    borderColor: index === comparisonRows.length - 1 ? "transparent" : T.border,
                    color: T.textSecondary,
                  }}
                >
                  <div className="font-medium" style={{ color: T.textPrimary }}>
                    {row[0]}
                  </div>
                  {row.slice(1).map((value, valueIndex) => (
                    <div key={`${row[0]}-${valueIndex}`} className="flex items-center">
                      {value ? <Check className="h-4 w-4" style={{ color: T.primary }} /> : <span style={{ color: T.textMuted }}>-</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </FadeIn>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {pricingFaqs.map((faq, index) => (
              <FadeIn key={faq.question} delay={index * 70}>
                <details
                  className="rounded-[1.5rem] border bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
                  style={{ borderColor: T.border }}
                >
                  <summary className="cursor-pointer list-none text-lg font-semibold" style={{ color: T.textPrimary }}>
                    {faq.question}
                  </summary>
                  <p className="mt-4 text-sm leading-7" style={{ color: T.textSecondary }}>
                    {faq.answer}
                  </p>
                </details>
              </FadeIn>
            ))}
          </div>
        </SectionShell>
      </section>
    </SitePageShell>
  );
}
