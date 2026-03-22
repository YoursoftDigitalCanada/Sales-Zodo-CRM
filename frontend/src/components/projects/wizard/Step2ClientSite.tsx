import { AlertCircle, MapPin, Search } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectWizardFormValues, CANADIAN_PROVINCES } from "@/lib/validations/project.schema";

interface ClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

interface Step2ClientSiteProps {
  clientSearch: string;
  setClientSearch: (value: string) => void;
  clientOptions: ClientOption[];
  isClientsLoading?: boolean;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-rose-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

export function Step2ClientSite({
  clientSearch,
  setClientSearch,
  clientOptions,
  isClientsLoading,
}: Step2ClientSiteProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProjectWizardFormValues>();

  const clientSelection = watch("clientSelection");
  const selectedClientId = watch("clientId");

  const selectedClient = clientOptions.find((client) => client.id === selectedClientId) || null;

  /* Auto-fill address when an existing client is selected */
  const handleClientChange = (id: string) => {
    setValue("clientId", id, { shouldValidate: true });
    const client = clientOptions.find((c) => c.id === id);
    if (client && (client.address || client.city || client.state || client.zip)) {
      setValue("sameAsClientAddress", true, { shouldValidate: true });
      setValue("jobSiteAddress", client.address || "", { shouldDirty: true });
      setValue("jobSiteCity", client.city || "", { shouldDirty: true });
      setValue("jobSiteState", client.state || "", { shouldDirty: true });
      setValue("jobSiteZip", client.zip || "", { shouldDirty: true });
    }
  };

  const addressParts = [
    watch("jobSiteAddress"),
    watch("jobSiteCity"),
    watch("jobSiteState"),
    watch("jobSiteZip"),
  ].filter(Boolean);

  const mapsQuery = encodeURIComponent(addressParts.join(", "));

  return (
    <div className="space-y-4">
      <Card className="border-[rgba(15,23,42,0.08)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">Step 1: Client & Job Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label>Client Selection *</Label>
            <RadioGroup
              value={clientSelection}
              onValueChange={(value) => setValue("clientSelection", value as "existing" | "new", { shouldValidate: true })}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] p-3">
                <RadioGroupItem value="existing" id="client-existing" />
                <span className="text-sm text-[#0F172A]">Use Existing Client</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] p-3">
                <RadioGroupItem value="new" id="client-new" />
                <span className="text-sm text-[#0F172A]">Create New Client</span>
              </label>
            </RadioGroup>
          </div>

          {clientSelection === "existing" ? (
            <div className="space-y-3 rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <Label>Find Client *</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Search by client name, email, phone"
                  className="pl-9"
                />
              </div>

              <Select value={selectedClientId || ""} onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder={isClientsLoading ? "Loading clients..." : "Select client"} />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.clientId?.message} />

              {selectedClient && (
                <div className="rounded-md bg-slate-50 p-3 text-xs text-[#475569]">
                  <p className="font-medium text-[#0F172A]">{selectedClient.name}</p>
                  {selectedClient.email ? <p>{selectedClient.email}</p> : null}
                  {selectedClient.phone ? <p>{selectedClient.phone}</p> : null}
                  {[selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.zip]
                    .filter(Boolean)
                    .join(", ") ? (
                    <p className="mt-1">{[selectedClient.address, selectedClient.city, selectedClient.state, selectedClient.zip].filter(Boolean).join(", ")}</p>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-[rgba(15,23,42,0.08)] p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>First Name *</Label>
                  <Input {...register("newClientFirstName")} placeholder="First name" />
                  <FieldError message={errors.newClientFirstName?.message} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input {...register("newClientLastName")} placeholder="Last name" />
                  <FieldError message={errors.newClientLastName?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Email *</Label>
                  <Input {...register("newClientEmail")} placeholder="name@email.com" />
                  <FieldError message={errors.newClientEmail?.message} />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input {...register("newClientPhone")} placeholder="(555) 555-1234" />
                  <FieldError message={errors.newClientPhone?.message} />
                </div>
              </div>

              <div>
                <Label>Company</Label>
                <Input {...register("newClientCompany")} placeholder="Optional company name" />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-md border border-[rgba(15,23,42,0.08)] p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={watch("sameAsClientAddress")}
                onCheckedChange={(checked) => setValue("sameAsClientAddress", Boolean(checked), { shouldValidate: true })}
              />
              <Label className="cursor-pointer">Use client address as job site</Label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Job Site Address *</Label>
                <Input {...register("jobSiteAddress")} placeholder="123 Main St" disabled={watch("sameAsClientAddress")} />
                <FieldError message={errors.jobSiteAddress?.message} />
              </div>
              <div className="md:col-span-2">
                <Label>Address Line 2</Label>
                <Input {...register("jobSiteAddress2")} placeholder="Suite / Unit / Landmark" disabled={watch("sameAsClientAddress")} />
              </div>
              <div>
                <Label>City *</Label>
                <Input {...register("jobSiteCity")} placeholder="City" disabled={watch("sameAsClientAddress")} />
                <FieldError message={errors.jobSiteCity?.message} />
              </div>
              <div>
                <Label>Province *</Label>
                <Select
                  value={watch("jobSiteState") || ""}
                  onValueChange={(value) => setValue("jobSiteState", value, { shouldValidate: true })}
                  disabled={watch("sameAsClientAddress")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANADIAN_PROVINCES.map((prov) => (
                      <SelectItem key={prov.value} value={prov.value}>
                        {prov.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.jobSiteState?.message} />
              </div>
              <div>
                <Label>Postal Code *</Label>
                <Input {...register("jobSiteZip")} placeholder="V3V 2Z0" disabled={watch("sameAsClientAddress")} />
                <FieldError message={errors.jobSiteZip?.message} />
              </div>
            </div>

            <div>
              <Label>Site Access Notes</Label>
              <Textarea {...register("siteAccessNotes")} rows={3} placeholder="Gate code, parking instructions, restricted hours, pets, HOA rules" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#0891B2]" />
              Job Site Map Preview
            </Label>

            {mapsQuery ? (
              <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.08)]">
                <iframe
                  title="Job site map preview"
                  src={`https://maps.google.com/maps?q=${mapsQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="260"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-[rgba(15,23,42,0.14)] p-4 text-sm text-[#64748B]">
                Enter a valid site address to preview map.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Step2ClientSite;
