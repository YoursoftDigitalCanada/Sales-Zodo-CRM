// src/pages/CreateInvoice.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
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
import api from "@/lib/axios";

// ============================================
// TYPES
// ============================================

interface Client {
  id: number;
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

// Mock Clients
const mockClients: Client[] = [
  { id: 1, businessName: "Maple Tech Solutions", email: "contact@mapletech.ca", phone: "+1 (416) 555-0123", address: "123 Bay Street", city: "Toronto", province: "ON", postalCode: "M5J 2N8", country: "Canada", gstNumber: "123456789RT0001" },
  { id: 2, businessName: "Pacific Digital Inc.", email: "info@pacificdigital.ca", phone: "+1 (604) 555-0456", address: "456 Granville St", city: "Vancouver", province: "BC", postalCode: "V6C 1T2", country: "Canada", gstNumber: "987654321RT0001" },
  { id: 3, businessName: "Prairie Innovations", email: "hello@prairieinnovations.ca", phone: "+1 (403) 555-0789", address: "789 Stephen Ave", city: "Calgary", province: "AB", postalCode: "T2P 1G8", country: "Canada" },
];

// Mock Products
const mockProducts: Product[] = [
  { id: 1, name: "Web Development", description: "Custom website development", rate: 150, unit: "hour", taxable: true },
  { id: 2, name: "UI/UX Design", description: "User interface design services", rate: 125, unit: "hour", taxable: true },
  { id: 3, name: "Consulting", description: "Business consulting services", rate: 200, unit: "hour", taxable: true },
  { id: 4, name: "Hosting (Monthly)", description: "Web hosting services", rate: 49.99, unit: "month", taxable: true },
  { id: 5, name: "Domain Registration", description: "Annual domain registration", rate: 15, unit: "year", taxable: true },
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
        "bg-white rounded-2xl border border-slate-200 overflow-hidden",
        "hover:border-[#17C3B2]/30 hover:shadow-lg hover:shadow-[#17C3B2]/5 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#17C3B2]/10 to-[#C9A14A]/10 flex items-center justify-center">
            <Icon size={20} className="text-[#17C3B2]" />
          </div>
          <h3 className="font-semibold text-[#0D2342]">{title}</h3>
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
  register,
  errors,
  onSelectClient,
  showClientSelector = false,
  clients = [],
}: {
  title: string;
  prefix: "billedBy" | "billedTo";
  control: any;
  register: any;
  errors: any;
  onSelectClient?: (client: Client) => void;
  showClientSelector?: boolean;
  clients?: Client[];
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
        <h4 className="font-medium text-[#0D2342] flex items-center gap-2">
          {isBilledTo ? <Users size={16} className="text-[#C9A14A]" /> : <Building2 size={16} className="text-[#17C3B2]" />}
          {title}
        </h4>
        {showClientSelector && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg text-xs">
                <Search size={12} className="mr-1" />
                Select Client
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl p-2">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search clients..."
                  className="h-8 pl-7 text-xs rounded-lg"
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
                    className="rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#17C3B2] to-[#C9A14A] flex items-center justify-center text-white text-xs font-semibold">
                        {getInitials(client.businessName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.businessName}</p>
                        <p className="text-xs text-slate-400">{client.email}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {filteredClients.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No clients found</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg text-[#17C3B2]">
                <PlusCircle size={14} className="mr-2" />
                Add New Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-slate-500">Business Name *</Label>
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              {...register(`${prefix}.businessName`)}
              placeholder="Business Name"
              className={cn(
                "h-10 pl-9 rounded-xl border-slate-200 text-sm",
                errors?.[prefix]?.businessName && "border-red-500"
              )}
            />
          </div>
          {errors?.[prefix]?.businessName && (
            <p className="text-xs text-red-500">{errors[prefix].businessName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Email</Label>
          <div className="relative">
            <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              {...register(`${prefix}.email`)}
              type="email"
              placeholder="email@example.com"
              className="h-10 pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Phone</Label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              {...register(`${prefix}.phone`)}
              placeholder="+1 (000) 000-0000"
              className="h-10 pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-slate-500">Address</Label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              {...register(`${prefix}.address`)}
              placeholder="Street Address"
              className="h-10 pl-9 rounded-xl border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">City</Label>
          <Input
            {...register(`${prefix}.city`)}
            placeholder="City"
            className="h-10 rounded-xl border-slate-200 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Province</Label>
          <Controller
            name={`${prefix}.province`}
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="Select Province" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {canadianProvinces.map((prov) => (
                    <SelectItem key={prov.code} value={prov.code} className="rounded-lg">
                      {prov.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Postal Code</Label>
          <Input
            {...register(`${prefix}.postalCode`)}
            placeholder="A1A 1A1"
            className="h-10 rounded-xl border-slate-200 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-slate-500">GST/HST Number</Label>
          <Input
            {...register(`${prefix}.gstNumber`)}
            placeholder="123456789RT0001"
            className="h-10 rounded-xl border-slate-200 text-sm"
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
      className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
    >
      {/* Drag Handle */}
      <td className="py-3 px-2 w-8">
        <GripVertical size={16} className="text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>

      {/* Item Name */}
      <td className="py-3 px-2">
        <div className="space-y-1">
          <div className="relative">
            <Input
              {...register(`items.${index}.name`)}
              placeholder="Item name"
              className={cn(
                "h-9 rounded-lg border-slate-200 text-sm",
                errors?.items?.[index]?.name && "border-red-500"
              )}
            />
          </div>
          <Input
            {...register(`items.${index}.description`)}
            placeholder="Description (optional)"
            className="h-8 rounded-lg border-slate-100 text-xs text-slate-500"
          />
        </div>
      </td>

      {/* Quantity */}
      <td className="py-3 px-2 w-24">
        <Input
          type="number"
          {...register(`items.${index}.quantity`)}
          min={1}
          className="h-9 rounded-lg border-slate-200 text-sm text-center"
        />
      </td>

      {/* Rate */}
      <td className="py-3 px-2 w-32">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <Input
            type="number"
            step="0.01"
            {...register(`items.${index}.rate`)}
            min={0}
            className="h-9 pl-7 rounded-lg border-slate-200 text-sm"
          />
        </div>
      </td>

      {/* Amount */}
      <td className="py-3 px-2 w-28 text-right">
        <span className="text-sm font-medium text-slate-700">{formatCurrency(amount)}</span>
      </td>

      {/* Tax */}
      <td className="py-3 px-2 w-28 text-right">
        <span className="text-sm text-slate-500">
          {taxRates.hst > 0 
            ? formatCurrency(hst) 
            : formatCurrency(gst + pst)
          }
        </span>
      </td>

      {/* Total */}
      <td className="py-3 px-2 w-32 text-right">
        <span className="text-sm font-bold text-[#0D2342]">{formatCurrency(total)}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-2 w-12">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={remove}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
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
        <span className="text-xs text-slate-500">Quick Add:</span>
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
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 hover:bg-[#17C3B2]/10 hover:text-[#17C3B2] transition-colors"
          >
            + {product.name}
          </motion.button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-3 px-2 w-8"></th>
              <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Item Description
              </th>
              <th className="py-3 px-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                Qty
              </th>
              <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                Rate
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                Amount
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                {taxRates.hst > 0 ? "HST" : taxRates.pst > 0 ? "Tax" : "GST"}
              </th>
              <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
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
        <div className="p-3 border-t border-slate-100">
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-[#17C3B2] hover:text-[#17C3B2] hover:bg-[#17C3B2]/5 transition-all"
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
}: {
  data: InvoiceFormData;
  totals: { subtotal: number; gst: number; pst: number; hst: number; discount: number; total: number };
  taxRates: { gst: number; pst: number; hst: number; taxType: string };
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0D2342]">INVOICE</h1>
          <p className="text-slate-500 mt-1">{data.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#17C3B2] to-[#C9A14A] flex items-center justify-center text-white font-bold text-xl">
            {getInitials(data.billedBy.businessName || "YB")}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-xl">
        <div>
          <p className="text-xs text-slate-500 uppercase">Invoice Date</p>
          <p className="font-semibold text-[#0D2342]">{data.invoiceDate}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Due Date</p>
          <p className="font-semibold text-[#0D2342]">{data.dueDate}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Amount Due</p>
          <p className="font-bold text-[#17C3B2] text-lg">{formatCurrency(totals.total, data.currency)}</p>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs text-slate-500 uppercase mb-2">From</p>
          <p className="font-semibold text-[#0D2342]">{data.billedBy.businessName}</p>
          <p className="text-sm text-slate-600">{data.billedBy.address}</p>
          <p className="text-sm text-slate-600">{data.billedBy.city}, {data.billedBy.province} {data.billedBy.postalCode}</p>
          <p className="text-sm text-slate-600">{data.billedBy.email}</p>
          {data.billedBy.gstNumber && (
            <p className="text-xs text-slate-500 mt-1">GST/HST: {data.billedBy.gstNumber}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase mb-2">Bill To</p>
          <p className="font-semibold text-[#0D2342]">{data.billedTo.businessName}</p>
          <p className="text-sm text-slate-600">{data.billedTo.address}</p>
          <p className="text-sm text-slate-600">{data.billedTo.city}, {data.billedTo.province} {data.billedTo.postalCode}</p>
          <p className="text-sm text-slate-600">{data.billedTo.email}</p>
          {data.billedTo.gstNumber && (
            <p className="text-xs text-slate-500 mt-1">GST/HST: {data.billedTo.gstNumber}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-[#17C3B2]">
            <th className="py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
            <th className="py-3 text-center text-xs font-semibold text-slate-500 uppercase w-16">Qty</th>
            <th className="py-3 text-right text-xs font-semibold text-slate-500 uppercase w-24">Rate</th>
            <th className="py-3 text-right text-xs font-semibold text-slate-500 uppercase w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} className="border-b border-slate-100">
              <td className="py-3">
                <p className="font-medium text-[#0D2342]">{item.name}</p>
                {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
              </td>
              <td className="py-3 text-center text-slate-600">{item.quantity}</td>
              <td className="py-3 text-right text-slate-600">{formatCurrency(item.rate)}</td>
              <td className="py-3 text-right font-medium text-[#0D2342]">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-slate-700">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Discount</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}
          {taxRates.hst > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">HST ({taxRates.hst}%)</span>
              <span className="text-slate-700">{formatCurrency(totals.hst)}</span>
            </div>
          ) : (
            <>
              {taxRates.gst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GST ({taxRates.gst}%)</span>
                  <span className="text-slate-700">{formatCurrency(totals.gst)}</span>
                </div>
              )}
              {taxRates.pst > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {data.clientProvince === "QC" ? "QST" : "PST"} ({taxRates.pst}%)
                  </span>
                  <span className="text-slate-700">{formatCurrency(totals.pst)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="font-bold text-[#0D2342]">Total ({data.currency})</span>
            <span className="font-bold text-xl text-[#17C3B2]">{formatCurrency(totals.total, data.currency)}</span>
          </div>
        </div>
      </div>

      {/* Total in Words */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
        <p className="text-xs text-slate-500 uppercase mb-1">Amount in Words</p>
        <p className="text-sm text-slate-700 italic">{numberToWords(totals.total)}</p>
      </div>

      {/* Notes & Terms */}
      {(data.notes || data.terms) && (
        <div className="mt-6 grid grid-cols-2 gap-6">
          {data.notes && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-slate-600">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Terms & Conditions</p>
              <p className="text-sm text-slate-600">{data.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-500">Thank you for your business!</p>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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
      terms: "Payment is due within the specified terms. Late payments may be subject to interest charges.",
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
    formState: { errors },
  } = methods;

  const clientProvince = watch("clientProvince");
  const paymentTerms = watch("paymentTerms");
  const invoiceDate = watch("invoiceDate");
  const items = watch("items");
  const discount = watch("discount") || 0;
  const discountType = watch("discountType");

  // Get tax rates for selected province
  const taxRates = useMemo(() => {
    const province = canadianProvinces.find((p) => p.code === clientProvince);
    return {
      gst: province?.gst || 0,
      pst: province?.pst || 0,
      hst: province?.hst || 0,
      taxType: province?.taxType || "HST",
    };
  }, [clientProvince]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
    const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount;
    const taxableAmount = subtotal - discountAmount;
    
    const gst = taxRates.hst > 0 ? 0 : (taxableAmount * taxRates.gst) / 100;
    const pst = (taxableAmount * taxRates.pst) / 100;
    const hst = (taxableAmount * taxRates.hst) / 100;
    
    const total = taxableAmount + gst + pst + hst;

    return { subtotal, gst, pst, hst, discount: discountAmount, total };
  }, [items, discount, discountType, taxRates]);

  // Effects
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Pre-fill business details
        if (parsed.businessName) {
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
  }, [setValue]);

  // Update due date when payment terms change
  useEffect(() => {
    const term = paymentTermsOptions.find((t) => t.value === paymentTerms);
    if (term && term.days !== null && invoiceDate) {
      setValue("dueDate", calculateDueDate(invoiceDate, term.days));
    }
  }, [paymentTerms, invoiceDate, setValue]);

  // Handlers
  const handleSelectClient = (client: Client) => {
    setValue("billedTo.businessName", client.businessName);
    setValue("billedTo.email", client.email);
    setValue("billedTo.phone", client.phone);
    setValue("billedTo.address", client.address);
    setValue("billedTo.city", client.city);
    setValue("billedTo.province", client.province);
    setValue("billedTo.postalCode", client.postalCode);
    setValue("billedTo.gstNumber", client.gstNumber || "");
    setValue("clientProvince", client.province);
  };

  const onSave = async (data: InvoiceFormData) => {
    setIsSaving(true);
    try {
      const apiPayload = {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        clientId: 1,
        clientName: data.billedTo.businessName,
        clientEmail: data.billedTo.email,
        currency: data.currency,
        subtotal: totals.subtotal,
        gst: totals.gst,
        pst: totals.pst,
        hst: totals.hst,
        discount: totals.discount,
        total: totals.total,
        notes: data.notes,
        terms: data.terms,
        items: data.items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          gst: item.gst,
          pst: item.pst,
          hst: item.hst,
          total: item.total,
        })),
      };

      await api.post("/invoices", apiPayload);

      toast({
        title: "Invoice Created!",
        description: `Invoice ${data.invoiceNumber} has been saved successfully.`,
      });

      navigate("/invoice");
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndSend = async () => {
    const data = getValues();
    if (!data.billedTo.email) {
      toast({
        title: "Email Required",
        description: "Please enter a client email address to send the invoice.",
        variant: "destructive",
      });
      return;
    }
    // Save first, then send
    await onSave(data);
    // Implement send logic here
  };

  const handleDownloadPDF = () => {
    const data = getValues();
    if (!data.billedTo.businessName) {
      toast({
        title: "Client Required",
        description: "Please enter a client name before downloading.",
        variant: "destructive",
      });
      return;
    }
    // Implement PDF generation
    toast({
      title: "Generating PDF",
      description: "Your invoice PDF is being generated...",
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/invoice")}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <ArrowLeft size={20} />
              </motion.button>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Invoices</span>
                <ChevronRight size={16} className="text-slate-300" />
                <span className="font-medium text-[#0D2342]">Create Invoice</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors",
                  showPreview
                    ? "bg-[#17C3B2]/10 border-[#17C3B2] text-[#17C3B2]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">PDF</span>
              </motion.button>

              {/* Save as Draft */}
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit(onSave)}
                disabled={isSaving}
                className="rounded-xl border-slate-200"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                Save Draft
              </Button>

              {/* Save & Send */}
              <Button
                type="button"
                onClick={handleSaveAndSend}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#17C3B2] to-[#17C3B2]/90 hover:from-[#17C3B2]/90 hover:to-[#17C3B2] text-white rounded-xl shadow-lg shadow-[#17C3B2]/25"
              >
                <Send size={16} className="mr-2" />
                Save & Send
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
                  {/* Page Title */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#17C3B2] to-[#C9A14A] flex items-center justify-center shadow-lg shadow-[#17C3B2]/25">
                      <FilePlus size={24} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-[#0D2342]">Create Invoice</h1>
                      <p className="text-slate-500">Fill in the details to generate a new invoice</p>
                    </div>
                  </motion.div>

                  {/* Invoice Details Card */}
                  <SectionCard title="Invoice Details" icon={FileText}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Invoice Number */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Invoice Number *</Label>
                        <div className="relative">
                          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            {...register("invoiceNumber")}
                            className="h-10 pl-9 rounded-xl border-slate-200 text-sm font-medium"
                          />
                        </div>
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Invoice Date *</Label>
                        <div className="relative">
                          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="date"
                            {...register("invoiceDate")}
                            className="h-10 pl-9 rounded-xl border-slate-200 text-sm"
                          />
                        </div>
                      </div>

                      {/* Payment Terms */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Payment Terms</Label>
                        <Controller
                          name="paymentTerms"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {paymentTermsOptions.map((term) => (
                                  <SelectItem key={term.value} value={term.value} className="rounded-lg">
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
                        <Label className="text-xs text-slate-500">Due Date *</Label>
                        <div className="relative">
                          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="date"
                            {...register("dueDate")}
                            className="h-10 pl-9 rounded-xl border-slate-200 text-sm"
                          />
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Currency</Label>
                        <Controller
                          name="currency"
                          control={control}
                                                    render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {currencyOptions.map((currency) => (
                                  <SelectItem key={currency.value} value={currency.value} className="rounded-lg">
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
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                          Tax Province
                          <span className="relative group">
                            <HelpCircle size={12} className="text-slate-400 cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Province used for tax calculation
                            </span>
                          </span>
                        </Label>
                        <Controller
                          name="clientProvince"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl max-h-60">
                                {canadianProvinces.map((prov) => (
                                  <SelectItem key={prov.code} value={prov.code} className="rounded-lg">
                                    <div className="flex items-center justify-between w-full">
                                      <span>{prov.name}</span>
                                      <span className="text-xs text-slate-400 ml-2">
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

                      {/* Tax Rate Display */}
                      <div className="col-span-2 p-3 bg-[#17C3B2]/5 rounded-xl border border-[#17C3B2]/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Percent size={14} className="text-[#17C3B2]" />
                          <span className="text-xs font-medium text-[#17C3B2]">Tax Rates Applied</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {taxRates.hst > 0 ? (
                            <span className="text-slate-600">HST: <strong>{taxRates.hst}%</strong></span>
                          ) : (
                            <>
                              {taxRates.gst > 0 && (
                                <span className="text-slate-600">GST: <strong>{taxRates.gst}%</strong></span>
                              )}
                              {taxRates.pst > 0 && (
                                <span className="text-slate-600">
                                  {clientProvince === "QC" ? "QST" : "PST"}: <strong>{taxRates.pst}%</strong>
                                </span>
                              )}
                            </>
                          )}
                        </div>
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
                        register={register}
                        errors={errors}
                      />
                    </SectionCard>

                    {/* Billed To */}
                    <SectionCard
                      title="Client Details"
                      icon={Users}
                      headerAction={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/clients/add")}
                          className="text-[#17C3B2] hover:text-[#17C3B2]/80 hover:bg-[#17C3B2]/5"
                        >
                          <PlusCircle size={14} className="mr-1" />
                          New Client
                        </Button>
                      }
                    >
                      <AddressBlock
                        title="Billed To"
                        prefix="billedTo"
                        control={control}
                        register={register}
                        errors={errors}
                        showClientSelector
                        clients={mockClients}
                        onSelectClient={handleSelectClient}
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
                          <Label className="text-xs text-slate-500">Notes to Client</Label>
                          <Textarea
                            {...register("notes")}
                            placeholder="Add any notes for your client (e.g., thank you message, special instructions)..."
                            rows={3}
                            className="rounded-xl border-slate-200 text-sm resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Terms & Conditions</Label>
                          <Textarea
                            {...register("terms")}
                            placeholder="Payment terms, late fees, etc..."
                            rows={3}
                            className="rounded-xl border-slate-200 text-sm resize-none"
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
                            <Label className="text-xs text-slate-500">Discount</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                {...register("discount")}
                                placeholder="0.00"
                                className="h-10 rounded-xl border-slate-200 text-sm"
                              />
                              <Controller
                                name="discountType"
                                control={control}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-10 w-24 rounded-xl border-slate-200 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="fixed" className="rounded-lg">$</SelectItem>
                                      <SelectItem value="percentage" className="rounded-lg">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Totals */}
                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Subtotal</span>
                            <span className="font-medium text-slate-700">{formatCurrency(totals.subtotal)}</span>
                          </div>

                          {totals.discount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Discount</span>
                              <span>-{formatCurrency(totals.discount)}</span>
                            </div>
                          )}

                          {taxRates.hst > 0 ? (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">HST ({taxRates.hst}%)</span>
                              <span className="font-medium text-slate-700">{formatCurrency(totals.hst)}</span>
                            </div>
                          ) : (
                            <>
                              {taxRates.gst > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">GST ({taxRates.gst}%)</span>
                                  <span className="font-medium text-slate-700">{formatCurrency(totals.gst)}</span>
                                </div>
                              )}
                              {taxRates.pst > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">
                                    {clientProvince === "QC" ? "QST" : "PST"} ({taxRates.pst}%)
                                  </span>
                                  <span className="font-medium text-slate-700">{formatCurrency(totals.pst)}</span>
                                </div>
                              )}
                            </>
                          )}

                          <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#0D2342]">Total ({watch("currency")})</span>
                              <span className="text-2xl font-bold text-[#17C3B2]">
                                {formatCurrency(totals.total, watch("currency"))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount in Words */}
                        <div className="p-3 bg-[#17C3B2]/5 rounded-xl border border-[#17C3B2]/20">
                          <p className="text-xs text-slate-500 uppercase mb-1">Amount in Words</p>
                          <p className="text-sm text-[#0D2342] font-medium italic">
                            {numberToWords(totals.total)}
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  </div>

                  {/* Additional Options */}
                  <SectionCard title="Additional Options" icon={Settings}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Send Reminder */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#C9A14A]/10 flex items-center justify-center">
                            <Bell size={18} className="text-[#C9A14A]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#0D2342] text-sm">Payment Reminders</p>
                            <p className="text-xs text-slate-500">Send automatic reminders before due date</p>
                          </div>
                        </div>
                        <Controller
                          name="sendReminder"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-slate-300 data-[state=checked]:bg-[#17C3B2] data-[state=checked]:border-[#17C3B2]"
                            />
                          )}
                        />
                      </div>

                      {/* Recurring Invoice */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                              <Repeat size={18} className="text-purple-500" />
                            </div>
                            <div>
                              <p className="font-medium text-[#0D2342] text-sm">Recurring Invoice</p>
                              <p className="text-xs text-slate-500">Automatically generate this invoice</p>
                            </div>
                          </div>
                          <Controller
                            name="isRecurring"
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-slate-300 data-[state=checked]:bg-[#17C3B2] data-[state=checked]:border-[#17C3B2]"
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
                            <Label className="text-xs text-slate-500">Frequency</Label>
                            <Controller
                              name="recurringFrequency"
                              control={control}
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="weekly" className="rounded-lg">Weekly</SelectItem>
                                    <SelectItem value="biweekly" className="rounded-lg">Bi-weekly</SelectItem>
                                    <SelectItem value="monthly" className="rounded-lg">Monthly</SelectItem>
                                    <SelectItem value="quarterly" className="rounded-lg">Quarterly</SelectItem>
                                    <SelectItem value="yearly" className="rounded-lg">Yearly</SelectItem>
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
                    className="bg-white rounded-2xl border border-slate-200 p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0D2342] mb-1">Digital Signature</h3>
                        <p className="text-xs text-slate-500">
                          Add your signature to make this invoice official
                        </p>
                      </div>
                      <div className="w-64">
                        <div className="h-20 border-b-2 border-dashed border-slate-300 mb-2 flex items-end justify-center pb-2">
                          <span className="text-slate-300 text-sm italic">Sign here</span>
                        </div>
                        <p className="text-xs text-slate-500 text-right">Authorized Signature</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Action Buttons (Mobile) */}
                  <div className="flex gap-3 md:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/invoice")}
                      className="flex-1 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-[#17C3B2] hover:bg-[#17C3B2]/90 text-white rounded-xl"
                    >
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin mr-2" />
                      ) : (
                        <Save size={16} className="mr-2" />
                      )}
                      Save Invoice
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
                    <div className="bg-slate-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-[#0D2342]">Live Preview</h3>
                        <div className="flex items-center gap-2">
                          <button className="p-2 rounded-lg bg-white text-slate-500 hover:text-[#17C3B2]">
                            <Printer size={16} />
                          </button>
                          <button className="p-2 rounded-lg bg-white text-slate-500 hover:text-[#17C3B2]">
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[calc(100vh-200px)] overflow-y-auto rounded-xl">
                        <InvoicePreview
                          data={getValues()}
                          totals={totals}
                          taxRates={taxRates}
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
