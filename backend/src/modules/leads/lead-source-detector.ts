import { LeadSourceType } from '@prisma/client';

export interface LeadSourceRequestMetadata {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  landingPageUrl?: string | null;
  referralParam?: string | null;
  formOrigin?: string | null;
  referrer?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}

export interface DetectedLeadSource {
  sourceName: string;
  sourceType: LeadSourceType;
  matchedBy: 'UTM' | 'FORM_ORIGIN' | 'REFERRAL' | 'DEFAULT';
  normalizedKey: string;
}

const REFERRAL_KEYS = ['ref', 'referral', 'partner', 'affiliate'];

function clean(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function valueFromHeader(
  headers: LeadSourceRequestMetadata['headers'],
  key: string
): string | null {
  if (!headers) return null;
  const raw = headers[key];
  if (Array.isArray(raw)) return clean(raw[0]);
  return clean(raw);
}

function toNormalizedKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'website';
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function parseUrl(urlLike?: string | null): URL | null {
  const value = clean(urlLike);
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    try {
      if (value.startsWith('/')) {
        return new URL(value, 'https://placeholder.local');
      }
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function queryParam(urlLike: string | null | undefined, keys: string[]): string | null {
  const url = parseUrl(urlLike);
  if (!url) return null;

  for (const key of keys) {
    const value = clean(url.searchParams.get(key));
    if (value) return value;
  }

  return null;
}

function classifySourceToken(token: string, medium?: string | null): {
  sourceType: LeadSourceType;
  sourceName: string;
} {
  const value = token.toLowerCase();
  const mediumValue = (medium || '').toLowerCase();

  if (
    value.includes('google') ||
    value.includes('adwords') ||
    value.includes('gads') ||
    mediumValue.includes('cpc') ||
    mediumValue.includes('ppc') ||
    mediumValue.includes('paid')
  ) {
    return { sourceType: 'GOOGLE_ADS', sourceName: 'Google Ads' };
  }

  if (
    value.includes('facebook') ||
    value.includes('instagram') ||
    value.includes('linkedin') ||
    value.includes('social') ||
    value.includes('tiktok') ||
    value.includes('youtube')
  ) {
    return { sourceType: 'SOCIAL_MEDIA', sourceName: 'Social Media' };
  }

  if (
    value.includes('referral') ||
    value.includes('partner') ||
    value.includes('affiliate') ||
    value.includes('wordofmouth') ||
    value.includes('word-of-mouth')
  ) {
    return { sourceType: 'REFERRAL', sourceName: 'Referral' };
  }

  if (value.includes('email') || value.includes('newsletter') || mediumValue.includes('email')) {
    return { sourceType: 'EMAIL_CAMPAIGN', sourceName: 'Email Campaign' };
  }

  if (value.includes('walk-in') || value.includes('walkin')) {
    return { sourceType: 'WALK_IN', sourceName: 'Walk-In' };
  }

  return { sourceType: 'WEBSITE', sourceName: titleCase(token) };
}

function classifyFormOrigin(origin: string): {
  sourceType: LeadSourceType;
  sourceName: string;
} {
  const token = origin.toLowerCase();

  if (token.includes('referral') || token.includes('partner') || token.includes('affiliate')) {
    return { sourceType: 'REFERRAL', sourceName: 'Referral' };
  }

  if (token.includes('google-ads') || token.includes('ppc') || token.includes('ad-')) {
    return { sourceType: 'GOOGLE_ADS', sourceName: 'Google Ads' };
  }

  if (token.includes('facebook') || token.includes('instagram') || token.includes('social')) {
    return { sourceType: 'SOCIAL_MEDIA', sourceName: 'Social Media' };
  }

  return { sourceType: 'WEBSITE', sourceName: 'Website' };
}

export function detectLeadSource(metadata: LeadSourceRequestMetadata): DetectedLeadSource {
  const headers = metadata.headers;
  const utmSource =
    clean(metadata.utmSource) ||
    valueFromHeader(headers, 'x-utm-source') ||
    queryParam(metadata.landingPageUrl, ['utm_source']) ||
    queryParam(metadata.referrer, ['utm_source']);
  const utmMedium =
    clean(metadata.utmMedium) ||
    valueFromHeader(headers, 'x-utm-medium') ||
    queryParam(metadata.landingPageUrl, ['utm_medium']) ||
    queryParam(metadata.referrer, ['utm_medium']);

  if (utmSource || utmMedium) {
    const token = utmSource || utmMedium || 'website';
    const mapped = classifySourceToken(token, utmMedium);
    return {
      sourceName: mapped.sourceName,
      sourceType: mapped.sourceType,
      matchedBy: 'UTM',
      normalizedKey: toNormalizedKey(token),
    };
  }

  const formOriginHeader = valueFromHeader(headers, 'x-form-origin');
  const landingPagePath = parseUrl(metadata.landingPageUrl)?.pathname;
  const formOrigin =
    clean(metadata.formOrigin) ||
    formOriginHeader ||
    clean(landingPagePath?.split('/').filter(Boolean).join('-')) ||
    valueFromHeader(headers, 'origin');

  if (formOrigin) {
    const mapped = classifyFormOrigin(formOrigin);
    return {
      sourceName: mapped.sourceName,
      sourceType: mapped.sourceType,
      matchedBy: 'FORM_ORIGIN',
      normalizedKey: toNormalizedKey(formOrigin),
    };
  }

  const referralValue =
    clean(metadata.referralParam) ||
    valueFromHeader(headers, 'x-referral') ||
    queryParam(metadata.landingPageUrl, REFERRAL_KEYS) ||
    queryParam(metadata.referrer, REFERRAL_KEYS) ||
    queryParam(metadata.referrer, ['utm_referral']);

  if (referralValue) {
    return {
      sourceName: 'Referral',
      sourceType: 'REFERRAL',
      matchedBy: 'REFERRAL',
      normalizedKey: toNormalizedKey(referralValue),
    };
  }

  return {
    sourceName: 'Website',
    sourceType: 'WEBSITE',
    matchedBy: 'DEFAULT',
    normalizedKey: 'website',
  };
}
