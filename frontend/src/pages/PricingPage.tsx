import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { pricingFaqs, pricingTiers } from "@/data/siteContent";

const comparisonRows = [
  ["Roofing CRM", true, true, true],
  ["Address-based AI estimator", false, true, true],
  ["Action Center", true, true, true],
  ["Revenue alerts", false, true, true],
  ["Advanced team controls", false, false, true],
];

function SectionShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export default function PricingPage() {
  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[6%] top-14 h-64 w-64 rounded-full bg-brand-cyan/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[8%] top-10 h-72 w-72 rounded-full bg-brand-orange/[0.04] blur-3xl" />

        <SectionShell className="relative max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              <Sparkles className="h-4 w-4" />
              Pricing
            </div>
            <h1 className="mt-5 text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
              Premium pricing presentation that now matches the new ZODO public theme.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              Clear plan separation, stronger CRM positioning, and a conversion path that feels consistent with the rest of the new `crm.zodo.ca` marketing experience.
            </p>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-10 md:py-16">
        <SectionShell>
          <div className="rounded-[2.2rem] bg-section-dark p-5 shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-7">
            <div className="grid gap-6 lg:grid-cols-3">
              {pricingTiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className={`rounded-[2rem] border p-8 shadow-[0_18px_40px_rgba(0,0,0,0.08)] ${
                    tier.highlight
                      ? "border-brand-cyan/30 bg-white"
                      : "border-white/10 bg-white/95"
                  }`}
                >
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">{tier.name}</p>
                  <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground">{tier.price}</h2>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">{tier.description}</p>
                  <div className="mt-6 grid gap-3">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-brand-cyan" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="mt-8 w-full" size="xl" variant={tier.highlight ? "accent" : "heroOutline"}>
                    <Link to={tier.cta === "Talk to Sales" ? "/contact" : "/contact?intent=trial"}>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
          >
            <div className="grid grid-cols-4 border-b border-border bg-muted/40 px-5 py-4 text-sm font-semibold text-muted-foreground md:px-8">
              <div>Feature</div>
              <div>Starter</div>
              <div>Pro</div>
              <div>Enterprise</div>
            </div>
            {comparisonRows.map((row, index) => (
              <div
                key={row[0]}
                className="grid grid-cols-4 border-b border-border px-5 py-4 text-sm text-muted-foreground md:px-8"
                style={{ borderBottomWidth: index === comparisonRows.length - 1 ? "0px" : undefined }}
              >
                <div className="font-medium text-foreground">{row[0]}</div>
                {row.slice(1).map((value, valueIndex) => (
                  <div key={`${row[0]}-${valueIndex}`} className="flex items-center">
                    {value ? <Check className="h-4 w-4 text-brand-cyan" /> : <span className="text-muted-foreground">-</span>}
                  </div>
                ))}
              </div>
            ))}
          </motion.div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {pricingFaqs.map((faq, index) => (
              <motion.details
                key={faq.question}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-[1.7rem] border border-border/60 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
              >
                <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">
                  {faq.question}
                </summary>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </motion.details>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell className="max-w-5xl">
          <div className="rounded-[2rem] bg-section-dark p-8 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-section-dark-foreground/80">
                  <ShieldCheck className="h-4 w-4 text-brand-green" />
                  Commercial clarity
                </div>
                <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">
                  Need the right plan mapped to your roofing workflow?
                </h2>
                <p className="mt-4 text-base leading-8 text-section-dark-foreground/72">
                  We can help position the estimator, CRM, invoicing, and operations modules against the way your team actually sells and delivers jobs.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row lg:justify-end">
                <Button asChild size="xl" variant="accent">
                  <Link to="/contact?intent=trial">Start Free Trial</Link>
                </Button>
                <Button asChild size="xl" variant="heroOutline">
                  <Link to="/contact">Talk to Sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
