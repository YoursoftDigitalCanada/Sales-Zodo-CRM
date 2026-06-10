import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Progress } from "../ui/progress";
import { toast } from "sonner";
import api from "@/lib/axios";

function parseMoney(value: any) {
  if (!value) return 0;
  const str = String(value).replace(/[^0-9.-]+/g, "");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Robust date parser that handles:
 * - MM/DD/YY  (01/03/25)
 * - MM/DD/YYYY (01/03/2025)
 * - M/DD/YYYY, M/D/YYYY, etc.
 * - YYYY-MM-DD (ISO)
 * - Already valid Date strings
 */
function parseDate(value: any): string {
  if (!value) return new Date().toISOString();
  const raw = String(value).trim();

  // Handle MM/DD/YY or MM/DD/YYYY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    // Convert 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Fallback to native parser
  const date = new Date(raw);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function guessCategoryType(name: string) {
  return name === "Sales" || name === "Services" || name === "Subscriptions" ? "INCOME" : "EXPENSE";
}

function matchCategoryKeyword(desc: string) {
  const lower = desc.toLowerCase();
  if (lower.includes("uber") || lower.includes("lyft")) return "Transportation";
  if (lower.includes("amazon")) return "Shopping";
  if (lower.includes("starbucks") || lower.includes("restaurant") || lower.includes("cafe") || lower.includes("mcdonalds")) return "Meals & Entertainment";
  if (lower.includes("staples") || lower.includes("office depot")) return "Office Supplies";
  if (lower.includes("payroll") || lower.includes("gusto") || lower.includes("adp")) return "Payroll Expense";
  if (lower.includes("hydro") || lower.includes("water") || lower.includes("power") || lower.includes("internet") || lower.includes("rogers") || lower.includes("bell")) return "Utilities";
  if (lower.includes("software") || lower.includes("subscription") || lower.includes("github") || lower.includes("aws") || lower.includes("google") || lower.includes("openai") || lower.includes("chatgpt")) return "Software & SaaS";
  if (lower.includes("insurance")) return "Insurance";
  if (lower.includes("tax") || lower.includes("cra")) return "Taxes";
  if (lower.includes("rent") || lower.includes("lease")) return "Rent";
  if (lower.includes("marketing") || lower.includes("ads") || lower.includes("facebook") || lower.includes("meta")) return "Marketing";
  if (lower.includes("petro") || lower.includes("gas") || lower.includes("fuel") || lower.includes("shell") || lower.includes("esso")) return "Fuel & Gas";
  return "Uncategorized";
}

function guessAccountType(typeStr: string) {
  const lower = typeStr.toLowerCase();
  if (lower.includes("credit") || lower.includes("mastercard") || lower.includes("visa") || lower.includes("amex")) return "LIABILITY";
  return "ASSET"; // checking, savings
}

/**
 * Clean up Excel scientific notation for account numbers.
 * "5.52613E+15" → "5526130000000000" → last 4 = "0000"
 * Better: just use the raw string's last 4 digits if available.
 */
function cleanAccountNumber(raw: string): string {
  if (!raw) return "";
  // If it looks like scientific notation, convert it
  if (raw.includes("E+") || raw.includes("e+")) {
    try {
      const num = Number(raw);
      if (!isNaN(num) && isFinite(num)) {
        return num.toFixed(0);
      }
    } catch { /* fall through */ }
  }
  return raw;
}

function extractVendorName(desc1: string): string {
  if (!desc1) return "Unknown Vendor";
  const lower = desc1.toLowerCase();

  // Known brand matches
  if (lower.includes("amazon")) return "Amazon";
  if (lower.includes("uber eats") || lower.includes("ubereats")) return "Uber Eats";
  if (lower.includes("uber")) return "Uber";
  if (lower.includes("lyft")) return "Lyft";
  if (lower.includes("starbucks")) return "Starbucks";
  if (lower.includes("rogers")) return "Rogers";
  if (lower.includes("google")) return "Google";
  if (lower.includes("openai") || lower.includes("chatgpt")) return "OpenAI";
  if (lower.includes("petro-canada") || lower.includes("petro canada")) return "Petro-Canada";
  if (lower.includes("meta") || lower.includes("facebook")) return "Meta";
  if (lower.includes("apple")) return "Apple";
  if (lower.includes("microsoft")) return "Microsoft";
  if (lower.includes("netflix")) return "Netflix";
  if (lower.includes("spotify")) return "Spotify";
  if (lower.includes("shopify")) return "Shopify";
  if (lower.includes("bell")) return "Bell";
  if (lower.includes("telus")) return "Telus";

  // General heuristic: clean up first meaningful word or phrase
  // Remove prefix patterns like "GOOGLE*", "OPENAI *"
  let cleaned = desc1.replace(/[*#]+/g, " ").replace(/\s+/g, " ").trim();
  // Take the first recognizable segment (up to the first number-heavy token)
  const words = cleaned.split(/\s+/);
  const vendorWords: string[] = [];
  for (const word of words) {
    // Stop at words that look like IDs, phone numbers, etc.
    if (/^\d{4,}/.test(word) || /^\d+-\d+/.test(word)) break;
    vendorWords.push(word);
    if (vendorWords.length >= 3) break; // Max 3 words for vendor name
  }

  const result = vendorWords.join(" ").replace(/[^a-zA-Z0-9\s&'-]/g, "").trim();
  return result || "Unknown Vendor";
}

export function ImportTransactionsDialog({
  accounts,
  categories,
  vendors,
  transactions,
  onSuccess
}: {
  accounts: any[];
  categories: any[];
  vendors: any[];
  transactions: any[];
  onSuccess: (dateRange?: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "IMPORTING" | "SUCCESS">("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<any>(null);

  const resetState = () => {
    setStep("UPLOAD");
    setFile(null);
    setProgress(0);
    setPreviewData(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    processCSV(file);
  };

  const processCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          toast.error("CSV file is empty or has no data rows.");
          return;
        }
        analyzeData(rows);
      },
      error: (error) => {
        toast.error("Failed to parse CSV: " + error.message);
      }
    });
  };

  const analyzeData = (rows: any[]) => {
    const accountsToCreate = new Map<string, any>();
    const vendorsToCreate = new Map<string, any>();
    const categoriesToCreate = new Map<string, any>();
    const txsToImport: any[] = [];
    const duplicates: string[] = [];
    let minDate = "";
    let maxDate = "";

    rows.forEach((row, index) => {
      const date = row["Transaction Date"] || row["Date"] || row["date"] || row["transaction_date"];
      const desc1 = row["Description 1"] || row["Description"] || row["description"];
      const desc2 = row["Description 2"] || row["description_2"] || "";
      const description = [desc1, desc2].filter(Boolean).join(" - ") || "Unknown Transaction";

      const cad = parseMoney(row["CAD$"] || row["CAD"] || row["cad"] || row["Amount"] || row["amount"]);
      const usd = parseMoney(row["USD$"] || row["USD"] || row["usd"]);
      let amount = cad !== 0 ? cad : usd;
      const currency = usd !== 0 && cad === 0 ? "USD" : "CAD";

      if (amount === 0) return; // Skip zero dollar transactions

      const type = amount < 0 ? "EXPENSE" : "INCOME";
      amount = Math.abs(amount);

      // Account matching — handle scientific notation from Excel
      const accTypeRaw = row["Account Type"] || row["account_type"] || "Bank Account";
      const accNumberRaw = row["Account Number"] || row["account_number"] || "";
      const accNumber = cleanAccountNumber(String(accNumberRaw).trim());
      const last4 = accNumber.length >= 4 ? accNumber.slice(-4) : accNumber;
      const accountName = last4 ? `${accTypeRaw} *${last4}` : accTypeRaw;

      let matchedAccount = accounts.find(a => a.name.toLowerCase() === accountName.toLowerCase());
      let accountTempId = "";
      if (matchedAccount) {
        accountTempId = matchedAccount.id;
      } else {
        if (!accountsToCreate.has(accountName)) {
          accountsToCreate.set(accountName, {
            tempId: `acc_${accountsToCreate.size}`,
            name: accountName,
            type: guessAccountType(accTypeRaw),
            isBankAccount: !guessAccountType(accTypeRaw).includes("LIABILITY")
          });
        }
        accountTempId = accountsToCreate.get(accountName)!.tempId;
      }

      // Vendor matching — smarter extraction
      const vendorName = extractVendorName(desc1);
      let matchedVendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
      let vendorTempId = "";
      if (vendorName !== "Unknown Vendor") {
        if (matchedVendor) {
          vendorTempId = matchedVendor.id;
        } else {
          if (!vendorsToCreate.has(vendorName.toLowerCase())) {
            vendorsToCreate.set(vendorName.toLowerCase(), { tempId: `ven_${vendorsToCreate.size}`, name: vendorName });
          }
          vendorTempId = vendorsToCreate.get(vendorName.toLowerCase())!.tempId;
        }
      }

      // Category matching
      const catName = matchCategoryKeyword(description);
      let matchedCategory = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      let categoryTempId = "";
      if (matchedCategory) {
        categoryTempId = matchedCategory.id;
      } else {
        if (!categoriesToCreate.has(catName)) {
          categoriesToCreate.set(catName, { tempId: `cat_${categoriesToCreate.size}`, name: catName, type: guessCategoryType(catName) });
        }
        categoryTempId = categoriesToCreate.get(catName)!.tempId;
      }

      const txDateIso = parseDate(date);
      const txDateShort = txDateIso.slice(0, 10);

      // Track date range of imported data
      if (!minDate || txDateShort < minDate) minDate = txDateShort;
      if (!maxDate || txDateShort > maxDate) maxDate = txDateShort;

      const txTempId = `tx_${index}`;

      // Duplicate detection
      const isDuplicate = transactions.some(t =>
        Math.abs(Number(t.amount) - amount) < 0.01 &&
        t.description === description &&
        new Date(t.transactionDate).toISOString().slice(0, 10) === txDateShort
      );

      if (isDuplicate) {
        duplicates.push(txTempId);
      }

      txsToImport.push({
        tempId: txTempId,
        description,
        amount,
        currency,
        transactionDate: txDateIso,
        type,
        accountId: accountTempId,
        categoryId: categoryTempId || null,
        vendorId: vendorTempId || null,
        reference: row["Cheque Number"] || row["cheque_number"] || null,
        paymentMethod: null,
        sourceType: "CSV_IMPORT",
        status: "POSTED"
      });
    });

    setPreviewData({
      accounts: Array.from(accountsToCreate.values()),
      vendors: Array.from(vendorsToCreate.values()),
      categories: Array.from(categoriesToCreate.values()),
      transactions: txsToImport,
      duplicates,
      dateRange: { from: minDate, to: maxDate }
    });
    setStep("PREVIEW");
  };

  const handleImport = async (strategy: "SKIP" | "REPLACE" | "IMPORT_ALL") => {
    setStep("IMPORTING");
    setProgress(10);
    try {
      const payload = {
        accountsToCreate: previewData.accounts,
        vendorsToCreate: previewData.vendors,
        categoriesToCreate: previewData.categories,
        transactions: previewData.transactions,
        duplicateStrategy: strategy,
        duplicateTransactionIds: previewData.duplicates
      };

      setProgress(50);
      const response = await api.post(`/bookkeeping/import`, payload);
      const result = response.data?.data || response.data || {};

      setProgress(100);
      setImportResult({
        ...result,
        totalRows: previewData.transactions.length,
        newAccounts: previewData.accounts.length,
        newVendors: previewData.vendors.length,
        newCategories: previewData.categories.length,
        dateRange: previewData.dateRange,
      });
      setTimeout(() => {
        setStep("SUCCESS");
        toast.success(`Imported ${result.createdCount || previewData.transactions.length} transactions successfully`);
        // Tell parent to adjust date range to show imported data
        onSuccess(previewData.dateRange);
      }, 500);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to import transactions");
      setStep("PREVIEW");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">
          <Upload className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#0F172A]">Import Transactions</DialogTitle>
        </DialogHeader>

        {step === "UPLOAD" && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#0891B2]/20 rounded-xl bg-[#F8FAFC]">
            <FileText className="h-12 w-12 text-[#0891B2] mb-4 opacity-80" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Upload your bank statement</h3>
            <p className="text-sm text-[#64748B] text-center mb-6 max-w-sm">
              We accept CSV files with Account Type, Transaction Date, Description, and Amount columns. We'll automatically categorize and create everything for you.
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-white border border-[rgba(15,23,42,0.06)] text-[#0F172A] hover:bg-slate-50 shadow-sm">
              Select CSV File
            </Button>
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
        )}

        {step === "PREVIEW" && previewData && (
          <div className="space-y-6">
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[rgba(15,23,42,0.06)]">
              <h3 className="font-semibold text-[#0F172A] mb-3">Import Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">Total Transactions</span><span className="font-medium">{previewData.transactions.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">Date Range</span><span className="font-medium text-[#0F172A]">{previewData.dateRange.from} → {previewData.dateRange.to}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Accounts</span><span className="font-medium text-[#0891B2]">{previewData.accounts.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Vendors</span><span className="font-medium text-[#0891B2]">{previewData.vendors.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Categories</span><span className="font-medium text-[#0891B2]">{previewData.categories.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">Duplicates</span><span className="font-medium text-amber-600">{previewData.duplicates.length}</span></div>
              </div>
            </div>

            {/* Preview all transactions */}
            {previewData.transactions.length > 0 && (
              <div className="bg-white rounded-xl border border-[rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-[300px]">
                <div className="p-3 bg-slate-50 border-b border-[rgba(15,23,42,0.06)]">
                  <h4 className="text-sm font-semibold text-[#0F172A]">Preview ({previewData.transactions.length} rows)</h4>
                </div>
                <div className="overflow-y-auto p-4 space-y-2 text-xs flex-1">
                  {previewData.transactions.map((tx: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tx.type === "EXPENSE" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{tx.type}</span>
                        <span className="text-[#64748B] w-20 flex-shrink-0">{tx.transactionDate.slice(0, 10)}</span>
                        <span className="text-[#0F172A] truncate">{tx.description}</span>
                      </div>
                      <span className={`font-medium flex-shrink-0 ml-2 ${tx.type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}`}>
                        {tx.type === "EXPENSE" ? "-" : "+"}${tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewData.duplicates.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Duplicate Transactions Detected</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      We found {previewData.duplicates.length} transactions that match existing records. How would you like to handle them?
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => { resetState(); }} className="rounded-xl">Cancel</Button>
              {previewData.duplicates.length > 0 ? (
                <>
                  <Button variant="outline" onClick={() => handleImport("SKIP")} className="rounded-xl text-[#0891B2] border-[#0891B2]/30 hover:bg-[#0891B2]/5">
                    Skip Duplicates
                  </Button>
                  <Button onClick={() => handleImport("IMPORT_ALL")} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">
                    Import All Anyway
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleImport("SKIP")} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">
                  Confirm Import <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "IMPORTING" && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <h3 className="text-lg font-medium text-[#0F172A]">Processing your transactions...</h3>
            <p className="text-sm text-[#64748B]">Creating accounts, vendors, categories, and posting transactions.</p>
            <div className="w-full max-w-sm mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {step === "SUCCESS" && importResult && (
          <div className="flex flex-col items-center justify-center p-6">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-4">Import Successful</h3>

            <div className="w-full bg-[#F8FAFC] rounded-xl p-4 border border-[rgba(15,23,42,0.06)] mb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-[#64748B]">Transactions Created</span><span className="font-semibold text-emerald-600">{importResult.createdCount || importResult.totalRows}</span></div>
                <div className="flex justify-between"><span className="text-[#64748B]">Accounts Created</span><span className="font-semibold text-[#0891B2]">{importResult.newAccounts}</span></div>
                <div className="flex justify-between"><span className="text-[#64748B]">Vendors Created</span><span className="font-semibold text-[#0891B2]">{importResult.newVendors}</span></div>
                <div className="flex justify-between"><span className="text-[#64748B]">Categories Created</span><span className="font-semibold text-[#0891B2]">{importResult.newCategories}</span></div>
              </div>
            </div>

            <Button onClick={() => { setOpen(false); resetState(); }} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white w-full max-w-xs">
              Go to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
