import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PrimaryAction, T } from "@/components/site/site-system";

const PUBLIC_SITE_DRAFT_KEY = "zodo-public-site-draft";

const buildInitialState = (initialAddress = "", requestType = "trial") => ({
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  team_size: "1-5",
  revenue_volume: "Under $1M",
  address: initialAddress,
  message: "",
  request_type: requestType,
});

type LeadCaptureFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  requestType?: "trial" | "estimate";
  initialAddress?: string;
  showAddress?: boolean;
  showRevenue?: boolean;
  messageLabel?: string;
  messagePlaceholder?: string;
  testIdPrefix?: string;
};

export function LeadCaptureForm({
  title,
  description,
  submitLabel,
  requestType = "trial",
  initialAddress = "",
  showAddress = false,
  showRevenue = true,
  messageLabel = "What would you like to improve first?",
  messagePlaceholder = "Tell us about your roofing workflow, estimating needs, or sales process.",
  testIdPrefix = "lead-form",
}: LeadCaptureFormProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(buildInitialState(initialAddress, requestType));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      address: initialAddress || current.address,
      request_type: requestType,
    }));
  }, [initialAddress, requestType]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      page_source: location.pathname,
      address: showAddress ? formData.address : initialAddress || "",
      revenue_volume: showRevenue ? formData.revenue_volume : "",
      saved_at: new Date().toISOString(),
    };

    sessionStorage.setItem(PUBLIC_SITE_DRAFT_KEY, JSON.stringify(payload));

    const params = new URLSearchParams();
    params.set("intent", requestType);
    if ((showAddress ? formData.address : initialAddress).trim()) {
      params.set("address", (showAddress ? formData.address : initialAddress).trim());
    }

    toast.success("Details saved. Continue in ZODO to finish.");
    navigate(`/signup?${params.toString()}`);
  };

  return (
    <div
      className="rounded-[2rem] border bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] md:p-8"
      style={{ borderColor: T.border }}
      data-testid={`${testIdPrefix}-wrapper`}
    >
      <div className="max-w-xl">
        <p
          className="text-xs font-bold uppercase tracking-[0.24em]"
          style={{ color: T.primary }}
          data-testid={`${testIdPrefix}-overline`}
        >
          Capture intent
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: T.textPrimary }} data-testid={`${testIdPrefix}-title`}>
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7" style={{ color: T.textSecondary }} data-testid={`${testIdPrefix}-description`}>
          {description}
        </p>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit} data-testid={`${testIdPrefix}-form`}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${testIdPrefix}-name`} data-testid={`${testIdPrefix}-name-label`}>
              Full name
            </Label>
            <Input
              id={`${testIdPrefix}-name`}
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              placeholder="Your name"
              required
              data-testid={`${testIdPrefix}-name-input`}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${testIdPrefix}-company`} data-testid={`${testIdPrefix}-company-label`}>
              Company
            </Label>
            <Input
              id={`${testIdPrefix}-company`}
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              placeholder="Roofing company"
              required
              data-testid={`${testIdPrefix}-company-input`}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${testIdPrefix}-email`} data-testid={`${testIdPrefix}-email-label`}>
              Work email
            </Label>
            <Input
              id={`${testIdPrefix}-email`}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              placeholder="name@company.com"
              required
              data-testid={`${testIdPrefix}-email-input`}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${testIdPrefix}-phone`} data-testid={`${testIdPrefix}-phone-label`}>
              Phone
            </Label>
            <Input
              id={`${testIdPrefix}-phone`}
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
              placeholder="(555) 123-4567"
              required
              data-testid={`${testIdPrefix}-phone-input`}
            />
          </div>
        </div>

        <div className={`grid gap-5 ${showRevenue || showAddress ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          <div className="grid gap-2">
            <Label htmlFor={`${testIdPrefix}-team-size`} data-testid={`${testIdPrefix}-team-size-label`}>
              Team size
            </Label>
            <select
              id={`${testIdPrefix}-team-size`}
              name="team_size"
              value={formData.team_size}
              onChange={handleChange}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none"
              data-testid={`${testIdPrefix}-team-size-select`}
            >
              <option value="1-5">1-5 people</option>
              <option value="6-15">6-15 people</option>
              <option value="16-30">16-30 people</option>
              <option value="31+">31+ people</option>
            </select>
          </div>

          {showRevenue ? (
            <div className="grid gap-2">
              <Label htmlFor={`${testIdPrefix}-revenue`} data-testid={`${testIdPrefix}-revenue-label`}>
                Revenue volume
              </Label>
              <select
                id={`${testIdPrefix}-revenue`}
                name="revenue_volume"
                value={formData.revenue_volume}
                onChange={handleChange}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none"
                data-testid={`${testIdPrefix}-revenue-select`}
              >
                <option value="Under $1M">Under $1M</option>
                <option value="$1M-$5M">$1M-$5M</option>
                <option value="$5M-$15M">$5M-$15M</option>
                <option value="$15M+">$15M+</option>
              </select>
            </div>
          ) : null}

          {showAddress ? (
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor={`${testIdPrefix}-address`} data-testid={`${testIdPrefix}-address-label`}>
                Property address
              </Label>
              <Input
                id={`${testIdPrefix}-address`}
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                placeholder="123 Main Street, Dallas, TX"
                required
                data-testid={`${testIdPrefix}-address-input`}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${testIdPrefix}-message`} data-testid={`${testIdPrefix}-message-label`}>
            {messageLabel}
          </Label>
          <Textarea
            id={`${testIdPrefix}-message`}
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="min-h-[140px] rounded-2xl border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
            placeholder={messagePlaceholder}
            required
            data-testid={`${testIdPrefix}-message-input`}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm" style={{ color: T.textSecondary }} data-testid={`${testIdPrefix}-footnote`}>
            ZODO is designed for roofing contractors, sales teams, and service businesses.
          </p>
          <PrimaryAction type="submit" className="px-6 py-3.5">
            {isSubmitting ? "Continuing..." : submitLabel}
          </PrimaryAction>
        </div>
      </form>
    </div>
  );
}
