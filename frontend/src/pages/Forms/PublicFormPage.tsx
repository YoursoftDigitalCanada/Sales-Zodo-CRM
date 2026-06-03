import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getPublicForm, recordPublicFormView, submitPublicForm, FormBuilderField } from "@/features/forms/services/forms-service";

export default function PublicFormPage() {
  const { publicId } = useParams();
  const [form, setForm] = useState<any>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const tracking = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_term: params.get("utm_term") || "",
      utm_content: params.get("utm_content") || "",
      referrerUrl: document.referrer || "",
      landingPageUrl: window.location.href,
    };
  }, []);

  useEffect(() => {
    if (!publicId) return;
    setLoading(true);
    getPublicForm(publicId)
      .then((data) => {
        setForm(data);
        const defaults: Record<string, any> = {};
        (data.fields || []).forEach((field: FormBuilderField) => {
          if (field.defaultValue !== undefined) defaults[field.internalName] = field.defaultValue;
        });
        setValues(defaults);
        void recordPublicFormView(publicId);
      })
      .catch(() => setMessage("This form is not available."))
      .finally(() => setLoading(false));
  }, [publicId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!publicId || !form) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitPublicForm(publicId, { data: values, tracking, honeypot });
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setMessage(result.thankYouMessage || form.thankYouMessage || "Thanks for your submission.");
      setValues({});
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Please check the form and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Shell><p className="text-sm text-slate-500">Loading form...</p></Shell>;
  if (!form) return <Shell><p className="text-sm text-slate-500">{message || "Form unavailable."}</p></Shell>;
  if (message && !submitting) return <Shell><div className="rounded-2xl border bg-white p-8 text-center"><h1 className="text-2xl font-bold text-slate-900">{message}</h1></div></Shell>;

  return (
    <Shell>
      <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-950">{form.name}</h1>
        {form.description && <p className="mt-2 text-sm text-slate-600">{form.description}</p>}
        <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" name="company_website" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(form.fields || []).map((field: FormBuilderField) => (
            <PublicField key={field.id} field={field} value={values[field.internalName]} onChange={(value) => setValues((current) => ({ ...current, [field.internalName]: value }))} />
          ))}
        </div>
        {message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <Button disabled={submitting} className="mt-6 rounded-xl bg-[#6637F4] px-6 text-white hover:bg-[#5630cc]">
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Shell>
  );
}

function PublicField({ field, value, onChange }: { field: FormBuilderField; value: any; onChange: (value: any) => void }) {
  if (field.type === "section_heading") return <h2 className="sm:col-span-2 text-lg font-semibold text-slate-900">{field.label}</h2>;
  if (field.type === "divider") return <hr className="sm:col-span-2" />;
  const className = field.width === "HALF" ? "" : "sm:col-span-2";
  const required = Boolean(field.required);

  return (
    <div className={className}>
      <Label>{field.label}{required && <span className="text-red-500"> *</span>}</Label>
      {field.type === "textarea" ? (
        <Textarea required={required} placeholder={field.placeholder || ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : ["dropdown", "radio"].includes(field.type) ? (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || "Select"} /></SelectTrigger>
          <SelectContent>{(field.options || []).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
      ) : ["checkbox_group", "multi_select"].includes(field.type) ? (
        <div className="mt-2 space-y-2">
          {(field.options || []).map((option) => {
            const selected = Array.isArray(value) ? value.includes(option.value) : false;
            return <label key={option.value} className="flex items-center gap-2 text-sm"><Checkbox checked={selected} onCheckedChange={(checked) => onChange(checked ? [...(Array.isArray(value) ? value : []), option.value] : (Array.isArray(value) ? value.filter((item) => item !== option.value) : []))} />{option.label}</label>;
          })}
        </div>
      ) : (
        <Input required={required} type={field.type === "phone" ? "tel" : field.type === "address" ? "text" : field.type} placeholder={field.placeholder || ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.helpText && <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[#F8FAFC] px-4 py-8"><div className="mx-auto max-w-3xl">{children}</div></main>;
}
