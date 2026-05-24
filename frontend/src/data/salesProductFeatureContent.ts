import { BriefcaseBusiness, FileCheck2, ReceiptText, Smartphone, Users2, type LucideIcon } from "lucide-react";

export type SalesProductFeatureSlug = "job-management" | "customer-crm" | "proposals" | "invoicing" | "mobile-app";

export interface SalesProductFeatureContent {
  slug: SalesProductFeatureSlug;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  heroSummary: string;
  icon: LucideIcon;
  color: "cyan" | "green" | "orange";
  bestFor: string;
  primaryCta: string;
  secondaryCta: string;
  featureBullets: string[];
  sections: Array<{
    title: string;
    description: string;
    points: string[];
  }>;
  outcomes: string[];
}

export const salesProductFeaturePages: SalesProductFeatureContent[] = [
  {
    slug: "job-management",
    title: "Deals and Pipeline",
    shortTitle: "Pipeline",
    eyebrow: "Revenue operations",
    description: "Manage opportunities with clear stages, next steps, owners, values, close dates, and activity history.",
    heroSummary: "Keep every opportunity moving from first conversation to closed revenue with stage-based visibility and automation.",
    icon: BriefcaseBusiness,
    color: "green",
    bestFor: "Sales teams that need one place to coordinate deal progress, tasks, documents, and revenue forecasts.",
    primaryCta: "Start free trial",
    secondaryCta: "Talk to sales",
    featureBullets: ["Pipeline stage tracking", "Deal value and close dates", "Owner and task visibility", "Proposal and invoice links"],
    sections: [
      {
        title: "Track every active opportunity",
        description: "Keep status, owner, value, contacts, documents, and next steps tied to the deal record.",
        points: ["Stage-based workflow", "Expected revenue visibility", "Linked contacts and companies"],
      },
      {
        title: "Create consistent follow-up",
        description: "Turn stage changes into tasks, reminders, owner notifications, and clean handoffs.",
        points: ["Automated next steps", "Stale deal reminders", "Manager visibility"],
      },
      {
        title: "Connect sales to revenue",
        description: "Move accepted work into contracts, invoices, documents, and bookkeeping without duplicate entry.",
        points: ["Proposal-to-contract flow", "Invoice handoff", "Customer success tasks"],
      },
    ],
    outcomes: ["Cleaner pipeline reviews", "Fewer missed follow-ups", "Better forecast visibility", "Faster handoff after close"],
  },
  {
    slug: "customer-crm",
    title: "Customer CRM",
    shortTitle: "CRM",
    eyebrow: "Customer records",
    description: "Manage leads, contacts, companies, communication, tasks, notes, documents, and lifecycle status in one workspace.",
    heroSummary: "A connected customer record gives sales, service, and operations the same source of truth.",
    icon: Users2,
    color: "cyan",
    bestFor: "Teams that need complete visibility across lead intake, account history, communication, and customer follow-up.",
    primaryCta: "Start free trial",
    secondaryCta: "Book CRM demo",
    featureBullets: ["Lead and contact records", "Company/account history", "Tasks and notes", "Lifecycle tracking"],
    sections: [
      {
        title: "Start with complete customer context",
        description: "Keep people, companies, conversations, notes, and documents attached to the same record.",
        points: ["Contacts and companies", "Lead source context", "Timeline activity"],
      },
      {
        title: "Keep owners accountable",
        description: "Assign records, schedule follow-up, and show the next action without searching across tools.",
        points: ["Owner assignment", "Follow-up tasks", "Notifications"],
      },
      {
        title: "Carry context after the sale",
        description: "Move customers into onboarding and customer success without losing their sales history.",
        points: ["Lifecycle status", "Customer success tasks", "Document history"],
      },
    ],
    outcomes: ["Better first response", "Cleaner account history", "More reliable follow-up", "Stronger customer handoffs"],
  },
  {
    slug: "proposals",
    title: "Proposals and Contracts",
    shortTitle: "Documents",
    eyebrow: "Sales documents",
    description: "Create, send, track, accept, and store sales documents while keeping them linked to deals and customers.",
    heroSummary: "Proposal and contract activity stays connected to the deal, customer record, automation, and document center.",
    icon: FileCheck2,
    color: "orange",
    bestFor: "Teams that need polished sales documents, acceptance tracking, and clean document storage.",
    primaryCta: "Start free trial",
    secondaryCta: "See documents",
    featureBullets: ["Proposal tracking", "Acceptance workflow", "Contract handoff", "Document storage"],
    sections: [
      {
        title: "Send documents from the deal",
        description: "Use customer and deal context to keep every proposal and contract tied to the right record.",
        points: ["Deal-linked documents", "Customer context", "Owner visibility"],
      },
      {
        title: "Track engagement and acceptance",
        description: "Notify owners when documents are sent, viewed, accepted, declined, or due for follow-up.",
        points: ["Viewed notifications", "Follow-up reminders", "Acceptance status"],
      },
      {
        title: "Store the final copy automatically",
        description: "Generated PDFs and accepted copies are saved into Documents with tenant-safe links.",
        points: ["PDF document automation", "Linked entity metadata", "No duplicate generated files"],
      },
    ],
    outcomes: ["Faster proposal follow-up", "Cleaner contract handoff", "Less document chasing", "Stronger sales audit trail"],
  },
  {
    slug: "invoicing",
    title: "Invoicing and Payments",
    shortTitle: "Invoicing",
    eyebrow: "Revenue",
    description: "Create invoices, send payment reminders, track payments, and sync completed revenue into bookkeeping.",
    heroSummary: "Keep billing tied to the customer and deal records your team already uses.",
    icon: ReceiptText,
    color: "green",
    bestFor: "Teams that need sales, finance, documents, reminders, payments, and bookkeeping to stay aligned.",
    primaryCta: "Start free trial",
    secondaryCta: "Talk to finance",
    featureBullets: ["Invoice status tracking", "Payment reminders", "Receipt documents", "Bookkeeping sync"],
    sections: [
      {
        title: "Create invoices from sales context",
        description: "Keep invoices connected to customers, deals, proposals, contracts, and documents.",
        points: ["Linked customers", "Source records", "Invoice PDFs"],
      },
      {
        title: "Automate reminders carefully",
        description: "Schedule due, overdue, and escalation reminders while preventing duplicate sends.",
        points: ["Email delivery status", "Task and notification channels", "Atomic reminder processing"],
      },
      {
        title: "Keep accounting accurate",
        description: "Sync payments, refunds, voids, and expenses into bookkeeping with safe idempotency.",
        points: ["Income transactions", "Refund reversals", "Reconciled transaction protection"],
      },
    ],
    outcomes: ["Cleaner collections", "Fewer missed payments", "Accurate revenue sync", "Better finance visibility"],
  },
  {
    slug: "mobile-app",
    title: "Mobile Workspace",
    shortTitle: "Mobile",
    eyebrow: "Anywhere access",
    description: "Keep contacts, deals, tasks, documents, invoices, and updates available when the team is away from a desk.",
    heroSummary: "The same sales record stays usable on calls, in meetings, and between customer conversations.",
    icon: Smartphone,
    color: "cyan",
    bestFor: "Teams that need fast customer context, follow-up, task updates, and document access from anywhere.",
    primaryCta: "Start free trial",
    secondaryCta: "Book mobile demo",
    featureBullets: ["Mobile customer context", "Task updates", "Document access", "Deal visibility"],
    sections: [
      {
        title: "Bring customer context with you",
        description: "Open the same contact, company, deal, document, and task history wherever work happens.",
        points: ["Customer records", "Deal details", "Documents"],
      },
      {
        title: "Update work while it is fresh",
        description: "Capture notes, complete tasks, and keep owners aligned without waiting to return to a desktop.",
        points: ["Task completion", "Notes", "Activity updates"],
      },
      {
        title: "Keep managers informed",
        description: "Field updates, notifications, and status changes roll back into the shared CRM workspace.",
        points: ["Status visibility", "Team notifications", "Pipeline updates"],
      },
    ],
    outcomes: ["Faster updates", "Less lost context", "Better team visibility", "More reliable customer follow-up"],
  },
];

export const salesProductFeatureMap = Object.fromEntries(
  salesProductFeaturePages.map((page) => [page.slug, page]),
) as Record<SalesProductFeatureSlug, SalesProductFeatureContent>;

export const salesProductFeatureNav = salesProductFeaturePages.map((page) => ({
  slug: page.slug,
  label: page.shortTitle,
  to: `/product/${page.slug}`,
}));
