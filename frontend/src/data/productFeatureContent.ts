import {
  Blocks,
  Bot,
  BriefcaseBusiness,
  FileCheck2,
  ReceiptText,
  Smartphone,
  Users2,
  type LucideIcon,
} from "lucide-react";

export type ProductFeatureSlug =
  | "ai-roof-estimator"
  | "job-management"
  | "customer-crm"
  | "proposals"
  | "invoicing"
  | "mobile-app";

export interface ProductFeatureContent {
  slug: ProductFeatureSlug;
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

export const productFeaturePages: ProductFeatureContent[] = [
  {
    slug: "ai-roof-estimator",
    title: "AI Roof Estimator",
    shortTitle: "AI Estimator",
    eyebrow: "Business",
    description:
      "Address-first roof estimation built directly into the CRM so quoting starts faster and stays connected to the rest of the job lifecycle.",
    heroSummary:
      "Start from the property address, generate the estimate faster, and carry the result straight into customer, job, proposal, and billing workflows.",
    icon: Bot,
    color: "cyan",
    bestFor:
      "Roofing teams that want faster first response, cleaner quoting, and a better bridge from lead intake to signed work.",
    primaryCta: "Start free trial",
    secondaryCta: "Book estimator demo",
    featureBullets: [
      "Address-based estimate initiation",
      "Roof measurement and pricing context",
      "Connected estimate-to-job workflow",
      "Built into the broader ZODO workspace",
    ],
    sections: [
      {
        title: "Start from the property, not a spreadsheet",
        description:
          "The estimator is designed for speed at the point of demand, so reps can move while interest is fresh.",
        points: [
          "Property-address intake",
          "Faster estimating motion",
          "Less manual setup before quoting",
        ],
      },
      {
        title: "Tie estimate output to the rest of the business",
        description:
          "Generated estimate context can feed the customer record, job planning, proposal creation, and finance activity.",
        points: [
          "Lead-to-estimate continuity",
          "Job-ready estimate context",
          "Clearer downstream handoff",
        ],
      },
      {
        title: "Keep the estimator inside the operating system",
        description:
          "Teams do not need a separate estimating tool and a separate CRM story when the sales workflow can stay in one place.",
        points: [
          "Same workspace as CRM",
          "Same workspace as inspections",
          "Same workspace as invoicing",
        ],
      },
    ],
    outcomes: [
      "Generate estimates faster",
      "Reduce context switching",
      "Move from lead to quote with less friction",
      "Give homeowners a more responsive experience",
    ],
  },
  {
    slug: "job-management",
    title: "Job Management",
    shortTitle: "Job Management",
    eyebrow: "Operations",
    description:
      "Manage every roofing job with clearer production visibility, board-level control, and connected files, tasks, and teams.",
    heroSummary:
      "From signed work to completed installation, ZODO keeps jobs visible through boards, file management, scheduling context, and operational follow-through.",
    icon: BriefcaseBusiness,
    color: "green",
    bestFor:
      "Roofing operators who need one place to manage active work, production momentum, and crew-facing coordination.",
    primaryCta: "Start free trial",
    secondaryCta: "Talk to sales",
    featureBullets: [
      "All Jobs and Kanban board views",
      "File Manager attached to real work",
      "Task and schedule context",
      "Clearer lead-to-job-to-completion flow",
    ],
    sections: [
      {
        title: "Move work across real stages",
        description:
          "Jobs are not static records. They need visible progression from approval through production and closeout.",
        points: [
          "All Jobs workspace",
          "Kanban production visibility",
          "Stage-based operational clarity",
        ],
      },
      {
        title: "Keep documents close to the job",
        description:
          "Files, internal references, and customer-facing documents stay attached to the work instead of getting scattered across tools.",
        points: [
          "Job-linked file access",
          "Operational documentation",
          "Cleaner internal handoff",
        ],
      },
      {
        title: "Support field and office in the same view",
        description:
          "Tasks, status, communication, and billing context stay near the production record so teams do not lose momentum.",
        points: [
          "Task visibility",
          "Production-aligned workflow",
          "Better coordination across roles",
        ],
      },
    ],
    outcomes: [
      "See job progress faster",
      "Reduce operational blind spots",
      "Organize production around reality",
      "Keep field and office aligned",
    ],
  },
  {
    slug: "customer-crm",
    title: "Customer CRM",
    shortTitle: "Customer CRM",
    eyebrow: "CRM",
    description:
      "Track leads, clients, and customer communication in a roofing workflow designed for real follow-up and revenue control.",
    heroSummary:
      "ZODO keeps the customer journey visible from first lead through active client, live job, and future opportunities without splitting the story across systems.",
    icon: Users2,
    color: "orange",
    bestFor:
      "Roofers who need better lead follow-up, cleaner client records, and a CRM that actually connects to operations and cash flow.",
    primaryCta: "Start free trial",
    secondaryCta: "See CRM walkthrough",
    featureBullets: [
      "Leads and Clients in one connected model",
      "Zodo Mail and Chats inside the workspace",
      "Job and invoice context tied to customers",
      "Less follow-up leakage across the pipeline",
    ],
    sections: [
      {
        title: "Keep the lead pipeline connected",
        description:
          "The CRM starts with leads but does not stop there. It follows the customer across the rest of the revenue path.",
        points: [
          "Lead visibility",
          "Client conversion continuity",
          "Pipeline-aware CRM flow",
        ],
      },
      {
        title: "Bring communication into the record",
        description:
          "Inbox, chat, support, and notification context help teams understand what is happening without bouncing between tools.",
        points: [
          "Zodo Mail",
          "Chats and alerts",
          "Customer communication context",
        ],
      },
      {
        title: "Tie CRM to job and finance reality",
        description:
          "The customer record becomes more useful when it is connected to estimates, jobs, invoices, and payment status.",
        points: [
          "Estimate visibility",
          "Job connection",
          "Finance awareness",
        ],
      },
    ],
    outcomes: [
      "Respond to leads faster",
      "Reduce missed follow-up",
      "See customer history more clearly",
      "Tie CRM activity to revenue movement",
    ],
  },
  {
    slug: "proposals",
    title: "Proposals",
    shortTitle: "Proposals",
    eyebrow: "Sales",
    description:
      "Turn roofing opportunity context into cleaner proposal flows that help teams present, follow up, and move jobs forward with less delay.",
    heroSummary:
      "ZODO positions proposals as part of the same sales and CRM motion, so estimate context, customer context, and next steps stay aligned.",
    icon: FileCheck2,
    color: "cyan",
    bestFor:
      "Sales-led roofing teams that want to move from estimate to customer-ready proposal without rebuilding the story by hand.",
    primaryCta: "Start free trial",
    secondaryCta: "Book a demo",
    featureBullets: [
      "Proposal-ready sales flow",
      "Estimate-linked customer context",
      "Cleaner handoff into approvals",
      "Closer connection to jobs and invoicing",
    ],
    sections: [
      {
        title: "Use estimate context as the proposal foundation",
        description:
          "Proposal work moves faster when the roof estimate and customer details are already in the same environment.",
        points: [
          "Estimate-informed proposals",
          "Less manual rebuild work",
          "Cleaner sales continuity",
        ],
      },
      {
        title: "Keep proposal momentum visible",
        description:
          "Proposal work should live inside the same flow as follow-up, pipeline management, and job conversion.",
        points: [
          "Sales-stage visibility",
          "Next-step tracking",
          "Reduced proposal drift",
        ],
      },
      {
        title: "Connect the sale to downstream operations",
        description:
          "When a proposal is accepted, the rest of the system should already be ready for the next phase.",
        points: [
          "Approval handoff",
          "CRM continuity",
          "Job and billing readiness",
        ],
      },
    ],
    outcomes: [
      "Send proposals faster",
      "Reduce manual prep time",
      "Improve estimate-to-close continuity",
      "Keep sales momentum visible",
    ],
  },
  {
    slug: "invoicing",
    title: "Invoicing",
    shortTitle: "Invoicing",
    eyebrow: "Finance",
    description:
      "Build invoicing into the same workflow as jobs, customers, and payments so the revenue layer reflects what is really happening on the ground.",
    heroSummary:
      "ZODO keeps estimates, invoices, and payments near the work itself, which makes cash collection and financial follow-through easier to manage.",
    icon: ReceiptText,
    color: "green",
    bestFor:
      "Roofing businesses that want finance tools tied closely to job execution instead of handled in a separate disconnected admin loop.",
    primaryCta: "Start free trial",
    secondaryCta: "See pricing",
    featureBullets: [
      "Invoices connected to customers and jobs",
      "Payment visibility in the same workspace",
      "Estimate-to-invoice continuity",
      "Revenue awareness tied to real workflow",
    ],
    sections: [
      {
        title: "Invoice from operational reality",
        description:
          "When invoicing follows the actual job and customer flow, teams can bill with more confidence and less rework.",
        points: [
          "Job-aware invoicing",
          "Client-linked billing",
          "Cleaner finance handoff",
        ],
      },
      {
        title: "Track payments where the work lives",
        description:
          "The finance view becomes more useful when payment status sits close to jobs, customers, and outstanding action.",
        points: [
          "Payment visibility",
          "Collection awareness",
          "Less finance fragmentation",
        ],
      },
      {
        title: "Turn the revenue path into one flow",
        description:
          "Estimate, proposal, invoice, and payment should not feel like separate software journeys for the team.",
        points: [
          "Connected revenue journey",
          "Lower admin drag",
          "Clearer cash flow view",
        ],
      },
    ],
    outcomes: [
      "Invoice with less friction",
      "Track collections faster",
      "Reduce revenue blind spots",
      "Keep finance aligned with operations",
    ],
  },
  {
    slug: "mobile-app",
    title: "Mobile App",
    shortTitle: "Mobile App",
    eyebrow: "Field access",
    description:
      "Give field and mobile teams access to the same system so customer, job, and communication context does not disappear when work leaves the office.",
    heroSummary:
      "ZODO’s mobile positioning is about keeping the roofing operating system available where crews, reps, and managers actually work, not just at a desktop.",
    icon: Smartphone,
    color: "orange",
    bestFor:
      "Roofing companies with reps, coordinators, or field teams who need faster access to customer, job, and workflow context while moving.",
    primaryCta: "Start free trial",
    secondaryCta: "Book mobile demo",
    featureBullets: [
      "Mobile-friendly access to core workflows",
      "Customer and job context on the move",
      "Better team continuity across locations",
      "Field-friendly visibility into work status",
    ],
    sections: [
      {
        title: "Keep the workspace available outside the office",
        description:
          "Mobile access matters when roofing work happens at job sites, in driveways, on calls, and between appointments.",
        points: [
          "On-the-go access",
          "Field-friendly visibility",
          "Faster status checks",
        ],
      },
      {
        title: "Bring customer and job context with the team",
        description:
          "When the record stays available, reps and crews can act with better timing and better information.",
        points: [
          "Customer detail access",
          "Job awareness on site",
          "Less reliance on manual updates",
        ],
      },
      {
        title: "Support a real distributed workflow",
        description:
          "Field, office, and leadership teams can stay inside the same operating surface instead of falling back to text threads and memory.",
        points: [
          "Stronger team alignment",
          "Fewer disconnected updates",
          "Better workflow continuity",
        ],
      },
    ],
    outcomes: [
      "Work faster in the field",
      "Keep context while mobile",
      "Reduce communication gaps",
      "Support a more responsive team",
    ],
  },
];

export const productFeatureMap: Record<ProductFeatureSlug, ProductFeatureContent> = productFeaturePages.reduce(
  (accumulator, item) => {
    accumulator[item.slug] = item;
    return accumulator;
  },
  {} as Record<ProductFeatureSlug, ProductFeatureContent>,
);

export const productFeatureNav = productFeaturePages.map((item) => ({
  label: item.title,
  to: `/product/${item.slug}`,
  slug: item.slug,
}));

export const productOverviewCards = [
  {
    title: "AI Roof Estimator",
    description: "Address-first estimating that feeds the rest of the roofing workflow.",
    to: "/product/ai-roof-estimator",
    icon: Bot,
  },
  {
    title: "Job Management",
    description: "Track production, files, tasks, and progress with clearer job visibility.",
    to: "/product/job-management",
    icon: BriefcaseBusiness,
  },
  {
    title: "Customer CRM",
    description: "Keep leads, clients, jobs, and communication in one connected system.",
    to: "/product/customer-crm",
    icon: Users2,
  },
  {
    title: "Proposals",
    description: "Move from estimate context to proposal flow with less friction.",
    to: "/product/proposals",
    icon: FileCheck2,
  },
  {
    title: "Invoicing",
    description: "Tie invoices and payment visibility directly to real work progress.",
    to: "/product/invoicing",
    icon: ReceiptText,
  },
  {
    title: "Mobile App",
    description: "Keep your roofing workflow available for field and mobile teams.",
    to: "/product/mobile-app",
    icon: Smartphone,
  },
  {
    title: "One connected stack",
    description: "The strength of ZODO is how CRM, jobs, comms, AI, and finance fit together.",
    to: "/product",
    icon: Blocks,
  },
];
