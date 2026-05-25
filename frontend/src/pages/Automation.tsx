import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, CheckCircle2, Play, RefreshCw, Settings2, ToggleLeft, ToggleRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AutomationRecord,
  cancelAutomationReminder,
  disableAutomationRule,
  enableAutomationRule,
  getAutomationReminders,
  getAutomationRules,
  getAutomationRuns,
  retryAutomationRun,
  seedAutomationDefaults,
} from "@/features/automation";
import { resolveNotificationTarget } from "@/features/notifications/utils/notification-navigation";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-cyan-600" />
      </div>
    </Panel>
  );
}

function statusBadge(status: string) {
  const value = String(status || "").toUpperCase();
  if (value === "SUCCESS" || value === "SENT") return <Badge className="bg-emerald-600">{value}</Badge>;
  if (value === "FAILED") return <Badge variant="destructive">{value}</Badge>;
  if (value === "SKIPPED" || value === "CANCELLED") return <Badge variant="secondary">{value}</Badge>;
  return <Badge variant="outline">{value || "ACTIVE"}</Badge>;
}

function automationTarget(row: AutomationRecord) {
  const entityType = String(row.entityType || "").toLowerCase();
  const entityId = String(row.entityId || "");
  const metadata = {
    invoiceId: entityType === "invoice" ? entityId : row.input?.invoiceId,
    projectId: entityType === "deal" || entityType === "project" ? entityId : row.input?.dealId || row.input?.projectId,
    leadId: entityType === "lead" ? entityId : row.input?.leadId,
    clientId: entityType === "customer" || entityType === "client" ? entityId : row.input?.clientId || row.input?.customerId,
    proposalId: entityType === "proposal" ? entityId : row.input?.proposalId,
    quoteId: entityType === "quote" ? entityId : row.input?.quoteId,
    contractId: entityType === "contract" ? entityId : row.input?.contractId,
    taskId: entityType === "task" ? entityId : row.input?.taskId,
    expenseId: entityType === "expense" ? entityId : row.input?.expenseId,
    documentId: entityType === "document" || entityType === "file" ? entityId : row.input?.documentId || row.output?.documentId,
  };
  return resolveNotificationTarget({ actionUrl: row.actionUrl, link: row.link, metadata });
}

function actionSummary(row: AutomationRecord) {
  const actions = Array.isArray(row.output?.actions) ? row.output.actions : [];
  const sideEffects = Array.isArray(row.output?.sideEffects) ? row.output.sideEffects : [];
  const planned = Array.isArray(row.plannedActions) ? row.plannedActions : [];
  const values = [...actions, ...sideEffects, ...planned.map((item: any) => item.action || item)].filter(Boolean);
  if (values.length) return values.slice(0, 3).join(", ") + (values.length > 3 ? ` +${values.length - 3}` : "");
  return row.output?.reason || row.input?.actionType || "-";
}

export default function AutomationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRecord[]>([]);
  const [runs, setRuns] = useState<AutomationRecord[]>([]);
  const [reminders, setReminders] = useState<AutomationRecord[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const [ruleRows, runRows, reminderRows] = await Promise.all([
        getAutomationRules(),
        getAutomationRuns({ limit: 100 }),
        getAutomationReminders({ limit: 200 }),
      ]);
      setRules(ruleRows);
      setRuns(runRows);
      setReminders(reminderRows);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load automation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    activeRules: rules.filter((rule) => rule.isActive).length,
    scheduled: reminders.filter((reminder) => reminder.status === "SCHEDULED").length,
    failedRuns: runs.filter((run) => run.status === "FAILED").length,
    recentRuns: runs.length,
  }), [rules, reminders, runs]);

  const seedDefaults = async () => {
    try {
      const result = await seedAutomationDefaults();
      toast.success(`Default rules ready${result?.created ? `: ${result.created} added` : ""}`);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to seed defaults");
    }
  };

  const toggleRule = async (rule: AutomationRecord) => {
    try {
      if (rule.isActive) await disableAutomationRule(rule.id);
      else await enableAutomationRule(rule.id);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update rule");
    }
  };

  const cancelReminder = async (id: string) => {
    try {
      await cancelAutomationReminder(id);
      toast.success("Reminder cancelled");
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to cancel reminder");
    }
  };

  const retryRun = async (id: string) => {
    try {
      await retryAutomationRun(id);
      toast.success("Automation retry started");
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to retry automation run");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-700"><Zap className="h-4 w-4" /> Settings</div>
            <h1 className="text-2xl font-semibold text-slate-950">Sales Automation</h1>
            <p className="text-sm text-slate-500">Tenant-safe rules, reminder schedules, and automation run logs for sales operations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            <Button onClick={seedDefaults}><Play className="mr-2 h-4 w-4" />Seed Defaults</Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Active Rules" value={stats.activeRules} icon={Settings2} />
          <Stat label="Scheduled Reminders" value={stats.scheduled} icon={Bell} />
          <Stat label="Failed Runs" value={stats.failedRuns} icon={Activity} />
          <Stat label="Recent Runs" value={stats.recentRuns} icon={CheckCircle2} />
        </div>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="runs">Runs / Logs</TabsTrigger>
            <TabsTrigger value="defaults">Templates / Defaults</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Panel>
              <h2 className="mb-3 text-base font-semibold text-slate-950">Recent Automation Activity</h2>
              <RunsTable rows={runs.slice(0, 8)} onOpen={(target) => navigate(target)} onRetry={retryRun} />
            </Panel>
          </TabsContent>

          <TabsContent value="rules">
            <Panel>
              <h2 className="mb-3 text-base font-semibold text-slate-950">Rules</h2>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Trigger</TableHead><TableHead>Actions</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell><p className="font-medium">{rule.name}</p><p className="text-xs text-slate-500">{rule.description}</p></TableCell>
                    <TableCell className="font-mono text-xs">{rule.triggerType}</TableCell>
                    <TableCell>{Array.isArray(rule.actions) ? rule.actions.length : 0}</TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>{rule.isActive ? <Badge className="bg-emerald-600">ACTIVE</Badge> : <Badge variant="secondary">DISABLED</Badge>}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => toggleRule(rule)}>{rule.isActive ? <ToggleRight className="mr-1 h-4 w-4" /> : <ToggleLeft className="mr-1 h-4 w-4" />}{rule.isActive ? "Disable" : "Enable"}</Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="reminders">
            <Panel>
              <h2 className="mb-3 text-base font-semibold text-slate-950">Scheduled Reminders</h2>
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Type</TableHead><TableHead>Entity</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>{reminder.scheduledFor ? new Date(reminder.scheduledFor).toLocaleString() : "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{reminder.reminderType}</TableCell>
                    <TableCell>{reminder.entityType} · {reminder.entityId}</TableCell>
                    <TableCell>{reminder.channel}</TableCell>
                    <TableCell>{statusBadge(reminder.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {automationTarget(reminder) ? <Button variant="ghost" size="sm" onClick={() => navigate(automationTarget(reminder)!)}>Open</Button> : null}
                        {reminder.status === "SCHEDULED" ? <Button variant="ghost" size="sm" onClick={() => cancelReminder(reminder.id)}>Cancel</Button> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </Panel>
          </TabsContent>

          <TabsContent value="runs"><Panel><RunsTable rows={runs} onOpen={(target) => navigate(target)} onRetry={retryRun} /></Panel></TabsContent>
          <TabsContent value="defaults">
            <Panel>
              <h2 className="mb-2 text-base font-semibold text-slate-950">Default Sales Automation Templates</h2>
              <p className="mb-4 text-sm text-slate-500">Install or repair the standard lead, proposal, invoice, payment, document, and bookkeeping automations for this tenant.</p>
              <Button onClick={seedDefaults}><Play className="mr-2 h-4 w-4" />Seed Defaults</Button>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function RunsTable({ rows, onOpen, onRetry }: { rows: AutomationRecord[]; onOpen: (target: string) => void; onRetry: (id: string) => void }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Trigger</TableHead><TableHead>Entity</TableHead><TableHead>Status</TableHead><TableHead>Side Effects</TableHead><TableHead>Error</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((run) => {
        const target = automationTarget(run);
        return (
          <TableRow key={run.id}>
            <TableCell>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "-"}</TableCell>
            <TableCell className="font-mono text-xs">{run.triggerType}</TableCell>
            <TableCell>{run.entityType} · {run.entityId}</TableCell>
            <TableCell>{statusBadge(run.status)}</TableCell>
            <TableCell className="max-w-xs truncate text-xs text-slate-600">{actionSummary(run)}</TableCell>
            <TableCell className="max-w-md truncate text-xs text-rose-600">{run.error || "-"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {target ? <Button variant="ghost" size="sm" onClick={() => onOpen(target)}>Open</Button> : null}
                {String(run.status || "").toUpperCase() === "FAILED" ? <Button variant="ghost" size="sm" onClick={() => onRetry(run.id)}>Retry</Button> : null}
                {!target && String(run.status || "").toUpperCase() !== "FAILED" ? "-" : null}
              </div>
            </TableCell>
          </TableRow>
        );
      })}</TableBody>
    </Table>
  );
}
