export interface LeadFieldMappingRow {
  form: string;
  crm: string;
  transform: string;
}

export const crmFieldOptions = [
  "Full Name",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Phone (Secondary)",
  "Company",
  "Job Title",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip Code",
  "Website",
  "Potential Value",
  "Status",
  "Temperature",
  "Service Needed",
  "Property Type",
  "Urgency",
  "Message/Notes",
  "External ID",
  "-- Ignore --",
];

export const transformOptions = [
  "None",
  "Uppercase",
  "Lowercase",
  "Title Case",
  "Phone Format (E.164)",
  "Split First/Last Name",
];

export const crmFieldLabelToKey: Record<string, string> = {
  "Full Name": "fullName",
  "First Name": "firstName",
  "Last Name": "lastName",
  Email: "email",
  Phone: "phone",
  "Phone (Secondary)": "phoneSecondary",
  Company: "companyName",
  "Job Title": "jobTitle",
  "Address Line 1": "location",
  "Address Line 2": "locationLine2",
  City: "city",
  State: "state",
  "Zip Code": "zipCode",
  Website: "website",
  "Potential Value": "potentialValue",
  Status: "status",
  Temperature: "temperature",
  "Service Needed": "serviceNeeded",
  "Property Type": "propertyType",
  Urgency: "urgency",
  "Message/Notes": "notes",
  "External ID": "externalId",
};

export function rowsToFieldMapping(rows: LeadFieldMappingRow[] | undefined | null): Record<string, string> {
  if (!rows?.length) return {};

  return rows.reduce<Record<string, string>>((acc, row) => {
    const internalField = crmFieldLabelToKey[row.crm];
    const sourceField = row.form?.trim();

    if (!internalField || !sourceField || row.crm === "-- Ignore --") {
      return acc;
    }

    acc[internalField] = sourceField;
    return acc;
  }, {});
}
