export type CompareStatus = "strong" | "partial" | "limited";

export interface CompareModule {
  label: string;
  badge?: "new" | "soon" | "ai";
}

export interface CompareFeatureGroup {
  title: string;
  description: string;
  modules: CompareModule[];
  zodoStatus: string;
  zodoDetail: string;
  competitorStatus: CompareStatus;
  competitorSummary: string;
  competitorDetail: string;
}

export interface CompareReasonCard {
  title: string;
  description: string;
  tone: "cyan" | "green" | "orange";
}

export interface ComparePageContent {
  slug: "jobnimbus" | "acculynx" | "roofr" | "jobprogress" | "leap";
  competitorName: string;
  heroTitle: string;
  heroDescription: string;
  competitorSnapshot: string[];
  zodoSnapshot: string[];
  competitorBestFor: string;
  zodoBestFor: string;
  notes?: string[];
  reasonCards: CompareReasonCard[];
  featureGroups: CompareFeatureGroup[];
}

const platformGroups: Omit<CompareFeatureGroup, "competitorStatus" | "competitorSummary" | "competitorDetail">[] = [
  {
    title: "Main workspace",
    description: "The daily command surface your reps, coordinators, and owners live in.",
    modules: [
      { label: "Dashboard" },
      { label: "Calendar", badge: "new" },
      { label: "Tasks" },
    ],
    zodoStatus: "Live in one workspace",
    zodoDetail: "Home base for daily ops, scheduling, and action tracking.",
  },
  {
    title: "CRM pipeline",
    description: "From first lead through active customers and production-ready jobs.",
    modules: [
      { label: "Leads" },
      { label: "Clients" },
      { label: "Jobs" },
      { label: "All Jobs" },
      { label: "Kanban Board" },
      { label: "File Manager" },
    ],
    zodoStatus: "Native flow",
    zodoDetail: "Lead, client, job, board view, and file access stay connected in one system.",
  },
  {
    title: "Finance",
    description: "Revenue workflows tied directly to CRM and field activity.",
    modules: [
      { label: "Invoices" },
      { label: "Estimates" },
      { label: "Payments" },
    ],
    zodoStatus: "Built in",
    zodoDetail: "Estimate, invoice, and payment actions live beside the rest of the customer journey.",
  },
  {
    title: "Business tools",
    description: "Roofing-specific workflows, not just generic contractor admin.",
    modules: [
      { label: "AI Roof Estimator", badge: "ai" },
      { label: "Inspections", badge: "new" },
      { label: "Insurance Claims", badge: "soon" },
    ],
    zodoStatus: "Roofing-first",
    zodoDetail: "The estimator and inspection stack are built into the same CRM experience.",
  },
  {
    title: "Communication",
    description: "Keep conversations, follow-up, and support visible inside the platform.",
    modules: [
      { label: "Zodo Mail" },
      { label: "Chats" },
      { label: "Support" },
      { label: "Notifications" },
    ],
    zodoStatus: "Unified comms",
    zodoDetail: "Inbox, live chat, support, and alerts stay in the same operating system.",
  },
  {
    title: "Team controls",
    description: "Separate people management from general CRM records.",
    modules: [
      { label: "Employees" },
      { label: "Users" },
      { label: "Roles & Permissions" },
    ],
    zodoStatus: "Structured team layer",
    zodoDetail: "Operational staff management and access control are part of the core workspace.",
  },
  {
    title: "Analytics",
    description: "Reporting layers that grow with the rest of the platform.",
    modules: [
      { label: "Reports", badge: "soon" },
      { label: "Analytics", badge: "soon" },
    ],
    zodoStatus: "Roadmap active",
    zodoDetail: "Analytics and reports are being expanded as part of the same CRM stack.",
  },
  {
    title: "Settings + automation",
    description: "Administration, integrations, enablement, and workflow leverage.",
    modules: [
      { label: "Settings" },
      { label: "Integrations", badge: "new" },
      { label: "Help Center" },
      { label: "Automations" },
    ],
    zodoStatus: "Admin-ready",
    zodoDetail: "Configuration, connected tools, help content, and workflow automation are kept together.",
  },
];

function mergeFeatureGroups(
  competitorGroups: Array<Pick<CompareFeatureGroup, "competitorStatus" | "competitorSummary" | "competitorDetail">>,
): CompareFeatureGroup[] {
  return platformGroups.map((group, index) => ({
    ...group,
    ...competitorGroups[index],
  }));
}

export const comparePages: Record<ComparePageContent["slug"], ComparePageContent> = {
  jobnimbus: {
    slug: "jobnimbus",
    competitorName: "JobNimbus",
    heroTitle: "ZODO vs JobNimbus",
    heroDescription:
      "JobNimbus is a respected roofing CRM with strong job management and billing boards. ZODO is the better fit if you want AI estimating, communications, team control, and roofing operations tied together in one newer workspace.",
    competitorSnapshot: [
      "JobNimbus publicly emphasizes contractor CRM, job tracking, scheduling, billing, payments, and financing.",
      "It is especially strong for teams centered on boards, customer/job workflows, and collections.",
      "Its product story is broad, but the differentiator is not an address-first AI roof estimating experience.",
    ],
    zodoSnapshot: [
      "ZODO leads with an AI roof estimator and keeps the estimate, inspection, CRM, and billing flow connected.",
      "Zodo Mail, Chats, Support, and Notifications live inside the same system instead of being a side layer.",
      "Employees, Users, Roles, Integrations, and Help Center are surfaced as first-class workspace controls.",
    ],
    competitorBestFor:
      "Teams already comfortable with a classic roofing CRM + billing board workflow and strong payment tools.",
    zodoBestFor:
      "Roofers who want a more unified operating system spanning AI estimating, field ops, communication, and workspace administration.",
    notes: [
      "Comparison positioning is based on public product pages reviewed on April 16, 2026.",
    ],
    reasonCards: [
      {
        title: "AI estimation is core, not adjacent",
        description: "ZODO starts the revenue motion at the property address and keeps that context through CRM, inspection, and finance.",
        tone: "cyan",
      },
      {
        title: "One communication surface",
        description: "Inbox, chat, support, and notification workflows stay visible in the same workspace your team already uses.",
        tone: "green",
      },
      {
        title: "Clearer admin structure",
        description: "Employees, users, permissions, integrations, and help content are organized as part of the product, not hidden behind a basic CRM layer.",
        tone: "orange",
      },
    ],
    featureGroups: mergeFeatureGroups([
      {
        competitorStatus: "strong",
        competitorSummary: "Strong scheduling + boards",
        competitorDetail: "JobNimbus publicly leans hard into job boards, tasks, and operational visibility.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Core strength",
        competitorDetail: "Customer, lead, and job progression are central to the JobNimbus story.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Very strong",
        competitorDetail: "Billing, payments, financing, and collections are heavily emphasized publicly.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Roofing workflows exist",
        competitorDetail: "Roofing field workflows are present, but the public story is less centered on an address-first AI estimating engine.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Customer comms present",
        competitorDetail: "Customer contact workflows exist, though ZODO surfaces inbox + chat + support more explicitly together.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Team collaboration",
        competitorDetail: "Collaboration is there, but ZODO exposes a more obvious employees/users/roles structure in one place.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Reporting available",
        competitorDetail: "Reporting exists, though ZODO is building the analytics layer as part of its broader workspace model.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Automation + integrations",
        competitorDetail: "JobNimbus publicly highlights automation and connected workflows, making this one of its stronger admin areas.",
      },
    ]),
  },
  acculynx: {
    slug: "acculynx",
    competitorName: "AccuLynx",
    heroTitle: "ZODO vs AccuLynx",
    heroDescription:
      "AccuLynx is one of the deepest roofing operations suites on the market. ZODO wins when you want a cleaner modern UX around AI estimating, communications, team structure, and a more unified CRM operating system.",
    competitorSnapshot: [
      "AccuLynx publicly highlights roofing CRM, scheduling, measurements, estimating, supplier ordering, payments, and financing.",
      "It is a strong fit for roofing companies that want deep operational process coverage.",
      "Its product breadth is real, but that breadth can also feel heavier for teams wanting a tighter all-in-one daily workspace.",
    ],
    zodoSnapshot: [
      "ZODO keeps the roof estimate, CRM, inspections, communication, and workspace controls in one calmer experience.",
      "The AI Roof Estimator is front-and-center instead of a secondary workflow.",
      "ZODO pairs field workflows with Zodo Mail, Chats, Support, Users, Roles, Integrations, and Help Center in the same navigation model.",
    ],
    competitorBestFor:
      "Roofing companies that want a mature, process-heavy roofing management platform with extensive operational workflows.",
    zodoBestFor:
      "Teams that still need depth but want a sharper experience around AI estimating, modern communications, and easier day-to-day navigation.",
    notes: [
      "Comparison positioning is based on public product pages reviewed on April 16, 2026.",
    ],
    reasonCards: [
      {
        title: "Less sprawl, more flow",
        description: "ZODO focuses on the exact workflows roofers touch every day, keeping estimating, CRM, comms, and admin in one rhythm.",
        tone: "cyan",
      },
      {
        title: "Modern customer-facing motion",
        description: "The experience from address intake to estimate to invoice feels more unified and easier to present to homeowners.",
        tone: "green",
      },
      {
        title: "Built-in team + workspace controls",
        description: "ZODO combines roofing operations with user, employee, permission, support, and integration layers in a cleaner shell.",
        tone: "orange",
      },
    ],
    featureGroups: mergeFeatureGroups([
      {
        competitorStatus: "strong",
        competitorSummary: "Very strong",
        competitorDetail: "AccuLynx publicly highlights dashboards, calendar, scheduling, and broad production operations.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Very strong",
        competitorDetail: "CRM, leads, customers, jobs, and production orchestration are major AccuLynx pillars.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Strong finance layer",
        competitorDetail: "Estimating, invoicing, financing, and payments are all well represented publicly.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Roofing-first suite",
        competitorDetail: "Measurement, estimation, ordering, and production tools are part of AccuLynx’s core pitch.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Communication tools exist",
        competitorDetail: "Customer communication exists, but ZODO’s inbox + chat + support presentation is more unified in one workspace.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Team operations supported",
        competitorDetail: "Team workflows are present, though ZODO more clearly exposes employees, users, and permissions as a dedicated layer.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Strong reporting",
        competitorDetail: "AccuLynx publicly emphasizes reporting, dashboards, and operational insight.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Admin mature",
        competitorDetail: "Integrations and system administration are clearly part of the public platform story.",
      },
    ]),
  },
  roofr: {
    slug: "roofr",
    competitorName: "Roofr",
    heroTitle: "ZODO vs Roofr",
    heroDescription:
      "Roofr is excellent when your priority is selling faster from measurement to proposal. ZODO is the stronger choice when you want that sales motion plus a broader operating system for CRM, communications, people, files, and field workflows.",
    competitorSnapshot: [
      "Roofr publicly emphasizes reports, proposals, instant estimator workflows, CRM, invoicing, and payments.",
      "Its strongest public positioning is around measurement, proposal speed, and homeowner-facing selling.",
      "Roofr feels especially sales-forward, while broader team and admin layers are less emphasized publicly.",
    ],
    zodoSnapshot: [
      "ZODO keeps the estimator story but extends it deeper into CRM, inspections, file workflows, team control, and communication.",
      "It gives roofers a single system for the sales motion and the back-office/field motion.",
      "ZODO exposes Help Center, Integrations, Users, Roles, Employees, Support, and Zodo Mail as part of the same product surface.",
    ],
    competitorBestFor:
      "Sales-led roofing teams that want fast measurements, quick proposals, and simple monetization tools.",
    zodoBestFor:
      "Roofers who want proposal speed without stopping there, and need the rest of the CRM, field, communication, and admin stack in one product.",
    notes: [
      "Comparison positioning is based on public product pages reviewed on April 16, 2026.",
    ],
    reasonCards: [
      {
        title: "More than a proposal machine",
        description: "ZODO takes the same estimate-to-close energy and adds the operational layers that keep teams aligned after the sale.",
        tone: "cyan",
      },
      {
        title: "Better communication depth",
        description: "Zodo Mail, Chats, Support, and Notifications are native parts of the platform instead of a narrower sales-follow-up story.",
        tone: "green",
      },
      {
        title: "Stronger team structure",
        description: "Employees, users, permissions, and file management give ZODO more day-two operational value than a sales-centric toolset alone.",
        tone: "orange",
      },
    ],
    featureGroups: mergeFeatureGroups([
      {
        competitorStatus: "partial",
        competitorSummary: "Sales-focused home base",
        competitorDetail: "Roofr has dashboards and mobile workflows, but the public story is more sales-oriented than broad workspace orchestration.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "CRM available",
        competitorDetail: "Roofr CRM is part of the story, but ZODO goes deeper on the full lead/client/job workspace model.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Strong monetization",
        competitorDetail: "Proposals, pricing, invoicing, and payments are among Roofr’s clearest strengths.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Estimator-led",
        competitorDetail: "Roofr is strong on reports, instant estimator workflows, and proposal creation, though ZODO pairs that with inspection and broader CRM control.",
      },
      {
        competitorStatus: "limited",
        competitorSummary: "Less emphasized publicly",
        competitorDetail: "Communication depth beyond the sales motion is not as strongly surfaced in Roofr’s public positioning.",
      },
      {
        competitorStatus: "limited",
        competitorSummary: "Lighter team layer",
        competitorDetail: "Roofr’s public message is less about workforce/admin structure and more about selling faster.",
      },
      {
        competitorStatus: "limited",
        competitorSummary: "Limited public emphasis",
        competitorDetail: "Analytics depth is not as prominent in Roofr’s public product story.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Some admin coverage",
        competitorDetail: "Core settings and integrations are present, though not positioned as heavily as ZODO’s broader workspace admin surface.",
      },
    ]),
  },
  jobprogress: {
    slug: "jobprogress",
    competitorName: "JobProgress",
    heroTitle: "ZODO vs JobProgress",
    heroDescription:
      "JobProgress built its reputation on contractor workflow management, proposals, scheduling, and collaboration. ZODO gives roofing teams a fresher all-in-one experience with AI estimating, unified communication, and clearer workspace structure across sales, field, and admin.",
    competitorSnapshot: [
      "JobProgress publicly highlights estimating, quoting, scheduling, proposals, contracts, cloud storage, and collaboration with employees and subcontractors.",
      "It remains strong for contractors who want a recognizable field-and-office workflow manager.",
      "Its public positioning now overlaps heavily with the Leap ecosystem, which can complicate the buying story for teams wanting a cleaner modern platform choice.",
    ],
    zodoSnapshot: [
      "ZODO combines roofing CRM, AI estimating, inspections, communication, and team controls in one newer product shell.",
      "The user experience is organized around how roofing companies actually move from lead to job to payment.",
      "File Manager, Zodo Mail, Chats, Support, Roles, Integrations, and Help Center give teams more operational continuity inside one workspace.",
    ],
    competitorBestFor:
      "Contractors familiar with legacy field-office workflow tools and collaboration patterns around proposals, files, and scheduling.",
    zodoBestFor:
      "Roofing companies that want the same operational breadth but with stronger AI estimating, cleaner communications, and a more current unified interface.",
    notes: [
      "Comparison positioning is based on public product pages reviewed on April 16, 2026.",
      "JobProgress public messaging now overlaps with Leap, so buyers should expect product-story crossover.",
    ],
    reasonCards: [
      {
        title: "A more current roofing stack",
        description: "ZODO feels purpose-built for modern roofing workflows instead of stretching older contractor-management patterns forward.",
        tone: "cyan",
      },
      {
        title: "AI estimate to field handoff",
        description: "The estimator, inspection, CRM, and billing flow stay connected instead of feeling like separate operating surfaces.",
        tone: "green",
      },
      {
        title: "Communication + admin included",
        description: "ZODO gives you inbox, chats, support, permissions, and integrations inside the same workspace instead of outside it.",
        tone: "orange",
      },
    ],
    featureGroups: mergeFeatureGroups([
      {
        competitorStatus: "strong",
        competitorSummary: "Strong scheduling story",
        competitorDetail: "JobProgress publicly emphasizes estimating, quoting, and scheduling as part of its core workflow.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Strong contractor CRM",
        competitorDetail: "Leads, customers, jobs, and project progression remain key parts of the JobProgress narrative.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Present but less central",
        competitorDetail: "Proposals and contracts are clear strengths, while payments/finance are less prominently positioned than in some peers.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Field workflows present",
        competitorDetail: "JobProgress supports field operations, but ZODO is more explicit about AI roof estimating and inspection-led roofing workflows.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Customer collaboration present",
        competitorDetail: "Customer-facing web links and collaboration exist, though ZODO’s inbox + chat + support stack is more visibly unified.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Strong collaboration layer",
        competitorDetail: "Employees and subcontractor collaboration are part of the public JobProgress story.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Reporting exists",
        competitorDetail: "Operational visibility is there, but analytics depth is not the loudest public differentiator.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Admin present",
        competitorDetail: "Storage, workflows, and integrations exist, but ZODO feels more cohesive around settings, help, and automation in one shell.",
      },
    ]),
  },
  leap: {
    slug: "leap",
    competitorName: "Leap",
    heroTitle: "ZODO vs Leap",
    heroDescription:
      "Leap is strong when your buying criteria center on sales presentations, financing, and homeowner conversion. ZODO is the better fit when you want sales velocity plus a fuller roofing CRM operating system around jobs, people, communication, and day-to-day admin.",
    competitorSnapshot: [
      "Leap publicly emphasizes contractor sales workflows, digital proposals, financing, payments, and homeowner experience.",
      "It is especially compelling for teams focused on in-home selling and closing financed projects.",
      "The public story leans more sales-platform than full roofing operations operating system.",
    ],
    zodoSnapshot: [
      "ZODO bridges sales and operations in one product: AI estimator, CRM, inspections, communication, team control, and admin tools.",
      "The platform keeps the address-first estimate motion connected to the downstream work of managing customers, teams, files, and payments.",
      "Roofers get a broader day-to-day workspace instead of a sales-first layer that still needs more tooling around it.",
    ],
    competitorBestFor:
      "Sales-heavy contractors optimizing proposals, financing, and homeowner conversion moments.",
    zodoBestFor:
      "Roofers who need strong sales motion but also want the rest of the business, communication, field, and admin stack to stay in one system.",
    notes: [
      "Comparison positioning is based on public product pages reviewed on April 16, 2026.",
    ],
    reasonCards: [
      {
        title: "Sales plus operations",
        description: "ZODO does not stop at proposal and payment momentum; it keeps the whole roofing operating model inside the same product.",
        tone: "cyan",
      },
      {
        title: "AI roof estimator in the same stack",
        description: "Lead capture, property intelligence, estimating, inspection, and downstream CRM are connected from the start.",
        tone: "green",
      },
      {
        title: "Deeper internal workspace",
        description: "Employees, users, permissions, inbox, chats, support, files, and integrations give ZODO more internal operating leverage.",
        tone: "orange",
      },
    ],
    featureGroups: mergeFeatureGroups([
      {
        competitorStatus: "partial",
        competitorSummary: "Sales-oriented home base",
        competitorDetail: "Leap’s public positioning is more centered on sales execution than on a broad daily contractor ops workspace.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "CRM present",
        competitorDetail: "Lead and customer management exist, but the public story is more weighted toward sales enablement than end-to-end roofing CRM orchestration.",
      },
      {
        competitorStatus: "strong",
        competitorSummary: "Clear strength",
        competitorDetail: "Financing, payments, proposals, and sales conversion are among Leap’s strongest public messages.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Sales-led business tools",
        competitorDetail: "Leap’s strength is in selling and closing, while ZODO goes further on AI roof estimating + inspections inside a roofing CRM shell.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Customer communication",
        competitorDetail: "Homeowner communication exists, though ZODO makes inbox, chat, support, and alerts feel more like one unified communications stack.",
      },
      {
        competitorStatus: "limited",
        competitorSummary: "Less public emphasis",
        competitorDetail: "The public Leap story is less about internal employee management and permissions than ZODO’s workspace model.",
      },
      {
        competitorStatus: "limited",
        competitorSummary: "Not a lead differentiator",
        competitorDetail: "Analytics exist in the broader ecosystem, but they are not the loudest public selling point.",
      },
      {
        competitorStatus: "partial",
        competitorSummary: "Admin coverage present",
        competitorDetail: "Platform administration exists, though ZODO more directly groups settings, integrations, help, and automations into one operating center.",
      },
    ]),
  },
};

export const comparePageOrder = [
  { label: "vs JobNimbus", to: "/compare/jobnimbus", slug: "jobnimbus" as const },
  { label: "vs AccuLynx", to: "/compare/acculynx", slug: "acculynx" as const },
  { label: "vs Roofr", to: "/compare/roofr", slug: "roofr" as const },
  { label: "vs JobProgress", to: "/compare/jobprogress", slug: "jobprogress" as const },
  { label: "vs Leap", to: "/compare/leap", slug: "leap" as const },
];
