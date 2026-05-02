import { useMemo, useState } from "react";
import { Calendar, Download, FileText, Phone, Plus, Search, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ModuleConfig = {
  title: string;
  subtitle: string;
  actionLabel: string;
  icon: typeof FileText;
  columns: string[];
  rows: Array<Record<string, string>>;
};

const moduleConfigs: Record<string, ModuleConfig> = {
  notes: {
    title: "Notes",
    subtitle: "Shared notes attached to leads, deals, contacts, and organizations.",
    actionLabel: "New Note",
    icon: FileText,
    columns: ["Title", "Linked To", "Owner", "Updated"],
    rows: [],
  },
  "call-logs": {
    title: "Call Logs",
    subtitle: "Track inbound, outbound, missed, and follow-up calls.",
    actionLabel: "Log Call",
    icon: Phone,
    columns: ["Contact", "Direction", "Duration", "Outcome"],
    rows: [],
  },
  "data-import": {
    title: "Data Import",
    subtitle: "Import leads, deals, contacts, organizations, notes, tasks, and call logs.",
    actionLabel: "New Import",
    icon: Upload,
    columns: ["Import", "Module", "Status", "Created"],
    rows: [],
  },
};

function CrmDevelopModulePage({ module }: { module: keyof typeof moduleConfigs }) {
  const config = moduleConfigs[module];
  const [query, setQuery] = useState("");
  const Icon = config.icon;

  const rows = useMemo(() => {
    if (!query.trim()) return config.rows;
    const term = query.trim().toLowerCase();
    return config.rows.filter((row) =>
      Object.values(row).some((value) => value.toLowerCase().includes(term))
    );
  }, [config.rows, query]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0369A1]">
              <Icon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#0F172A]">{config.title}</h1>
              <p className="text-sm text-[#64748B]">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export
            </Button>
            <Button className="gap-2 bg-[#0F766E] hover:bg-[#115E59]">
              <Plus size={16} />
              {config.actionLabel}
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}`}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Calendar size={16} />
            <span>All records</span>
            <Badge variant="secondary">{rows.length}</Badge>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                {config.columns.map((column) => (
                  <TableHead key={column} className="font-semibold text-[#334155]">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => (
                  <TableRow key={index}>
                    {config.columns.map((column) => (
                      <TableCell key={column}>{row[column] || "-"}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={config.columns.length} className="h-44 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#64748B]">
                        <Icon size={22} />
                      </div>
                      <p className="font-medium text-[#0F172A]">No records yet</p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Create your first record to start building this CRM workspace.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}

export function NotesPage() {
  return <CrmDevelopModulePage module="notes" />;
}

export function CallLogsPage() {
  return <CrmDevelopModulePage module="call-logs" />;
}

export function DataImportPage() {
  return <CrmDevelopModulePage module="data-import" />;
}
