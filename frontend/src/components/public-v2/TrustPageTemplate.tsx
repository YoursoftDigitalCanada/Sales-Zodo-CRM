import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { cn } from "@/lib/utils";
import type { TrustPageContent } from "@/data/trustContent";

const trustNav = [
  { label: "Privacy Policy", to: "/privacy-policy", slug: "privacy-policy" as const },
  { label: "Terms of Service", to: "/terms-of-service", slug: "terms-of-service" as const },
  { label: "Security", to: "/security", slug: "security" as const },
];

function SectionShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function toneClasses(color: TrustPageContent["color"]) {
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

export function TrustPageTemplate({ content }: { content: TrustPageContent }) {
  const tone = toneClasses(content.color);
  const Icon = content.icon;

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
              {trustNav.map((item) => (
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
            <p className="mt-5 text-sm font-medium text-muted-foreground">{content.updatedLabel}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="rounded-[2rem] bg-section-dark p-5 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-7"
          >
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <Icon className={cn("h-6 w-6", tone.accent)} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">{content.title}</h2>
                <p className="mt-3 text-sm leading-7 text-section-dark-foreground/72">{content.summary}</p>
              </div>

              <div className="rounded-[1.6rem] bg-white p-5 text-foreground">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">At a glance</p>
                <div className="mt-5 space-y-3">
                  {content.highlights.map((item) => (
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
            <p className={cn("text-xs font-bold uppercase tracking-[0.24em]", tone.accent)}>Details</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Clear, readable information instead of a hard-to-scan legal wall.
            </h2>
          </div>

          <div className="mt-12 grid gap-5">
            {content.sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="rounded-[1.9rem] border border-border/60 bg-white p-7 shadow-[0_18px_46px_rgba(15,23,42,0.06)] md:p-8"
              >
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h3>
                <p className="mt-4 text-base leading-8 text-muted-foreground">{section.body}</p>
                {section.bullets?.length ? (
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {section.bullets.map((item) => (
                      <div key={item} className={cn("rounded-2xl border px-4 py-3 text-sm", tone.panel)}>
                        {item}
                      </div>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            ))}
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] bg-section-dark p-8 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">Need help?</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Questions about trust, platform use, or data handling?
            </h2>
            <p className="mt-5 text-base leading-8 text-section-dark-foreground/72">
              If you need clarification around these materials, the fastest path is to contact the ZODO team directly so we can route your question to the right person.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10">
            <p className={cn("text-xs font-bold uppercase tracking-[0.24em]", tone.accent)}>Contact</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Reach the team if you need product, privacy, or security clarification.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              These pages are designed to be clear and readable. If your team needs more specific answers, we can help through the contact and support channels.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/contact">
                  Contact us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/signup">Start free trial</Link>
              </Button>
            </div>
          </div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
