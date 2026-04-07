// src/pages/AddClient.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Bell,
  Loader2,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Users,
  Building2,
  MapPin,
  CreditCard,
  Tag,
  FileText,
  User,
  Phone,
  Mail,
  Globe,
  Hash,
  DollarSign,
  Calendar,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Home,
  Wrench,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";
import { normalizeProvinceName } from "@/lib/address-utils";
import { getClientById, createClient, updateClient } from "@/services/clientService";
import { getEmployees } from "@/features/users";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  getCanadianPhoneError,
  getCanadianPostalCodeError,
  getEmailAddressError,
  getPersonNameError,
  isValidPersonName,
  normalizeCanadianPostalCode,
  normalizeEmailAddress,
  normalizeWhitespace,
} from "@contracts/contact";

// ============================================
// CANADIAN DATA
// ============================================

const provincesOfCanada = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
];

const leadSources = [
  "Website",
  "Referral",
  "Cold Call",
  "Advertisement",
  "Partner",
  "Social Media",
  "Trade Show",
  "Other",
];

const businessTypes = [
  "Corporation",
  "Sole Proprietorship",
  "Partnership",
  "Co-operative",
  "Non-Profit",
];

// ============================================
// TYPES
// ============================================

interface FormData {
  profileImage: string;
  clientName: string;
  clientType: string;
  primaryEmail: string;
  phone: string;
  status: string;
  assignedOwner: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber: string;
  pstNumber: string;
  companyRegistrationNo: string;
  businessType: string;
  taxCategory: string;
  primaryContactName: string;
  primaryContactDesignation: string;
  primaryContactPhone: string;
  creditLimit: number;
  paymentTermsDays: number;
  currency: string;
  priceTier: string;
  leadSource: string;
  clientCategory: string;
  tags: string;
  notes: string;
  // Roofing-specific
  propertyType: string;
  numberOfStories: string;
  serviceType: string;
  preferredContactMethod: string;
  bestTimeToContact: string;
  currentRoofMaterial: string;
  roofAge: string;
  insuranceCompanyName: string;
  isInsuranceClaim: string;
  isHomeowner: string;
  isHOA: string;
  hoaRestrictions: string;
  secondaryPhone: string;
  spouseCoOwnerName: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

// ============================================
// INITIAL STATE
// ============================================

const initialFormState: FormData = {
  profileImage: "",
  clientName: "",
  clientType: "Business",
  primaryEmail: "",
  phone: "",
  status: "Active",
  assignedOwner: "",
  billingAddressLine1: "",
  billingAddressLine2: "",
  city: "",
  state: "",
  country: "Canada",
  pincode: "",
  gstNumber: "",
  pstNumber: "",
  companyRegistrationNo: "",
  businessType: "",
  taxCategory: "Standard",
  primaryContactName: "",
  primaryContactDesignation: "",
  primaryContactPhone: "",
  creditLimit: 0,
  paymentTermsDays: 0,
  currency: "CAD",
  priceTier: "Standard",
  leadSource: "",
  clientCategory: "Regular",
  tags: "",
  notes: "",
  // Roofing-specific
  propertyType: "",
  numberOfStories: "",
  serviceType: "",
  preferredContactMethod: "",
  bestTimeToContact: "",
  currentRoofMaterial: "",
  roofAge: "",
  insuranceCompanyName: "",
  isInsuranceClaim: "",
  isHomeowner: "",
  isHOA: "",
  hoaRestrictions: "",
  secondaryPhone: "",
  spouseCoOwnerName: "",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toUiClientType = (clientType?: string | null): string =>
  clientType?.toUpperCase() === "INDIVIDUAL" ? "Individual" : "Business";

const toApiClientType = (clientType: string): "BUSINESS" | "INDIVIDUAL" =>
  clientType.toLowerCase() === "individual" ? "INDIVIDUAL" : "BUSINESS";

const toUiStatus = (status?: string | null): string =>
  status?.toUpperCase() === "INACTIVE" ? "Inactive" : "Active";

const toApiStatus = (status: string): "ACTIVE" | "INACTIVE" =>
  status.toLowerCase() === "inactive" ? "INACTIVE" : "ACTIVE";

const normalizeTags = (tags: unknown): string => {
  if (Array.isArray(tags)) {
    return tags.join(", ");
  }

  return typeof tags === "string" ? tags : "";
};

const splitTags = (tags: string): string[] =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const isUuid = (value: string): boolean => UUID_REGEX.test(value.trim());

const mapApiClientToFormData = (data: any): FormData => {
  const paymentTermsDays = Number.parseInt(
    String(data.paymentTerms || "").replace(/[^0-9]/g, ""),
    10
  );

  return {
    profileImage: data.clientLogo || data.profileImage || "",
    clientName: data.clientName || "",
    clientType: toUiClientType(data.clientType),
    primaryEmail: data.primaryEmail || "",
    phone: data.primaryPhone || data.phone || "",
    status: toUiStatus(data.status),
    assignedOwner:
      typeof data.assignedOwner === "string"
        ? data.assignedOwner
        : `${data.assignedOwner?.firstName || ""} ${data.assignedOwner?.lastName || ""
          }`.trim(),
    billingAddressLine1: data.streetAddress || data.billingAddressLine1 || "",
    billingAddressLine2: data.suite || data.billingAddressLine2 || "",
    city: data.city || "",
    state: data.province || data.state || "",
    country: data.country || "Canada",
    pincode: data.postalCode || data.pincode || "",
    gstNumber: data.gstHstNumber || data.gstNumber || "",
    pstNumber: data.pstQstNumber || data.pstNumber || "",
    companyRegistrationNo:
      data.corpRegistrationNumber || data.companyRegistrationNo || "",
    businessType: data.businessStructure || data.businessType || "",
    taxCategory: data.taxCategory || "Standard",
    primaryContactName: data.contactName || data.primaryContactName || "",
    primaryContactDesignation:
      data.position || data.primaryContactDesignation || "",
    primaryContactPhone: data.directPhone || data.primaryContactPhone || "",
    creditLimit: Number(data.creditLimit || 0),
    paymentTermsDays: Number.isFinite(paymentTermsDays) ? paymentTermsDays : 0,
    currency: data.currency || "CAD",
    priceTier: data.priceTier || "Standard",
    leadSource: data.leadSource || "",
    clientCategory: data.clientCategory || "Regular",
    tags: normalizeTags(data.tags),
    notes: data.internalNotes || data.notes || "",
    // Roofing-specific
    propertyType: data.propertyType || "",
    numberOfStories: data.numberOfStories || "",
    serviceType: data.serviceType || "",
    preferredContactMethod: data.preferredContactMethod || "",
    bestTimeToContact: data.bestTimeToContact || "",
    currentRoofMaterial: data.currentRoofMaterial || "",
    roofAge: data.roofAge || "",
    insuranceCompanyName: data.insuranceCompanyName || "",
    isInsuranceClaim: data.isInsuranceClaim || "",
    isHomeowner: data.isHomeowner || "",
    isHOA: data.isHOA || "",
    hoaRestrictions: data.hoaRestrictions || "",
    secondaryPhone: data.secondaryPhone || "",
    spouseCoOwnerName: data.spouseCoOwnerName || "",
  };
};

const mapFormDataToApiPayload = (data: FormData) => {
  const ownerValue = data.assignedOwner.trim();
  const ownerPayload =
    ownerValue === ""
      ? { assignedOwner: null }
      : isUuid(ownerValue)
        ? { assignedOwner: ownerValue }
        : {};

  const logoValue = data.profileImage.trim();
  const logoPayload =
    logoValue === ""
      ? { clientLogo: null }
      : /^https?:\/\//i.test(logoValue)
        ? { clientLogo: logoValue }
        : {};

  return {
    ...logoPayload,
    clientName:
      data.clientType === "Individual"
        ? normalizeWhitespace(data.clientName)
        : data.clientName.trim(),
    clientType: toApiClientType(data.clientType),
    primaryEmail: normalizeEmailAddress(data.primaryEmail),
    primaryPhone: data.phone.trim(),
    status: toApiStatus(data.status),
    ...ownerPayload,
    gstHstNumber: data.gstNumber || null,
    pstQstNumber: data.pstNumber || null,
    businessStructure: data.businessType || null,
    corpRegistrationNumber: data.companyRegistrationNo || null,
    streetAddress: data.billingAddressLine1.trim() || null,
    suite: data.billingAddressLine2.trim() || null,
    city: data.city.trim() || null,
    province: data.state.trim() || null,
    postalCode: data.pincode.trim() ? normalizeCanadianPostalCode(data.pincode) : null,
    country: data.country || null,
    internalNotes: data.notes.trim() || null,
    contactName: normalizeWhitespace(data.primaryContactName) || null,
    position: data.primaryContactDesignation.trim() || null,
    directPhone: data.primaryContactPhone.trim() || null,
    creditLimit: Number.isFinite(data.creditLimit) ? data.creditLimit : 0,
    paymentTerms:
      data.paymentTermsDays > 0 ? `${data.paymentTermsDays} days` : null,
    currency: data.currency || "CAD",
    leadSource: data.leadSource || null,
    clientCategory: data.clientCategory || null,
    tags: splitTags(data.tags),
    // Roofing-specific
    propertyType: data.propertyType || null,
    numberOfStories: data.numberOfStories || null,
    serviceType: data.serviceType || null,
    preferredContactMethod: data.preferredContactMethod || null,
    bestTimeToContact: data.bestTimeToContact || null,
    currentRoofMaterial: data.currentRoofMaterial || null,
    roofAge: data.roofAge || null,
    insuranceCompanyName: data.insuranceCompanyName || null,
    isInsuranceClaim: data.isInsuranceClaim || null,
    isHomeowner: data.isHomeowner || null,
    isHOA: data.isHOA || null,
    hoaRestrictions: data.hoaRestrictions.trim() || null,
    secondaryPhone: data.secondaryPhone.trim() || null,
    spouseCoOwnerName: normalizeWhitespace(data.spouseCoOwnerName) || null,
  };
};

const validateClientForm = (data: FormData): FormErrors => {
  const errors: FormErrors = {};
  const clientName = normalizeWhitespace(data.clientName);

  if (!clientName) {
    errors.clientName = "Client / Company name is required.";
  } else if (data.clientType === "Individual" && !isValidPersonName(clientName)) {
    errors.clientName =
      "Client name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }

  const primaryEmailError = getEmailAddressError(data.primaryEmail, "Primary email", {
    required: true,
  });
  if (primaryEmailError) {
    errors.primaryEmail = primaryEmailError;
  }

  const primaryPhoneError = getCanadianPhoneError(data.phone, "Primary phone", {
    required: true,
  });
  if (primaryPhoneError) {
    errors.phone = primaryPhoneError;
  }

  const postalCodeError = getCanadianPostalCodeError(data.pincode, "Postal code");
  if (postalCodeError) {
    errors.pincode = postalCodeError;
  }

  const contactNameError = getPersonNameError(
    data.primaryContactName,
    "Contact name",
  );
  if (contactNameError) {
    errors.primaryContactName = contactNameError;
  }

  const contactPhoneError = getCanadianPhoneError(
    data.primaryContactPhone,
    "Direct phone",
  );
  if (contactPhoneError) {
    errors.primaryContactPhone = contactPhoneError;
  }

  const secondaryPhoneError = getCanadianPhoneError(
    data.secondaryPhone,
    "Secondary phone",
  );
  if (secondaryPhoneError) {
    errors.secondaryPhone = secondaryPhoneError;
  }

  const spouseNameError = getPersonNameError(
    data.spouseCoOwnerName,
    "Spouse / co-owner name",
  );
  if (spouseNameError) {
    errors.spouseCoOwnerName = spouseNameError;
  }

  return errors;
};

// ============================================
// STYLED COMPONENTS
// ============================================

// Card Component matching dashboard style
const StyledCard = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={cn(
      "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
      className
    )}
  >
    {children}
  </motion.div>
);

// Card Header Component
const StyledCardHeader = ({
  icon: Icon,
  title,
  subtitle,
  color = "teal",
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  color?: "teal" | "gold" | "navy" | "purple";
}) => {
  const colorClasses = {
    teal: "bg-[#0891B2]/10 text-[#0891B2]",
    gold: "bg-[#D97706]/10 text-[#D97706]",
    navy: "bg-[#F8FAFC]/10 text-[#0F172A]",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center",
            colorClasses[color]
          )}
        >
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-[#0F172A]">{title}</h3>
          {subtitle && <p className="text-xs text-[#475569]">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

// Styled Input with theme
const StyledInput = ({
  label,
  required,
  icon: Icon,
  error,
  ...props
}: {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-[#475569]">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
        />
      )}
      <Input
        {...props}
        className={cn(
          "h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 transition-all",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          Icon && "pl-10",
          props.className
        )}
        aria-invalid={Boolean(error)}
      />
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// Styled Select with theme
const StyledSelect = ({
  label,
  required,
  value,
  onValueChange,
  placeholder,
  options,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  error?: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-[#475569]">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(
        "h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-md border-[rgba(15,23,42,0.06)]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-md focus:bg-[#0891B2]/10 focus:text-[#0891B2]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AddClientPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();

  const isEditMode = Boolean(id);

  // State

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [activeSection, setActiveSection] = useState<string>("basic");
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);

  // Fetch employees for the Assigned Owner dropdown
  useEffect(() => {
    const fetchEmployeeList = async () => {
      try {
        const data = (await getEmployees()) as any[] || [];
        const options = data.map((e: any) => ({
          value: e.id,
          label: `${e.user?.firstName || ''} ${e.user?.lastName || ''}`.trim() || e.id,
        }));
        setEmployeeOptions(options);
      } catch (error) {
        console.error('Failed to fetch employees for dropdown:', error);
      }
    };
    fetchEmployeeList();
  }, []);

  // Fetch client data if editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchClientData(id);
    }
  }, [id, isEditMode]);

  const fetchClientData = async (clientId: string) => {
    setIsFetching(true);
    try {
      const data = await getClientById(clientId) as any;

      if (data) {
        setFormData(mapApiClientToFormData(data));
      }

      if (data?.clientLogo || data?.profileImage) {
        setPreviewImage(data.clientLogo || data.profileImage);
      }
    } catch (error: any) {
      console.error("Error fetching client:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Could not fetch client data.",
        variant: "destructive",
      });
      navigate("/client-list");
    } finally {
      setIsFetching(false);
    }
  };

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setFormErrors((prev) => {
      if (!prev[id as keyof FormData]) {
        return prev;
      }

      const next = { ...prev };
      delete next[id as keyof FormData];
      return next;
    });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: Number(value) }));
    setFormErrors((prev) => {
      if (!prev[id as keyof FormData]) {
        return prev;
      }

      const next = { ...prev };
      delete next[id as keyof FormData];
      return next;
    });
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field as keyof FormData];
      if (field === "clientType") {
        delete next.clientName;
      }
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 2MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setFormData((prev) => ({ ...prev, profileImage: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setFormData((prev) => ({ ...prev, profileImage: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateClientForm(formData);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation error",
        description: "Please fix the highlighted client details and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const url = isEditMode ? `/clients/${id}` : "/clients";
      const payload = mapFormDataToApiPayload(formData);

      if (isEditMode) {
        await updateClient(id!, payload);
      } else {
        await createClient(payload);
      }

      toast({
        title: "Success!",
        description: isEditMode
          ? "Client updated successfully."
          : "Client created successfully.",
      });
      navigate("/client-list");
    } catch (error: any) {
      console.error("API Error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save. Check required fields.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading State
  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <main

        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-md bg-[#0891B2]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
            </div>
            <p className="text-[#94A3B8] font-medium">Loading client data...</p>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <main

      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="crm-module-header sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-20 items-center justify-between px-6">
            {/* Left Section - Back & Breadcrumb */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/client-list")}
                className="p-2.5 rounded-md bg-white/5 text-[#475569] hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={18} />
              </motion.button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-[#475569] hover:text-[#0891B2] transition-colors"
                >
                  Dashboard
                </button>
                <ChevronRight size={14} className="text-[#475569]" />
                <button
                  onClick={() => navigate("/client-list")}
                  className="text-[#475569] hover:text-[#0891B2] transition-colors"
                >
                  Clients
                </button>
                <ChevronRight size={14} className="text-[#475569]" />
                <span className="font-semibold text-[#0891B2]">
                  {isEditMode ? "Edit Client" : "New Client"}
                </span>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-3">
              <NotificationBell
                buttonClassName="border-0 bg-white/5 p-2.5 text-[#475569] hover:bg-slate-200"
                iconSize={18}
              />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/client-list")}
                className="hidden sm:flex px-4 py-2.5 rounded-md border border-[rgba(15,23,42,0.06)] text-[#475569] hover:bg-[#F8FAFC] transition-colors items-center gap-2 font-medium"
              >
                <X size={16} />
                <span>Cancel</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isLoading}
                className="hidden sm:flex px-4 py-2.5 rounded-md bg-[#0891B2] text-white  hover:bg-[#0891B2]/90 transition-colors items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>
                  {isEditMode ? "Update" : "Save"} Client
                </span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================ */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
          {/* Page Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-[#F1F5F9] p-8"
          >
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0891B2]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#D97706]/10 rounded-full blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#D97706]" />
                  <span className="text-[#D97706] text-sm font-medium">
                    Client Management
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
                  {isEditMode ? (
                    <>
                      Edit{" "}
                      <span className="text-[#0891B2]">
                        {formData.clientName || "Client"}
                      </span>
                    </>
                  ) : (
                    <>
                      Add New <span className="text-[#0891B2]">Client</span>
                    </>
                  )}
                </h1>
                <p className="text-[#475569] text-lg max-w-xl">
                  {isEditMode
                    ? "Update the client information below. All changes will be saved automatically."
                    : "Register a new business or individual client to your CRM system."}
                </p>
              </div>

              {/* Status Badge */}
              {isEditMode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-[rgba(15,23,42,0.06)] rounded-md p-4"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-md flex items-center justify-center",
                      formData.status === "Active"
                        ? "bg-green-500/20 text-green-400"
                        : formData.status === "Inactive"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                    )}
                  >
                    {formData.status === "Active" ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[#475569]">Current Status</p>
                    <p className="text-lg font-bold text-[#0F172A]">
                      {formData.status}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-6 pb-20 md:pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ============================================ */}
              {/* LEFT COLUMN */}
              {/* ============================================ */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <StyledCard delay={0.1}>
                  <StyledCardHeader
                    icon={Users}
                    title="Basic Information"
                    subtitle="Client's primary details"
                    color="teal"
                  />
                  <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Photo Upload */}
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            "w-24 h-24 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden bg-[#F8FAFC] transition-all cursor-pointer",
                            previewImage
                              ? "border-[#22D3EE]"
                              : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/50"
                          )}
                        >
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="text-[#475569] w-8 h-8" />
                          )}
                        </motion.div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0891B2] text-white rounded-md  flex items-center justify-center pointer-events-none">
                          <Upload size={14} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#0F172A]">
                          Client Logo / Photo
                        </h3>
                        <p className="text-sm text-[#475569] mt-1">
                          Supports JPG, PNG (Max 2MB)
                        </p>
                        {previewImage && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-sm text-red-500 hover:text-red-600 mt-2 font-medium"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <StyledInput
                        label="Client / Company Name"
                        required
                        id="clientName"
                        placeholder="e.g. Maple Leaf Tech"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        icon={Building2}
                        error={formErrors.clientName}
                      />

                      <StyledSelect
                        label="Client Type"
                        value={formData.clientType}
                        onValueChange={(val) =>
                          handleSelectChange("clientType", val)
                        }
                        options={[
                          { value: "Business", label: "Business" },
                          { value: "Individual", label: "Individual" },
                        ]}
                      />

                      <StyledInput
                        label="Primary Email"
                        required
                        id="primaryEmail"
                        type="email"
                        placeholder="contact@domain.ca"
                        value={formData.primaryEmail}
                        onChange={handleInputChange}
                        icon={Mail}
                        error={formErrors.primaryEmail}
                      />

                      <StyledInput
                        label="Primary Phone"
                        required
                        id="phone"
                        placeholder="+1 (416) 555-0199"
                        value={formData.phone}
                        onChange={handleInputChange}
                        icon={Phone}
                        error={formErrors.phone}
                      />

                      <StyledSelect
                        label="Status"
                        value={formData.status}
                        onValueChange={(val) =>
                          handleSelectChange("status", val)
                        }
                        options={[
                          { value: "Active", label: "Active" },
                          { value: "Inactive", label: "Inactive" },
                          { value: "Pending", label: "Pending" },
                        ]}
                      />

                      <StyledSelect
                        label="Assigned Owner"
                        value={formData.assignedOwner}
                        onValueChange={(val) =>
                          handleSelectChange("assignedOwner", val)
                        }
                        placeholder="Select an employee"
                        options={employeeOptions}
                      />
                    </div>
                  </div>
                </StyledCard>

                {/* Business & Tax Details */}
                <StyledCard delay={0.2}>
                  <StyledCardHeader
                    icon={FileText}
                    title="Business & Tax Details"
                    subtitle="Canadian business registration"
                    color="gold"
                  />
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <StyledInput
                        label="GST/HST Number"
                        id="gstNumber"
                        placeholder="12345 6789 RT0001"
                        value={formData.gstNumber}
                        onChange={handleInputChange}
                        icon={Hash}
                      />

                      <StyledInput
                        label="PST/QST Number"
                        id="pstNumber"
                        placeholder="If applicable"
                        value={formData.pstNumber}
                        onChange={handleInputChange}
                        icon={Hash}
                      />

                      <StyledSelect
                        label="Business Structure"
                        value={formData.businessType}
                        onValueChange={(val) =>
                          handleSelectChange("businessType", val)
                        }
                        placeholder="Select Type"
                        options={businessTypes.map((type) => ({
                          value: type,
                          label: type,
                        }))}
                      />

                      <StyledInput
                        label="Corp Registration No."
                        id="companyRegistrationNo"
                        placeholder="123456-7"
                        value={formData.companyRegistrationNo}
                        onChange={handleInputChange}
                        icon={Hash}
                      />
                    </div>
                  </div>
                </StyledCard>

                {/* Billing Address */}
                <StyledCard delay={0.3}>
                  <StyledCardHeader
                    icon={MapPin}
                    title="Billing Address"
                    subtitle="Canadian address details"
                    color="navy"
                  />
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-[#475569]">
                            Street Address
                          </Label>
                          <AddressAutocompleteInput
                            id="billingAddressLine1"
                            placeholder="123 King St W"
                            value={formData.billingAddressLine1}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, billingAddressLine1: value }))
                            }
                            onSelectAddress={(details) =>
                              {
                                setFormData((prev) => ({
                                  ...prev,
                                  billingAddressLine1: details.addressLine1 || details.formattedAddress || prev.billingAddressLine1,
                                  city: details.city || prev.city,
                                  state: normalizeProvinceName(details.state) || prev.state,
                                  pincode: details.postalCode || prev.pincode,
                                  country: details.country || prev.country,
                                }));
                                setFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.pincode;
                                  return next;
                                });
                              }
                            }
                            className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 transition-all"
                            iconClassName="text-[#475569]"
                          />
                        </div>
                        <Input
                          id="billingAddressLine2"
                          placeholder="Suite 100 (Optional)"
                          value={formData.billingAddressLine2}
                          onChange={handleInputChange}
                          className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                        />
                      </div>

                      <StyledInput
                        label="City"
                        id="city"
                        placeholder="Toronto"
                        value={formData.city}
                        onChange={handleInputChange}
                      />

                      <StyledSelect
                        label="Province / Territory"
                        value={formData.state}
                        onValueChange={(val) =>
                          handleSelectChange("state", val)
                        }
                        placeholder="Select Province"
                        options={provincesOfCanada.map((p) => ({
                          value: p,
                          label: p,
                        }))}
                      />

                      <StyledInput
                        label="Postal Code"
                        id="pincode"
                        placeholder="M5V 2T6"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className="uppercase"
                        error={formErrors.pincode}
                      />

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#475569]">
                          Country
                        </Label>
                        <div className="relative">
                          <Globe
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                          />
                          <Input
                            value="Canada"
                            disabled
                            className="h-11 pl-10 rounded-md bg-[#F8FAFC] border-[rgba(15,23,42,0.06)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </StyledCard>

                {/* Notes */}
                <StyledCard delay={0.4}>
                  <StyledCardHeader
                    icon={FileText}
                    title="Internal Notes"
                    subtitle="Additional information"
                    color="purple"
                  />
                  <div className="p-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">
                        Notes
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Internal notes about this client..."
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="min-h-[120px] rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
                      />
                    </div>
                  </div>
                </StyledCard>
              </div>

              {/* ============================================ */}
              {/* RIGHT COLUMN */}
              {/* ============================================ */}
              <div className="space-y-6">
                {/* Primary Contact */}
                <StyledCard delay={0.2}>
                  <StyledCardHeader
                    icon={User}
                    title="Primary Contact"
                    subtitle="Main point of contact"
                    color="teal"
                  />
                  <div className="p-6 space-y-4">
                    <StyledInput
                      label="Contact Name"
                      id="primaryContactName"
                      placeholder="e.g. Jane Doe"
                      value={formData.primaryContactName}
                      onChange={handleInputChange}
                      icon={User}
                      error={formErrors.primaryContactName}
                    />

                    <StyledInput
                      label="Position"
                      id="primaryContactDesignation"
                      placeholder="e.g. VP Sales"
                      value={formData.primaryContactDesignation}
                      onChange={handleInputChange}
                    />

                    <StyledInput
                      label="Direct Phone"
                      id="primaryContactPhone"
                      placeholder="+1 (555) 123-4567"
                      value={formData.primaryContactPhone}
                      onChange={handleInputChange}
                      icon={Phone}
                      error={formErrors.primaryContactPhone}
                    />
                  </div>
                </StyledCard>

                {/* Financial Settings */}
                <StyledCard delay={0.3}>
                  <StyledCardHeader
                    icon={CreditCard}
                    title="Financial Settings"
                    subtitle="Payment & credit terms"
                    color="gold"
                  />
                  <div className="p-6 space-y-4">
                    <StyledInput
                      label="Credit Limit ($)"
                      id="creditLimit"
                      type="number"
                      placeholder="0.00"
                      value={formData.creditLimit}
                      onChange={handleNumberChange}
                      icon={DollarSign}
                    />

                    <StyledSelect
                      label="Payment Terms"
                      value={String(formData.paymentTermsDays)}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          paymentTermsDays: parseInt(val),
                        })
                      }
                      placeholder="Select Terms"
                      options={[
                        { value: "0", label: "Due on Receipt" },
                        { value: "15", label: "Net 15" },
                        { value: "30", label: "Net 30" },
                        { value: "45", label: "Net 45" },
                        { value: "60", label: "Net 60" },
                      ]}
                    />

                    <StyledSelect
                      label="Currency"
                      value={formData.currency}
                      onValueChange={(val) =>
                        handleSelectChange("currency", val)
                      }
                      options={[
                        { value: "CAD", label: "CAD ($)" },
                        { value: "USD", label: "USD ($)" },
                        { value: "EUR", label: "EUR (€)" },
                      ]}
                    />
                  </div>
                </StyledCard>

                {/* Property & Service Details */}
                <StyledCard delay={0.35}>
                  <StyledCardHeader
                    icon={Home}
                    title="Property & Service Details"
                    subtitle="Property type and service request"
                    color="teal"
                  />
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledSelect
                        label="Property Type"
                        value={formData.propertyType}
                        onValueChange={(val) => handleSelectChange("propertyType", val)}
                        placeholder="Select Type"
                        options={[
                          { value: "Residential", label: "Residential" },
                          { value: "Commercial", label: "Commercial" },
                          { value: "Multi-Family", label: "Multi-Family" },
                        ]}
                      />
                      <StyledSelect
                        label="Number of Stories"
                        value={formData.numberOfStories}
                        onValueChange={(val) => handleSelectChange("numberOfStories", val)}
                        placeholder="Select"
                        options={[
                          { value: "1", label: "1 Story" },
                          { value: "2", label: "2 Stories" },
                          { value: "3+", label: "3+ Stories" },
                        ]}
                      />
                    </div>
                    <StyledSelect
                      label="Service Type"
                      value={formData.serviceType}
                      onValueChange={(val) => handleSelectChange("serviceType", val)}
                      placeholder="Select Service"
                      options={[
                        { value: "Roof Replacement", label: "Roof Replacement" },
                        { value: "Roof Repair", label: "Roof Repair" },
                        { value: "Storm/Hail Damage", label: "Storm/Hail Damage" },
                        { value: "Inspection", label: "Inspection" },
                        { value: "Maintenance", label: "Maintenance" },
                        { value: "Gutter Work", label: "Gutter Work" },
                        { value: "Siding", label: "Siding" },
                        { value: "Other", label: "Other" },
                      ]}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledSelect
                        label="Preferred Contact Method"
                        value={formData.preferredContactMethod}
                        onValueChange={(val) => handleSelectChange("preferredContactMethod", val)}
                        placeholder="Select"
                        options={[
                          { value: "Phone Call", label: "Phone Call" },
                          { value: "Text", label: "Text" },
                          { value: "Email", label: "Email" },
                        ]}
                      />
                      <StyledSelect
                        label="Best Time to Contact"
                        value={formData.bestTimeToContact}
                        onValueChange={(val) => handleSelectChange("bestTimeToContact", val)}
                        placeholder="Select"
                        options={[
                          { value: "Morning", label: "Morning" },
                          { value: "Afternoon", label: "Afternoon" },
                          { value: "Evening", label: "Evening" },
                          { value: "Anytime", label: "Anytime" },
                        ]}
                      />
                    </div>
                  </div>
                </StyledCard>

                {/* Roof & Insurance Details */}
                <StyledCard delay={0.4}>
                  <StyledCardHeader
                    icon={Wrench}
                    title="Roof & Insurance Details"
                    subtitle="Roof info and insurance claim"
                    color="navy"
                  />
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledSelect
                        label="Current Roof Material"
                        value={formData.currentRoofMaterial}
                        onValueChange={(val) => handleSelectChange("currentRoofMaterial", val)}
                        placeholder="Select Material"
                        options={[
                          { value: "Asphalt Shingles", label: "Asphalt Shingles" },
                          { value: "Metal", label: "Metal" },
                          { value: "Tile", label: "Tile" },
                          { value: "Flat/TPO", label: "Flat/TPO" },
                          { value: "Wood Shake", label: "Wood Shake" },
                          { value: "Slate", label: "Slate" },
                          { value: "Unknown", label: "Unknown" },
                        ]}
                      />
                      <StyledSelect
                        label="Roof Age"
                        value={formData.roofAge}
                        onValueChange={(val) => handleSelectChange("roofAge", val)}
                        placeholder="Select Age"
                        options={[
                          { value: "0-5 years", label: "0-5 years" },
                          { value: "5-10 years", label: "5-10 years" },
                          { value: "10-15 years", label: "10-15 years" },
                          { value: "15-20 years", label: "15-20 years" },
                          { value: "20+ years", label: "20+ years" },
                          { value: "Unknown", label: "Unknown" },
                        ]}
                      />
                    </div>
                    <StyledInput
                      label="Insurance Company Name"
                      id="insuranceCompanyName"
                      placeholder="e.g. State Farm, Allstate"
                      value={formData.insuranceCompanyName}
                      onChange={handleInputChange}
                      icon={Shield}
                    />
                    <StyledSelect
                      label="Insurance Claim?"
                      value={formData.isInsuranceClaim}
                      onValueChange={(val) => handleSelectChange("isInsuranceClaim", val)}
                      placeholder="Select"
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                        { value: "Not Sure", label: "Not Sure" },
                      ]}
                    />
                  </div>
                </StyledCard>

                {/* Ownership & Secondary Contact */}
                <StyledCard delay={0.45}>
                  <StyledCardHeader
                    icon={User}
                    title="Ownership & Secondary Contact"
                    subtitle="Homeowner details and co-owner"
                    color="gold"
                  />
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledSelect
                        label="Homeowner?"
                        value={formData.isHomeowner}
                        onValueChange={(val) => handleSelectChange("isHomeowner", val)}
                        placeholder="Select"
                        options={[
                          { value: "Yes", label: "Yes" },
                          { value: "No", label: "No" },
                          { value: "Tenant", label: "Tenant" },
                        ]}
                      />
                      <StyledSelect
                        label="HOA?"
                        value={formData.isHOA}
                        onValueChange={(val) => handleSelectChange("isHOA", val)}
                        placeholder="Select"
                        options={[
                          { value: "Yes", label: "Yes" },
                          { value: "No", label: "No" },
                          { value: "Not Sure", label: "Not Sure" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#475569]">HOA Restrictions</Label>
                      <Textarea
                        id="hoaRestrictions"
                        placeholder="Any HOA restrictions or requirements..."
                        value={formData.hoaRestrictions}
                        onChange={handleInputChange}
                        className="min-h-[60px] rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledInput
                        label="Spouse / Co-Owner Name"
                        id="spouseCoOwnerName"
                        placeholder="e.g. John Smith"
                        value={formData.spouseCoOwnerName}
                        onChange={handleInputChange}
                        icon={User}
                        error={formErrors.spouseCoOwnerName}
                      />
                      <StyledInput
                        label="Secondary Phone"
                        id="secondaryPhone"
                        placeholder="+1 (555) 123-4567"
                        value={formData.secondaryPhone}
                        onChange={handleInputChange}
                        icon={Phone}
                        error={formErrors.secondaryPhone}
                      />
                    </div>
                  </div>
                </StyledCard>

                {/* Categorization */}
                <StyledCard delay={0.4}>
                  <StyledCardHeader
                    icon={Tag}
                    title="Categorization"
                    subtitle="Client classification"
                    color="purple"
                  />
                  <div className="p-6 space-y-4">
                    <StyledSelect
                      label="Lead Source"
                      value={formData.leadSource}
                      onValueChange={(val) =>
                        handleSelectChange("leadSource", val)
                      }
                      placeholder="Select Source"
                      options={leadSources.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                    />

                    <StyledSelect
                      label="Client Category"
                      value={formData.clientCategory}
                      onValueChange={(val) =>
                        handleSelectChange("clientCategory", val)
                      }
                      options={[
                        { value: "VIP", label: "VIP" },
                        { value: "Regular", label: "Regular" },
                        { value: "New", label: "New" },
                      ]}
                    />

                    <StyledInput
                      label="Tags"
                      id="tags"
                      placeholder="e.g. Tech, Retail"
                      value={formData.tags}
                      onChange={handleInputChange}
                      icon={Tag}
                    />
                  </div>
                </StyledCard>

                {/* Edit Mode Info Card */}
                {isEditMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-[#0891B2]/10 border border-[#22D3EE]/20 rounded-md p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-[#0891B2]/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={18} className="text-[#0891B2]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#0F172A]">
                          Editing Mode
                        </h4>
                        <p className="text-sm text-[#94A3B8] mt-1">
                          You are editing an existing client record. Click
                          "Update Client" to save your changes.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Tips */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#D97706]/10 border border-[#FBBF24]/20 rounded-md p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#D97706]/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={18} className="text-[#D97706]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0F172A]">
                        Quick Tips
                      </h4>
                      <ul className="text-sm text-[#94A3B8] mt-2 space-y-1">
                        <li>• Fields marked with * are required</li>
                        <li>• GST/HST format: 12345 6789 RT0001</li>
                        <li>• Postal code format: A1A 1A1</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {isMobile && <div className="h-4" />}

            {isMobile && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(15,23,42,0.06)] bg-white/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-md"
                    onClick={() => navigate("/client-list")}
                  >
                    <X size={15} className="mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 size={15} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={15} className="mr-2" />
                    )}
                    {isEditMode ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-6 hidden border-t border-[rgba(15,23,42,0.06)] bg-white px-6 py-4 md:block">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#475569] max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A]">Yoursoft</span>
              <span className="text-[#0891B2] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default AddClientPage;
