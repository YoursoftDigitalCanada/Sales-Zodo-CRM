export type SiteNavLink = {
  label: string;
  href: string;
};

export type SiteMedia = {
  heroBackground: string;
  estimatorRoof: string;
  contractorTablet: string;
  handshake: string;
  texture: string;
};

export type StatItem = {
  value: string;
  label: string;
};

export type WorkflowStep = {
  title: string;
  description: string;
};

export type FeatureItem = {
  title: string;
  description: string;
};

export type ProductSection = {
  title: string;
  description: string;
  points: string[];
};

export type SolutionsAudience = {
  title: string;
  description: string;
};

export type EstimatorStep = {
  title: string;
  description: string;
};

export type PricingTier = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export type PricingFaq = {
  question: string;
  answer: string;
};

export const media: SiteMedia = {
  heroBackground:
    "https://images.unsplash.com/photo-1519662978799-2f05096d3636?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3NzYyMDAwMzd8MA&ixlib=rb-4.1.0&q=85",
  estimatorRoof:
    "https://images.unsplash.com/photo-1608015311754-0f49fd259557?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBob3VzZSUyMHJvb2YlMjBhZXJpYWx8ZW58MHx8fHwxNzc2MjAwMDI3fDA&ixlib=rb-4.1.0&q=85",
  contractorTablet:
    "https://images.unsplash.com/photo-1627820751059-43001b92c076?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxjb250cmFjdG9yJTIwdXNpbmclMjB0YWJsZXR8ZW58MHx8fHwxNzc2MjAwMDI3fDA&ixlib=rb-4.1.0&q=85",
  handshake:
    "https://images.unsplash.com/photo-1559056961-a6b61993c0f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxjb250cmFjdG9yJTIwdXNpbmclMjB0YWJsZXR8ZW58MHx8fHwxNzc2MjAwMDI3fDA&ixlib=rb-4.1.0&q=85",
  texture:
    "https://images.unsplash.com/photo-1531591022136-eb8b0da1e6d0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTJ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8fDE3NzYyMDAwMzd8MA&ixlib=rb-4.1.0&q=85",
};

export const navLinks: SiteNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Solutions", href: "/solutions" },
  { label: "Automation", href: "/product/customer-crm" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const homeStats: StatItem[] = [
  { value: "Lead -> Payment", label: "The full sales revenue pipeline is kept in one system." },
  { value: "One record", label: "Contacts, companies, deals, documents, invoices, and payments stay connected." },
  { value: "Action Center", label: "Daily priorities surface follow-ups, proposals, tasks, and invoices." },
  { value: "Built for sales", label: "Sales, success, finance, and operations stay aligned." },
];

export const workflowSteps: WorkflowStep[] = [
  {
    title: "Lead comes in",
    description: "Every opportunity starts with clean intake, clear ownership, and immediate action.",
  },
  {
    title: "Proposal gets prepared",
    description: "Use customer and deal context to move pricing, documents, and approvals faster.",
  },
  {
    title: "Client approves",
    description: "The estimate becomes active work with less back-and-forth and less delay.",
  },
  {
    title: "Deal progresses",
    description: "Tasks, deadlines, documents, and updates stay connected inside the same workflow.",
  },
  {
    title: "Invoice and payment",
    description: "Billing stays tied to job reality so revenue is easier to collect and protect.",
  },
];

export const homeFeatures: FeatureItem[] = [
  {
    title: "Lead-to-deal automation",
    description: "Capture the inquiry, assign an owner, and move toward a proposal faster.",
  },
  {
    title: "Action-driven dashboard",
    description: "The system tells the team what deserves attention today instead of burying work in passive screens.",
  },
  {
    title: "Auto invoice builder",
    description: "Finance stays tied to deal progress so teams stop rebuilding invoices from scratch.",
  },
  {
    title: "Missed revenue alerts",
    description: "ZODO surfaces stalled deals, overdue invoices, and pipeline leaks before money disappears.",
  },
];

export const productSections: ProductSection[] = [
  {
    title: "Action Center",
    description: "A clear command layer for follow-ups, pending proposals, scheduled meetings, and overdue invoices.",
    points: ["Today's priorities", "No missed next steps", "Sales + operations visibility"],
  },
  {
    title: "Deals and team control",
    description: "Track progress, assignments, documents, and deadlines around the real customer opportunity instead of isolated records.",
    points: ["Kanban pipeline", "File manager", "Field coordination"],
  },
  {
    title: "Finance tied to execution",
    description: "Proposals, invoices, and payments stay close to deal movement so cash flow remains visible.",
    points: ["Proposal approvals", "Auto-built invoicing", "Payment tracking"],
  },
  {
    title: "Revenue alerting",
    description: "Spot pipeline risk, delayed payments, and deals stuck in negotiation before revenue slips away.",
    points: ["Proposal aging", "Invoice risk", "Missed follow-up detection"],
  },
];

export const solutionsAudiences: SolutionsAudience[] = [
  {
    title: "Sales leaders",
    description: "Get one operating system to understand what is moving, what is stuck, and where revenue is leaking.",
  },
  {
    title: "Sales teams",
    description: "Quote faster, stay on top of follow-ups, and convert more opportunities without admin drag.",
  },
  {
    title: "Operations leaders",
    description: "Coordinate tasks, meetings, paperwork, and finance with less context loss between stages.",
  },
];

export const solutionOutcomes = [
  "Faster proposal creation for new opportunities",
  "Better follow-up control for leads and negotiations",
  "Cleaner handoff from signed proposal to customer onboarding",
  "Fewer missed invoices and easier payment visibility",
  "More confidence for teams running sales and operations together",
  "Stronger positioning for companies scaling revenue",
];

export const estimatorSteps: EstimatorStep[] = [
  {
    title: "Enter the address",
    description: "Start with a clean customer and company record instead of asking the team to rebuild context.",
  },
  {
    title: "ZODO organizes the sales context",
    description: "The system keeps lead source, owner, contact, deal, and proposal inputs available for speed.",
  },
  {
    title: "Proposal workflow begins",
    description: "The deal becomes the launch point for faster proposal, approval, and customer conversion.",
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$99/mo",
    description: "For smaller teams getting off spreadsheets and disconnected follow-up systems.",
    features: ["Lead + customer CRM", "Tasks and calendar", "Basic proposal workflow"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$249/mo",
    description: "For growing sales teams that want automation, deal control, and stronger revenue visibility.",
    features: ["Sales automation", "Deals + invoicing", "Action Center + revenue alerts"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For multi-team businesses that need advanced workflows, permissions, and process control.",
    features: ["Advanced team management", "Custom workflow support", "Priority onboarding"],
    cta: "Talk to Sales",
    highlight: false,
  },
];

export const pricingFaqs: PricingFaq[] = [
  {
    question: "Are these final prices?",
    answer: "These are placeholder pricing options for the current marketing build and can be replaced with your final commercial model anytime.",
  },
  {
    question: "Can teams start with CRM and automation first?",
    answer: "Yes. Teams can start with lead and deal workflows, then expand into documents, invoicing, reporting, and bookkeeping over time.",
  },
  {
    question: "Do all plans support sales workflows?",
    answer: "Yes. Every tier is framed around lead management, deal movement, follow-up, document workflows, and revenue control.",
  },
];

export const contactBullets = [
  "Start a free-trial conversation",
  "Request an automation walkthrough",
  "Show how ZODO fits your sales process",
  "Plan the move from scattered tools to one system",
];

export const whyZodoItems = [
  "Lead-to-deal automation positioning",
  "Action-driven workflow for sales teams",
  "Lead, proposal, contract, invoice, payment in one system",
];
