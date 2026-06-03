import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, BarChart3, Copy, Eye, FileText, GripVertical, Plus, Save, Send, Trash2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  archiveForm,
  createForm,
  duplicateForm,
  FormBuilderField,
  FormBuilderForm,
  getForm,
  getFormAnalytics,
  getForms,
  getFormSubmissions,
  getFormsSummary,
  publishForm,
  updateForm,
} from "@/features/forms/services/forms-service";

const FIELD_TYPES = [
  "text", "textarea", "email", "phone", "number", "url", "date", "time", "address",
  "dropdown", "radio", "checkbox_group", "multi_select", "hidden", "section_heading", "divider",
] as const;

const CRM_MAPPINGS = [
  ["none", "No mapping"],
  ["fullName", "Full Name"],
  ["firstName", "First Name"],
  ["lastName", "Last Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["companyName", "Company"],
  ["website", "Website"],
  ["address", "Address"],
  ["notes", "Notes"],
  ["potentialValue", "Potential Value"],
];

const defaultField = (type: FormBuilderField["type"] = "text", index = 0): FormBuilderField => ({
  id: crypto.randomUUID(),
  type,
  label: type === "textarea" ? "Message" : "New Field",
  internalName: `field_${Date.now()}`,
  required: false,
  width: "FULL",
  options: ["dropdown", "radio", "checkbox_group", "multi_select"].includes(type)
    ? [{ id: crypto.randomUUID(), label: "Option 1", value: "option_1" }]
    : [],
  order: index,
});

function publicFormUrl(publicId: string) {
  return `${window.location.origin}/forms/${publicId}`;
}

function apiEmbedUrl(publicId: string) {
  const apiOrigin = import.meta.env.VITE_API_URL || "https://salesapi.zodo.ca/api/v1";
  return `${String(apiOrigin).replace(/\/$/, "")}/public/forms/${publicId}/embed.js`;
}

export default function FormBuilderPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = location.pathname.endsWith("/new");
  const isSubmissions = location.pathname.endsWith("/submissions");
  const isAnalytics = location.pathname.endsWith("/analytics");
  const [forms, setForms] = useState<FormBuilderForm[]>([]);
  const [form, setForm] = useState<FormBuilderForm | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedField = useMemo(() => form?.fields.find((field) => field.id === selectedFieldId) || form?.fields[0], [form, selectedFieldId]);

  useEffect(() => {
    void load();
  }, [id, location.pathname]);

  async function load() {
    setLoading(true);
    try {
      if (isNew) {
        setForm({
          id: "",
          name: "New Lead Capture Form",
          description: "",
          status: "DRAFT",
          thankYouMessage: "Thanks for your submission. We will be in touch soon.",
          publicId: "",
          slug: "",
          fields: [
            { id: "full-name", type: "text", label: "Full Name", internalName: "full_name", required: true, crmMapping: "fullName", width: "FULL", order: 0 },
            { id: "email", type: "email", label: "Email", internalName: "email", required: true, crmMapping: "email", width: "HALF", order: 1 },
            { id: "phone", type: "phone", label: "Phone", internalName: "phone", required: false, crmMapping: "phone", width: "HALF", order: 2 },
            { id: "message", type: "textarea", label: "Message", internalName: "message", required: false, crmMapping: "notes", width: "FULL", order: 3 },
          ],
          settings: {},
          spamProtection: { honeypot: true },
          notificationEmails: [],
          assignmentRules: {},
          duplicateHandling: "FLAG_DUPLICATE",
          submissionCount: 0,
          viewCount: 0,
          conversionRate: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }
      if (id) {
        const nextForm = await getForm(id);
        setForm(nextForm);
        setSelectedFieldId(nextForm.fields[0]?.id || null);
        if (isSubmissions) {
          const result = await getFormSubmissions(id);
          setSubmissions(result.data || []);
        }
        if (isAnalytics) {
          setAnalytics(await getFormAnalytics(id));
        }
      } else {
        const [result, nextSummary] = await Promise.all([getForms({ limit: 100 }), getFormsSummary()]);
        setForms(result.data || []);
        setSummary(nextSummary);
      }
    } catch (error: any) {
      toast({ title: "Forms unavailable", description: error?.response?.data?.message || "Could not load forms.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function updateLocal(patch: Partial<FormBuilderForm>) {
    setForm((current) => current ? { ...current, ...patch } : current);
  }

  function updateField(fieldId: string, patch: Partial<FormBuilderField>) {
    setForm((current) => current ? {
      ...current,
      fields: current.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field),
    } : current);
  }

  function addField(type: FormBuilderField["type"]) {
    setForm((current) => {
      if (!current) return current;
      const field = defaultField(type, current.fields.length);
      setSelectedFieldId(field.id);
      return { ...current, fields: [...current.fields, field] };
    });
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    setForm((current) => {
      if (!current) return current;
      const index = current.fields.findIndex((field) => field.id === fieldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.fields.length) return current;
      const fields = [...current.fields];
      const [field] = fields.splice(index, 1);
      fields.splice(nextIndex, 0, field);
      return { ...current, fields: fields.map((item, order) => ({ ...item, order })) };
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        thankYouMessage: form.thankYouMessage,
        redirectUrl: form.redirectUrl || null,
        fields: form.fields,
        settings: form.settings,
        spamProtection: form.spamProtection,
        notificationEmails: form.notificationEmails,
        assignmentRules: form.assignmentRules,
        duplicateHandling: form.duplicateHandling,
        submissionLimit: form.submissionLimit || null,
      };
      const saved = form.id ? await updateForm(form.id, payload) : await createForm(payload);
      setForm(saved);
      toast({ title: "Form saved", description: "Your form builder changes are saved." });
      if (!form.id) navigate(`/leads/sources/forms/${saved.id}/edit`, { replace: true });
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.response?.data?.message || "Could not save form.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!form?.id) return;
    const saved = await publishForm(form.id);
    setForm(saved);
    toast({ title: "Form published", description: "The hosted form and embed codes are active." });
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value);
    toast({ title: "Copied" });
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading forms...</div>;

  if (!id && !isNew) {
    return (
      <main className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#6637F4]">Leads / Sources / Forms</p>
            <h1 className="text-2xl font-bold text-[#0F172A]">Form Builder</h1>
            <p className="text-sm text-[#64748B]">Create hosted and embedded lead capture forms without code.</p>
          </div>
          <Button asChild className="rounded-xl bg-[#6637F4] text-white hover:bg-[#5630cc]">
            <Link to="/leads/sources/forms/new"><Plus className="mr-2 h-4 w-4" />New Form</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Forms" value={summary?.forms || forms.length} icon={FileText} />
          <Metric label="Submissions" value={summary?.submissions || 0} icon={Users} />
          <Metric label="Top Form" value={summary?.topForms?.[0]?.name || "None yet"} icon={BarChart3} />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
              <tr><th className="p-4">Form</th><th>Status</th><th>Views</th><th>Submissions</th><th>Conversion</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {forms.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-4"><p className="font-semibold text-[#0F172A]">{item.name}</p><p className="text-xs text-[#64748B]">{item.description}</p></td>
                  <td><Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"}>{item.status}</Badge></td>
                  <td>{item.viewCount}</td>
                  <td>{item.submissionCount}</td>
                  <td>{Number(item.conversionRate || 0).toFixed(1)}%</td>
                  <td className="space-x-2">
                    <Button asChild size="sm" variant="outline"><Link to={`/leads/sources/forms/${item.id}/edit`}>Edit</Link></Button>
                    <Button asChild size="sm" variant="outline"><Link to={`/leads/sources/forms/${item.id}/submissions`}>Submissions</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicateForm(item.id).then(load)}>Duplicate</Button>
                  </td>
                </tr>
              ))}
              {!forms.length && <tr><td colSpan={6} className="p-8 text-center text-[#64748B]">No forms yet. Create your first lead capture form.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  if (isSubmissions && form) {
    return (
      <main className="space-y-5 p-4 sm:p-6">
        <Header title={`${form.name} Submissions`} back={`/leads/sources/forms/${form.id}/edit`} />
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-xs uppercase text-[#64748B]">
              <tr><th className="p-4">Submitted</th><th>Status</th><th>Name</th><th>Email</th><th>Phone</th><th>Lead</th></tr>
            </thead>
            <tbody>
              {submissions.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-4">{new Date(item.submittedAt).toLocaleString()}</td>
                  <td><Badge variant="secondary">{item.status}</Badge></td>
                  <td>{item.lead ? `${item.lead.firstName} ${item.lead.lastName}` : String(item.mappedLeadData?.fullName || "")}</td>
                  <td>{item.lead?.email || String(item.mappedLeadData?.email || "")}</td>
                  <td>{item.lead?.phone || String(item.mappedLeadData?.phone || "")}</td>
                  <td>{item.leadId ? <Link className="text-[#6637F4]" to={`/leads/${item.leadId}`}>Open lead</Link> : "-"}</td>
                </tr>
              ))}
              {!submissions.length && <tr><td colSpan={6} className="p-8 text-center text-[#64748B]">No submissions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  if (isAnalytics && form) {
    return (
      <main className="space-y-5 p-4 sm:p-6">
        <Header title={`${form.name} Analytics`} back={`/leads/sources/forms/${form.id}/edit`} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Views" value={form.viewCount} icon={Eye} />
          <Metric label="Submissions" value={form.submissionCount} icon={Send} />
          <Metric label="Conversion" value={`${Number(form.conversionRate || 0).toFixed(1)}%`} icon={BarChart3} />
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Status breakdown</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {(analytics?.byStatus || []).map((item: any) => <Metric key={item.status} label={item.status} value={item.count} icon={FileText} />)}
          </div>
        </div>
      </main>
    );
  }

  if (!form) return null;

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <Header title={isNew ? "New Form" : form.name} back="/leads/sources/forms" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => updateLocal({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Duplicate handling</Label><Select value={form.duplicateHandling} onValueChange={(value: any) => updateLocal({ duplicateHandling: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="FLAG_DUPLICATE">Flag duplicate</SelectItem><SelectItem value="IGNORE">Ignore duplicate</SelectItem><SelectItem value="UPDATE_EXISTING">Update existing</SelectItem><SelectItem value="CREATE_NEW">Create new</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => updateLocal({ description: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Thank you message</Label><Textarea value={form.thankYouMessage} onChange={(e) => updateLocal({ thankYouMessage: e.target.value })} /></div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-[#0F172A]">Fields</h2>
              <Select onValueChange={(value: FormBuilderField["type"]) => addField(value)}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Add field" /></SelectTrigger>
                <SelectContent>{FIELD_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {form.fields.map((field, index) => (
                <button key={field.id} type="button" onClick={() => setSelectedFieldId(field.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selectedField?.id === field.id ? "border-[#6637F4] bg-[#6637F4]/5" : "bg-white"}`}>
                  <GripVertical className="h-4 w-4 text-[#94A3B8]" />
                  <div className="min-w-0 flex-1"><p className="font-medium">{field.label}</p><p className="text-xs text-[#64748B]">{field.type} · {field.crmMapping || "unmapped"}</p></div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); moveField(field.id, -1); }} disabled={index === 0}>Up</Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); moveField(field.id, 1); }} disabled={index === form.fields.length - 1}>Down</Button>
                </button>
              ))}
            </div>
          </div>

          <Preview form={form} />
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-semibold">Field Settings</h2>
            {selectedField ? (
              <div className="space-y-3">
                <div className="space-y-2"><Label>Label</Label><Input value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} /></div>
                <div className="space-y-2"><Label>Internal name</Label><Input value={selectedField.internalName} onChange={(e) => updateField(selectedField.id, { internalName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Placeholder</Label><Input value={selectedField.placeholder || ""} onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} /></div>
                <div className="space-y-2"><Label>CRM mapping</Label><Select value={selectedField.crmMapping || "none"} onValueChange={(value: any) => updateField(selectedField.id, { crmMapping: value === "none" ? null : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CRM_MAPPINGS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(selectedField.required)} onCheckedChange={(checked) => updateField(selectedField.id, { required: Boolean(checked) })} />Required</label>
                {selectedField.options?.length ? <Textarea value={selectedField.options.map((option) => option.label).join("\n")} onChange={(e) => updateField(selectedField.id, { options: e.target.value.split("\n").filter(Boolean).map((label) => ({ label, value: label.toLowerCase().replace(/\s+/g, "_") })) })} placeholder="One option per line" /> : null}
                <Button variant="destructive" onClick={() => updateLocal({ fields: form.fields.filter((field) => field.id !== selectedField.id) })}><Trash2 className="mr-2 h-4 w-4" />Delete field</Button>
              </div>
            ) : <p className="text-sm text-[#64748B]">Select a field to edit it.</p>}
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <h2 className="mb-4 font-semibold">Publish</h2>
            <div className="space-y-3">
              <Button onClick={save} disabled={saving} className="w-full rounded-xl bg-[#6637F4] text-white hover:bg-[#5630cc]"><Save className="mr-2 h-4 w-4" />Save</Button>
              <Button onClick={publish} disabled={!form.id || form.status === "PUBLISHED"} variant="outline" className="w-full rounded-xl"><Upload className="mr-2 h-4 w-4" />Publish</Button>
              {form.publicId && (
                <div className="space-y-2 text-xs">
                  <Label>Hosted URL</Label>
                  <CodeCopy value={publicFormUrl(form.publicId)} onCopy={copy} />
                  <Label>Iframe embed</Label>
                  <CodeCopy value={`<iframe src="${publicFormUrl(form.publicId)}" style="width:100%;min-height:620px;border:0;" loading="lazy"></iframe>`} onCopy={copy} />
                  <Label>JavaScript embed</Label>
                  <CodeCopy value={`<script src="${apiEmbedUrl(form.publicId)}"></script>`} onCopy={copy} />
                </div>
              )}
              {form.id && <Button asChild variant="ghost" className="w-full"><Link to={`/leads/sources/forms/${form.id}/submissions`}>View submissions</Link></Button>}
              {form.id && <Button asChild variant="ghost" className="w-full"><Link to={`/leads/sources/forms/${form.id}/analytics`}>View analytics</Link></Button>}
              {form.id && <Button variant="ghost" className="w-full text-red-600" onClick={() => archiveForm(form.id).then(load)}>Archive</Button>}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Header({ title, back }: { title: string; back: string }) {
  return <div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to={back}><ArrowLeft className="h-4 w-4" /></Link></Button><div><p className="text-sm font-semibold text-[#6637F4]">Form Builder</p><h1 className="text-2xl font-bold text-[#0F172A]">{title}</h1></div></div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return <div className="rounded-2xl border bg-white p-4"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#6637F4]/10 text-[#6637F4]"><Icon className="h-4 w-4" /></div><p className="text-xs uppercase text-[#64748B]">{label}</p><p className="mt-1 truncate text-xl font-bold text-[#0F172A]">{value}</p></div>;
}

function CodeCopy({ value, onCopy }: { value: string; onCopy: (value: string) => void }) {
  return <div className="flex items-center gap-2"><Input readOnly value={value} className="font-mono text-[11px]" /><Button size="icon" variant="outline" onClick={() => onCopy(value)}><Copy className="h-4 w-4" /></Button></div>;
}

function Preview({ form }: { form: FormBuilderForm }) {
  return <div className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-semibold">Live Preview</h2><div className="mx-auto max-w-2xl rounded-2xl border bg-[#F8FAFC] p-5"><h3 className="text-xl font-bold">{form.name}</h3>{form.description && <p className="mt-1 text-sm text-[#64748B]">{form.description}</p>}<div className="mt-5 grid gap-3 sm:grid-cols-2">{form.fields.map((field) => <div key={field.id} className={field.width === "HALF" ? "" : "sm:col-span-2"}>{field.type === "section_heading" ? <h4 className="font-semibold">{field.label}</h4> : field.type === "divider" ? <hr /> : <><Label>{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>{field.type === "textarea" ? <Textarea placeholder={field.placeholder || ""} /> : <Input placeholder={field.placeholder || ""} type={field.type === "phone" ? "tel" : field.type} />}{field.helpText && <p className="mt-1 text-xs text-[#64748B]">{field.helpText}</p>}</>}</div>)}</div><Button className="mt-5 rounded-xl bg-[#6637F4] text-white">Submit</Button></div></div>;
}
