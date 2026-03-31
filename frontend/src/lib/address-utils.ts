const CANADIAN_PROVINCE_ENTRIES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
] as const;

export function normalizeProvinceCode(value: string | null | undefined): string {
  const normalized = (value || "").trim();
  if (!normalized) return "";

  const upper = normalized.toUpperCase();
  const exactCode = CANADIAN_PROVINCE_ENTRIES.find((entry) => entry.code === upper);
  if (exactCode) return exactCode.code;

  const exactName = CANADIAN_PROVINCE_ENTRIES.find((entry) => entry.name.toUpperCase() === upper);
  if (exactName) return exactName.code;

  return upper;
}

export function normalizeProvinceName(value: string | null | undefined): string {
  const normalized = (value || "").trim();
  if (!normalized) return "";

  const upper = normalized.toUpperCase();
  const exactCode = CANADIAN_PROVINCE_ENTRIES.find((entry) => entry.code === upper);
  if (exactCode) return exactCode.name;

  const exactName = CANADIAN_PROVINCE_ENTRIES.find((entry) => entry.name.toUpperCase() === upper);
  if (exactName) return exactName.name;

  return normalized;
}
