import type { NextFunction, Request, Response } from 'express';

function normalizeHeaderValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    return normalizeHeaderValue(value[0]);
  }

  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeTimeZone(value?: string): string | undefined {
  const candidate = normalizeHeaderValue(value);
  if (!candidate) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return undefined;
  }
}

function normalizeLocale(value?: string): string | undefined {
  const candidate = normalizeHeaderValue(value);
  if (!candidate) {
    return undefined;
  }

  try {
    return Intl.getCanonicalLocales(candidate)[0];
  } catch {
    return undefined;
  }
}

export function requestLocalization(req: Request, _res: Response, next: NextFunction): void {
  req.userTimezone = normalizeTimeZone(req.header('x-user-timezone'));
  req.userLocale = normalizeLocale(req.header('x-user-locale'));
  next();
}
