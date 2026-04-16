import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { MarketingNavbar } from "@/components/public-v2/MarketingNavbar";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";
import { LandingFooter } from "@/components/public-v2/LandingSections";
import { solutionOverviewCards } from "@/data/solutionFeatureContent";

function SectionShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export default function SolutionsPage() {
  return (
    <PublicV2Shell>
      <MarketingNavbar />

      <section className="relative overflow-hidden bg-hero-bg py-16 md:py-24">
        <div className="pointer-events-none absolute left-[8%] top-14 h-72 w-72 rounded-full bg-brand-cyan/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute right-[10%] top-20 h-80 w-80 rounded-full bg-brand-green/[0.04] blur-3xl" />

        <SectionShell className="relative grid items-start gap-10 lg:grid-cols-[0.98fr_1.02fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
              Solutions
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-none tracking-[-0.05em] text-foreground md:text-6xl">
              Separate solution pages for the roofing businesses ZODO is built to serve.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              Explore how the same ZODO platform adapts for residential roofers, commercial roofing, storm restoration teams, and multi-location operators without losing one connected workflow.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/signup">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/contact">Book a demo</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="rounded-[2rem] bg-section-dark p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {solutionOverviewCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5 text-section-dark-foreground transition hover:bg-white/10"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <Icon className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-section-dark-foreground/70">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </SectionShell>
      </section>

      <section className="bg-background py-20 md:py-24">
        <SectionShell>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Choose your operating model</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Start with the solution story that matches how your roofing business actually runs.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {solutionOverviewCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className="rounded-[1.9rem] border border-border/60 bg-white p-7 shadow-[0_18px_46px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-cyan/15 bg-brand-cyan/[0.06]">
                    <Icon className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">{item.description}</p>
                  <Button asChild size="lg" variant="heroOutline" className="mt-8">
                    <Link to={item.to}>
                      View page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </SectionShell>
      </section>

      <section className="bg-hero-bg py-20 md:py-24">
        <SectionShell className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] bg-section-dark p-8 text-section-dark-foreground shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-green">Why this matters</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Different roofing businesses share one problem: too many disconnected systems.
            </h2>
            <p className="mt-5 text-base leading-8 text-section-dark-foreground/72">
              ZODO keeps the same CRM, estimating, jobs, communication, and revenue stack underneath each audience-specific solution, so teams do not have to rebuild process by business type.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border/60 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-cyan">Next step</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Want to see which solution path matches your team best?
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              We can show how ZODO maps differently for residential sales, commercial operations, restoration workflows, or multi-location structure while keeping one connected platform.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="xl" variant="accent">
                <Link to="/contact">Book a demo</Link>
              </Button>
              <Button asChild size="xl" variant="heroOutline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </SectionShell>
      </section>

      <LandingFooter />
    </PublicV2Shell>
  );
}
