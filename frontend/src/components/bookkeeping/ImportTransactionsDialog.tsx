import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, X } from "lucide-react";
import { Progress } from "../ui/progress";
import { toast } from "sonner";
import api from "@/lib/axios";

function parseMoney(value: any) {
  if (!value) return 0;
  const str = String(value).replace(/[^0-9.-]+/g, "");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: any) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
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
  if (lower.includes("software") || lower.includes("subscription") || lower.includes("github") || lower.includes("aws") || lower.includes("google")) return "Software & SaaS";
  if (lower.includes("insurance")) return "Insurance";
  if (lower.includes("tax") || lower.includes("cra")) return "Taxes";
  if (lower.includes("rent") || lower.includes("lease")) return "Rent";
  if (lower.includes("marketing") || lower.includes("ads") || lower.includes("facebook") || lower.includes("meta")) return "Marketing";
  return "Uncategorized";
}

function guessAccountType(typeStr: string) {
  const lower = typeStr.toLowerCase();
  if (lower.includes("credit") || lower.includes("mastercard") || lower.includes("visa") || lower.includes("amex")) return "LIABILITY";
  return "ASSET"; // checking, savings
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
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "IMPORTING" | "SUCCESS">("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewData, setPreviewData] = useState<any>(null);

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

    rows.forEach((row, index) => {
      const date = row["Transaction Date"] || row["Date"];
      const desc1 = row["Description 1"] || row["Description"];
      const desc2 = row["Description 2"] || "";
      const description = [desc1, desc2].filter(Boolean).join(" - ") || "Unknown Transaction";
      
      const cad = parseMoney(row["CAD$"] || row["CAD"]);
      const usd = parseMoney(row["USD$"] || row["USD"]);
      let amount = cad !== 0 ? cad : usd;
      const currency = usd !== 0 && cad === 0 ? "USD" : "CAD";

      if (amount === 0) return; // Skip zero dollar transactions

      const type = amount < 0 ? "EXPENSE" : "INCOME";
      amount = Math.abs(amount);

      // Account matching
      const accTypeRaw = row["Account Type"] || "Bank Account";
      const accNumber = row["Account Number"] || "";
      const accountName = accNumber ? `${accTypeRaw} *${String(accNumber).slice(-4)}` : accTypeRaw;
      
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
        accountTempId = accountsToCreate.get(accountName).tempId;
      }

      // Vendor matching
      // Simple heuristic: Take first word or known keywords
      let vendorName = "Unknown Vendor";
      if (desc1) {
        const words = desc1.split(" ");
        if (words[0]) vendorName = words[0].replace(/[^a-zA-Z0-9]/g, ""); // basic cleanup
        if (desc1.toLowerCase().includes("amazon")) vendorName = "Amazon";
        if (desc1.toLowerCase().includes("uber")) vendorName = "Uber";
        if (desc1.toLowerCase().includes("starbucks")) vendorName = "Starbucks";
      }

      let matchedVendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
      let vendorTempId = "";
      if (vendorName !== "Unknown Vendor") {
        if (matchedVendor) {
          vendorTempId = matchedVendor.id;
        } else {
          if (!vendorsToCreate.has(vendorName)) {
            vendorsToCreate.set(vendorName, { tempId: `ven_${vendorsToCreate.size}`, name: vendorName });
          }
          vendorTempId = vendorsToCreate.get(vendorName).tempId;
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
        categoryTempId = categoriesToCreate.get(catName).tempId;
      }

      const txDateIso = parseDate(date);
      const txTempId = `tx_${index}`;

      // Duplicate detection
      const isDuplicate = transactions.some(t => 
        Math.abs(Number(t.amount) - amount) < 0.01 && 
        t.description === description && 
        new Date(t.transactionDate).toISOString().slice(0,10) === txDateIso.slice(0,10)
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
        reference: row["Cheque Number"] || null,
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
      duplicates
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
      const { data } = await api.post(`/bookkeeping/import`, payload);
      
      setProgress(100);
      setTimeout(() => {
        setStep("SUCCESS");
        toast.success(`Imported ${data.createdCount || data.data?.createdCount || 0} transactions successfully`);
        onSuccess();
      }, 500);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || error.response?.data?.message || "Failed to import transactions");
      setStep("PREVIEW");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white">
          <Upload className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#0F172A]">Import Transactions</DialogTitle>
        </DialogHeader>
        
        {step === "UPLOAD" && (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#0891B2]/20 rounded-xl bg-[#F8FAFC]">
            <FileText className="h-12 w-12 text-[#0891B2] mb-4 opacity-80" />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Upload your bank statement</h3>
            <p className="text-sm text-[#64748B] text-center mb-6 max-w-sm">
              We accept CSV files containing Account, Date, Description, and Amount columns. We'll automatically categorize them for you.
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">Total Rows</span><span className="font-medium">{previewData.transactions.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Accounts</span><span className="font-medium text-[#0891B2]">{previewData.accounts.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Vendors</span><span className="font-medium text-[#0891B2]">{previewData.vendors.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-[#64748B]">New Categories</span><span className="font-medium text-[#0891B2]">{previewData.categories.length}</span></div>
              </div>
            </div>

            {previewData.duplicates.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Duplicate Transactions Detected</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      We found {previewData.duplicates.length} transactions that match existing records in your bookkeeping. How would you like to handle them?
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setStep("UPLOAD")} className="rounded-xl">Cancel</Button>
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
            <p className="text-sm text-[#64748B]">Creating accounts, vendors, and matching categories.</p>
            <div className="w-full max-w-sm mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        )}

        {step === "SUCCESS" && (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Import Successful</h3>
            <p className="text-sm text-[#64748B] text-center mb-6">
              Your bookkeeping dashboard has been updated automatically.
            </p>
            <Button onClick={() => setOpen(false)} className="rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white w-full max-w-xs">
              Go to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
