import { z } from "zod";

const PERSON_NAME_REGEX = /^[\p{L}]+(?:[.' -][\p{L}]+)*$/u;
const CANADIAN_POSTAL_CODE_REGEX =
  /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
const NANP_PHONE_REGEX = /^[2-9]\d{2}[2-9]\d{6}$/;

export const PERSON_NAME_VALIDATION_MESSAGE =
  "can only contain letters, spaces, apostrophes, periods, and hyphens.";
export const CANADIAN_PHONE_VALIDATION_MESSAGE =
  "Enter a valid Canadian phone number.";
export const EMAIL_VALIDATION_MESSAGE = "Enter a valid email address.";
export const CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE =
  "Enter a valid Canadian postal code (e.g. A1A 1A1).";

export function normalizeWhitespace(value?: string | null): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEmailAddress(value?: string | null): string {
  return normalizeWhitespace(value).toLowerCase();
}

export function normalizeCanadianPostalCode(value?: string | null): string {
  const normalized = normalizeWhitespace(value).toUpperCase().replace(/\s+/g, "");
  if (normalized.length !== 6) {
    return normalizeWhitespace(value).toUpperCase();
  }

  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

export function extractCanadianPhoneDigits(value?: string | null): string | null {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  if (digits.length === 10) {
    return digits;
  }

  return null;
}

export function isValidPersonName(value?: string | null): boolean {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 && PERSON_NAME_REGEX.test(normalized);
}

export function isValidFullName(value?: string | null): boolean {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return false;
  }

  const segments = normalized.split(/\s+/);
  return segments.length >= 2 && segments.every((segment) => PERSON_NAME_REGEX.test(segment));
}

export function isValidEmailAddress(value?: string | null): boolean {
  const normalized = normalizeEmailAddress(value);
  return normalized.length > 0 && z.string().email().safeParse(normalized).success;
}

export function isValidCanadianPhoneNumber(value?: string | null): boolean {
  const digits = extractCanadianPhoneDigits(value);
  return Boolean(digits && NANP_PHONE_REGEX.test(digits));
}

export function isValidCanadianPostalCode(value?: string | null): boolean {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 && CANADIAN_POSTAL_CODE_REGEX.test(normalized);
}

export function getPersonNameError(
  value: string | null | undefined,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return options.required ? `${label} is required.` : null;
  }

  if (!isValidPersonName(normalized)) {
    return `${label} ${PERSON_NAME_VALIDATION_MESSAGE}`;
  }

  return null;
}

export function getFullNameError(
  value: string | null | undefined,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return options.required ? `${label} is required.` : null;
  }

  if (!isValidFullName(normalized)) {
    return `${label} must include at least first and last name and cannot contain numbers.`;
  }

  return null;
}

export function getEmailAddressError(
  value: string | null | undefined,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  const normalized = normalizeEmailAddress(value);

  if (!normalized) {
    return options.required ? `${label} is required.` : null;
  }

  if (!isValidEmailAddress(normalized)) {
    return EMAIL_VALIDATION_MESSAGE;
  }

  return null;
}

export function getCanadianPhoneError(
  value: string | null | undefined,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return options.required ? `${label} is required.` : null;
  }

  if (!isValidCanadianPhoneNumber(normalized)) {
    return CANADIAN_PHONE_VALIDATION_MESSAGE;
  }

  return null;
}

export function getCanadianPostalCodeError(
  value: string | null | undefined,
  label: string,
  options: { required?: boolean } = {},
): string | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return options.required ? `${label} is required.` : null;
  }

  if (!isValidCanadianPostalCode(normalized)) {
    return CANADIAN_POSTAL_CODE_VALIDATION_MESSAGE;
  }

  return null;
}
