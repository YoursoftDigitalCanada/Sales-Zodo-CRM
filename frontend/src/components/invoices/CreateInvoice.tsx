// src/pages/CreateInvoice.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, FormProvider, useFieldArray, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
// // import { Sidebar } from "@/components/Sidebar"; // Removed // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  User,
  Users,
  Building2,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  FileText,
  CalendarDays,
  DollarSign,
  Save,
  Send,
  Mail,
  Printer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  CreditCard,
  Wallet,
  Hash,
  Settings,
  ImageIcon,
  ArrowLeft,
  FileDown,
  FilePlus,
  Percent,
  Calculator,
  Globe,
  MapPin,
  Phone,
  AtSign,
  Briefcase,
  Package,
  Tag,
  Info,
  HelpCircle,
  Repeat,
  PanelLeftClose,
  PanelLeft,
  GripVertical,
  PlusCircle,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createInvoice, downloadInvoicePdf, getInvoiceById, sendInvoice, updateInvoice } from "@/services/invoiceService";
import { printInvoiceDocument } from "@/features/invoices/utils/invoice-print";
import { createClient, getClients } from "@/features/clients/services/clients-service";
import { getLeadById, type LeadEntity } from "@/features/leads";
import { getProjectById, type ProjectEntity } from "@/features/projects/services/projects-service";
import { getCompanyProfile, type CompanyProfile } from "@/features/settings/services/settings-service";
import { useWorkspaceBranding } from "@/features/settings/context/workspace-branding";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";

// ============================================
// TYPES
// ============================================

interface Client {
  id: string | number;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  gstNumber?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  rate: number;
  unit?: string;
  taxable: boolean;
}

interface AppUser {
  firstName: string;
  lastName: string;
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  gstNumber?: string;
}

interface ParsedCompanyAddress {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  taxType: string;
  amount: number;
  gst: number;
  pst: number;
  hst: number;
  total: number;
}

// ============================================
// CONSTANTS - Canadian Tax Rates by Province
// ============================================

const canadianProvinces = [
  { code: "AB", name: "Alberta", gst: 5, pst: 0, hst: 0, taxType: "GST" },
  { code: "BC", name: "British Columbia", gst: 5, pst: 7, hst: 0, taxType: "GST+PST" },
  { code: "MB", name: "Manitoba", gst: 5, pst: 7, hst: 0, taxType: "GST+PST" },
  { code: "NB", name: "New Brunswick", gst: 0, pst: 0, hst: 15, taxType: "HST" },
  { code: "NL", name: "Newfoundland and Labrador", gst: 0, pst: 0, hst: 15, taxType: "HST" },
  { code: "NS", name: "Nova Scotia", gst: 0, pst: 0, hst: 15, taxType: "HST" },
  { code: "NT", name: "Northwest Territories", gst: 5, pst: 0, hst: 0, taxType: "GST" },
  { code: "NU", name: "Nunavut", gst: 5, pst: 0, hst: 0, taxType: "GST" },
  { code: "ON", name: "Ontario", gst: 0, pst: 0, hst: 13, taxType: "HST" },
  { code: "PE", name: "Prince Edward Island", gst: 0, pst: 0, hst: 15, taxType: "HST" },
  { code: "QC", name: "Quebec", gst: 5, pst: 9.975, hst: 0, taxType: "GST+QST" },
  { code: "SK", name: "Saskatchewan", gst: 5, pst: 6, hst: 0, taxType: "GST+PST" },
  { code: "YT", name: "Yukon", gst: 5, pst: 0, hst: 0, taxType: "GST" },
];

const paymentTermsOptions = [
  { value: "due_on_receipt", label: "Due on Receipt", days: 0 },
  { value: "net_7", label: "Net 7", days: 7 },
  { value: "net_15", label: "Net 15", days: 15 },
  { value: "net_30", label: "Net 30", days: 30 },
  { value: "net_45", label: "Net 45", days: 45 },
  { value: "net_60", label: "Net 60", days: 60 },
  { value: "custom", label: "Custom", days: null },
];

const currencyOptions = [
  { value: "CAD", label: "CAD - Canadian Dollar", symbol: "$" },
  { value: "USD", label: "USD - US Dollar", symbol: "$" },
];

// Clients are fetched from the API in the component below

// Starter line items
const mockProducts: Product[] = [
  { id: 1, name: "Implementation Package", description: "Initial setup, configuration, and onboarding support", rate: 1200, unit: "package", taxable: true },
  { id: 2, name: "Professional Services", description: "Consulting, delivery, and account support", rate: 150, unit: "hour", taxable: true },
  { id: 3, name: "Monthly Subscription", description: "Recurring platform or service subscription", rate: 500, unit: "month", taxable: true },
  { id: 4, name: "Training Session", description: "Team enablement and product training", rate: 300, unit: "session", taxable: true },
  { id: 5, name: "Support Retainer", description: "Priority support and success management", rate: 750, unit: "month", taxable: true },
];

// ============================================
// ZOD SCHEMA
// ============================================

const lineItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  taxType: z.string(),
  amount: z.number(),
  gst: z.number(),
  pst: z.number(),
  hst: z.number(),
  total: z.number(),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentTerms: z.string(),
  currency: z.string(),
  clientProvince: z.string(),
  gstEnabled: z.boolean().optional(),
  gstRate: z.coerce.number().min(0).optional(),
  pstEnabled: z.boolean().optional(),
  pstRate: z.coerce.number().min(0).optional(),
  hstEnabled: z.boolean().optional(),
  hstRate: z.coerce.number().min(0).optional(),
  billedBy: z.object({
    businessName: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
    gstNumber: z.string(),
  }),
  billedTo: z.object({
    businessName: z.string().min(1, "Client name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
    gstNumber: z.string(),
  }),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  sendReminder: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const DEFAULT_INVOICE_TERMS =
  "Payment is due within the specified terms. Late payments may be subject to applicable fees. Please contact us if you have any questions about this invoice.";

type AutoSaveState = "idle" | "waiting" | "saving" | "saved" | "error";

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const formatCurrency = (amount: number, currency = "CAD") => {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `INV-${year}-${random}`;
};

const calculateDueDate = (invoiceDate: string, days: number) => {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const getTaxTypeLabel = (taxRates: { gst: number; pst: number; hst: number }, provinceCode?: string) => {
  if (taxRates.hst > 0) return "HST";
  if (taxRates.gst > 0 && taxRates.pst > 0) {
    return provinceCode === "QC" ? "GST+QST" : "GST+PST";
  }
  if (taxRates.gst > 0) return "GST";
  if (taxRates.pst > 0) return provinceCode === "QC" ? "QST" : "PST";
  return "Tax";
};

const readText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toDateInputValue = (value: unknown) => {
  const text = readText(value);
  if (!text) return new Date().toISOString().split("T")[0];
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? new Date().toISOString().split("T")[0] : date.toISOString().split("T")[0];
};

const getProvinceCode = (value: unknown) => {
  const text = readText(value).toUpperCase();
  if (canadianProvinces.some((province) => province.code === text)) return text;
  const province = canadianProvinces.find((entry) => entry.name.toUpperCase() === text);
  return province?.code || "ON";
};

const parseCompanyAddress = (value: unknown): ParsedCompanyAddress => {
  const text = readText(value);

  if (!text) {
    return {
      address: "",
      city: "",
      province: "ON",
      postalCode: "",
      country: "Canada",
    };
  }

  const segments = text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const firstSegment = segments[0] || text;
  const lastSegment = segments[segments.length - 1] || "";
  const postalMatch = text.match(/\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i);
  const provinceMatch = text.match(/\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Northwest Territories|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)\b/i);

  let city = "";
  if (segments.length >= 3) {
    city = segments[1];
  } else if (segments.length === 2 && !provinceMatch) {
    city = segments[1];
  }

  return {
    address: firstSegment,
    city,
    province: getProvinceCode(provinceMatch?.[1] || ""),
    postalCode: postalMatch?.[1]?.toUpperCase() || "",
    country: /canada/i.test(lastSegment) ? "Canada" : "Canada",
  };
};

const getSelectedInvoiceAddress = (details: { formattedAddress?: string | null; addressLine1?: string | null }, fallback?: string) =>
  readText(details.formattedAddress) || readText(details.addressLine1) || readText(fallback);

const buildInvoiceAddressLines = (party: InvoiceFormData["billedBy"] | InvoiceFormData["billedTo"]) => {
  const address = readText(party.address);
  const locality = [party.city, party.province, party.postalCode].map(readText).filter(Boolean).join(", ");
  const country = readText(party.country);
  const normalizedAddress = address.toLowerCase();
  const hasLocalityInAddress = Boolean(locality) && locality.toLowerCase().split(/[,\s]+/).filter(Boolean).every((part) => normalizedAddress.includes(part));
  const hasCountryInAddress = Boolean(country) && normalizedAddress.includes(country.toLowerCase());

  return [
    address,
    locality && !hasLocalityInAddress ? locality : "",
    country && !hasCountryInAddress ? country : "",
  ].filter(Boolean);
};

const renderInvoiceAddressLines = (party: InvoiceFormData["billedBy"] | InvoiceFormData["billedTo"]) =>
  buildInvoiceAddressLines(party).map((line, index) => (
    <p key={`${line}-${index}`} className="text-sm text-[#475569]">{line}</p>
  ));

const getProjectInvoice = (project: ProjectEntity, invoiceId?: string | null) => {
  if (!Array.isArray(project.invoices) || project.invoices.length === 0) return null;
  const invoices = project.invoices as Array<Record<string, unknown>>;
  if (invoiceId) {
    const exact = invoices.find((invoice) => readText(invoice.id) === invoiceId);
    if (exact) return exact;
  }
  return invoices.find((invoice) => readText(invoice.status).toUpperCase() === "DRAFT") ?? invoices[0] ?? null;
};

const findMatchingClient = (clients: Client[], billedTo: InvoiceFormData["billedTo"]) => {
  const email = billedTo.email.trim().toLowerCase();
  const businessName = billedTo.businessName.trim().toLowerCase();

  return clients.find((client) => {
    if (email && client.email.trim().toLowerCase() === email) return true;
    return businessName ? client.businessName.trim().toLowerCase() === businessName : false;
  }) || null;
};

const hasValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const canAutoSaveInvoiceDraft = (data: InvoiceFormData) =>
  Boolean(
    readText(data.invoiceNumber)
    && readText(data.invoiceDate)
    && readText(data.dueDate)
    && readText(data.billedTo.businessName)
    && hasValidEmail(readText(data.billedTo.email)),
  );

const normalizeAutoSaveInvoiceData = (data: InvoiceFormData): InvoiceFormData => {
  const normalizedItems = (data.items || []).map((item) => ({
    ...item,
    name: readText(item.name) || "Draft invoice item",
    description: readText(item.description),
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    rate: Number(item.rate) >= 0 ? Number(item.rate) : 0,
    amount: Number(item.amount) >= 0 ? Number(item.amount) : 0,
    total: Number(item.total) >= 0 ? Number(item.total) : 0,
  }));

  return {
    ...data,
    billedTo: {
      ...data.billedTo,
      businessName: readText(data.billedTo.businessName),
      email: readText(data.billedTo.email),
      phone: readText(data.billedTo.phone),
      address: readText(data.billedTo.address),
      city: readText(data.billedTo.city),
      province: readText(data.billedTo.province) || "ON",
      postalCode: readText(data.billedTo.postalCode),
      country: readText(data.billedTo.country) || "Canada",
      gstNumber: readText(data.billedTo.gstNumber),
    },
    items: normalizedItems.length > 0 ? normalizedItems : [{
      id: crypto.randomUUID(),
      name: "Draft invoice item",
      description: "",
      quantity: 1,
      rate: 0,
      taxType: "HST",
      amount: 0,
      gst: 0,
      pst: 0,
      hst: 0,
      total: 0,
    }],
  };
};

const mapInvoiceItemsToFormItems = (
  items: Array<Record<string, unknown>>,
  taxRates: { gst: number; pst: number; hst: number },
): LineItem[] =>
  items.map((item, index) => {
    const quantity = toNumber(item.quantity) || 1;
    const rate = toNumber(item.unitPrice);
    const amount = quantity * rate;
    return {
      id: readText(item.id) || crypto.randomUUID(),
      name: readText(item.description) || `Line Item ${index + 1}`,
      description: readText(item.description),
      quantity,
      rate,
      taxType: taxRates.hst > 0 ? "HST" : taxRates.pst > 0 ? "GST+PST" : "GST",
      amount,
      gst: taxRates.hst > 0 ? 0 : (amount * taxRates.gst) / 100,
      pst: (amount * taxRates.pst) / 100,
      hst: (amount * taxRates.hst) / 100,
      total: amount + (taxRates.hst > 0 ? (amount * taxRates.hst) / 100 : ((amount * taxRates.gst) / 100) + ((amount * taxRates.pst) / 100)),
    };
  });

const inferPaymentTerms = (invoiceDate: string, dueDate: string) => {
  const invoiceTime = new Date(invoiceDate).getTime();
  const dueTime = new Date(dueDate).getTime();
  if (Number.isNaN(invoiceTime) || Number.isNaN(dueTime)) return "net_30";
  const diffInDays = Math.round((dueTime - invoiceTime) / (1000 * 60 * 60 * 24));
  const exact = paymentTermsOptions.find((option) => option.days === diffInDays);
  return exact?.value || "custom";
};

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero Dollars";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertGroup(n % 100) : "");
  };

  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);

  let result = "";
  let scaleIndex = 0;
  let remaining = dollars;

  while (remaining > 0) {
    const group = remaining % 1000;
    if (group > 0) {
      result = convertGroup(group) + (scales[scaleIndex] ? " " + scales[scaleIndex] : "") + (result ? " " + result : "");
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  result += " Dollar" + (dollars !== 1 ? "s" : "");
  if (cents > 0) {
    result += " and " + convertGroup(cents) + " Cent" + (cents !== 1 ? "s" : "");
  }

  return result || "Zero Dollars";
};

// ============================================
// SECTION CARD COMPONENT
// ============================================

const SectionCard = ({
  title,
  icon: Icon,
  children,
  className,
  headerAction,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between p-5 border-b border-[rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center">
            <Icon size={20} className="text-[#0891B2]" />
          </div>
          <h3 className="font-semibold text-[#0F172A]">{title}</h3>
        </div>
        {headerAction}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

// ============================================
// ADDRESS BLOCK COMPONENT
// ============================================

const AddressBlock = ({
  title,
  prefix,
  control,
  setValue,
  register,
  errors,
  onSelectClient,
  showClientSelector = false,
  clients = [],
  disabled = false,
}: {
  title: string;
  prefix: "billedBy" | "billedTo";
  control: any;
  setValue: any;
  register: any;
  errors: any;
  onSelectClient?: (client: Client) => void;
  showClientSelector?: boolean;
  clients?: Client[];
  disabled?: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredClients = clients.filter((client) =>
    client.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isBilledTo = prefix === "billedTo";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-[#0F172A] flex items-center gap-2">
          {isBilledTo ? <Users size={16} className="text-[#D97706]" /> : <Building2 size={16} className="text-[#0891B2]" />}
          {title}
        </h4>
        {showClientSelector && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-md text-xs" disabled={disabled}>
                <Search size={12} className="mr-1" />
                Select Organization
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-md p-2">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search organizations..."
                  className="h-8 pl-7 text-xs rounded-md"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredClients.map((client) => (
                  <DropdownMenuItem
                    key={client.id}
                    onClick={() => {
                      onSelectClient?.(client);
                      setIsDropdownOpen(false);
                    }}
                    className="rounded-md cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-semibold">
                        {getInitials(client.businessName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.businessName}</p>
                        <p className="text-xs text-[#475569]">{client.email}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-xs text-[#475569] text-center py-4">No organizations found</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md text-[#0891B2]">
                <PlusCircle size={14} className="mr-2" />
                Add New Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-[#94A3B8]">Business Name *</Label>
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <Input
              {...register(`${prefix}.businessName`)}
              placeholder="Business Name"
              disabled={disabled}
              className={cn(
                "h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm",
                errors?.[prefix]?.businessName && "border-red-500"
              )}
            />
          </div>
          {errors?.[prefix]?.businessName && (
            <p className="text-xs text-red-500">{errors[prefix].businessName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">Email</Label>
          <div className="relative">
            <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <Input
              {...register(`${prefix}.email`)}
              type="email"
              placeholder="email@example.com"
              disabled={disabled}
              className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">Phone</Label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
            <Input
              {...register(`${prefix}.phone`)}
              placeholder="+1 (000) 000-0000"
              disabled={disabled}
              className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
            />
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-[#94A3B8]">Address</Label>
          <Controller
            name={`${prefix}.address`}
            control={control}
            render={({ field }) => (
              <AddressAutocompleteInput
                name={field.name}
                value={field.value || ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Street Address"
                disabled={disabled}
                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
                onSelectAddress={(details) => {
                  field.onChange(getSelectedInvoiceAddress(details, field.value));
                  setValue(`${prefix}.city`, details.city || "", { shouldDirty: true });
                  setValue(`${prefix}.province`, getProvinceCode(details.state), { shouldDirty: true });
                  setValue(`${prefix}.postalCode`, details.postalCode || "", { shouldDirty: true });
                  setValue(`${prefix}.country`, details.country || "Canada", { shouldDirty: true });
                }}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">City</Label>
          <Input
            {...register(`${prefix}.city`)}
            placeholder="City"
            disabled={disabled}
            className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">Province</Label>
          <Controller
            name={`${prefix}.province`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <SelectTrigger className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                  <SelectValue placeholder="Select Province" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {canadianProvinces.map((prov) => (
                    <SelectItem key={prov.code} value={prov.code} className="rounded-md">
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">Postal Code</Label>
          <Input
            {...register(`${prefix}.postalCode`)}
            placeholder="A1A 1A1"
            disabled={disabled}
            className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-[#94A3B8]">GST/HST Number</Label>
          <Input
            {...register(`${prefix}.gstNumber`)}
            placeholder="123456789RT0001"
            disabled={disabled}
            className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// LINE ITEM ROW COMPONENT
// ============================================

const LineItemRow = ({
  index,
  item,
  register,
  control,
  watch,
  setValue,
  remove,
  errors,
  taxRates,
  products,
  onSelectProduct,
}: {
  index: number;
  item: any;
  register: any;
  control: any;
  watch: any;
  setValue: any;
  remove: () => void;
  errors: any;
  taxRates: { gst: number; pst: number; hst: number; taxType: string };
  products: Product[];
  onSelectProduct: (product: Product) => void;
}) => {
  const quantity = watch(`items.${index}.quantity`) || 0;
  const rate = watch(`items.${index}.rate`) || 0;
  const amount = quantity * rate;

  // Calculate taxes based on province
  const gst = taxRates.hst > 0 ? 0 : (amount * taxRates.gst) / 100;
  const pst = (amount * taxRates.pst) / 100;
  const hst = (amount * taxRates.hst) / 100;
  const total = amount + gst + pst + hst;

  useEffect(() => {
    setValue(`items.${index}.amount`, amount);
    setValue(`items.${index}.gst`, gst);
    setValue(`items.${index}.pst`, pst);
    setValue(`items.${index}.hst`, hst);
    setValue(`items.${index}.total`, total);
  }, [quantity, rate, taxRates, setValue, index, amount, gst, pst, hst, total]);

  return (
    <motion.tr
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group border-b border-[rgba(15,23,42,0.06)] last:border-0 hover:bg-white/5/50"
    >
      {/* Drag Handle */}
      <td className="py-3 px-2 w-8">
        <GripVertical size={16} className="text-[#475569] cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>

      {/* Item Name */}
      <td className="py-3 px-2">
        <div className="space-y-1">
          <div className="relative">
            <Input
              {...register(`items.${index}.name`)}
              placeholder="Item name"
              className={cn(
                "h-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm",
                errors?.items?.[index]?.name && "border-red-500"
              )}
            />
          </div>
          <Input
            {...register(`items.${index}.description`)}
            placeholder="Description (optional)"
            className="h-8 rounded-md border-[rgba(15,23,42,0.06)] text-xs text-[#94A3B8]"
          />
        </div>
      </td>

      {/* Quantity */}
      <td className="py-3 px-2 w-24">
        <Input
          type="number"
          {...register(`items.${index}.quantity`)}
          min={1}
          className="h-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm text-center"
        />
      </td>

      {/* Rate */}
      <td className="py-3 px-2 w-32">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] text-sm">$</span>
          <Input
            type="number"
            step="0.01"
            {...register(`items.${index}.rate`)}
            min={0}
            className="h-9 pl-7 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
          />
        </div>
      </td>

      {/* Amount */}
      <td className="py-3 px-2 w-28 text-right">
        <span className="text-sm font-medium text-slate-200">{formatCurrency(amount)}</span>
      </td>

      {/* Tax */}
      <td className="py-3 px-2 w-28 text-right">
        <span className="text-sm text-[#94A3B8]">
          {taxRates.hst > 0
            ? formatCurrency(hst)
            : formatCurrency(gst + pst)
          }
        </span>
      </td>

      {/* Total */}
      <td className="py-3 px-2 w-32 text-right">
        <span className="text-sm font-bold text-[#0F172A]">{formatCurrency(total)}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-2 w-12">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={remove}
          className="p-1.5 rounded-md text-[#475569] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={14} />
        </motion.button>
      </td>
    </motion.tr>
  );
};

// ============================================
// LINE ITEMS TABLE COMPONENT
// ============================================

const LineItemsTable = ({
  control,
  register,
  watch,
  setValue,
  errors,
  taxRates,
  products,
}: {
  control: any;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  taxRates: { gst: number; pst: number; hst: number; taxType: string };
  products: Product[];
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleAddItem = () => {
    append({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      quantity: 1,
      rate: 0,
      taxType: taxRates.taxType,
      amount: 0,
      gst: 0,
      pst: 0,
      hst: 0,
      total: 0,
    });
  };

  const handleSelectProduct = (product: Product, index: number) => {
    setValue(`items.${index}.name`, product.name);
    setValue(`items.${index}.description`, product.description || "");
    setValue(`items.${index}.rate`, product.rate);
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Products */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#94A3B8]">Quick Add:</span>
        {products.slice(0, 5).map((product) => (
          <motion.button
            key={product.id}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              append({
                id: crypto.randomUUID(),
                name: product.name,
                description: product.description || "",
                quantity: 1,
                rate: product.rate,
                taxType: taxRates.taxType,
                amount: 0,
                gst: 0,
                pst: 0,
                hst: 0,
                total: 0,
              });
            }}
            className="px-3 py-1.5 rounded-md bg-white/5 text-xs text-[#475569] hover:bg-[#0891B2]/10 hover:text-[#0891B2] transition-colors"
          >
            + {product.name}
          </motion.button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5/80 border-b border-[rgba(15,23,42,0.06)]">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-2 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Item Description
              </th>
              <th className="py-3 px-2 text-center text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-24">
                Qty
              </th>
              <th className="py-3 px-2 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-32">
                Rate
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-28">
                Amount
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-28">
                {taxRates.hst > 0 ? "HST" : taxRates.pst > 0 ? "Tax" : "GST"}
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider w-32">
                Total
              </th>
              <th className="py-3 px-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {fields.map((field, index) => (
                <LineItemRow
                  key={field.id}
                  index={index}
                  item={field}
                  register={register}
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  remove={() => remove(index)}
                  errors={errors}
                  taxRates={taxRates}
                  products={products}
                  onSelectProduct={(product) => handleSelectProduct(product, index)}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Add Item Button */}
        <div className="p-3 border-t border-[rgba(15,23,42,0.06)]">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border-2 border-dashed border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:border-[#22D3EE] hover:text-[#0891B2] hover:bg-[#0891B2]/5 transition-all"
          >
            <PlusCircle size={18} />
            <span className="font-medium">Add Line Item</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INVOICE PREVIEW COMPONENT
// ============================================

const InvoicePreview = ({
  data,
  totals,
  taxRates,
  brandLogoUrl,
  brandName,
}: {
  data: InvoiceFormData;
  totals: { subtotal: number; gst: number; pst: number; hst: number; discount: number; total: number };
  taxRates: { gst: number; pst: number; hst: number; taxType: string };
  brandLogoUrl?: string | null;
  brandName?: string;
}) => {
  const previewBrandName = brandName?.trim() || data.billedBy.businessName || "Your Business";

  return (
    <div className="bg-white rounded-md card-shadow p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">INVOICE</h1>
          <p className="text-[#94A3B8] mt-1">{data.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] text-[#0F172A] font-bold text-xl">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={`${previewBrandName} logo`}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              getInitials(previewBrandName || "YB")
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-white/5 rounded-md">
        <div>
          <p className="text-xs text-[#94A3B8] uppercase">Invoice Date</p>
          <p className="font-semibold text-[#0F172A]">{data.invoiceDate}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] uppercase">Due Date</p>
          <p className="font-semibold text-[#0F172A]">{data.dueDate}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] uppercase">Amount Due</p>
          <p className="font-bold text-[#0891B2] text-lg">{formatCurrency(totals.total, data.currency)}</p>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs text-[#94A3B8] uppercase mb-2">From</p>
          <p className="font-semibold text-[#0F172A]">{data.billedBy.businessName}</p>
          {renderInvoiceAddressLines(data.billedBy)}
          <p className="text-sm text-[#475569]">{data.billedBy.email}</p>
          {data.billedBy.gstNumber && (
            <p className="text-xs text-[#94A3B8] mt-1">GST/HST: {data.billedBy.gstNumber}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] uppercase mb-2">Bill To</p>
          <p className="font-semibold text-[#0F172A]">{data.billedTo.businessName}</p>
          {renderInvoiceAddressLines(data.billedTo)}
          <p className="text-sm text-[#475569]">{data.billedTo.email}</p>
          {data.billedTo.gstNumber && (
            <p className="text-xs text-[#94A3B8] mt-1">GST/HST: {data.billedTo.gstNumber}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-[#22D3EE]">
            <th className="py-3 text-left text-xs font-semibold text-[#94A3B8] uppercase">Description</th>
            <th className="py-3 text-center text-xs font-semibold text-[#94A3B8] uppercase w-16">Qty</th>
            <th className="py-3 text-right text-xs font-semibold text-[#94A3B8] uppercase w-24">Rate</th>
            <th className="py-3 text-right text-xs font-semibold text-[#94A3B8] uppercase w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} className="border-b border-[rgba(15,23,42,0.06)]">
              <td className="py-3">
                <p className="font-medium text-[#0F172A]">{item.name}</p>
                {item.description && <p className="text-xs text-[#94A3B8]">{item.description}</p>}
              </td>
              <td className="py-3 text-center text-[#475569]">{item.quantity}</td>
              <td className="py-3 text-right text-[#475569]">{formatCurrency(item.rate)}</td>
              <td className="py-3 text-right font-medium text-[#0F172A]">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#94A3B8]">Subtotal</span>
            <span className="text-slate-200">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Discount</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          {taxRates.hst > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">HST ({taxRates.hst}%)</span>
              <span className="text-slate-200">{formatCurrency(totals.hst)}</span>
            </div>
          ) : (
            <>
              {taxRates.gst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">GST ({taxRates.gst}%)</span>
                  <span className="text-slate-200">{formatCurrency(totals.gst)}</span>
                </div>
              )}
              {taxRates.pst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#94A3B8]">
                    {data.clientProvince === "QC" ? "QST" : "PST"} ({taxRates.pst}%)
                  </span>
                  <span className="text-slate-200">{formatCurrency(totals.pst)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between pt-2 border-t border-[rgba(15,23,42,0.06)]">
            <span className="font-bold text-[#0F172A]">Total ({data.currency})</span>
            <span className="font-bold text-xl text-[#0891B2]">{formatCurrency(totals.total, data.currency)}</span>
          </div>
        </div>
      </div>

      {/* Total in Words */}
      <div className="mt-6 p-4 bg-white/5 rounded-md">
        <p className="text-xs text-[#94A3B8] uppercase mb-1">Amount in Words</p>
        <p className="text-sm text-slate-200 italic">{numberToWords(totals.total)}</p>
      </div>

      {/* Notes & Payment Instructions */}
      {(data.notes || data.terms) && (
        <div className="mt-6 space-y-4">
          {data.notes && (
            <div>
              <p className="text-xs text-[#94A3B8] uppercase mb-1">Notes</p>
              <p className="whitespace-pre-line text-sm text-[#475569]">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
              <p className="text-xs text-[#94A3B8] uppercase mb-2">Payment Instructions / Terms</p>
              <p className="whitespace-pre-line text-sm leading-6 text-[#475569]">{data.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-[rgba(15,23,42,0.06)] text-center">
        <p className="text-sm text-[#94A3B8]">Thank you for your business!</p>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { id: routeInvoiceId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { branding: workspaceBranding } = useWorkspaceBranding();
  const linkedProjectId = searchParams.get("dealId") || searchParams.get("projectId");
  const linkedLeadId = searchParams.get("leadId");
  const linkedContactId = searchParams.get("contactId");
  const linkedQuoteId = searchParams.get("quoteId") || searchParams.get("proposalId");
  const linkedContractId = searchParams.get("contractId");
  const requestedInvoiceId = searchParams.get("invoiceId") || routeInvoiceId;
  const isProjectReviewMode = Boolean(linkedProjectId);
  const isEditMode = Boolean(requestedInvoiceId) && !isProjectReviewMode;

  // State
  const [user, setUser] = useState<AppUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLinkedInvoice, setIsLoadingLinkedInvoice] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [clients, setClients] = useState<Client[]>([]);
  const [linkedProjectName, setLinkedProjectName] = useState("");
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(requestedInvoiceId);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const selectedClientIdRef = React.useRef<string | null>(null);
  const autoSaveTimerRef = React.useRef<number | null>(null);
  const autoSaveInFlightRef = React.useRef(false);
  const lastAutoSaveSignatureRef = React.useRef("");
  const linkedInvoiceIdRef = React.useRef<string | null>(requestedInvoiceId);
  const isHydratingInvoiceRef = React.useRef(false);

  // Form
  const methods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: generateInvoiceNumber(),
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: calculateDueDate(new Date().toISOString().split("T")[0], 30),
      paymentTerms: "net_30",
      currency: "CAD",
      clientProvince: "ON",
      gstEnabled: false,
      gstRate: 0,
      pstEnabled: false,
      pstRate: 0,
      hstEnabled: true,
      hstRate: 13,
      billedBy: {
        businessName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "ON",
        postalCode: "",
        country: "Canada",
        gstNumber: "",
      },
      billedTo: {
        businessName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "ON",
        postalCode: "",
        country: "Canada",
        gstNumber: "",
      },
      items: [
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          quantity: 1,
          rate: 0,
          taxType: "HST",
          amount: 0,
          gst: 0,
          pst: 0,
          hst: 0,
          total: 0,
        },
      ],
      notes: "",
      terms: DEFAULT_INVOICE_TERMS,
      discount: 0,
      discountType: "fixed",
      sendReminder: true,
      isRecurring: false,
      recurringFrequency: "monthly",
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = methods;

  const clientProvince = watch("clientProvince");
  const paymentTerms = watch("paymentTerms");
  const invoiceDate = watch("invoiceDate");
  const items = useWatch({ control, name: "items" });
  const discount = useWatch({ control, name: "discount" }) || 0;
  const discountType = useWatch({ control, name: "discountType" });
  const gstEnabled = useWatch({ control, name: "gstEnabled" });
  const gstRate = useWatch({ control, name: "gstRate" });
  const pstEnabled = useWatch({ control, name: "pstEnabled" });
  const pstRate = useWatch({ control, name: "pstRate" });
  const hstEnabled = useWatch({ control, name: "hstEnabled" });
  const hstRate = useWatch({ control, name: "hstRate" });

  // Get tax rates for selected province
  const taxRates = useMemo(() => {
    const resolvedGst = gstEnabled ? toNumber(gstRate) : 0;
    const resolvedPst = pstEnabled ? toNumber(pstRate) : 0;
    const resolvedHst = hstEnabled ? toNumber(hstRate) : 0;
    return {
      gst: resolvedHst > 0 ? 0 : resolvedGst,
      pst: resolvedHst > 0 ? 0 : resolvedPst,
      hst: resolvedHst,
      taxType: getTaxTypeLabel(
        {
          gst: resolvedHst > 0 ? 0 : resolvedGst,
          pst: resolvedHst > 0 ? 0 : resolvedPst,
          hst: resolvedHst,
        },
        clientProvince,
      ),
    };
  }, [clientProvince, gstEnabled, gstRate, hstEnabled, hstRate, pstEnabled, pstRate]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items?.reduce((sum, item) => {
      const quantity = toNumber(item?.quantity);
      const rate = toNumber(item?.rate);
      return sum + quantity * rate;
    }, 0) || 0;
    const discountValue = Math.max(toNumber(discount), 0);
    const rawDiscountAmount = discountType === "percentage" ? (subtotal * discountValue) / 100 : discountValue;
    const discountAmount = Math.min(Math.max(rawDiscountAmount, 0), subtotal);
    const taxableAmount = Math.max(subtotal - discountAmount, 0);

    const gst = taxRates.hst > 0 ? 0 : (taxableAmount * taxRates.gst) / 100;
    const pst = (taxableAmount * taxRates.pst) / 100;
    const hst = (taxableAmount * taxRates.hst) / 100;

    const total = taxableAmount + gst + pst + hst;

    return { subtotal, gst, pst, hst, discount: discountAmount, total };
  }, [items, discount, discountType, taxRates]);

  // Effects
  useEffect(() => {
    linkedInvoiceIdRef.current = linkedInvoiceId;
  }, [linkedInvoiceId]);

  useEffect(() => {
    let cancelled = false;

    getCompanyProfile()
      .then((profile) => {
        if (!cancelled) {
          setCompanyProfile(profile);
        }
      })
      .catch((error) => {
        console.error("Failed to load company profile:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!companyProfile || isEditMode) {
      return;
    }

    const parsedAddress = parseCompanyAddress(companyProfile.address);
    const currentValues = getValues("billedBy");

    setValue("billedBy.businessName", companyProfile.companyName || currentValues.businessName || "");
    setValue("billedBy.email", companyProfile.email || currentValues.email || "");
    setValue("billedBy.phone", companyProfile.phone || currentValues.phone || "");
    setValue("billedBy.address", parsedAddress.address || currentValues.address || "");
    setValue("billedBy.city", parsedAddress.city || currentValues.city || "");
    setValue("billedBy.province", parsedAddress.province || currentValues.province || "ON");
    setValue("billedBy.postalCode", parsedAddress.postalCode || currentValues.postalCode || "");
    setValue("billedBy.country", parsedAddress.country || currentValues.country || "Canada");
    setValue("billedBy.gstNumber", companyProfile.taxId || currentValues.gstNumber || "");

    const tenantInvoiceFooter = String(companyProfile.invoiceDefaultFooter || "").trim();
    const currentTerms = String(getValues("terms") || "").trim();
    if (tenantInvoiceFooter && (!currentTerms || currentTerms === DEFAULT_INVOICE_TERMS)) {
      setValue("terms", tenantInvoiceFooter);
    }
  }, [companyProfile, getValues, isEditMode, setValue]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Legacy fallback for older workspaces without company profile data yet.
        if (parsed.businessName && !companyProfile && !isEditMode) {
          setValue("billedBy.businessName", parsed.businessName);
          setValue("billedBy.email", parsed.email || "");
          setValue("billedBy.phone", parsed.phone || "");
          setValue("billedBy.address", parsed.address || "");
          setValue("billedBy.city", parsed.city || "");
          setValue("billedBy.province", parsed.province || "ON");
          setValue("billedBy.postalCode", parsed.postalCode || "");
          setValue("billedBy.gstNumber", parsed.gstNumber || "");
        }
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, [companyProfile, isEditMode, setValue]);

  useEffect(() => {
    if (!linkedProjectId) return;

    let cancelled = false;
    setIsLoadingLinkedInvoice(true);

    getProjectById(linkedProjectId)
      .then((project) => {
        if (cancelled) return;

        const invoice = getProjectInvoice(project, requestedInvoiceId);
        const provinceCode = getProvinceCode(project.client?.province || project.territory);
        const provinceTax = canadianProvinces.find((entry) => entry.code === provinceCode) || canadianProvinces.find((entry) => entry.code === "ON")!;
        const invoiceDateValue = invoice ? toDateInputValue(invoice.issueDate) : new Date().toISOString().split("T")[0];
        const dueDateValue = invoice ? toDateInputValue(invoice.dueDate) : calculateDueDate(invoiceDateValue, 30);
        const reviewItems = mapInvoiceItemsToFormItems(
          Array.isArray(invoice?.items) ? (invoice.items as Array<Record<string, unknown>>) : [],
          { gst: provinceTax.gst, pst: provinceTax.pst, hst: provinceTax.hst },
        );

        selectedClientIdRef.current = readText(project.client?.id) || null;
        setLinkedProjectName(readText(project.name) || "Linked Deal");
        setLinkedInvoiceId(readText(invoice?.id) || requestedInvoiceId || null);

        const currentValues = getValues();
        reset({
          ...currentValues,
          invoiceNumber: readText(invoice?.invoiceNumber) || currentValues.invoiceNumber,
          invoiceDate: invoiceDateValue,
          dueDate: dueDateValue,
          paymentTerms: inferPaymentTerms(invoiceDateValue, dueDateValue),
          currency:
            readText(invoice?.currency) ||
            readText(project.currency) ||
            readText(project.quote?.currency) ||
            currentValues.currency,
          clientProvince: provinceCode,
          billedBy: {
            ...currentValues.billedBy,
            province: getProvinceCode(currentValues.billedBy.province),
          },
          billedTo: {
            businessName: readText(project.client?.clientName) || currentValues.billedTo.businessName,
            email: readText(project.client?.primaryEmail) || currentValues.billedTo.email,
            phone: readText(project.client?.primaryPhone) || currentValues.billedTo.phone,
            address: readText(project.client?.streetAddress) || readText(project.location) || currentValues.billedTo.address,
            city: readText(project.client?.city) || currentValues.billedTo.city,
            province: provinceCode,
            postalCode: readText(project.client?.postalCode) || currentValues.billedTo.postalCode,
            country: readText(project.client?.country) || currentValues.billedTo.country,
            gstNumber: readText(project.client?.gstHstNumber) || currentValues.billedTo.gstNumber,
          },
          items: reviewItems.length > 0 ? reviewItems : currentValues.items,
          notes: readText(invoice?.notes) || readText(project.description) || currentValues.notes || "",
          terms: readText(invoice?.terms) || readText(project.quote?.terms) || currentValues.terms || "",
          discount: toNumber(invoice?.discountAmount),
          discountType: "fixed",
          sendReminder: currentValues.sendReminder ?? true,
          isRecurring: false,
          recurringFrequency: currentValues.recurringFrequency || "monthly",
        });
      })
      .catch((error) => {
        console.error("Failed to load linked project invoice:", error);
        if (!cancelled) {
          toast({
            title: "Invoice review unavailable",
            description: "The linked deal invoice could not be loaded right now.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLinkedInvoice(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getValues, linkedProjectId, requestedInvoiceId, reset, toast]);

  useEffect(() => {
    if (!requestedInvoiceId || linkedProjectId) return;

    let cancelled = false;
    setIsLoadingLinkedInvoice(true);

    getInvoiceById(requestedInvoiceId)
      .then((invoice: any) => {
        if (cancelled) return;

        const currentValues = getValues();
        const client = invoice?.client && typeof invoice.client === "object" ? invoice.client : null;
        const businessAddress = invoice?.businessAddress && typeof invoice.businessAddress === "object" ? invoice.businessAddress : null;
        const clientAddress = invoice?.clientAddress && typeof invoice.clientAddress === "object" ? invoice.clientAddress : null;
        const invoiceDateValue = toDateInputValue(invoice?.issueDate || invoice?.invoiceDate);
        const dueDateValue = toDateInputValue(invoice?.dueDate);
        const provinceCode = getProvinceCode(invoice?.taxProvince || clientAddress?.province || client?.province || currentValues.billedTo.province);
        const provinceTax = canadianProvinces.find((entry) => entry.code === provinceCode) || canadianProvinces.find((entry) => entry.code === "ON")!;
        const savedTaxRows = Array.isArray(invoice?.taxRates) ? invoice.taxRates : null;
        const savedTaxRateByName = (pattern: RegExp) => {
          const match = savedTaxRows?.find((row: any) => pattern.test(readText(row?.name)));
          return match ? toNumber(match.rate) : 0;
        };
        const savedGstRate = savedTaxRows ? savedTaxRateByName(/gst/i) : provinceTax.gst;
        const savedPstRate = savedTaxRows ? savedTaxRateByName(/pst|qst/i) : provinceTax.pst;
        const savedHstRate = savedTaxRows ? savedTaxRateByName(/hst/i) : provinceTax.hst;
        const reviewItems = mapInvoiceItemsToFormItems(
          Array.isArray(invoice?.items) ? invoice.items : [],
          { gst: savedHstRate > 0 ? 0 : savedGstRate, pst: savedHstRate > 0 ? 0 : savedPstRate, hst: savedHstRate },
        );

        selectedClientIdRef.current = readText(client?.id) || null;
        setLinkedInvoiceId(readText(invoice?.id) || requestedInvoiceId);

        isHydratingInvoiceRef.current = true;
        reset({
          ...currentValues,
          invoiceNumber: readText(invoice?.invoiceNumber) || currentValues.invoiceNumber,
          invoiceDate: invoiceDateValue,
          dueDate: dueDateValue,
          paymentTerms: readText(invoice?.paymentTerms) || inferPaymentTerms(invoiceDateValue, dueDateValue),
          currency: readText(invoice?.currency) || currentValues.currency,
          clientProvince: provinceCode,
          gstEnabled: savedHstRate > 0 ? false : savedGstRate > 0,
          gstRate: savedHstRate > 0 ? 0 : savedGstRate,
          pstEnabled: savedHstRate > 0 ? false : savedPstRate > 0,
          pstRate: savedHstRate > 0 ? 0 : savedPstRate,
          hstEnabled: savedHstRate > 0,
          hstRate: savedHstRate,
          billedBy: {
            businessName: readText(invoice?.businessName) || currentValues.billedBy.businessName,
            email: readText(invoice?.businessEmail) || currentValues.billedBy.email,
            phone: readText(invoice?.businessPhone) || currentValues.billedBy.phone,
            address: readText(businessAddress?.address) || currentValues.billedBy.address,
            city: readText(businessAddress?.city) || currentValues.billedBy.city,
            province: getProvinceCode(businessAddress?.province || currentValues.billedBy.province),
            postalCode: readText(businessAddress?.postalCode) || currentValues.billedBy.postalCode,
            country: currentValues.billedBy.country,
            gstNumber: readText(invoice?.businessGstHstNumber) || currentValues.billedBy.gstNumber,
          },
          billedTo: {
            businessName: readText(invoice?.clientBusinessName || client?.clientName || client?.companyName) || currentValues.billedTo.businessName,
            email: readText(invoice?.clientEmail || client?.primaryEmail) || currentValues.billedTo.email,
            phone: readText(invoice?.clientPhone || client?.primaryPhone) || currentValues.billedTo.phone,
            address: readText(clientAddress?.address || client?.streetAddress) || currentValues.billedTo.address,
            city: readText(clientAddress?.city || client?.city) || currentValues.billedTo.city,
            province: getProvinceCode(clientAddress?.province || client?.province || provinceCode),
            postalCode: readText(clientAddress?.postalCode || client?.postalCode) || currentValues.billedTo.postalCode,
            country: readText(clientAddress?.country || client?.country) || currentValues.billedTo.country,
            gstNumber: readText(invoice?.clientGstHstNumber) || currentValues.billedTo.gstNumber,
          },
          items: reviewItems.length > 0 ? reviewItems : currentValues.items,
          notes: readText(invoice?.notes) || currentValues.notes || "",
          terms: readText(invoice?.terms) || currentValues.terms || "",
          discount: toNumber(invoice?.discountAmount),
          discountType: "fixed",
          sendReminder: currentValues.sendReminder ?? true,
          isRecurring: false,
          recurringFrequency: currentValues.recurringFrequency || "monthly",
        });
        window.setTimeout(() => {
          isHydratingInvoiceRef.current = false;
        }, 0);
      })
      .catch((error) => {
        console.error("Failed to load invoice:", error);
        if (!cancelled) {
          toast({
            title: "Invoice unavailable",
            description: "The invoice could not be loaded right now.",
            variant: "destructive",
          });
          navigate("/invoice");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLinkedInvoice(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getValues, linkedProjectId, navigate, requestedInvoiceId, reset, toast]);

  useEffect(() => {
    if (!linkedLeadId || isEditMode || linkedProjectId) return;

    let cancelled = false;
    setIsLoadingLinkedInvoice(true);

    getLeadById(linkedLeadId)
      .then((lead: LeadEntity) => {
        if (cancelled) return;

        const currentValues = getValues();
        const firstName = readText(lead.firstName);
        const lastName = readText(lead.lastName);
        const personName = [firstName, lastName].filter(Boolean).join(" ");
        const organizationName = readText(lead.companyName)
          || readText(lead.organization)
          || readText(lead.company)
          || readText(lead.clientName)
          || personName
          || currentValues.billedTo.businessName;
        const provinceCode = getProvinceCode(lead.province || lead.state || currentValues.billedTo.province);
        const convertedClientId = readText(lead.convertedToClientId || lead.clientId || lead.organizationId);

        if (convertedClientId) {
          selectedClientIdRef.current = convertedClientId;
        }

        reset({
          ...currentValues,
          billedTo: {
            businessName: organizationName,
            email: readText(lead.email) || currentValues.billedTo.email,
            phone: readText(lead.phone || lead.mobileNo || lead.mobilePhone) || currentValues.billedTo.phone,
            address: readText(lead.streetAddress || lead.address || lead.location) || currentValues.billedTo.address,
            city: readText(lead.city) || currentValues.billedTo.city,
            province: provinceCode,
            postalCode: readText(lead.postalCode || lead.zip) || currentValues.billedTo.postalCode,
            country: readText(lead.country) || currentValues.billedTo.country,
            gstNumber: currentValues.billedTo.gstNumber,
          },
          clientProvince: provinceCode,
          notes: currentValues.notes || (personName ? `Lead contact: ${personName}` : ""),
        });
      })
      .catch((error) => {
        console.error("Failed to load linked lead:", error);
        if (!cancelled) {
          toast({
            title: "Lead unavailable",
            description: "The linked lead could not be loaded right now.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLinkedInvoice(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getValues, isEditMode, linkedLeadId, linkedProjectId, reset, toast]);

  // Fetch real organizations from API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await getClients();
        const mapped: Client[] = (data || []).map((c: any) => ({
          id: c.id || c.Id || 0,
          businessName: c.clientName || c.ClientName || c.companyName || c.name || "",
          email: c.primaryEmail || c.contactEmail || c.email || "",
          phone: c.primaryPhone || c.contactNo || c.phone || "",
          address: c.streetAddress || c.address || "",
          city: c.city || "",
          province: c.province || "ON",
          postalCode: c.postalCode || "",
          country: c.country || "Canada",
          gstNumber: c.gstHstNumber || "",
        }));
        setClients(mapped);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      }
    };
    fetchClients();
  }, []);

  // Update due date when payment terms change
  useEffect(() => {
    const term = paymentTermsOptions.find((t) => t.value === paymentTerms);
    if (term && term.days !== null && invoiceDate) {
      setValue("dueDate", calculateDueDate(invoiceDate, term.days));
    }
  }, [paymentTerms, invoiceDate, setValue]);

  useEffect(() => {
    if (isHydratingInvoiceRef.current) return;
    const province = canadianProvinces.find((p) => p.code === clientProvince);
    if (!province) return;

    setValue("gstEnabled", province.gst > 0);
    setValue("gstRate", province.gst || 0);
    setValue("pstEnabled", province.pst > 0);
    setValue("pstRate", province.pst || 0);
    setValue("hstEnabled", province.hst > 0);
    setValue("hstRate", province.hst || 0);
  }, [clientProvince, setValue]);

  // Handlers
  const handleSelectClient = (client: Client) => {
    selectedClientIdRef.current = String(client.id);
    setValue("billedTo.businessName", client.businessName);
    setValue("billedTo.email", client.email);
    setValue("billedTo.phone", client.phone);
    setValue("billedTo.address", client.address);
    setValue("billedTo.city", client.city);
    setValue("billedTo.province", client.province);
    setValue("billedTo.postalCode", client.postalCode);
    setValue("billedTo.country", client.country || "Canada");
    setValue("billedTo.gstNumber", client.gstNumber || "");
    setValue("clientProvince", client.province);
  };

  const buildInvoicePayload = (data: InvoiceFormData, clientId: string) => {
    const effectiveTaxRate = taxRates.hst > 0 ? taxRates.hst : taxRates.gst + taxRates.pst;
    const appliedTaxRates = [
      ...(taxRates.gst > 0 ? [{ name: "GST", rate: taxRates.gst }] : []),
      ...(taxRates.pst > 0 ? [{ name: data.clientProvince === "QC" ? "QST" : "PST", rate: taxRates.pst }] : []),
      ...(taxRates.hst > 0 ? [{ name: "HST", rate: taxRates.hst }] : []),
    ];
    return {
      invoiceNumber: data.invoiceNumber,
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      currency: data.currency,
      taxProvince: data.clientProvince,
      taxRate: effectiveTaxRate,
      taxRates: appliedTaxRates,
      discountAmount: totals.discount,
      paymentTerms: inferPaymentTerms(data.invoiceDate, data.dueDate),
      businessName: data.billedBy.businessName,
      businessEmail: data.billedBy.email || null,
      businessPhone: data.billedBy.phone || null,
      businessAddress: {
        address: data.billedBy.address || null,
        city: data.billedBy.city || null,
        province: data.billedBy.province || null,
        postalCode: data.billedBy.postalCode || null,
        country: data.billedBy.country || null,
      },
      businessGstHstNumber: data.billedBy.gstNumber || null,
      clientId,
      contactId: linkedContactId || undefined,
      quoteId: linkedQuoteId || undefined,
      projectId: linkedProjectId || undefined,
      contractId: linkedContractId || undefined,
      clientBusinessName: data.billedTo.businessName || null,
      clientEmail: data.billedTo.email || null,
      clientPhone: data.billedTo.phone || null,
      clientAddress: {
        address: data.billedTo.address || null,
        city: data.billedTo.city || null,
        province: data.billedTo.province || null,
        postalCode: data.billedTo.postalCode || null,
        country: data.billedTo.country || null,
      },
      clientGstHstNumber: data.billedTo.gstNumber || null,
      items: data.items.map((item) => ({
        itemName: item.name,
        description: item.description || null,
        quantity: item.quantity,
        rate: item.rate,
        taxApplied: (item.gst || 0) > 0 || (item.pst || 0) > 0 || (item.hst || 0) > 0,
        lineTotal: item.amount || item.quantity * item.rate,
      })),
      notes: data.notes || null,
      terms: data.terms || null,
    };
  };

  const saveInvoiceDraftSilently = async (rawData: InvoiceFormData) => {
    if (isProjectReviewMode || isSaving || autoSaveInFlightRef.current || !canAutoSaveInvoiceDraft(rawData)) {
      if (!canAutoSaveInvoiceDraft(rawData)) {
        setAutoSaveState("waiting");
      }
      return;
    }

    const data = normalizeAutoSaveInvoiceData(rawData);
    const currentInvoiceId = linkedInvoiceIdRef.current;
    const signature = JSON.stringify({
      linkedInvoiceId: currentInvoiceId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      currency: data.currency,
      billedBy: data.billedBy,
      billedTo: data.billedTo,
      items: data.items,
      notes: data.notes,
      terms: data.terms,
      discount: data.discount,
      discountType: data.discountType,
      taxRates,
    });

    if (signature === lastAutoSaveSignatureRef.current) {
      return;
    }

    autoSaveInFlightRef.current = true;
    setAutoSaveState("saving");

    try {
      const matchedClient = selectedClientIdRef.current ? null : findMatchingClient(clients, data.billedTo);
      let resolvedClientId = selectedClientIdRef.current || (matchedClient ? String(matchedClient.id) : null);

      if (!resolvedClientId) {
        const createdOrganization = await createClient({
          clientName: data.billedTo.businessName.trim(),
          companyName: data.billedTo.businessName.trim(),
          clientType: "BUSINESS",
          primaryEmail: data.billedTo.email.trim(),
          primaryPhone: data.billedTo.phone.trim() || "N/A",
          status: "ACTIVE",
          lifecycleStage: "PROSPECT",
          currency: data.currency,
          streetAddress: data.billedTo.address || null,
          organizationAddress: data.billedTo.address || null,
          city: data.billedTo.city || null,
          province: data.billedTo.province || null,
          postalCode: data.billedTo.postalCode || null,
          country: data.billedTo.country || "Canada",
          gstHstNumber: data.billedTo.gstNumber || null,
          leadSource: linkedLeadId ? "Invoice from Lead" : "Invoice draft",
        });

        resolvedClientId = readText(createdOrganization.id);
        if (resolvedClientId) {
          setClients((current) => [
            {
              id: resolvedClientId,
              businessName: data.billedTo.businessName.trim(),
              email: data.billedTo.email.trim(),
              phone: data.billedTo.phone.trim() || "N/A",
              address: data.billedTo.address,
              city: data.billedTo.city,
              province: data.billedTo.province,
              postalCode: data.billedTo.postalCode,
              country: data.billedTo.country || "Canada",
              gstNumber: data.billedTo.gstNumber,
            },
            ...current,
          ]);
        }
      }

      if (!resolvedClientId) {
        throw new Error("Organization could not be resolved for invoice draft");
      }

      selectedClientIdRef.current = resolvedClientId;
      const apiPayload = buildInvoicePayload(data, resolvedClientId);
      const savedInvoice = currentInvoiceId
        ? await updateInvoice(currentInvoiceId, apiPayload)
        : await createInvoice(apiPayload);
      const savedInvoiceId = readText(savedInvoice?.id) || currentInvoiceId;

      if (savedInvoiceId && !currentInvoiceId) {
        linkedInvoiceIdRef.current = savedInvoiceId;
        setLinkedInvoiceId(savedInvoiceId);
      }

      lastAutoSaveSignatureRef.current = signature;
      setLastAutoSavedAt(new Date());
      setAutoSaveState("saved");
    } catch (error) {
      console.error("Invoice autosave failed:", error);
      setAutoSaveState("error");
    } finally {
      autoSaveInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (isProjectReviewMode) {
      return undefined;
    }

    const subscription = watch((value) => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = window.setTimeout(() => {
        void saveInvoiceDraftSilently(value as InvoiceFormData);
      }, 2500);
    });

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      subscription.unsubscribe();
    };
  }, [isProjectReviewMode, saveInvoiceDraftSilently, watch]);

  const persistInvoice = async (data: InvoiceFormData, options?: { send?: boolean }) => {
    setIsSaving(true);
    try {
      const matchedClient = selectedClientIdRef.current ? null : findMatchingClient(clients, data.billedTo);
      let resolvedClientId = selectedClientIdRef.current || (matchedClient ? String(matchedClient.id) : null);

      if (!resolvedClientId) {
        const createdOrganization = await createClient({
          clientName: data.billedTo.businessName.trim(),
          companyName: data.billedTo.businessName.trim(),
          clientType: "BUSINESS",
          primaryEmail: data.billedTo.email.trim(),
          primaryPhone: data.billedTo.phone.trim() || "N/A",
          status: "ACTIVE",
          lifecycleStage: "PROSPECT",
          currency: data.currency,
          streetAddress: data.billedTo.address || null,
          organizationAddress: data.billedTo.address || null,
          city: data.billedTo.city || null,
          province: data.billedTo.province || null,
          postalCode: data.billedTo.postalCode || null,
          country: data.billedTo.country || "Canada",
          gstHstNumber: data.billedTo.gstNumber || null,
          leadSource: linkedLeadId ? "Invoice from Lead" : "Invoice",
        });
        resolvedClientId = readText(createdOrganization.id);
        setClients((current) => [
          {
            id: resolvedClientId,
            businessName: data.billedTo.businessName.trim(),
            email: data.billedTo.email.trim(),
            phone: data.billedTo.phone.trim() || "N/A",
            address: data.billedTo.address,
            city: data.billedTo.city,
            province: data.billedTo.province,
            postalCode: data.billedTo.postalCode,
            country: data.billedTo.country || "Canada",
            gstNumber: data.billedTo.gstNumber,
          },
          ...current,
        ]);
      }

      if (!resolvedClientId) {
        throw new Error("Organization could not be created for this invoice");
      }

      selectedClientIdRef.current = resolvedClientId;

      const apiPayload = buildInvoicePayload(data, resolvedClientId);
      const currentInvoiceId = linkedInvoiceIdRef.current;
      const savedInvoice = currentInvoiceId
        ? await updateInvoice(currentInvoiceId, apiPayload)
        : await createInvoice(apiPayload);
      const savedInvoiceId = readText(savedInvoice?.id) || currentInvoiceId;

      if (options?.send && savedInvoiceId) {
        await sendInvoice(savedInvoiceId, data.billedTo.email || undefined);
      }

      toast({
        title: options?.send ? "Invoice Sent!" : linkedInvoiceId ? "Invoice Updated!" : "Invoice Created!",
        description: options?.send
          ? `Invoice ${data.invoiceNumber} was reviewed and sent successfully.`
          : linkedInvoiceId
            ? `Invoice ${data.invoiceNumber} has been updated successfully.`
            : `Invoice ${data.invoiceNumber} has been saved successfully.`,
      });

      navigate(linkedProjectId ? `/deals` : "/invoice");
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error",
        description: options?.send ? "Failed to send invoice. Please try again." : "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSave = async (data: InvoiceFormData) => {
    await persistInvoice(data);
  };

  const handleSaveAndSend = async () => {
    await handleSubmit(async (data) => {
      if (!data.billedTo.email) {
        toast({
          title: "Email Required",
          description: "Please enter a client email address to send the invoice.",
          variant: "destructive",
        });
        return;
      }
      await persistInvoice(data, { send: true });
    })();
  };

  const handleDownloadPDF = async () => {
    if (!linkedInvoiceId) {
      toast({
        title: "Save required",
        description: "Save the invoice first to download its PDF.",
      });
      return;
    }

    try {
      await downloadInvoicePdf(linkedInvoiceId);
      toast({
        title: "Downloaded",
        description: "Your invoice PDF is ready.",
      });
    } catch (error) {
      console.error("Failed to download invoice PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice PDF.",
        variant: "destructive",
      });
    }
  };

  const handlePrintPreview = async () => {
    try {
      const formValues = getValues();
      const summaryLines = [
        { label: "Subtotal", amount: totals.subtotal, tone: "muted" as const },
        ...(totals.discount > 0
          ? [{ label: "Discount", amount: -totals.discount, tone: "positive" as const }]
          : []),
        ...(taxRates.hst > 0
          ? [{ label: `HST (${taxRates.hst}%)`, amount: totals.hst }]
          : [
              ...(taxRates.gst > 0 ? [{ label: `GST (${taxRates.gst}%)`, amount: totals.gst }] : []),
              ...(taxRates.pst > 0 ? [{ label: `PST (${taxRates.pst}%)`, amount: totals.pst }] : []),
            ]),
      ];

      await printInvoiceDocument({
        invoiceNumber: formValues.invoiceNumber,
        invoiceDate: formValues.invoiceDate,
        dueDate: formValues.dueDate,
        currency: formValues.currency,
        amountDue: totals.total,
        amountDueLabel: "Amount Due",
        brandLogoUrl: companyProfile?.logoUrl || workspaceBranding?.logoUrl || null,
        brandName: companyProfile?.companyName || workspaceBranding?.companyName || formValues.billedBy.businessName,
        billedBy: formValues.billedBy,
        billedTo: formValues.billedTo,
        items: formValues.items.map((item) => ({
          description: item.name,
          details: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        })),
        summaryLines,
        total: totals.total,
        notes: formValues.notes,
        terms: formValues.terms,
      });
    } catch (error) {
      console.error("Failed to print invoice:", error);
      toast({
        title: "Error",
        description: "Failed to open the invoice for printing.",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen r from-slate-50 via-white to-slate-50">
<main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="crm-module-header sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(linkedProjectId ? `/deals/${linkedProjectId}` : "/invoice")}
                className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#475569]">Invoices</span>
                <ChevronRight size={16} className="text-[#475569]" />
                <span className="font-medium text-[#0F172A]">
                  {isProjectReviewMode ? "Review Deal Invoice" : isEditMode ? "Edit Invoice" : "Create Invoice"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isProjectReviewMode && (
                <div className="hidden items-center gap-2 rounded-md border border-[rgba(15,23,42,0.06)] bg-white/70 px-3 py-2 text-xs text-[#64748B] lg:flex">
                  {autoSaveState === "saving" ? <Loader2 size={14} className="animate-spin text-[#0891B2]" /> : null}
                  {autoSaveState === "saved" ? <CheckCircle2 size={14} className="text-emerald-600" /> : null}
                  {autoSaveState === "error" ? <AlertCircle size={14} className="text-red-500" /> : null}
                  {autoSaveState === "waiting" || autoSaveState === "idle" ? <Clock size={14} className="text-[#94A3B8]" /> : null}
                  <span>
                    {autoSaveState === "saving"
                      ? "Saving draft..."
                      : autoSaveState === "saved"
                        ? `Draft saved${lastAutoSavedAt ? ` ${lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
                        : autoSaveState === "error"
                          ? "Autosave failed"
                          : "Autosaves after customer name and email"}
                  </span>
                </div>
              )}
              {/* Preview Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPreview(!showPreview)}
                disabled={isLoadingLinkedInvoice}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md border transition-colors",
                  showPreview
                    ? "bg-[#0891B2]/10 border-[#22D3EE] text-[#0891B2]"
                    : "border-[rgba(15,23,42,0.06)] text-[#475569] hover:bg-white/5"
                )}
              >
                <Eye size={18} />
                <span className="font-medium">Preview</span>
              </motion.button>

              {/* Download PDF */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadPDF}
                disabled={isLoadingLinkedInvoice}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-[rgba(15,23,42,0.06)] text-[#475569] hover:bg-white/5 transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">PDF</span>
              </motion.button>

              {/* Save as Draft */}
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit(onSave)}
                disabled={isSaving || isLoadingLinkedInvoice}
                className="rounded-md border-[rgba(15,23,42,0.06)]"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                  {isProjectReviewMode ? "Save Changes" : isEditMode ? "Save Changes" : "Save Draft"}
              </Button>

              {/* Save & Send */}
              <Button
                type="button"
                onClick={handleSaveAndSend}
                disabled={isSaving || isLoadingLinkedInvoice}
                className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md "
              >
                <Send size={16} className="mr-2" />
                {isProjectReviewMode ? "Review & Send" : isEditMode ? "Update & Send" : "Save & Send"}
              </Button>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-6">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSave)}>
              <div className={cn("grid gap-6", showPreview ? "grid-cols-2" : "grid-cols-1")}>
                {/* Form Section */}
                <div className="space-y-6">
                  {isProjectReviewMode ? (
                    <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Linked Deal Invoice</p>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">{linkedProjectName || "Linked deal"}</p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Core deal values are locked here. You can review line items, adjust tax, add a discount, and update notes before sending.
                      </p>
                    </div>
                  ) : null}

                  {/* Page Title */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center ">
                      <FilePlus size={24} className="text-[#0F172A]" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-2xl font-bold text-[#0F172A]">
                        {isProjectReviewMode ? "Review Deal Invoice" : isEditMode ? "Edit Invoice" : "Create Invoice"}
                      </h1>
                      <p className="text-[#94A3B8]">
                        {isProjectReviewMode
                          ? "The deal already built this invoice draft. Review it here and send when ready."
                          : isEditMode
                            ? "Update the existing invoice details and keep the same billing pattern."
                            : "Fill in the details to generate a new invoice"}
                      </p>
                    </div>
                  </motion.div>

                  {/* Invoice Details Card */}
                  <SectionCard title="Invoice Details" icon={FileText}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Invoice Number */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8]">Invoice Number *</Label>
                        <div className="relative">
                          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                          <Input
                            {...register("invoiceNumber")}
                            disabled={isProjectReviewMode}
                            className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm font-medium"
                          />
                        </div>
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8]">Invoice Date *</Label>
                        <div className="relative">
                          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                          <Input
                            type="date"
                            {...register("invoiceDate")}
                            disabled={isProjectReviewMode}
                            className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
                          />
                        </div>
                      </div>

                      {/* Payment Terms */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8]">Payment Terms</Label>
                        <Controller
                          name="paymentTerms"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={isProjectReviewMode}>
                              <SelectTrigger className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-md">
                                {paymentTermsOptions.map((term) => (
                                  <SelectItem key={term.value} value={term.value} className="rounded-md">
                                    {term.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Due Date */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8]">Due Date *</Label>
                        <div className="relative">
                          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                          <Input
                            type="date"
                            {...register("dueDate")}
                            disabled={isProjectReviewMode}
                            className="h-10 pl-9 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
                          />
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8]">Currency</Label>
                        <Controller
                          name="currency"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={isProjectReviewMode}>
                              <SelectTrigger className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-md">
                                {currencyOptions.map((currency) => (
                                  <SelectItem key={currency.value} value={currency.value} className="rounded-md">
                                    {currency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Client Province (for tax calculation) */}
                      <div className="space-y-1">
                        <Label className="text-xs text-[#94A3B8] flex items-center gap-1">
                          Tax Province
                          <span className="relative group">
                            <HelpCircle size={12} className="text-[#475569] cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[#0F172A] text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Province used for tax calculation
                            </span>
                          </span>
                        </Label>
                        <Controller
                          name="clientProvince"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-md max-h-60">
                                {canadianProvinces.map((prov) => (
                                  <SelectItem key={prov.code} value={prov.code} className="rounded-md">
                                    <div className="flex items-center justify-between w-full">
                                      <span>{prov.name}</span>
                                      <span className="text-xs text-[#475569] ml-2">
                                        {prov.taxType}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {/* Tax Controls */}
                      <div className="col-span-2 rounded-md border border-[#22D3EE]/20 bg-[#0891B2]/5 p-3">
                        <div className="mb-3 flex items-center gap-2">
                          <Percent size={14} className="text-[#0891B2]" />
                          <span className="text-xs font-medium text-[#0891B2]">Tax Controls</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <Label className="text-xs font-medium text-[#0F172A]">GST</Label>
                              <Controller
                                name="gstEnabled"
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={Boolean(field.value)}
                                    onCheckedChange={(checked) => {
                                      const nextChecked = Boolean(checked);
                                      field.onChange(nextChecked);
                                      if (nextChecked) {
                                        setValue("hstEnabled", false);
                                      }
                                    }}
                                  />
                                )}
                              />
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                {...register("gstRate")}
                                disabled={!gstEnabled || hstEnabled}
                                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] pr-8 text-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">%</span>
                            </div>
                          </div>
                          <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <Label className="text-xs font-medium text-[#0F172A]">{clientProvince === "QC" ? "QST" : "PST"}</Label>
                              <Controller
                                name="pstEnabled"
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={Boolean(field.value)}
                                    onCheckedChange={(checked) => {
                                      const nextChecked = Boolean(checked);
                                      field.onChange(nextChecked);
                                      if (nextChecked) {
                                        setValue("hstEnabled", false);
                                      }
                                    }}
                                  />
                                )}
                              />
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                {...register("pstRate")}
                                disabled={!pstEnabled || hstEnabled}
                                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] pr-8 text-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">%</span>
                            </div>
                          </div>
                          <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <Label className="text-xs font-medium text-[#0F172A]">HST</Label>
                              <Controller
                                name="hstEnabled"
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={Boolean(field.value)}
                                    onCheckedChange={(checked) => {
                                      const nextChecked = Boolean(checked);
                                      field.onChange(nextChecked);
                                      if (nextChecked) {
                                        setValue("gstEnabled", false);
                                        setValue("pstEnabled", false);
                                      }
                                    }}
                                  />
                                )}
                              />
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.001"
                                {...register("hstRate")}
                                disabled={!hstEnabled}
                                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] pr-8 text-sm"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">%</span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-[#64748B]">
                          Pick a province to preload tax defaults, then adjust or disable GST, {clientProvince === "QC" ? "QST" : "PST"}, and HST manually.
                        </p>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Addresses Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Billed By */}
                    <SectionCard title="Your Business Details" icon={Building2}>
                      <AddressBlock
                        title="Billed By"
                        prefix="billedBy"
                        control={control}
                        setValue={setValue}
                        register={register}
                        errors={errors}
                        disabled={isProjectReviewMode}
                      />
                    </SectionCard>

                    {/* Billed To */}
                    <SectionCard
                      title="Organization Details"
                      icon={Users}
                      headerAction={!isProjectReviewMode ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/organizations")}
                          className="text-[#0891B2] hover:text-[#0891B2]/80 hover:bg-[#0891B2]/5"
                        >
                          <PlusCircle size={14} className="mr-1" />
                          New Organization
                        </Button>
                      ) : undefined}
                    >
                      <AddressBlock
                        title="Billed To"
                        prefix="billedTo"
                        control={control}
                        setValue={setValue}
                        register={register}
                        errors={errors}
                        showClientSelector={!isProjectReviewMode}
                        clients={clients}
                        onSelectClient={handleSelectClient}
                        disabled={isProjectReviewMode}
                      />
                    </SectionCard>
                  </div>

                  {/* Line Items */}
                  <SectionCard title="Invoice Items" icon={Package}>
                    <LineItemsTable
                      control={control}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      errors={errors}
                      taxRates={taxRates}
                      products={mockProducts}
                    />
                  </SectionCard>

                  {/* Summary & Additional Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Notes & Terms */}
                    <SectionCard title="Notes & Terms" icon={FileText}>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-[#94A3B8]">Notes to Client</Label>
                          <Textarea
                            {...register("notes")}
                            placeholder="Add any notes for your customer, delivery scope, billing context, or special instructions..."
                            rows={3}
                            className="rounded-md border-[rgba(15,23,42,0.06)] text-sm resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-[#94A3B8]">Payment Instructions / Terms</Label>
                          <Textarea
                            {...register("terms")}
                            placeholder="Bank details, e-transfer email, payment conditions, late fees, or other invoice footer text..."
                            rows={5}
                            className="rounded-md border-[rgba(15,23,42,0.06)] text-sm resize-none"
                          />
                        </div>
                      </div>
                    </SectionCard>

                    {/* Invoice Summary */}
                    <SectionCard title="Invoice Summary" icon={Calculator}>
                      <div className="space-y-4">
                        {/* Discount */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-[#94A3B8]">Discount</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                {...register("discount")}
                                placeholder="0.00"
                                className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm"
                              />
                              <Controller
                                name="discountType"
                                control={control}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10 w-24 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-md">
                                      <SelectItem value="fixed" className="rounded-md">$</SelectItem>
                                      <SelectItem value="percentage" className="rounded-md">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Totals */}
                        <div className="p-4 bg-white/5 rounded-md space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#94A3B8]">Subtotal</span>
                            <span className="font-medium text-slate-200">{formatCurrency(totals.subtotal)}</span>
                          </div>

                          {totals.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Discount</span>
                              <span>-{formatCurrency(totals.discount)}</span>
                            </div>
                          )}

                          {taxRates.hst > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-[#94A3B8]">HST ({taxRates.hst}%)</span>
                              <span className="font-medium text-slate-200">{formatCurrency(totals.hst)}</span>
                            </div>
                          ) : (
                            <>
                              {taxRates.gst > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#94A3B8]">GST ({taxRates.gst}%)</span>
                                  <span className="font-medium text-slate-200">{formatCurrency(totals.gst)}</span>
                                </div>
                              )}
                              {taxRates.pst > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#94A3B8]">
                                    {clientProvince === "QC" ? "QST" : "PST"} ({taxRates.pst}%)
                                  </span>
                                  <span className="font-medium text-slate-200">{formatCurrency(totals.pst)}</span>
                                </div>
                              )}
                            </>
                          )}

                          <div className="pt-3 border-t border-[rgba(15,23,42,0.06)]">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#0F172A]">Total ({watch("currency")})</span>
                              <span className="text-2xl font-bold text-[#0891B2]">
                                {formatCurrency(totals.total, watch("currency"))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount in Words */}
                        <div className="p-3 bg-[#0891B2]/5 rounded-md border border-[#22D3EE]/20">
                          <p className="text-xs text-[#94A3B8] uppercase mb-1">Amount in Words</p>
                          <p className="text-sm text-[#0F172A] font-medium italic">
                            {numberToWords(totals.total)}
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  {!isProjectReviewMode ? (
                    <>
                      {/* Additional Options */}
                      <SectionCard title="Additional Options" icon={Settings}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Send Reminder */}
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-md">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md bg-[#D97706]/10 flex items-center justify-center">
                                <Bell size={18} className="text-[#D97706]" />
                              </div>
                              <div>
                                <p className="font-medium text-[#0F172A] text-sm">Payment Reminders</p>
                                <p className="text-xs text-[#94A3B8]">Send automatic reminders before due date</p>
                              </div>
                            </div>
                            <Controller
                              name="sendReminder"
                              control={control}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                                />
                              )}
                            />
                          </div>

                          {/* Recurring Invoice */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-md">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
                                  <Repeat size={18} className="text-purple-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-[#0F172A] text-sm">Recurring Invoice</p>
                                  <p className="text-xs text-[#94A3B8]">Automatically generate this invoice</p>
                                </div>
                              </div>
                              <Controller
                                name="isRecurring"
                                control={control}
                                render={({ field }) => (
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                                  />
                                )}
                              />
                            </div>

                            {watch("isRecurring") && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1 pl-4"
                              >
                                <Label className="text-xs text-[#94A3B8]">Frequency</Label>
                                <Controller
                                  name="recurringFrequency"
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger className="h-10 rounded-md border-[rgba(15,23,42,0.06)] text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-md">
                                        <SelectItem value="weekly" className="rounded-md">Weekly</SelectItem>
                                        <SelectItem value="biweekly" className="rounded-md">Bi-weekly</SelectItem>
                                        <SelectItem value="monthly" className="rounded-md">Monthly</SelectItem>
                                        <SelectItem value="quarterly" className="rounded-md">Quarterly</SelectItem>
                                        <SelectItem value="yearly" className="rounded-md">Yearly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </SectionCard>

                      {/* Signature Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[#0F172A] mb-1">Digital Signature</h3>
                            <p className="text-xs text-[#94A3B8]">
                              Add your signature to make this invoice official
                            </p>
                          </div>
                          <div className="w-64">
                            <div className="h-20 border-b-2 border-dashed border-slate-300 mb-2 flex items-end justify-center pb-2">
                              <span className="text-[#475569] text-sm italic">Sign here</span>
                            </div>
                            <p className="text-xs text-[#94A3B8] text-right">Authorized Signature</p>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  ) : null}

                  {/* Action Buttons (Mobile) */}
                  <div className="flex gap-3 md:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(linkedProjectId ? `/deals/${linkedProjectId}` : "/invoice")}
                      className="flex-1 rounded-md"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving || isLoadingLinkedInvoice}
                      className="flex-1 bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                    >
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Save size={16} className="mr-2" />
                      )}
                      {isProjectReviewMode ? "Save Review" : "Save Invoice"}
                    </Button>
                  </div>
                </div>

                {/* Preview Section */}
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="sticky top-24"
                  >
                    <div className="bg-white/5 rounded-md p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-[#0F172A]">Live Preview</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={handlePrintPreview} className="p-2 rounded-md bg-white text-[#94A3B8] hover:text-[#0891B2]">
                            <Printer size={16} />
                          </button>
                          <button onClick={() => void handleDownloadPDF()} className="p-2 rounded-md bg-white text-[#94A3B8] hover:text-[#0891B2]">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[calc(100vh-200px)] overflow-y-auto rounded-md">
                          <InvoicePreview
                            data={getValues()}
                            totals={totals}
                            taxRates={taxRates}
                            brandLogoUrl={companyProfile?.logoUrl || workspaceBranding?.logoUrl || null}
                            brandName={companyProfile?.companyName || workspaceBranding?.companyName || getValues().billedBy.businessName}
                          />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </form>
          </FormProvider>
        </div>
      </main>
    </div>
  );
};

export default CreateInvoicePage;
