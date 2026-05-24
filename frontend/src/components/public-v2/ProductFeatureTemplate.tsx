import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, Layers3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { cn } from "@/lib/utils";
import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";
import type { ProductFeatureContent } from "@/data/productFeatureContent";
import { productFeatureNav } from "@/data/productFeatureContent";
import type { SalesProductFeatureContent } from "@/data/salesProductFeatureContent";
import { salesProductFeatureNav } from "@/data/salesProductFeatureContent";

function SectionShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function toneClasses(color: ProductFeatureContent["color"]) {
  if (color === "green") {
    return {
      accent: "text-brand-green",
      badge: "border-brand-green/20 bg-brand-green/10 text-brand-green",
      panel: "border-brand-green/15 bg-brand-green/[0.06]",
      glow: "bg-brand-green/[0.05]",
    };
  }
  if (color === "orange") {
    return {
      accent: "text-brand-orange",
      badge: "border-brand-orange/20 bg-brand-orange/10 text-brand-orange",
      panel: "border-brand-orange/15 bg-brand-orange/[0.06]",
      glow: "bg-brand-orange/[0.05]",
    };
  }
  return {
    accent: "text-brand-cyan",
    badge: "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
    panel: "border-brand-cyan/15 bg-brand-cyan/[0.06]",
    glow: "bg-brand-cyan/[0.05]",
  };
}

type VisibleProductFeatureContent = ProductFeatureContent | SalesProductFeatureContent;

export function ProductFeatureTemplate({ content }: { content: VisibleProductFeatureContent }) {
  const tone = toneClasses(content.color);
  const Icon = content.icon;
  const visibleFeatureNav = isRoofingPublicMarketingEnabled ? productFeatureNav : salesProductFeatureNav;

  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className={cn("pointer-events-none absolute left-[8%] top-16 h-72 w-72 rounded-full blur-3xl", tone.glow)} />
        <div className="pointer-events-none absolute right-[10%] top-20 h-80 w-80 rounded-full bg-brand-orange/[0.04] blur-3xl" />

        <SectionShell className="relative grid items-start gap-10 lg:grid-cols-[1fr_0.96fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em]", tone.badge)}>
              <Sparkles className="h-4 w-4" />
              {content.eyebrow}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {visibleFeatureNav.map((item) => (
                <Link
                  key={item.slug}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                    content.slug === item.slug
                      ? "border-border bg-white text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                      : "border-border bg-white/70 text-muted-foreground hover:border-brand-cyan/35 hover:text-foreground",
                  )}
                >
                  {item.label}
                  {content.slug === item.slug ? <ChevronRight className={cn("h-4 w-4", tone.accent)} /> : null}
                </Link>
              ))}
            </div>

            <h1 className="mt-8 text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
              {content.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              {content.description}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/signup">
                  {content.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/contact">{content.secondaryCta}</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="rounded-[2rem] bg-section-dark p-5 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-7"
          >
            <div className="grid gap-4 md:grid-cols-[0.88fr_1.12fr]">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className={cn("h-6 w-6", tone.accent)} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">{content.shortTitle}</h2>
                <p className="mt-3 text-sm leading-7 text-section-dark-foreground/72">{content.heroSummary}</p>
              </div>

              <div className="rounded-[1.6rem] bg-white p-5 text-foreground">
                <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Layers3 className="h-3.5 w-3.5" />
                  Best for
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{content.bestFor}</p>
                <div className="mt-5 space-y-3">
                  {content.featureBullets.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className={cn("mt-1 h-4 w-4 flex-shrink-0", tone.accent)} />
                      <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell>
          <div className="max-w-3xl">
            <p className={cn("text-xs font-bold uppercase tracking-[0.24em]", tone.accent)}>How it works inside ZODO</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              This feature is designed to work as part of the same connected sales operating system.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {content.sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-[1.9rem] border border-border/60 bg-white p-7 shadow-[0_18px_46px_rgba(15,23,42,0.06)]"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", tone.panel)}>
                  <span className={cn("text-lg font-bold", tone.accent)}>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{section.title}</h3>
                <p className="mt-4 text-base leading-8 text-muted-foreground">{section.description}</p>
                <div className="mt-6 space-y-3">
                  {section.points.map((point) => (
                    <div key={point} className="rounded-2xl bg-muted/45 px-4 py-3 text-sm text-foreground">
                      {point}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className="rounded-[2rem] bg-section-dark p-8 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10"
          >
            <div className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] bg-white/10 text-section-dark-foreground/80")}>
              <Sparkles className={cn("h-4 w-4", tone.accent)} />
              Outcomes
            </div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">
              What teams get when this module lives inside the same stack.
            </h2>
            <div className="mt-6 space-y-3">
              {content.outcomes.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className={cn("mt-1 h-4 w-4 flex-shrink-0", tone.accent)} />
                  <p className="text-base leading-8 text-section-dark-foreground/72">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10"
          >
            <p className={cn("text-xs font-bold uppercase tracking-[0.24em]", tone.accent)}>Why it matters</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              ZODO is strongest when these features work together, not in isolation.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              The product story is not just about one feature page. It is about keeping sales, operations, communication, documents, and finance inside one connected workspace.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/product">
                  View all product pages
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/contact">Book a demo</Link>
              </Button>
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
