import { useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, Loader2, Mail, Pencil, Phone, Plus, Search, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import api from "@/lib/axios";
import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
  type ClientEntity,
} from "@/features/clients";

type Organization = ClientEntity & {
  id: string;
  clientName: string;
  primaryEmail: string;
  primaryPhone: string;
  status: string;
  contactsCount?: number;
  projectsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type OrgForm = {
  clientName: string;
  clientLogo: string;
  website: string;
  noOfEmployees: string;
  currency: string;
  exchangeRate: string;
  annualRevenue: string;
  industry: string;
  territory: string;
  organizationAddress: string;
  primaryEmail: string;
  primaryPhone: string;
  status: string;
};

const employeeRanges = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const industries = ["Technology", "Manufacturing", "Consulting", "Financial Services", "Advertising", "Telecommunications", "Healthcare", "Construction", "Retail", "Other"];
const territories = ["Canada", "United States", "North America", "Europe", "APAC", "Global", "Other"];

const emptyForm: OrgForm = {
  clientName: "",
  clientLogo: "",
  website: "",
  noOfEmployees: "1-10",
  currency: "CAD",
  exchangeRate: "1",
  annualRevenue: "",
  industry: "",
  territory: "",
  organizationAddress: "",
  primaryEmail: "",
  primaryPhone: "",
  status: "ACTIVE",
};

const formatCurrency = (value?: number | string | null, currency = "CAD") => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
};

const cleanWebsite = (website?: string | null) => {
  if (!website) return "";
  return website.replace(/^(https?:\/\/)?(www\.)?/i, "");
};

const withProtocol = (website?: string | null) => {
  if (!website) return "";
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
};

const mapOrganization = (item: any): Organization => ({
  ...item,
  id: String(item.id),
  clientName: item.clientName || item.organizationName || item.companyName || "Untitled Organization",
  primaryEmail: item.primaryEmail || "",
  primaryPhone: item.primaryPhone || "",
  status: item.status || "ACTIVE",
  contactsCount: item.contactsCount || 0,
  projectsCount: item.projectsCount || 0,
});

export default function OrganizationsPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [viewing, setViewing] = useState<Organization | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [form, setForm] = useState<OrgForm>(emptyForm);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) =>
      [org.clientName, org.website, org.industry, org.territory, org.primaryEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [organizations, search]);

  const stats = useMemo(() => ({
    total: organizations.length,
    active: organizations.filter((org) => org.status === "ACTIVE").length,
    revenue: organizations.reduce((sum, org) => sum + Number(org.annualRevenue || 0), 0),
    contacts: organizations.reduce((sum, org) => sum + Number(org.contactsCount || 0), 0),
  }), [organizations]);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (!viewing) return;
    setLinkedLoading(true);
    Promise.all([
      api.get("/projects", { params: { clientId: viewing.id, limit: 100 } }).catch(() => ({ data: { data: [] } })),
      api.get("/contacts", { params: { companyId: viewing.id, limit: 100 } }).catch(() => ({ data: { data: [] } })),
    ]).then(([dealRes, contactRes]) => {
      setDeals(dealRes.data?.data?.data || dealRes.data?.data || []);
      setContacts(contactRes.data?.data?.data || contactRes.data?.data || []);
    }).finally(() => setLinkedLoading(false));
  }, [viewing]);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const data = await getClients();
      setOrganizations((data || []).map(mapOrganization));
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to load organizations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(org: Organization) {
    setEditing(org);
    setForm({
      clientName: org.clientName || "",
      clientLogo: String(org.clientLogo || ""),
      website: String(org.website || ""),
      noOfEmployees: String(org.noOfEmployees || "1-10"),
      currency: String(org.currency || "CAD"),
      exchangeRate: String(org.exchangeRate || "1"),
      annualRevenue: org.annualRevenue ? String(org.annualRevenue) : "",
      industry: String(org.industry || ""),
      territory: String(org.territory || ""),
      organizationAddress: String(org.organizationAddress || ""),
      primaryEmail: org.primaryEmail || "",
      primaryPhone: org.primaryPhone || "",
      status: org.status || "ACTIVE",
    });
    setModalOpen(true);
  }

  async function saveOrganization() {
    if (!form.clientName.trim() || !form.primaryEmail.trim() || !form.primaryPhone.trim()) {
      toast({ title: "Missing details", description: "Organization name, email, and phone are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      clientName: form.clientName.trim(),
      companyName: form.clientName.trim(),
      clientType: "BUSINESS",
      primaryEmail: form.primaryEmail.trim(),
      primaryPhone: form.primaryPhone.trim(),
      status: form.status,
      clientLogo: form.clientLogo.trim() || null,
      website: form.website.trim() || null,
      noOfEmployees: form.noOfEmployees,
      currency: form.currency.trim().toUpperCase() || "CAD",
      exchangeRate: Number(form.exchangeRate || 1),
      annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : null,
      industry: form.industry || null,
      territory: form.territory || null,
      organizationAddress: form.organizationAddress.trim() || null,
      streetAddress: form.organizationAddress.trim() || null,
    };

    try {
      if (editing) {
        await updateClient(editing.id, payload);
        toast({ title: "Updated", description: "Organization updated successfully." });
      } else {
        await createClient(payload);
        toast({ title: "Created", description: "Organization created successfully." });
      }
      setModalOpen(false);
      await loadOrganizations();
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to save organization", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function removeOrganization(org: Organization) {
    if (!confirm(`Delete ${org.clientName}?`)) return;
    try {
      await deleteClient(org.id);
      setOrganizations((prev) => prev.filter((item) => item.id !== org.id));
      toast({ title: "Deleted", description: "Organization deleted successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.response?.data?.message || "Failed to delete organization", variant: "destructive" });
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Organizations</h1>
            <p className="text-sm text-[#64748B]">Company accounts from crm-develop, connected to deals and contacts.</p>
          </div>
          <Button onClick={openCreate} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
            <Plus size={16} className="mr-2" /> Create
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["Organizations", stats.total, Building2],
            ["Active", stats.active, Users],
            ["Annual Revenue", formatCurrency(stats.revenue), Mail],
            ["Contacts", stats.contacts, Phone],
          ].map(([label, value, Icon]: any) => (
            <div key={label} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">{label}</p>
                  <p className="mt-1 text-xl font-bold text-[#0F172A]">{value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
                  <Icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white">
          <div className="flex items-center gap-3 border-b border-[rgba(15,23,42,0.06)] p-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations, website, industry, territory..." className="h-11 rounded-md pl-10" />
            </div>
            <Button variant="outline" onClick={loadOrganizations} className="rounded-md">Refresh</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wide text-[#64748B]">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Employees</th>
                  <th className="px-4 py-3 text-right">Annual Revenue</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#64748B]"><Loader2 className="mx-auto mb-2 animate-spin" />Loading organizations...</td></tr>
                ) : filtered.length ? filtered.map((org) => (
                  <tr key={org.id} className="border-t border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-4">
                      <button onClick={() => setViewing(org)} className="flex items-center gap-3 text-left">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-[#0891B2]/10 font-semibold text-[#0891B2]">
                          {org.clientLogo ? <img src={String(org.clientLogo)} alt="" className="h-full w-full object-cover" /> : org.clientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{org.clientName}</p>
                          <p className="text-xs text-[#64748B]">{org.primaryEmail || "-"}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4">{org.website ? <a className="text-[#0891B2]" href={withProtocol(String(org.website))} target="_blank" rel="noreferrer">{cleanWebsite(String(org.website))}</a> : "-"}</td>
                    <td className="px-4 py-4">{org.industry || "-"}</td>
                    <td className="px-4 py-4">{org.noOfEmployees || "-"}</td>
                    <td className="px-4 py-4 text-right font-medium">{formatCurrency(org.annualRevenue, String(org.currency || "CAD"))}</td>
                    <td className="px-4 py-4">{org.territory || "-"}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="outline" onClick={() => openEdit(org)} className="h-9 w-9 rounded-md"><Pencil size={15} /></Button>
                        <Button size="icon" variant="outline" onClick={() => removeOrganization(org)} className="h-9 w-9 rounded-md text-red-600"><Trash2 size={15} /></Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[#64748B]">No organizations found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] p-5">
            <DialogTitle>{editing ? "Edit Organization" : "New Organization"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Organization Name" required value={form.clientName} onChange={(value) => setForm({ ...form, clientName: value })} />
            <Field label="Organization Logo URL" value={form.clientLogo} onChange={(value) => setForm({ ...form, clientLogo: value })} />
            <Field label="Website" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
            <Field label="Annual Revenue" type="number" value={form.annualRevenue} onChange={(value) => setForm({ ...form, annualRevenue: value })} />
            <div className="space-y-2">
              <Label>No. of Employees</Label>
              <Select value={form.noOfEmployees} onValueChange={(value) => setForm({ ...form, noOfEmployees: value })}>
                <SelectTrigger className="h-11 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent>{employeeRanges.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(value) => setForm({ ...form, industry: value })}>
                <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>{industries.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Territory</Label>
              <Select value={form.territory} onValueChange={(value) => setForm({ ...form, territory: value })}>
                <SelectTrigger className="h-11 rounded-md"><SelectValue placeholder="Select territory" /></SelectTrigger>
                <SelectContent>{territories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Currency" value={form.currency} onChange={(value) => setForm({ ...form, currency: value })} />
            <Field label="Exchange Rate" type="number" value={form.exchangeRate} onChange={(value) => setForm({ ...form, exchangeRate: value })} />
            <Field label="Primary Email" required value={form.primaryEmail} onChange={(value) => setForm({ ...form, primaryEmail: value })} />
            <Field label="Primary Phone" required value={form.primaryPhone} onChange={(value) => setForm({ ...form, primaryPhone: value })} />
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger className="h-11 rounded-md"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.organizationAddress} onChange={(event) => setForm({ ...form, organizationAddress: event.target.value })} className="min-h-[90px] rounded-md" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[rgba(15,23,42,0.06)] p-5">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={saveOrganization} disabled={saving} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
              {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-[900px]">
          {viewing ? (
            <>
              <div className="flex items-start justify-between border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md bg-[#0891B2]/10 font-bold text-[#0891B2]">
                    {viewing.clientLogo ? <img src={String(viewing.clientLogo)} alt="" className="h-full w-full object-cover" /> : viewing.clientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">{viewing.clientName}</h2>
                    {viewing.website ? <a href={withProtocol(String(viewing.website))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#0891B2]">{cleanWebsite(String(viewing.website))}<ExternalLink size={13} /></a> : null}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setViewing(null)}><X size={18} /></Button>
              </div>
              <Tabs defaultValue="details" className="p-5">
                <TabsList className="rounded-md">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="deals">Deals {deals.length}</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts {contacts.length}</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-5 grid gap-4 md:grid-cols-2">
                  <Detail label="No. of Employees" value={String(viewing.noOfEmployees || "-")} />
                  <Detail label="Annual Revenue" value={formatCurrency(viewing.annualRevenue, String(viewing.currency || "CAD"))} />
                  <Detail label="Industry" value={String(viewing.industry || "-")} />
                  <Detail label="Territory" value={String(viewing.territory || "-")} />
                  <Detail label="Currency" value={String(viewing.currency || "CAD")} />
                  <Detail label="Exchange Rate" value={String(viewing.exchangeRate || 1)} />
                  <Detail label="Email" value={viewing.primaryEmail || "-"} />
                  <Detail label="Phone" value={viewing.primaryPhone || "-"} />
                  <div className="md:col-span-2"><Detail label="Address" value={String(viewing.organizationAddress || "-")} /></div>
                </TabsContent>
                <TabsContent value="deals" className="mt-5">
                  <LinkedTable loading={linkedLoading} rows={deals} columns={["name", "status", "contractValue", "updatedAt"]} empty="No linked deals." />
                </TabsContent>
                <TabsContent value="contacts" className="mt-5">
                  <LinkedTable loading={linkedLoading} rows={contacts} columns={["contactName", "email", "officePhone", "roleInBuyingProcess"]} empty="No linked contacts." />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; type?: string; required?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label} {required ? <span className="text-red-500">*</span> : null}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-md" />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-1 font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

function LinkedTable({ loading, rows, columns, empty }: { loading: boolean; rows: any[]; columns: string[]; empty: string }) {
  if (loading) return <div className="py-8 text-center text-[#64748B]"><Loader2 className="mx-auto mb-2 animate-spin" />Loading...</div>;
  if (!rows.length) return <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.16)] py-8 text-center text-[#64748B]">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-md border border-[rgba(15,23,42,0.06)]">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-wide text-[#64748B]">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.name || index} className="border-t border-[rgba(15,23,42,0.06)]">
              {columns.map((column) => <td key={column} className="px-4 py-3">{String(row[column] ?? "-")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
