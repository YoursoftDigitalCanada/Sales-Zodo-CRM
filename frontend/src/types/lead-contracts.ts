import { CreateLeadSchema, type CreateLeadDto } from "@contracts/lead";
export { LeadStatus, LeadTemperature } from "@contracts/enums";
export type { LeadStatus, LeadTemperature } from "@contracts/enums";

export type CreateLeadPayload = CreateLeadDto;
export type UpdateLeadPayload = Partial<CreateLeadDto>;

/**
 * Contract-first payload sanitizer.
 * No UI field remapping is performed here; forms must already use backend contract field names.
 */
export function normalizeLeadPayload(formData: Record<string, unknown>): Partial<CreateLeadDto> {
  const parsed = CreateLeadSchema.partial().safeParse(formData);
  if (!parsed.success) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  ) as Partial<CreateLeadDto>;
}

