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
  { label: "AI Estimator", href: "/ai-estimator" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export const homeStats: StatItem[] = [
  { value: "Address-first", label: "AI estimator starts with property location, not photo upload." },
  { value: "Lead -> Payment", label: "The full roofing money pipeline is kept in one system." },
  { value: "Action Center", label: "Daily priorities surface follow-ups, visits, estimates, and invoices." },
  { value: "Built for roofers", label: "Field teams, sales teams, and operations stay aligned." },
];

export const workflowSteps: WorkflowStep[] = [
  {
    title: "Lead comes in",
    description: "Every opportunity starts with clean intake, clear ownership, and immediate action.",
  },
  {
    title: "Estimate gets generated",
    description: "Use address-based AI estimation or manual workflow to move quoting faster.",
  },
  {
    title: "Client approves",
    description: "The estimate becomes active work with less back-and-forth and less delay.",
  },
  {
    title: "Job progresses",
    description: "Crews, deadlines, documents, and updates stay connected inside the same workflow.",
  },
  {
    title: "Invoice and payment",
    description: "Billing stays tied to job reality so revenue is easier to collect and protect.",
  },
];

export const homeFeatures: FeatureItem[] = [
  {
    title: "Address-to-estimate AI",
    description: "Enter the property address, let ZODO analyze roof data, and move toward an estimate faster.",
  },
  {
    title: "Action-driven dashboard",
    description: "The system tells the team what deserves attention today instead of burying work in passive screens.",
  },
  {
    title: "Auto invoice builder",
    description: "Finance stays tied to job progress so teams stop rebuilding invoices from scratch.",
  },
  {
    title: "Missed revenue alerts",
    description: "ZODO surfaces stalled deals, overdue invoices, and pipeline leaks before money disappears.",
  },
];

export const productSections: ProductSection[] = [
  {
    title: "Action Center",
    description: "A clear command layer for follow-ups, pending estimates, scheduled visits, and overdue invoices.",
    points: ["Today's priorities", "No missed next steps", "Sales + operations visibility"],
  },
  {
    title: "Jobs and crew control",
    description: "Track progress, crew assignments, documents, and deadlines around the real job instead of isolated records.",
    points: ["Kanban pipeline", "File manager", "Field coordination"],
  },
  {
    title: "Finance tied to execution",
    description: "Estimates, invoices, and payments stay close to job movement so cash flow remains visible.",
    points: ["Estimate approvals", "Auto-built invoicing", "Payment tracking"],
  },
  {
    title: "Revenue alerting",
    description: "Spot pipeline risk, delayed payments, and deals stuck in negotiation before revenue slips away.",
    points: ["Estimate aging", "Invoice risk", "Missed follow-up detection"],
  },
];

export const solutionsAudiences: SolutionsAudience[] = [
  {
    title: "Roofing owners",
    description: "Get one operating system to understand what is moving, what is stuck, and where revenue is leaking.",
  },
  {
    title: "Sales teams",
    description: "Quote faster, stay on top of follow-ups, and convert more opportunities without admin drag.",
  },
  {
    title: "Operations leaders",
    description: "Coordinate crews, site visits, paperwork, and finance with less context loss between stages.",
  },
];

export const solutionOutcomes = [
  "Faster estimating for residential and commercial jobs",
  "Better follow-up control for leads and negotiations",
  "Cleaner handoff from signed estimate to live job",
  "Fewer missed invoices and easier payment visibility",
  "More confidence for teams running field + office together",
  "Stronger positioning for roofing companies scaling revenue",
];

export const estimatorSteps: EstimatorStep[] = [
  {
    title: "Enter the address",
    description: "Start with a property location instead of asking the customer to upload images or wait on manual steps.",
  },
  {
    title: "ZODO analyzes roof data",
    description: "The system interprets the property context, roof characteristics, and estimating inputs needed for speed.",
  },
  {
    title: "Estimate workflow begins",
    description: "The address becomes the launch point for faster quoting, approval, and job conversion.",
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$99/mo",
    description: "For smaller crews getting off spreadsheets and disconnected follow-up systems.",
    features: ["Lead + client CRM", "Tasks and calendar", "Basic estimating workflow"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$249/mo",
    description: "For growing roofing teams that want AI estimation, job control, and stronger revenue visibility.",
    features: ["Address-based AI estimator", "Jobs + invoicing", "Action Center + revenue alerts"],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For multi-team roofing businesses that need advanced workflows, permissions, and process control.",
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
    question: "Can teams start with AI estimation first?",
    answer: "Yes. The pricing story is designed so the AI estimator can act as the hook while the rest of the CRM expands the value over time.",
  },
  {
    question: "Do all plans support roofing workflows?",
    answer: "Yes. Every tier is framed around roofing-specific estimating, operational workflow, and revenue control rather than generic CRM admin.",
  },
];

export const contactBullets = [
  "Start a free-trial conversation",
  "Request an AI estimate walkthrough",
  "Show how ZODO fits your roofing sales process",
  "Plan the move from scattered tools to one system",
];

export const whyZodoItems = [
  "Address-based AI estimator positioning",
  "Action-driven workflow for roofing teams",
  "Lead, estimate, job, invoice, payment in one system",
];
