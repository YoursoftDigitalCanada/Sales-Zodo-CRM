import {
  Building2,
  CloudLightning,
  Home,
  Network,
  type LucideIcon,
} from "lucide-react";

export type SolutionFeatureSlug =
  | "residential-roofers"
  | "commercial-roofing"
  | "storm-restoration"
  | "multi-location";

export interface SolutionFeatureContent {
  slug: SolutionFeatureSlug;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  heroSummary: string;
  icon: LucideIcon;
  color: "cyan" | "green" | "orange";
  bestFor: string;
  primaryCta: string;
  primaryCtaHref: string;
  secondaryCta: string;
  secondaryCtaHref: string;
  featureBullets: string[];
  sections: Array<{
    title: string;
    description: string;
    points: string[];
  }>;
  outcomes: string[];
}

export const solutionFeaturePages: SolutionFeatureContent[] = [
  {
    slug: "residential-roofers",
    title: "Residential Roofers",
    shortTitle: "Residential",
    eyebrow: "Solutions",
    description:
      "A tighter operating system for residential roofing teams that need to move from lead to estimate to signed job without losing follow-up or homeowner confidence.",
    heroSummary:
      "ZODO helps residential roofers respond faster, quote faster, and keep the entire homeowner journey connected through CRM, estimating, jobs, invoicing, and communication.",
    icon: Home,
    color: "cyan",
    bestFor:
      "Residential roofers who rely on fast follow-up, clean homeowner communication, and quicker estimate-to-close motion.",
    primaryCta: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCta: "Book residential demo",
    secondaryCtaHref: "/contact",
    featureBullets: [
      "AI Roof Estimator for faster first response",
      "Lead and client CRM tied to real jobs",
      "Proposal, invoice, and payment continuity",
      "Zodo Mail, Chats, and alerts in one workspace",
    ],
    sections: [
      {
        title: "Respond while homeowner intent is still active",
        description:
          "Residential roofing is often won by speed and clarity. ZODO is built to make first response and follow-up easier to manage.",
        points: [
          "Faster lead intake",
          "Cleaner follow-up visibility",
          "Less homeowner drop-off",
        ],
      },
      {
        title: "Turn address-first estimating into a sales advantage",
        description:
          "The estimator helps teams start quoting faster, then keeps the estimate context connected to the rest of the sales process.",
        points: [
          "Address-to-estimate workflow",
          "Proposal-ready momentum",
          "Faster move toward signed work",
        ],
      },
      {
        title: "Keep the homeowner experience organized",
        description:
          "Customer records, communication, jobs, invoices, and updates stay close together so teams can present a more professional operation.",
        points: [
          "Customer history in one place",
          "Communication continuity",
          "Job and finance visibility",
        ],
      },
    ],
    outcomes: [
      "Quote residential jobs faster",
      "Reduce missed follow-up",
      "Improve homeowner communication",
      "Carry sales momentum into production and billing",
    ],
  },
  {
    slug: "commercial-roofing",
    title: "Commercial Roofing",
    shortTitle: "Commercial",
    eyebrow: "Solutions",
    description:
      "Bring more structure to larger jobs, broader stakeholder communication, and more complex production and billing workflows.",
    heroSummary:
      "ZODO gives commercial roofing teams a single workspace to manage leads, clients, active jobs, files, teams, finance, and communication without scattering context across tools.",
    icon: Building2,
    color: "green",
    bestFor:
      "Commercial roofing teams that need stronger control over larger accounts, more stakeholders, longer cycles, and more operational coordination.",
    primaryCta: "Talk to sales",
    primaryCtaHref: "/contact",
    secondaryCta: "See commercial workflow",
    secondaryCtaHref: "/contact",
    featureBullets: [
      "Client, job, and file visibility for bigger projects",
      "Team and permission structure for more complex operations",
      "Kanban and All Jobs views for production clarity",
      "Invoices and payments tied to job progression",
    ],
    sections: [
      {
        title: "Manage longer and more complex sales cycles",
        description:
          "Commercial deals often involve more stakeholders, more documentation, and more follow-up pressure than a simple residential job.",
        points: [
          "Lead-to-client continuity",
          "Clear opportunity visibility",
          "Better account control",
        ],
      },
      {
        title: "Run production with more operational discipline",
        description:
          "As project size grows, teams need clearer boards, file access, and internal coordination around the work.",
        points: [
          "All Jobs visibility",
          "Kanban workflow tracking",
          "File Manager for project context",
        ],
      },
      {
        title: "Keep finance and communication attached to the account",
        description:
          "Commercial teams benefit when invoices, payments, client messaging, and operational status stay visible together.",
        points: [
          "Client-linked finance",
          "Operational communication context",
          "More dependable billing follow-through",
        ],
      },
    ],
    outcomes: [
      "Handle larger projects with less fragmentation",
      "Improve internal coordination",
      "Keep account context visible",
      "Tie project execution to revenue follow-through",
    ],
  },
  {
    slug: "storm-restoration",
    title: "Storm Restoration",
    shortTitle: "Storm Restoration",
    eyebrow: "Solutions",
    description:
      "Move faster in high-volume, high-urgency roofing cycles where inspection, communication, and follow-up discipline decide revenue.",
    heroSummary:
      "Storm restoration teams can use ZODO to keep intake, estimating, inspection, communication, and downstream job and billing steps moving in one coordinated system.",
    icon: CloudLightning,
    color: "orange",
    bestFor:
      "Storm restoration roofers who need rapid lead response, stronger inspection coordination, and better pipeline control under pressure.",
    primaryCta: "Start free trial",
    primaryCtaHref: "/signup",
    secondaryCta: "Book storm demo",
    secondaryCtaHref: "/contact",
    featureBullets: [
      "Fast-response CRM and lead handling",
      "AI estimator + inspections in the same stack",
      "Communication tools for urgent follow-up",
      "Cleaner job and finance handoff after approval",
    ],
    sections: [
      {
        title: "React faster when volume spikes",
        description:
          "Storm demand creates pipeline pressure quickly. Teams need intake, follow-up, and prioritization that can keep up.",
        points: [
          "Rapid lead handling",
          "Better response discipline",
          "Clearer action visibility",
        ],
      },
      {
        title: "Keep inspection and estimate context together",
        description:
          "The storm workflow is stronger when roof context, inspection details, and estimate activity stay in the same system.",
        points: [
          "Inspection-linked workflow",
          "Estimate continuity",
          "Fewer disconnected handoffs",
        ],
      },
      {
        title: "Move urgency into real operational follow-through",
        description:
          "Once work is approved, teams still need clean job management, file access, invoicing, and payment visibility.",
        points: [
          "Job-ready workflow",
          "Customer communication continuity",
          "Revenue protection after approval",
        ],
      },
    ],
    outcomes: [
      "Handle spikes more confidently",
      "Reduce storm-season chaos",
      "Keep inspections tied to estimating",
      "Protect follow-up and cash flow under pressure",
    ],
  },
  {
    slug: "multi-location",
    title: "Multi-location",
    shortTitle: "Multi-location",
    eyebrow: "Solutions",
    description:
      "Keep distributed roofing teams aligned with a clearer workspace for CRM, jobs, finance, team structure, and connected operating controls.",
    heroSummary:
      "ZODO helps multi-location roofing businesses organize work with stronger visibility across users, employees, permissions, jobs, communication, and revenue activity.",
    icon: Network,
    color: "cyan",
    bestFor:
      "Roofing businesses operating across multiple crews, markets, or locations that need more internal consistency and easier oversight.",
    primaryCta: "Talk to sales",
    primaryCtaHref: "/contact",
    secondaryCta: "Book multi-location demo",
    secondaryCtaHref: "/contact",
    featureBullets: [
      "Users, Employees, and Roles as first-class controls",
      "Shared CRM, jobs, files, and finance visibility",
      "Communication and notifications in one workspace",
      "A cleaner operating surface across distributed teams",
    ],
    sections: [
      {
        title: "Create a more consistent operating model",
        description:
          "As locations multiply, the system matters more. Teams need one environment that keeps workflows recognizable and easier to govern.",
        points: [
          "Shared workflow model",
          "Cleaner cross-team visibility",
          "Less process drift",
        ],
      },
      {
        title: "Make team structure more explicit",
        description:
          "ZODO surfaces Employees, Users, and Roles so access and responsibility are clearer as the organization grows.",
        points: [
          "User control",
          "Permission structure",
          "Better operational accountability",
        ],
      },
      {
        title: "Keep revenue and communication centralized",
        description:
          "Jobs, invoices, payments, inbox activity, chats, and notifications become easier to track when they stay in the same system.",
        points: [
          "Centralized CRM and jobs",
          "Finance visibility",
          "Unified communication surface",
        ],
      },
    ],
    outcomes: [
      "Run distributed teams with more consistency",
      "Improve visibility across locations",
      "Clarify team roles and access",
      "Centralize communication and revenue tracking",
    ],
  },
];

export const solutionFeatureMap: Record<SolutionFeatureSlug, SolutionFeatureContent> = solutionFeaturePages.reduce(
  (accumulator, item) => {
    accumulator[item.slug] = item;
    return accumulator;
  },
  {} as Record<SolutionFeatureSlug, SolutionFeatureContent>,
);

export const solutionFeatureNav = solutionFeaturePages.map((item) => ({
  label: item.title,
  to: `/solutions/${item.slug}`,
  slug: item.slug,
}));

export const solutionOverviewCards = solutionFeaturePages.map((item) => ({
  title: item.title,
  description: item.description,
  to: `/solutions/${item.slug}`,
  icon: item.icon,
}));
