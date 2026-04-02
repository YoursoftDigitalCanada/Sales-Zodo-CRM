import { LeadFieldMappingRow, rowsToFieldMapping } from "./field-mapping-utils";

type LeadSourceType =
  | "COLD_CALL"
  | "EMAIL_CAMPAIGN"
  | "GOOGLE_ADS"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "TRADE_SHOW"
  | "WALK_IN"
  | "WEBSITE";

interface BuildLeadSourcePayloadArgs {
  selectedType: {
    type: LeadSourceType;
  };
  formData: any;
}

function sanitizeValue<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function stripUndefinedDeep(value: any): any {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, stripUndefinedDeep(item)] as const)
      .filter(([, item]) => item !== undefined);

    if (!entries.length) return undefined;
    return Object.fromEntries(entries);
  }

  return sanitizeValue(value);
}

function getConnectionMethod(selectedType: LeadSourceType, integrationConfig: Record<string, any>): string | undefined {
  if (selectedType === "GOOGLE_ADS" || selectedType === "SOCIAL_MEDIA") {
    return integrationConfig.connection_method || "webhook";
  }
  if (selectedType === "WEBSITE") {
    return "webhook";
  }
  return undefined;
}

function getDefaultFieldMappingRows(selectedType: LeadSourceType): LeadFieldMappingRow[] {
  switch (selectedType) {
    case "GOOGLE_ADS":
      return [
        { form: "full_name", crm: "Full Name", transform: "None" },
        { form: "email", crm: "Email", transform: "Lowercase" },
        { form: "phone_number", crm: "Phone", transform: "Phone Format (E.164)" },
        { form: "campaign_name", crm: "Message/Notes", transform: "None" },
      ];
    case "SOCIAL_MEDIA":
      return [
        { form: "full_name", crm: "Full Name", transform: "None" },
        { form: "email", crm: "Email", transform: "Lowercase" },
        { form: "phone_number", crm: "Phone", transform: "Phone Format (E.164)" },
        { form: "street_address", crm: "Address Line 1", transform: "None" },
      ];
    case "WEBSITE":
    default:
      return [
        { form: "name", crm: "Full Name", transform: "None" },
        { form: "email", crm: "Email", transform: "Lowercase" },
        { form: "phone", crm: "Phone", transform: "Phone Format (E.164)" },
        { form: "address", crm: "Address Line 1", transform: "None" },
      ];
  }
}

export function buildLeadSourcePayload({
  selectedType,
  formData,
}: BuildLeadSourcePayloadArgs) {
  const nextIntegrationConfig = {
    ...(formData.integrationConfig || {}),
  };

  const fieldMappingRows: LeadFieldMappingRow[] =
    nextIntegrationConfig.field_mapping_rows
    || getDefaultFieldMappingRows(selectedType.type);

  const fieldMapping = rowsToFieldMapping(fieldMappingRows);
  const apiEndpoint = sanitizeValue(nextIntegrationConfig.api_endpoint);
  const connectionMethod = getConnectionMethod(selectedType.type, nextIntegrationConfig);

  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    nextIntegrationConfig.fieldMapping = fieldMapping;
  }

  nextIntegrationConfig.field_mapping_rows = fieldMappingRows;
  nextIntegrationConfig.connection_method = connectionMethod || nextIntegrationConfig.connection_method;

  const integrationStatus = (() => {
    if (apiEndpoint) return "CONNECTING";
    if (connectionMethod === "webhook") return "CONNECTED";
    if (selectedType.type === "WEBSITE" || selectedType.type === "EMAIL_CAMPAIGN") return "CONNECTED";
    return "DISCONNECTED";
  })();

  const payload = {
    integrationConfig: stripUndefinedDeep(nextIntegrationConfig),
    apiEndpoint: apiEndpoint || undefined,
    fieldMapping: Object.keys(fieldMapping).length ? fieldMapping : undefined,
    defaultValues: undefined,
    integrationStatus,
  };

  return payload;
}
