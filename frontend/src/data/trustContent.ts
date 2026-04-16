import { FileLock2, ShieldCheck, ScrollText, type LucideIcon } from "lucide-react";

export type TrustPageSlug = "privacy-policy" | "terms-of-service" | "security";

export interface TrustSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface TrustPageContent {
  slug: TrustPageSlug;
  title: string;
  eyebrow: string;
  description: string;
  summary: string;
  icon: LucideIcon;
  color: "cyan" | "green" | "orange";
  updatedLabel: string;
  highlights: string[];
  sections: TrustSection[];
}

export const trustPages: Record<TrustPageSlug, TrustPageContent> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    eyebrow: "Trust",
    description:
      "How ZODO collects, uses, stores, and protects information across the public website and CRM experience.",
    summary:
      "This page explains the categories of information we process, why we process them, and the choices available to customers and visitors using ZODO.",
    icon: FileLock2,
    color: "cyan",
    updatedLabel: "Last updated April 16, 2026",
    highlights: [
      "Data is collected to operate the website, deliver the CRM, support customers, and improve the product.",
      "Customer workspace data is treated separately from anonymous marketing site usage data.",
      "Access to customer information is limited to authorized personnel and service providers supporting delivery and security.",
    ],
    sections: [
      {
        title: "Information we collect",
        body:
          "We may collect information that visitors submit directly, information required to create or manage a workspace, and technical usage data generated when people use the website or CRM.",
        bullets: [
          "Account and contact details such as name, email address, phone number, company name, and role",
          "Workspace content such as customer records, estimates, invoices, documents, communications, and operational data",
          "Technical information such as device, browser, IP address, session activity, and usage analytics",
        ],
      },
      {
        title: "How we use information",
        body:
          "We use information to provide and secure the service, support customers, process transactions, respond to inquiries, and improve the performance and usability of ZODO.",
        bullets: [
          "Provision and maintain the CRM and public website",
          "Authenticate users, prevent abuse, and monitor system integrity",
          "Respond to support requests, demos, onboarding, and product feedback",
          "Analyze product usage trends to improve features and performance",
        ],
      },
      {
        title: "How information is shared",
        body:
          "We do not sell customer data. Information may be shared with service providers, infrastructure partners, and trusted subprocessors that help us host, secure, support, or operate the product.",
        bullets: [
          "Cloud hosting and infrastructure vendors",
          "Email, payment, analytics, and support tooling providers",
          "Legal or regulatory authorities when required by applicable law",
        ],
      },
      {
        title: "Retention and control",
        body:
          "We retain data for as long as needed to operate the service, meet contractual obligations, comply with law, resolve disputes, and enforce agreements. Customers may request updates or deletion of information subject to legal and operational requirements.",
      },
      {
        title: "Security and contact",
        body:
          "We use administrative, technical, and organizational safeguards designed to protect personal and workspace information. Questions about privacy can be directed through the ZODO contact and support channels.",
      },
    ],
  },
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service",
    eyebrow: "Legal",
    description:
      "The core terms that govern use of the ZODO website, platform, and related services.",
    summary:
      "These terms define how customers and visitors may use ZODO, the responsibilities attached to account access, and the limits and conditions that apply to the service.",
    icon: ScrollText,
    color: "orange",
    updatedLabel: "Last updated April 16, 2026",
    highlights: [
      "Use of ZODO is subject to lawful, authorized, and commercially reasonable behavior.",
      "Customers remain responsible for the accuracy, legality, and permissions attached to data they upload or manage in the platform.",
      "Service availability, features, and pricing may evolve over time as the product changes.",
    ],
    sections: [
      {
        title: "Acceptance and eligibility",
        body:
          "By accessing or using ZODO, you agree to these terms on behalf of yourself or the organization you represent. You must have authority to bind that organization when using the service for business purposes.",
      },
      {
        title: "Accounts and access",
        body:
          "Customers are responsible for maintaining the confidentiality of account credentials, controlling user access, and promptly notifying ZODO of suspected unauthorized activity.",
        bullets: [
          "Use strong credentials and access controls",
          "Restrict access to authorized personnel only",
          "Review user permissions and remove access when no longer needed",
        ],
      },
      {
        title: "Acceptable use",
        body:
          "You may not use ZODO to violate law, infringe rights, transmit malicious code, interfere with the service, or engage in misuse that harms ZODO, other customers, or third parties.",
        bullets: [
          "No unlawful or fraudulent activity",
          "No security abuse, probing, or disruption",
          "No unauthorized access to data, systems, or workspaces",
        ],
      },
      {
        title: "Customer data and content",
        body:
          "Customers retain responsibility for the content they create, upload, or manage in the platform. ZODO receives the rights necessary to host, process, back up, transmit, and display that content solely to provide the service.",
      },
      {
        title: "Commercial terms and limits",
        body:
          "Subscriptions, billing terms, feature availability, and service limits are governed by the applicable commercial agreement, plan selection, or pricing model in effect at the time of purchase or renewal.",
      },
      {
        title: "Disclaimers and liability",
        body:
          "Except where required by law or expressly agreed otherwise, the service is provided on an as-available basis. Customers should review legal, tax, regulatory, and industry-specific obligations independently before relying on workflows or content generated through the platform.",
      },
    ],
  },
  security: {
    slug: "security",
    title: "Security",
    eyebrow: "Security",
    description:
      "The safeguards, operational controls, and product-level protections designed to help keep ZODO secure.",
    summary:
      "ZODO is built with layered controls for access management, infrastructure protection, monitoring, and operational response so roofing teams can run the platform with greater confidence.",
    icon: ShieldCheck,
    color: "green",
    updatedLabel: "Last updated April 16, 2026",
    highlights: [
      "Access to sensitive systems and customer data is restricted and monitored.",
      "Security controls are designed to cover authentication, transport, storage, permissions, and operational visibility.",
      "Security is treated as an ongoing operational practice, not a one-time feature set.",
    ],
    sections: [
      {
        title: "Application and account security",
        body:
          "ZODO includes account-level controls such as session management, configurable password policies, access restrictions, and role-aware permissions within the workspace.",
        bullets: [
          "User and role management",
          "Session visibility and revocation",
          "Workspace security settings for access control and policy enforcement",
        ],
      },
      {
        title: "Data protection",
        body:
          "Customer and operational data are protected through layered technical safeguards that are intended to reduce unauthorized access and protect information in transit and at rest.",
        bullets: [
          "Encrypted transport across supported product traffic",
          "Protected infrastructure and controlled storage environments",
          "Access limitation and logging around operational systems",
        ],
      },
      {
        title: "Operational monitoring",
        body:
          "Security depends on visibility. ZODO maintains monitoring, auditability, and activity records that support internal oversight, troubleshooting, and incident investigation.",
        bullets: [
          "Audit and activity visibility",
          "Operational monitoring and alerting",
          "Support for controlled administrative access",
        ],
      },
      {
        title: "Response and continuous improvement",
        body:
          "Security practices evolve over time as the product, infrastructure, and threat landscape change. Operational safeguards and internal procedures are reviewed and improved as part of ongoing platform work.",
      },
      {
        title: "Customer responsibility",
        body:
          "Customers also play an important role in security by using appropriate permissions, protecting credentials, reviewing access regularly, and following internal security and compliance requirements relevant to their business.",
      },
    ],
  },
};
