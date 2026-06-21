import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, Check, CreditCard, Download, FileSpreadsheet, FileText, Landmark, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  BookkeepingRecord,
  createImportSession,
  downloadStatementExport,
  finalizeImportSession,
  getImportSession,
  getImportSessions,
  getRawImportTransactions,
  processImportSession,
  updateRawImportTransaction,
  uploadStatementCsv,
} from "@/features/bookkeeping";

type StatementMode = "BANK" | "CREDIT_CARD";

const money = (value: unknown, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(value || 0));

const dateLabel = (value: unknown) => {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text || "-";
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toLocaleDateString("en-CA");
};

const errorMessage = (error: any, fallback: string) => {
  const details = error?.response?.data?.details?.errors;
  const first = details && Object.values(details).flat().find((item) => typeof item === "string");
  return String(first || error?.response?.data?.message || error?.message || fallback);
};

const statusTone: Record<string, string> = {
  FINALIZED: "bg-emerald-100 text-emerald-700",
  CATEGORIZED: "bg-sky-100 text-sky-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
  SKIPPED: "bg-slate-100 text-slate-600",
  PENDING: "bg-slate-100 text-slate-700",
};

const months = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

export function StatementImportPanel({
  mode,
  accounts,
  categories,
  vendors,
  onPosted,
  onSummaryChange,
  globalSearch = "",
  globalType = "",
  globalDateFrom = "",
  globalDateTo = "",
}: {
  mode: StatementMode;
  accounts: BookkeepingRecord[];
  categories: BookkeepingRecord[];
  vendors: BookkeepingRecord[];
  onPosted: () => void;
  onSummaryChange?: (summary: { charges: number; credits: number; net: number; largestCharge: number; rows: number } | null) => void;
  globalSearch?: string;
  globalType?: string;
  globalDateFrom?: string;
  globalDateTo?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const prefix = mode === "BANK" ? "Bank statement" : "Credit card statement";
  const [sessions, setSessions] = useState<BookkeepingRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [session, setSession] = useState<BookkeepingRecord | null>(null);
  const [rows, setRows] = useState<BookkeepingRecord[]>([]);
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");

  const eligibleAccounts = useMemo(() => accounts.filter((account) => {
    if (mode === "CREDIT_CARD") {
      const subtype = String(account.subtype || "").toUpperCase().replace(/[\s-]+/g, "_");
      const searchableName = `${account.name || ""} ${account.institutionName || ""}`.toLowerCase();
      return subtype === "CREDIT_CARD"
        || searchableName.includes("credit card")
        || searchableName.includes("visa")
        || searchableName.includes("mastercard")
        || searchableName.includes("amex")
        || (account.type === "LIABILITY" && account.isSystem === false);
    }
    return account.type === "ASSET" && (account.isBankAccount || ["CHECKING", "SAVINGS", "CASH"].includes(String(account.subtype || "").toUpperCase()));
  }), [accounts, mode]);

  const loadSession = async (id: string) => {
    if (!id) {
      setSession(null);
      setRows([]);
      return;
    }
    const [details, raw] = await Promise.all([
      getImportSession(id),
      getRawImportTransactions(id, { limit: 5000 }),
    ]);
    setSession(details);
    setRows(raw.data || []);
  };

  const loadSessions = async (preferredId?: string) => {
    const result = await getImportSessions({ limit: 100 });
    const matching = (result.data || []).filter((item) => String(item.name || "").startsWith(prefix));
    setSessions(matching);
    const nextId = preferredId || activeSessionId || matching[0]?.id || "";
    setActiveSessionId(nextId);
    await loadSession(nextId);
  };

  useEffect(() => {
    setFilterDate("");
    setFilterMonth("ALL");
    setFilterYear("ALL");
    loadSessions().catch((error) => toast.error(errorMessage(error, `Could not load ${prefix.toLowerCase()} imports.`)));
    // The mode identifies an independent workspace; selection changes are handled explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const availableYears = useMemo(() => Array.from(new Set(rows
    .map((row) => String(row.normalizedData?.date || "").match(/^(\d{4})-\d{2}-\d{2}/)?.[1])
    .filter((year): year is string => Boolean(year))))
    .sort((a, b) => Number(b) - Number(a)), [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const normalized = row.normalizedData || {};
    const overrides = row.manualOverrides || {};
    const dateMatch = String(normalized.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const transactionDate = dateMatch?.slice(1);
    const isoDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : "";
    const transactionType = String(overrides.transactionType || row.aiTransactionType || (normalized.type === "CREDIT" ? "INCOME" : "EXPENSE")).toUpperCase();
    const searchTerm = globalSearch.trim().toLowerCase();
    const searchableText = [
      normalized.description,
      normalized.merchant,
      normalized.reference,
      overrides.vendor,
      row.aiVendor,
      overrides.category,
      row.aiCategory,
    ].filter(Boolean).join(" ").toLowerCase();

    if (searchTerm && !searchableText.includes(searchTerm)) return false;
    if (globalType && globalType !== "ALL" && transactionType !== globalType) return false;
    if (globalDateFrom && (!isoDate || isoDate < globalDateFrom)) return false;
    if (globalDateTo && (!isoDate || isoDate > globalDateTo)) return false;
    if (!transactionDate) return !filterDate && filterMonth === "ALL" && filterYear === "ALL";
    const [year, month, day] = transactionDate;
    if (filterDate && `${year}-${month}-${day}` !== filterDate) return false;
    if (filterMonth !== "ALL" && month !== filterMonth) return false;
    if (filterYear !== "ALL" && year !== filterYear) return false;
    return true;
  }), [filterDate, filterMonth, filterYear, globalDateFrom, globalDateTo, globalSearch, globalType, rows]);

  const statementSummary = useMemo(() => {
    const activeRows = filteredRows.filter((row) => row.status !== "SKIPPED" && Number(row.duplicateScore || 0) < 95);
    let charges = 0;
    let credits = 0;
    let largestCharge = 0;
    activeRows.forEach((row) => {
      const normalized = row.normalizedData || {};
      const overrides = row.manualOverrides || {};
      const transactionType = String(overrides.transactionType || row.aiTransactionType || (normalized.type === "CREDIT" ? "INCOME" : "EXPENSE")).toUpperCase();
      const amount = Math.abs(Number(normalized.amount || 0));
      const isCredit = ["INCOME", "REFUND", "CASHBACK", "TRANSFER", "CREDIT_CARD_PAYMENT"].includes(transactionType);
      if (isCredit) {
        credits += amount;
      } else {
        charges += amount;
        largestCharge = Math.max(largestCharge, amount);
      }
    });
    return { charges, credits, net: charges - credits, largestCharge, rows: activeRows.length };
  }, [filteredRows]);

  useEffect(() => {
    if (!onSummaryChange) return;
    onSummaryChange(rows.length ? statementSummary : null);
    return () => onSummaryChange(null);
  }, [onSummaryChange, rows.length, statementSummary]);

  const upload = async (file: File) => {
    try {
      setBusy(true);
      const created = await createImportSession(`${prefix} - ${file.name}`);
      const uploaded = await uploadStatementCsv(created.id, file, accountId || undefined);
      const detected = String(uploaded.provider || uploaded.uploadedFile?.provider || "UNKNOWN");
      if (mode === "CREDIT_CARD" && detected !== "CREDIT_CARD") {
        toast.warning("The file did not identify itself as a credit-card statement. Please review the detected account and transaction types.");
      }
      if (mode === "BANK" && detected === "CREDIT_CARD") {
        toast.warning("This looks like a credit-card statement. It is available in this review session, but the Credit Cards tab is the better home for it.");
      }
      await processImportSession(created.id);
      await loadSessions(created.id);
      toast.success(`${uploaded.totalRows || 0} statement rows analyzed`);
    } catch (error: any) {
      toast.error(errorMessage(error, "Statement upload failed."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const saveReview = async (row: BookkeepingRecord, patch: BookkeepingRecord) => {
    if (!activeSessionId) return;
    try {
      const updated = await updateRawImportTransaction(activeSessionId, row.id, patch);
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      toast.success("Classification updated");
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not update this transaction."));
    }
  };

  const finalize = async () => {
    if (!activeSessionId) return;
    try {
      setBusy(true);
      const result = await finalizeImportSession(activeSessionId);
      await loadSessions(activeSessionId);
      onPosted();
      const skipped = Number(result.totalSkipped || 0);
      toast.success(`${result.totalCreated || 0} transactions posted${skipped ? `, ${skipped} still need review` : ""}`);
    } catch (error: any) {
      toast.error(errorMessage(error, "Could not post statement transactions."));
    } finally {
      setBusy(false);
    }
  };

  const exportStatement = async (format: "csv" | "pdf") => {
    if (!activeSessionId) return;
    try {
      setExporting(format);
      const { blob, fileName } = await downloadStatementExport(activeSessionId, format, {
        mode,
        search: globalSearch || undefined,
        type: globalType && globalType !== "ALL" ? globalType : undefined,
        dateFrom: globalDateFrom || undefined,
        dateTo: globalDateTo || undefined,
        exactDate: filterDate || undefined,
        month: filterMonth !== "ALL" ? filterMonth : undefined,
        year: filterYear !== "ALL" ? filterYear : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export downloaded`);
    } catch (error: any) {
      toast.error(errorMessage(error, "Statement export failed."));
    } finally {
      setExporting(null);
    }
  };

  const reviewCount = filteredRows.filter((row) => row.status === "NEEDS_REVIEW").length;
  const duplicateCount = filteredRows.filter((row) => Number(row.duplicateScore || 0) >= 95).length;
  const readyCount = filteredRows.filter((row) => ["CATEGORIZED", "PENDING", "MATCHED"].includes(String(row.status))).length;
  const hasFilters = Boolean(
    filterDate
    || filterMonth !== "ALL"
    || filterYear !== "ALL"
    || globalSearch.trim()
    || (globalType && globalType !== "ALL")
    || globalDateFrom
    || globalDateTo,
  );
  const Icon = mode === "BANK" ? Landmark : CreditCard;

  return (
    <section className="space-y-5 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E0F2FE] text-[#0284C7]"><Icon className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">{mode === "BANK" ? "Bank Statements" : "Credit Card Statements"}</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#64748B]">
              Upload a CSV, let AI classify income and spending, review the results, then post approved rows to the ledger.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 space-y-1">
            <Label className="text-xs text-[#64748B]">Statement account</Label>
            <Select value={accountId || "AUTO"} onValueChange={(value) => setAccountId(value === "AUTO" ? "" : value)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Auto-detect and create</SelectItem>
                {eligibleAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="h-10 rounded-xl bg-[#0891B2] hover:bg-[#0E7490]">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!activeSessionId || rows.length === 0 || Boolean(exporting)} className="h-10 rounded-xl">
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void exportStatement("pdf")}><FileText className="mr-2 h-4 w-4" />Export branded PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportStatement("csv")}><FileSpreadsheet className="mr-2 h-4 w-4" />Export CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
          }} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-y border-[#E2E8F0] py-4 md:flex-row md:items-end">
        <div className="min-w-72 space-y-1">
          <Label className="text-xs text-[#64748B]">Import session</Label>
          <Select value={activeSessionId || "NONE"} onValueChange={(value) => {
            const id = value === "NONE" ? "" : value;
            setActiveSessionId(id);
            loadSession(id).catch((error) => toast.error(errorMessage(error, "Could not load the import session.")));
          }}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No imports yet</SelectItem>
              {sessions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <Badge variant="outline">{hasFilters ? `${filteredRows.length} of ${rows.length} rows` : `${rows.length} rows`}</Badge>
          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{readyCount} ready</Badge>
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{reviewCount} review</Badge>
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">{duplicateCount} duplicates</Badge>
          {session?.status ? <Badge variant="outline">Session: {session.status}</Badge> : null}
        </div>
        <Button variant="outline" size="icon" title="Refresh import" disabled={!activeSessionId || busy} onClick={() => loadSession(activeSessionId)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={finalize} disabled={!activeSessionId || busy || rows.length === 0} className="rounded-xl bg-[#0F766E] hover:bg-[#115E59]">
          <Check className="mr-2 h-4 w-4" />Post reviewed transactions
        </Button>
      </div>

      {rows.length ? (
        <div className="flex flex-col gap-3 rounded-xl bg-[#F8FAFC] p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-44 flex-1 space-y-1">
            <Label className="text-xs text-[#64748B]">Exact date</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-10 bg-white"
            />
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label className="text-xs text-[#64748B]">Month</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All months</SelectItem>
                {months.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label className="text-xs text-[#64748B]">Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All years</SelectItem>
                {availableYears.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!hasFilters}
            onClick={() => {
              setFilterDate("");
              setFilterMonth("ALL");
              setFilterYear("ALL");
            }}
            className="h-10"
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      {!rows.length ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <FileSpreadsheet className="mb-3 h-9 w-9 text-[#0891B2]" />
          <p className="font-medium text-[#0F172A]">No statement rows yet</p>
          <p className="mt-1 text-sm text-[#64748B]">Upload a CSV to create an AI-assisted review list.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#F8FAFC]">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>AI Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const normalized = row.normalizedData || {};
                  const overrides = row.manualOverrides || {};
                  const transactionType = overrides.transactionType || row.aiTransactionType || (normalized.type === "CREDIT" ? "INCOME" : "EXPENSE");
                  const category = overrides.category || row.aiCategory || "Uncategorized";
                  const vendor = overrides.vendor || row.aiVendor || normalized.merchant || "Unknown";
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{dateLabel(normalized.date)}</TableCell>
                      <TableCell className="min-w-64">
                        <p className="font-medium text-[#0F172A]">{normalized.description}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-[#64748B]">
                          <BrainCircuit className="h-3 w-3" />{Math.round(Number(row.aiConfidence || 0) * 100)}% confidence
                          {row.aiReason ? ` · ${row.aiReason}` : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Select value={transactionType} onValueChange={(value) => saveReview(row, { transactionType: value })}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{["EXPENSE", "INCOME", "TRANSFER", "REFUND"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={category} onValueChange={(value) => saveReview(row, { category: value })}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {!categories.some((item) => item.name === category) ? <SelectItem value={category}>{category} (new)</SelectItem> : null}
                            {categories.filter((item) => item.type === (transactionType === "INCOME" || transactionType === "REFUND" ? "INCOME" : "EXPENSE")).map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={vendor} onValueChange={(value) => saveReview(row, { vendor: value })}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {!vendors.some((item) => item.name === vendor) ? <SelectItem value={vendor}>{vendor} (new)</SelectItem> : null}
                            {vendors.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}`}>
                        {transactionType === "EXPENSE" ? "-" : "+"}{money(normalized.amount, normalized.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusTone[row.status] || "bg-slate-100 text-slate-700"}>{row.status}</Badge>
                        {Number(row.duplicateScore || 0) >= 95 ? <p className="mt-1 text-xs text-amber-700">Duplicate</p> : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredRows.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-sm text-[#64748B]">
                      No transactions match the selected date filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  );
}
