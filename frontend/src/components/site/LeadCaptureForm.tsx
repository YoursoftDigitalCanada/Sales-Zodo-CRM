import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

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

const inputClassName =
  "h-12 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15";

const selectClassName =
  "h-12 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/15";

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
      className="overflow-hidden rounded-[2rem] border border-border/60 bg-white/96 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur md:p-8"
      data-testid={`${testIdPrefix}-wrapper`}
    >
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
          <Sparkles className="h-3.5 w-3.5" />
          Capture intent
        </div>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground" data-testid={`${testIdPrefix}-title`}>
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground" data-testid={`${testIdPrefix}-description`}>
          {description}
        </p>
      </div>

      <form className="mt-8 grid gap-5" onSubmit={handleSubmit} data-testid={`${testIdPrefix}-form`}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-name`} data-testid={`${testIdPrefix}-name-label`}>
              Full name
            </label>
            <input
              id={`${testIdPrefix}-name`}
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Your name"
              required
              data-testid={`${testIdPrefix}-name-input`}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-company`} data-testid={`${testIdPrefix}-company-label`}>
              Company
            </label>
            <input
              id={`${testIdPrefix}-company`}
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className={inputClassName}
              placeholder="Roofing company"
              required
              data-testid={`${testIdPrefix}-company-input`}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-email`} data-testid={`${testIdPrefix}-email-label`}>
              Work email
            </label>
            <input
              id={`${testIdPrefix}-email`}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClassName}
              placeholder="name@company.com"
              required
              data-testid={`${testIdPrefix}-email-input`}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-phone`} data-testid={`${testIdPrefix}-phone-label`}>
              Phone
            </label>
            <input
              id={`${testIdPrefix}-phone`}
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={inputClassName}
              placeholder="(555) 123-4567"
              required
              data-testid={`${testIdPrefix}-phone-input`}
            />
          </div>
        </div>

        <div className={`grid gap-5 ${showRevenue || showAddress ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-team-size`} data-testid={`${testIdPrefix}-team-size-label`}>
              Team size
            </label>
            <select
              id={`${testIdPrefix}-team-size`}
              name="team_size"
              value={formData.team_size}
              onChange={handleChange}
              className={selectClassName}
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
              <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-revenue`} data-testid={`${testIdPrefix}-revenue-label`}>
                Revenue volume
              </label>
              <select
                id={`${testIdPrefix}-revenue`}
                name="revenue_volume"
                value={formData.revenue_volume}
                onChange={handleChange}
                className={selectClassName}
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
              <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-address`} data-testid={`${testIdPrefix}-address-label`}>
                Property address
              </label>
              <input
                id={`${testIdPrefix}-address`}
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={inputClassName}
                placeholder="123 Main Street, Dallas, TX"
                required
                data-testid={`${testIdPrefix}-address-input`}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor={`${testIdPrefix}-message`} data-testid={`${testIdPrefix}-message-label`}>
            {messageLabel}
          </label>
          <textarea
            id={`${testIdPrefix}-message`}
            name="message"
            value={formData.message}
            onChange={handleChange}
            className="min-h-[140px] w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
            placeholder={messagePlaceholder}
            required
            data-testid={`${testIdPrefix}-message-input`}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-footnote`}>
            ZODO is designed for roofing contractors, sales teams, and service businesses.
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/92 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Continuing..." : submitLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
