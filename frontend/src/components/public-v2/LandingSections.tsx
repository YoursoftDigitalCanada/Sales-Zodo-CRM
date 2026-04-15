import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Calculator,
  Check,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  Link2,
  Loader2,
  MapPin,
  Ruler,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  Trophy,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { BrandLogo } from "./BrandLogo";
import { Marquee } from "./Marquee";

const categories = [
  { label: "AI Estimator", color: "brand-green" },
  { label: "Job Tracking", color: "brand-cyan" },
  { label: "Customer CRM", color: "brand-yellow" },
  { label: "Proposals", color: "brand-orange" },
  { label: "Invoicing", color: "brand-green" },
];

const bgWords = ["Estimates", "Roofing", "AI Power", "Projects"];
const bgColors = ["--brand-green", "--brand-cyan", "--brand-yellow", "--brand-orange"];

const trustedCompanies = [
  { name: "ABC Roofing", style: "font-bold tracking-wider" },
  { name: "Peak Contractors", style: "font-semibold tracking-wide" },
  { name: "Titan Roofing Co", style: "text-lg font-bold tracking-tight" },
  { name: "Summit Exteriors", style: "font-medium tracking-wide" },
  { name: "StormGuard Roofing", style: "font-bold tracking-widest" },
  { name: "RedHawk Roofing", style: "text-lg font-extrabold" },
  { name: "ProShingle Inc", style: "text-sm font-semibold tracking-wider" },
  { name: "AllWeather Roof", style: "font-medium tracking-wide" },
];

const awardCards = [
  { name: "Best Roofing CRM", source: "Capterra", icon: Trophy, color: "text-brand-orange" },
  { name: "Contractors Choice", source: "BuiltWith", icon: Star, color: "text-brand-yellow" },
  { name: "Top Construction App", source: "G2", icon: Award, color: "text-brand-green" },
  { name: "Easiest Setup", source: "G2", icon: Award, color: "text-brand-cyan" },
  { name: "Best Estimating Tool", source: "SourceForge", icon: Shield, color: "text-brand-orange" },
  { name: "Top Performer 2025", source: "GetApp", icon: Trophy, color: "text-brand-green" },
  { name: "High Performer", source: "G2", icon: Award, color: "text-brand-yellow" },
  { name: "Best Value", source: "Capterra", icon: Star, color: "text-brand-cyan" },
];

const featureCards = [
  {
    icon: Calculator,
    iconBg: "bg-brand-orange",
    checkColor: "text-brand-orange",
    glowColor: "bg-brand-orange",
    title: "AI Roof Estimator",
    description:
      "Enter any address and get an instant, AI-powered roof estimate with materials, labor, and total cost breakdown.",
    highlights: ["Satellite Roof Measurement", "Multiple Material Options", "Local Labor Pricing", "Instant Cost Breakdown"],
    items: [
      "Roof pitch & type detection",
      "Waste factor calculations",
      "Material quantity takeoff",
      "PDF estimate export",
      "One-click proposal generation",
    ],
  },
  {
    icon: ClipboardList,
    iconBg: "bg-brand-cyan",
    checkColor: "text-brand-cyan",
    glowColor: "bg-brand-cyan",
    title: "Job Management",
    description:
      "Track every roofing job from lead to completion with crew scheduling, materials tracking, and progress updates.",
    highlights: ["Job Pipeline Tracking", "Crew Scheduling", "Material Orders", "Progress Photos"],
    items: [
      "Permit tracking",
      "Weather-aware scheduling",
      "Subcontractor management",
      "Completion checklists",
      "Customer notifications",
    ],
  },
  {
    icon: Users,
    iconBg: "bg-brand-green",
    checkColor: "text-brand-green",
    glowColor: "bg-brand-green",
    title: "Customer CRM",
    description:
      "Manage all your roofing leads, customers, and follow-ups in one place built specifically for roofing contractors.",
    highlights: ["Lead Management", "Customer History", "Automated Follow-ups", "Review Requests"],
    items: [
      "Storm damage lead capture",
      "Insurance claim tracking",
      "Referral program management",
      "Email & SMS templates",
      "Customer portal access",
    ],
  },
];

const stats = [
  {
    value: "3x",
    title: "Faster estimates",
    description: "Generate roof estimates in seconds instead of hours on-site",
    icon: Zap,
    color: "text-brand-green",
    bg: "bg-brand-green/10",
  },
  {
    value: "40%",
    title: "More deals closed",
    description: "Faster proposals mean more signed contracts before competitors",
    icon: TrendingUp,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
  },
  {
    value: "$15K",
    title: "Avg. saved yearly",
    description: "Reduce overhead costs with automated workflows and estimates",
    icon: DollarSign,
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10",
  },
  {
    value: "85%",
    title: "Customer satisfaction",
    description: "Professional proposals and faster response times win trust",
    icon: Clock,
    color: "text-brand-orange",
    bg: "bg-brand-orange/10",
  },
];

const securityCards = [
  {
    title: "Contractor-Grade Security",
    description:
      "Your customer data, estimates, and business information protected with enterprise encryption and secure cloud storage.",
    icon: ShieldCheck,
    iconColor: "text-brand-green",
    iconBg: "bg-brand-green/10",
  },
  {
    title: "Seamless Integrations",
    description:
      "Connect with QuickBooks, CompanyCam, EagleView, Google Calendar, and your favourite roofing tools.",
    icon: Link2,
    iconColor: "text-brand-cyan",
    iconBg: "bg-brand-cyan/10",
  },
  {
    title: "Insurance & Compliance",
    description:
      "Built-in tools for insurance claim documentation, lien waiver management, and contractor licensing compliance.",
    icon: ClipboardCheck,
    iconColor: "text-brand-orange",
    iconBg: "bg-brand-orange/10",
  },
];

const footerSections = [
  { title: "PRODUCT", links: [{ label: "AI Roof Estimator", to: "/ai-estimator" }, { label: "Job Management", to: "/solutions" }, { label: "Customer CRM", to: "/product" }, { label: "Proposals", to: "/" }, { label: "Invoicing", to: "/pricing" }, { label: "Mobile App", to: "/contact" }] },
  { title: "SOLUTIONS", links: [{ label: "Residential Roofers", to: "/solutions" }, { label: "Commercial Roofing", to: "/solutions" }, { label: "Storm Restoration", to: "/solutions" }, { label: "Multi-location", to: "/solutions" }] },
  { title: "RESOURCES", links: [{ label: "Roofing Blog", to: "/contact" }, { label: "Estimating Guides", to: "/contact" }, { label: "Webinars", to: "/contact" }, { label: "Case Studies", to: "/contact" }, { label: "ROI Calculator", to: "/pricing" }] },
  { title: "COMPANY", links: [{ label: "About Us", to: "/contact" }, { label: "Careers", to: "/contact" }, { label: "Contact", to: "/contact" }, { label: "Press", to: "/contact" }, { label: "Affiliates", to: "/contact" }] },
  { title: "COMPARE", links: [{ label: "vs JobNimbus", to: "/product" }, { label: "vs AccuLynx", to: "/product" }, { label: "vs Roofr", to: "/product" }, { label: "vs JobProgress", to: "/product" }, { label: "vs Leap", to: "/product" }] },
];

export interface TabItem {
  label: string;
  variant: "estimation" | "proposals" | "followup" | "jobtracking" | "team" | "invoicing";
}

function SectionShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

function MockScreenshot() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_20px_50px_-12px_hsl(215_28%_17%/0.15)]">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-green/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-brand-yellow/50" />
          <div className="h-2.5 w-2.5 rounded-full bg-brand-orange/50" />
        </div>
        <div className="ml-4 flex items-center gap-2">
          <div className="flex h-5 w-28 items-center rounded bg-card px-2 text-[9px] text-muted-foreground">Zodo CRM</div>
          <div className="flex h-5 items-center rounded bg-secondary px-2 text-[9px] font-medium text-muted-foreground">Active Jobs</div>
          <div className="flex h-5 items-center rounded bg-secondary px-2 text-[9px] font-medium text-muted-foreground">Estimates</div>
        </div>
      </div>
      <div className="flex min-h-[220px] md:min-h-[320px]">
        <div className="hidden w-10 flex-col items-center gap-3 border-r border-border/50 p-2 pt-3 md:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-cyan/15">
            <div className="h-3 w-3 rounded-sm bg-brand-cyan/40" />
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded bg-secondary">
            <div className="h-3 w-3 rounded-sm bg-muted" />
          </div>
        </div>
        <div className="hidden w-44 space-y-0.5 border-r border-border/50 p-3 lg:block">
          <div className="mb-2 text-[10px] font-semibold text-foreground">Dashboard</div>
          <div className="mb-1 mt-3 text-[8px] uppercase tracking-wider text-muted-foreground">MANAGEMENT</div>
          {["Active Jobs", "Estimates", "Customers", "Calendar"].map((item, index) => (
            <div
              key={item}
              className={cn(
                "flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px]",
                index === 1 ? "bg-brand-cyan/10 text-foreground" : "text-muted-foreground",
              )}
            >
              <div className="h-3 w-3 rounded bg-muted/60" />
              {item}
            </div>
          ))}
          <div className="mb-1 mt-3 text-[8px] uppercase tracking-wider text-muted-foreground">TOOLS</div>
          {["AI Estimator", "Proposals", "Invoices", "Reports"].map((item) => (
            <div key={item} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] text-muted-foreground">
              <div className="h-3 w-3 rounded bg-muted/60" />
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-foreground">Recent Estimates</div>
            <div className="flex gap-1.5">
              <div className="flex h-6 items-center rounded bg-brand-green/10 px-2 text-[9px] font-medium text-brand-green">+ New Estimate</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-md border border-border/50">
            <div className="flex border-b border-border/50 bg-muted/30 px-3 py-1.5">
              <div className="w-6 text-[8px] font-medium text-muted-foreground">#</div>
              <div className="flex-1 text-[8px] font-medium text-muted-foreground">ADDRESS</div>
              <div className="hidden w-20 text-[8px] font-medium text-muted-foreground sm:block">ROOF SQ FT</div>
              <div className="hidden w-20 text-[8px] font-medium text-muted-foreground sm:block">ESTIMATE</div>
              <div className="hidden w-16 text-[8px] font-medium text-muted-foreground sm:block">STATUS</div>
            </div>
            {[
              { id: 1, addr: "142 Oak Street, Austin TX", sqft: "2,450", est: "$15,200", status: "Approved", style: "bg-brand-green/15 text-brand-green" },
              { id: 2, addr: "87 Elm Ave, Dallas TX", sqft: "3,100", est: "$21,800", status: "Pending", style: "bg-brand-yellow/15 text-brand-orange" },
              { id: 3, addr: "231 Maple Dr, Houston TX", sqft: "1,980", est: "$12,400", status: "Sent", style: "bg-brand-cyan/15 text-brand-cyan" },
              { id: 4, addr: "56 Pine Ct, San Antonio TX", sqft: "2,800", est: "$18,500", status: "Approved", style: "bg-brand-green/15 text-brand-green" },
            ].map((row) => (
              <div key={row.id} className="flex items-center border-b border-border/30 px-3 py-2 last:border-0">
                <div className="w-6 text-[9px] text-muted-foreground">{row.id}</div>
                <div className="flex-1 truncate pr-2 text-[9px] font-medium text-foreground">{row.addr}</div>
                <div className="hidden w-20 text-[9px] text-muted-foreground sm:block">{row.sqft}</div>
                <div className="hidden w-20 text-[9px] font-semibold text-foreground sm:block">{row.est}</div>
                <div className="hidden w-16 sm:block">
                  <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-medium", row.style)}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockSidePanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_10px_25px_-5px_hsl(215_28%_17%/0.1)]">
      <div className="border-b border-border/50 p-3">
        <div className="text-[10px] font-semibold text-foreground">AI Roof Estimate</div>
      </div>
      <div className="p-3">
        <div className="mb-3 flex h-24 items-center justify-center rounded-lg border border-brand-cyan/10 bg-brand-cyan/5">
          <MapPin className="h-6 w-6 text-brand-cyan/40" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[9px]">
            <span className="text-muted-foreground">Roof Area</span>
            <span className="font-medium text-foreground">2,450 sq ft</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-muted-foreground">Pitch</span>
            <span className="font-medium text-foreground">6/12</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-muted-foreground">Materials</span>
            <span className="font-medium text-foreground">$8,200</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-muted-foreground">Labor</span>
            <span className="font-medium text-foreground">$6,800</span>
          </div>
          <div className="flex justify-between border-t border-border/50 pt-1.5 text-[9px] font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-brand-orange">$15,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockUi({ variant }: { variant: TabItem["variant"] }) {
  const layouts: Record<TabItem["variant"], JSX.Element> = {
    estimation: (
      <div className="flex min-h-[250px] md:min-h-[340px]">
        <div className="hidden w-52 space-y-3 border-r border-border/50 p-4 md:block">
          <div className="text-[10px] font-semibold text-foreground">AI Estimation</div>
          <div className="flex h-28 items-center justify-center rounded-lg bg-muted/30">
            <div className="text-[9px] text-muted-foreground">Satellite View</div>
          </div>
          <div className="space-y-2">
            {["Roof Area: 2,450 sq ft", "Pitch: 6/12", "Type: Gable", "Facets: 8"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-badge-green" />
                <span className="text-[9px] text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="mb-3 text-[10px] font-semibold text-foreground">Material Options</div>
          <div className="space-y-2">
            {[
              { name: "Asphalt 3-Tab", price: "$12,400", selected: false },
              { name: "Architectural Shingles", price: "$15,000", selected: true },
              { name: "Metal Standing Seam", price: "$24,800", selected: false },
              { name: "Synthetic Slate", price: "$28,500", selected: false },
            ].map((material) => (
              <div
                key={material.name}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-2.5 text-[9px]",
                  material.selected ? "border-accent bg-accent/5" : "border-border/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-full border-2",
                      material.selected ? "border-accent" : "border-border",
                    )}
                  >
                    {material.selected ? <div className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </div>
                  <span className="font-medium text-foreground">{material.name}</span>
                </div>
                <span className="font-bold text-foreground">{material.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 p-3">
            <span className="text-[10px] font-semibold text-foreground">Selected Estimate Total</span>
            <span className="text-sm font-bold text-accent">$15,000</span>
          </div>
        </div>
      </div>
    ),
    proposals: (
      <div className="min-h-[250px] p-4 md:min-h-[340px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-[10px] font-semibold text-foreground">Proposal Builder</div>
          <div className="flex gap-1.5">
            <div className="flex h-5 items-center rounded bg-accent/10 px-2 text-[8px] font-medium text-accent">Preview</div>
            <div className="flex h-5 items-center rounded bg-badge-green/10 px-2 text-[8px] font-medium text-badge-green">Send</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/50">
          <div className="bg-section-dark p-4">
            <div className="text-[11px] font-bold text-section-dark-foreground">YOUR COMPANY NAME</div>
            <div className="mt-1 text-[9px] text-section-dark-foreground/60">Professional Roofing Proposal</div>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <div className="text-[8px] uppercase text-muted-foreground">Prepared for</div>
              <div className="text-[10px] font-medium text-foreground">John & Sarah Miller</div>
              <div className="text-[9px] text-muted-foreground">142 Oak Street, Austin TX 78701</div>
            </div>
            <div className="border-t border-border/50 pt-3">
              <div className="mb-2 text-[9px] font-semibold text-foreground">Scope of Work</div>
              <div className="space-y-1">
                {[
                  "Remove existing shingles",
                  "Install new underlayment",
                  "Install architectural shingles",
                  "Replace all flashing",
                  "Clean up & haul away debris",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <Check className="h-2.5 w-2.5 text-badge-green" />
                    <span className="text-[8px] text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <span className="text-[10px] font-bold text-foreground">Total Investment</span>
              <span className="text-sm font-bold text-accent">$15,000</span>
            </div>
          </div>
        </div>
      </div>
    ),
    followup: (
      <div className="min-h-[250px] p-4 md:min-h-[340px]">
        <div className="mb-3 text-[10px] font-semibold text-foreground">Follow-up Pipeline</div>
        <div className="overflow-hidden rounded-md border border-border/50">
          <div className="flex border-b border-border/50 bg-muted/30 px-3 py-1.5">
            {["Customer", "Sent", "Last Follow-up", "Status", "Next Action"].map((heading) => (
              <div key={heading} className="flex-1 text-[8px] font-medium text-muted-foreground">
                {heading}
              </div>
            ))}
          </div>
          {[
            { name: "Miller Family", sent: "2 days ago", followUp: "Yesterday", status: "Viewed", style: "bg-accent/20 text-accent", next: "Call today" },
            { name: "Johnson Home", sent: "5 days ago", followUp: "3 days ago", status: "Pending", style: "bg-badge-orange/20 text-badge-orange", next: "Send reminder" },
            { name: "Garcia Residence", sent: "1 week ago", followUp: "2 days ago", status: "Signed", style: "bg-badge-green/20 text-badge-green", next: "Schedule job" },
            { name: "Chen Property", sent: "Today", followUp: "-", status: "New", style: "bg-badge-purple/20 text-badge-purple", next: "Follow up in 2d" },
          ].map((row) => (
            <div key={row.name} className="flex items-center border-b border-border/30 px-3 py-2 last:border-0">
              <div className="flex-1 text-[9px] font-medium text-foreground">{row.name}</div>
              <div className="flex-1 text-[9px] text-muted-foreground">{row.sent}</div>
              <div className="flex-1 text-[9px] text-muted-foreground">{row.followUp}</div>
              <div className="flex-1">
                <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-medium", row.style)}>{row.status}</span>
              </div>
              <div className="flex-1 text-[9px] font-medium text-accent">{row.next}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Open Rate", value: "78%" },
            { label: "Avg. Close Time", value: "3.2 days" },
            { label: "Win Rate", value: "62%" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-lg font-bold text-foreground">{item.value}</div>
              <div className="text-[8px] text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    jobtracking: (
      <div className="flex min-h-[250px] md:min-h-[340px]">
        <div className="hidden w-44 space-y-1 border-r border-border/50 p-3 md:block">
          <div className="mb-2 text-[10px] font-semibold text-foreground">Active Jobs</div>
          {["142 Oak St (Miller)", "87 Elm Ave (Davis)", "231 Maple Dr (Lee)", "56 Pine Ct (Wright)", "18 Cedar Ln (Patel)"].map((item, index) => (
            <div
              key={item}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1.5 text-[9px]",
                index === 0 ? "bg-accent/10 text-foreground" : "text-muted-foreground",
              )}
            >
              <div className={cn("h-2 w-2 rounded-full", index < 2 ? "bg-badge-green" : index === 2 ? "bg-accent" : "bg-muted")} />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="mb-1 text-[10px] font-semibold text-foreground">142 Oak Street - Miller Family</div>
          <div className="mb-3 text-[8px] text-muted-foreground">Architectural Shingle Replacement</div>
          <div className="space-y-2">
            {[
              { task: "Permits obtained", done: true },
              { task: "Material delivery confirmed", done: true },
              { task: "Tear-off old roof", done: true },
              { task: "Install underlayment", done: false },
              { task: "Install new shingles", done: false },
              { task: "Final inspection", done: false },
            ].map((item) => (
              <div key={item.task} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded border",
                    item.done ? "border-badge-green bg-badge-green/20" : "border-border",
                  )}
                >
                  {item.done ? <span className="text-[7px] text-badge-green">✓</span> : null}
                </div>
                <span className={cn("text-[9px]", item.done ? "text-muted-foreground line-through" : "text-foreground")}>{item.task}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <div className="rounded bg-accent/10 px-2 py-1 text-[8px] font-medium text-accent">50% Complete</div>
            <div className="rounded bg-secondary px-2 py-1 text-[8px] text-muted-foreground">Crew A assigned</div>
          </div>
        </div>
      </div>
    ),
    team: (
      <div className="min-h-[250px] p-4 md:min-h-[340px]">
        <div className="mb-4 text-[10px] font-semibold text-foreground">Crew Management</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Crew Alpha", lead: "Mike Torres", status: "On Job", job: "142 Oak St", style: "bg-badge-green/20 text-badge-green" },
            { name: "Crew Bravo", lead: "Carlos Reyes", status: "Available", job: "-", style: "bg-accent/20 text-accent" },
            { name: "Crew Charlie", lead: "James Wilson", status: "On Job", job: "87 Elm Ave", style: "bg-badge-green/20 text-badge-green" },
            { name: "Crew Delta", lead: "Ryan Murphy", status: "Off Today", job: "-", style: "bg-muted text-muted-foreground" },
          ].map((crew) => (
            <div key={crew.name} className="rounded-lg border border-border/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-foreground">{crew.name}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-medium", crew.style)}>{crew.status}</span>
              </div>
              <div className="text-[9px] text-muted-foreground">Lead: {crew.lead}</div>
              {crew.job !== "-" ? <div className="mt-1 text-[9px] text-accent">Job: {crew.job}</div> : null}
              <div className="mt-2 flex -space-x-1">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-5 w-5 rounded-full border-2 border-card bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    invoicing: (
      <div className="min-h-[250px] p-4 md:min-h-[340px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-semibold text-foreground">Invoices</div>
          <div className="flex h-5 items-center rounded bg-accent/10 px-2 text-[8px] font-medium text-accent">+ New Invoice</div>
        </div>
        <div className="overflow-hidden rounded-md border border-border/50">
          <div className="flex border-b border-border/50 bg-muted/30 px-3 py-1.5">
            {["Invoice #", "Customer", "Amount", "Due Date", "Status"].map((heading) => (
              <div key={heading} className="flex-1 text-[8px] font-medium text-muted-foreground">
                {heading}
              </div>
            ))}
          </div>
          {[
            { invoice: "INV-1042", customer: "Miller Family", amount: "$15,000", due: "Dec 15", status: "Paid", style: "bg-badge-green/20 text-badge-green" },
            { invoice: "INV-1043", customer: "Davis Home", amount: "$21,800", due: "Dec 20", status: "Sent", style: "bg-accent/20 text-accent" },
            { invoice: "INV-1044", customer: "Lee Residence", amount: "$12,400", due: "Jan 5", status: "Draft", style: "bg-muted text-muted-foreground" },
            { invoice: "INV-1045", customer: "Wright Property", amount: "$18,500", due: "Dec 28", status: "Overdue", style: "bg-destructive/20 text-destructive" },
          ].map((row) => (
            <div key={row.invoice} className="flex items-center border-b border-border/30 px-3 py-2 last:border-0">
              <div className="flex-1 text-[9px] font-medium text-accent">{row.invoice}</div>
              <div className="flex-1 text-[9px] text-foreground">{row.customer}</div>
              <div className="flex-1 text-[9px] font-semibold text-foreground">{row.amount}</div>
              <div className="flex-1 text-[9px] text-muted-foreground">{row.due}</div>
              <div className="flex-1">
                <span className={cn("rounded px-1.5 py-0.5 text-[8px] font-medium", row.style)}>{row.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Outstanding", value: "$52,700" },
            { label: "Collected (MTD)", value: "$87,300" },
            { label: "Avg. Pay Time", value: "8 days" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="text-base font-bold text-foreground">{item.value}</div>
              <div className="text-[8px] text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_20px_50px_-12px_hsl(215_28%_17%/0.15)]">
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-destructive/30" />
          <div className="h-2.5 w-2.5 rounded-full bg-badge-orange/30" />
          <div className="h-2.5 w-2.5 rounded-full bg-badge-green/30" />
        </div>
        <div className="ml-4 h-5 w-40 rounded bg-card" />
      </div>
      {layouts[variant]}
    </div>
  );
}

export function HeroSection() {
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveCategory((current) => (current + 1) % categories.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-hero-bg">
      <div className="pointer-events-none absolute left-[10%] top-20 h-64 w-64 rounded-full bg-brand-green/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute right-[5%] top-60 h-72 w-72 rounded-full bg-brand-cyan/[0.03] blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-0 z-0 hidden h-full select-none overflow-hidden md:right-[2%] md:block">
        <div className="vertical-scroll-track">
          {[...bgWords, ...bgWords, ...bgWords, ...bgWords].map((word, index) => (
            <div
              key={`${word}-${index}`}
              className="text-7xl font-bold leading-snug lg:text-[9rem]"
              style={{
                color: `hsl(var(${bgColors[index % 4]}) / ${index % 4 === activeCategory % 4 ? 0.08 : 0.03})`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>

      <SectionShell className="relative z-10 pt-12 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Badge className="gap-2 rounded-full border border-border bg-card px-4 py-1.5 shadow-sm" variant="secondary">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[10px] font-bold text-card">#1</span>
              <span className="text-sm font-medium text-foreground">CRM for Roofers</span>
            </Badge>
            <Badge className="gap-2 rounded-full border border-border bg-card px-4 py-1.5 shadow-sm" variant="secondary">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-3 w-3 fill-brand-yellow text-brand-yellow" />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">Trusted by 2,000+ contractors</span>
            </Badge>
          </div>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            AI-Powered Roof Estimates
            <br />
            <span className="text-accent">in Seconds</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            The only CRM built for roofers. Enter any address, get instant AI estimates, send proposals, and manage your entire roofing business.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="xl" variant="accent">
              <Link to="/signup">
                Try AI Estimator Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="heroOutline">
              <Link to="/contact">Book a demo</Link>
            </Button>
          </div>
        </motion.div>
      </SectionShell>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="py-4">
        <Marquee speed={20}>
          {[...categories, ...categories].map((item, index) => {
            const isActive = index % categories.length === activeCategory;
            return (
              <span
                key={`${item.label}-${index}`}
                className={cn(
                  "mx-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-card text-foreground shadow-sm" : "border-border/50 bg-transparent text-muted-foreground",
                )}
                style={
                  isActive
                    ? {
                        borderColor: `hsl(var(--${item.color}))`,
                        boxShadow: `0 0 0 1px hsl(var(--${item.color}) / 0.2)`,
                      }
                    : undefined
                }
              >
                {item.label}
              </span>
            );
          })}
        </Marquee>
        <div className="mt-2">
          <Marquee reverse speed={25}>
            {[...categories, ...categories].map((item, index) => {
              const isActive = (index + 2) % categories.length === activeCategory;
              return (
                <span
                  key={`${item.label}-reverse-${index}`}
                  className={cn(
                    "mx-2 whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-card text-foreground shadow-sm" : "border-border/50 bg-transparent text-muted-foreground",
                  )}
                  style={
                    isActive
                      ? {
                          borderColor: `hsl(var(--${item.color}))`,
                          boxShadow: `0 0 0 1px hsl(var(--${item.color}) / 0.2)`,
                        }
                      : undefined
                  }
                >
                  {item.label}
                </span>
              );
            })}
          </Marquee>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8"
      >
        <div className="relative">
          <div className="animate-float relative z-10 mx-auto w-full md:ml-auto md:mr-0 md:w-[85%]">
            <MockScreenshot />
          </div>
          <div className="animate-float-delay absolute left-0 top-8 z-0 hidden w-[40%] md:block">
            <MockSidePanel />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export function TrustedBySection() {
  return (
    <section className="bg-background py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">Trusted by 2,000+ roofing contractors across the country</p>
      </motion.div>
      <Marquee speed={35}>
        {trustedCompanies.map((company, index) => (
          <span
            key={company.name}
            className={cn(
              "mx-8 select-none whitespace-nowrap text-foreground/40 transition-colors md:mx-12",
              ["hover:text-brand-green/60", "hover:text-brand-cyan/60", "hover:text-brand-yellow/70", "hover:text-brand-orange/60"][index % 4],
              company.style,
            )}
          >
            {company.name}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

export function RoofEstimatorSection() {
  const [address, setAddress] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleEstimate = () => {
    if (!address.trim()) return;
    setIsEstimating(true);
    setShowResults(false);
    window.setTimeout(() => {
      setIsEstimating(false);
      setShowResults(true);
    }, 2200);
  };

  return (
    <section className="bg-background py-16 md:py-24">
      <SectionShell>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-brand-cyan/40">
              <Calculator className="h-4 w-4 text-brand-cyan" />
            </div>
            <span className="text-base font-medium text-brand-cyan">AI-Powered Technology</span>
          </div>
          <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            Get Instant Roof Estimates
            <br />
            Just Enter an Address
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Our AI analyzes satellite imagery and local pricing data to generate accurate roof estimates in seconds
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-8 rounded-3xl bg-section-dark p-6 md:p-10"
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-section-dark-foreground/70">Property Address</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleEstimate();
                        }
                      }}
                      placeholder="e.g. 142 Oak Street, Austin TX"
                      className="h-12 rounded-lg border-border bg-card pl-10 text-foreground"
                    />
                  </div>
                  <Button className="h-12 whitespace-nowrap" disabled={isEstimating || !address.trim()} onClick={handleEstimate} size="lg" variant="accent">
                    {isEstimating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Get Estimate
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Home, label: "Satellite roof measurement" },
                  { icon: Ruler, label: "Accurate sq ft calculation" },
                  { icon: Calculator, label: "Material cost breakdown" },
                  { icon: DollarSign, label: "Local labor pricing" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent/15">
                      <item.icon className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <span className="text-xs text-section-dark-foreground/70">{item.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] leading-relaxed text-section-dark-foreground/40">
                Estimates powered by AI satellite imagery analysis, local material costs, and regional labor rates. Results are approximate and may vary based on actual roof conditions.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {showResults ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-xl bg-card p-6 shadow-lg"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">Roof Estimate</div>
                    <Badge className="rounded-full border-badge-green/20 bg-badge-green/10 px-3 py-1 text-xs font-semibold text-badge-green" variant="secondary">
                      94% Confidence
                    </Badge>
                  </div>
                  <div className="mb-5 grid grid-cols-3 gap-4">
                    {[
                      { label: "Roof Area", value: "2,450 sq ft" },
                      { label: "Pitch", value: "6/12" },
                      { label: "Type", value: "Gable" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="text-[11px] text-muted-foreground">{item.label}</div>
                        <div className="text-base font-bold text-foreground">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Materials (Asphalt Shingles)</span>
                      <span className="font-medium text-foreground">$8,200</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Underlayment & Flashing</span>
                      <span className="font-medium text-foreground">$1,450</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Labor</span>
                      <span className="font-medium text-foreground">$5,350</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                      <span className="text-foreground">Estimated Total</span>
                      <span className="text-xl text-accent">$15,000</span>
                    </div>
                  </div>
                  <Button asChild className="mt-6 w-full" size="lg" variant="accent">
                    <Link to="/signup">
                      Generate Proposal
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--section-dark-foreground)/0.15)] bg-[hsl(var(--section-dark-foreground)/0.04)] p-6 text-center"
                >
                  {isEstimating ? (
                    <>
                      <Loader2 className="mb-4 h-12 w-12 animate-spin text-accent" />
                      <p className="text-sm font-medium text-section-dark-foreground/70">Analyzing satellite imagery...</p>
                      <p className="mt-1 text-xs text-section-dark-foreground/40">Calculating roof area and local pricing</p>
                    </>
                  ) : (
                    <>
                      <Home className="mb-4 h-14 w-14 text-section-dark-foreground/15" />
                      <p className="text-sm font-medium text-section-dark-foreground/50">Enter a property address to get</p>
                      <p className="text-sm text-section-dark-foreground/50">an instant AI roof estimate</p>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-badge-green" />
                        <span className="text-xs text-section-dark-foreground/40">Avg. estimate in under 10 seconds</span>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </SectionShell>
    </section>
  );
}

export function TabShowcase({
  badge,
  badgeIcon,
  heading,
  tabs,
}: {
  badge: string;
  badgeIcon: "dollar" | "settings";
  heading: string;
  tabs: TabItem[];
}) {
  const [activeTab, setActiveTab] = useState(0);
  const BadgeIcon = badgeIcon === "dollar" ? DollarSign : Settings;

  return (
    <section className="bg-background py-16 md:py-24">
      <SectionShell>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-accent/40">
              <BadgeIcon className="h-4 w-4 text-accent" />
            </div>
            <span className="text-base font-medium text-accent">{badge}</span>
          </div>
          <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            {heading}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-8 rounded-3xl bg-section-dark p-4 md:p-8"
        >
          <div className="mb-6 flex justify-center">
            <div className="flex gap-0.5 rounded-full bg-[hsl(var(--section-dark-foreground)/0.06)] p-1">
              {tabs.map((tab, index) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-colors md:px-6",
                    activeTab === index
                      ? "bg-card text-foreground shadow-sm"
                      : "text-section-dark-foreground/70 hover:text-section-dark-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tabs[activeTab].label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative flex justify-center px-0 md:px-4"
            >
              <div className="w-full max-w-4xl">
                <MockUi variant={tabs[activeTab].variant} />
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button asChild size="xl" variant="accent">
            <Link to="/signup">Start free trial</Link>
          </Button>
          <Button asChild size="xl" variant="heroOutline">
            <Link to="/contact">Book a demo</Link>
          </Button>
        </motion.div>
      </SectionShell>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="bg-background py-16 md:py-24">
      <SectionShell>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            Everything a roofer needs,
            <br className="hidden sm:block" />
            nothing you don't
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Built by roofers, for roofers. Every feature designed for how roofing businesses actually work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {featureCards.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex h-full flex-col border-border/60 p-6 transition-shadow hover:shadow-lg">
                <div className="relative mb-4 h-8 overflow-hidden">
                  <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.07]", feature.glowColor)} />
                </div>
                <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", feature.iconBg)}>
                  <feature.icon className="h-5 w-5 text-card" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                <div className="mb-3 text-xs font-semibold text-foreground">What you get:</div>
                <div className="flex-1 space-y-2">
                  {feature.highlights.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", feature.checkColor)} />
                      <span className="text-sm font-semibold text-foreground">{item}</span>
                    </div>
                  ))}
                  {feature.items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", feature.checkColor)} />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Button asChild size="xl" variant="accent">
            <Link to="/signup">Start free trial</Link>
          </Button>
          <Button asChild size="xl" variant="heroOutline">
            <Link to="/contact">Book a demo</Link>
          </Button>
        </motion.div>
      </SectionShell>
    </section>
  );
}

export function AwardsMarqueeSection() {
  return (
    <section className="overflow-hidden bg-background py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <p className="text-sm font-medium text-muted-foreground">Recognized by the industry</p>
      </motion.div>
      <Marquee speed={40}>
        {awardCards.map((award, index) => (
          <div
            key={`${award.name}-${index}`}
            className="mx-2 flex min-w-[130px] flex-col items-center gap-2 rounded-xl border border-border/50 bg-card px-6 py-4 transition-shadow hover:shadow-sm"
          >
            <award.icon className={cn("h-6 w-6", award.color)} />
            <span className="whitespace-nowrap text-xs font-semibold text-foreground">{award.name}</span>
            <span className="text-[10px] text-muted-foreground">{award.source}</span>
          </div>
        ))}
      </Marquee>
      <div className="mt-3">
        <Marquee reverse speed={45}>
          {awardCards
            .slice()
            .reverse()
            .map((award, index) => (
              <div
                key={`${award.name}-reverse-${index}`}
                className="mx-2 flex min-w-[130px] flex-col items-center gap-2 rounded-xl border border-border/50 bg-card px-6 py-4 transition-shadow hover:shadow-sm"
              >
                <award.icon className={cn("h-6 w-6", award.color)} />
                <span className="whitespace-nowrap text-xs font-semibold text-foreground">{award.name}</span>
                <span className="text-[10px] text-muted-foreground">{award.source}</span>
              </div>
            ))}
        </Marquee>
      </div>
    </section>
  );
}

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-background py-16 md:py-24">
      <div className="pointer-events-none absolute -bottom-32 left-[15%] h-60 w-60 rounded-full bg-brand-yellow/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute -top-32 right-[10%] h-60 w-60 rounded-full bg-brand-green/[0.03] blur-3xl" />

      <SectionShell className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-brand-orange/40">
              <TrendingUp className="h-3.5 w-3.5 text-brand-orange" />
            </div>
            <span className="text-sm font-medium text-brand-orange">Real results</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            Numbers that speak for themselves
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            See how roofing contractors are growing their business with Zodo
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex h-full flex-col border-border/50 p-6 transition-shadow hover:shadow-md">
                <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-full", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">{stat.value}</div>
                <div className="mb-1 text-sm font-semibold text-foreground">{stat.title}</div>
                <p className="mt-auto text-xs leading-relaxed text-muted-foreground">{stat.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}

export function SecuritySection() {
  return (
    <section id="security" className="bg-background py-16 md:py-24">
      <SectionShell>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
            Built for the Roofing Industry
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Security, integrations, and compliance tools that roofers actually need
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
          {securityCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex h-full flex-col items-center border-border/50 p-8 text-center transition-shadow hover:shadow-md">
                <div className={cn("mb-5 flex h-14 w-14 items-center justify-center rounded-2xl", card.iconBg)}>
                  <card.icon className={cn("h-7 w-7", card.iconColor)} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{card.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-6"
        >
          {[
            { name: "EagleView", color: "border-brand-cyan/20" },
            { name: "QuickBooks", color: "border-brand-green/20" },
            { name: "CompanyCam", color: "border-brand-orange/20" },
            { name: "Google", color: "border-brand-yellow/20" },
          ].map((brand) => (
            <div key={brand.name} className={cn("rounded-xl border bg-card px-5 py-3", brand.color)}>
              <span className="text-sm font-semibold text-muted-foreground">{brand.name}</span>
            </div>
          ))}
        </motion.div>
      </SectionShell>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-background py-16 md:py-24">
      <div className="pointer-events-none absolute left-[5%] top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-brand-cyan/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute right-[5%] top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-brand-orange/[0.03] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-6 text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            Ready to close more roofing jobs?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Join 2,000+ roofing contractors who use Zodo to estimate faster, send better proposals, and grow their business. Start your free trial today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="xl" variant="accent">
              <Link to="/signup">
                Try AI Estimator Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="heroOutline">
              <Link to="/contact">Book a demo</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer id="resources" className="bg-section-dark text-section-dark-foreground">
      <SectionShell className="py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-6">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-section-dark-foreground/50">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link className="text-sm text-section-dark-foreground/80 transition-colors hover:text-section-dark-foreground" to={link.to}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-section-dark-foreground/10 pt-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <span className="ml-2 text-xs text-section-dark-foreground/40">The #1 CRM for Roofers</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {[
                { label: "Privacy Policy", to: "/contact" },
                { label: "Terms of Service", to: "/contact" },
                { label: "Security", to: "/contact" },
              ].map((item) => (
                <Link key={item.label} className="text-xs text-section-dark-foreground/50 transition-colors hover:text-section-dark-foreground/80" to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="text-xs text-section-dark-foreground/40">© 2026 Zodo Inc. All rights reserved.</div>
          </div>
        </div>
      </SectionShell>
    </footer>
  );
}
