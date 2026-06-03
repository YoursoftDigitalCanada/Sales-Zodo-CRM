export const PERMISSION_ALIASES: Record<string, string[]> = {
  "task_pipeline.view": ["tasks.view"],
  "task_pipeline.create": ["tasks.create"],
  "task_pipeline.update": ["tasks.update"],
  "task_pipeline.delete": ["tasks.delete"],

  "meetings.view": ["calendar.view"],
  "meetings.create": ["calendar.create"],
  "meetings.update": ["calendar.update"],
  "meetings.delete": ["calendar.delete"],

  "calls.view": ["tasks.view"],
  "calls.create": ["tasks.create"],
  "calls.update": ["tasks.update"],
  "calls.delete": ["tasks.delete"],

  "email_templates.view": ["emails.view"],
  "email_templates.create": ["emails.create", "emails.send"],
  "email_templates.update": ["emails.send"],
  "email_templates.delete": ["emails.delete"],

  "sequences.view": ["emails.view"],
  "sequences.create": ["emails.send"],
  "sequences.update": ["emails.send"],
  "sequences.delete": ["emails.delete"],

  "payments.view": ["invoices.view", "bookkeeping.view"],
  "payments.create": ["invoices.mark-paid", "bookkeeping.create"],
  "payments.update": ["invoices.update", "bookkeeping.update"],
  "payments.delete": ["invoices.delete", "bookkeeping.delete"],

  "reports.view": ["analytics.view", "bookkeeping.reports"],
  "reports.export": ["analytics.export", "bookkeeping.export"],

  "forecast.view": ["analytics.view", "projects.view"],
  "lead_scoring.view": ["leads.view", "analytics.view"],
  "deal_insights.view": ["projects.view", "analytics.view"],

  "website_analytics.view": ["analytics.view"],
  "website_analytics.create": ["analytics.export"],
  "website_analytics.update": ["analytics.export"],
  "website_analytics.delete": ["analytics.export"],

  "sales_assistant.view": ["analytics.view", "automation.view"],
  "email_generator.view": ["emails.view", "automation.view"],
  "subscriptions.view": ["tenants.view", "invoices.view"],
  "subscriptions.create": ["tenants.create", "invoices.create"],
  "subscriptions.update": ["tenants.update", "invoices.update"],
  "subscriptions.delete": ["tenants.delete", "invoices.delete"],
  "pricing_plans.view": ["settings.view", "tenants.view"],
  "pricing_plans.create": ["settings.update", "tenants.create"],
  "pricing_plans.update": ["settings.update", "tenants.update"],
  "pricing_plans.delete": ["settings.update", "tenants.delete"],
};

export function expandPermissionAliases(permissionCode: string): string[] {
  return [permissionCode, ...(PERMISSION_ALIASES[permissionCode] || [])];
}

export function hasPermissionWithAliases(permissions: string[], permissionCode: string): boolean {
  return expandPermissionAliases(permissionCode).some((code) => permissions.includes(code));
}
