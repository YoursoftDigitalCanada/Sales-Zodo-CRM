// src/modules/tenants/business-type.ts
// ============================================================================
// BUSINESS TYPE ENUM + INDUSTRY MAPPING
//
// Canonical list of business types used by:
//   — Tenant.settings.businessType
//   — BusinessTypeInsightEngine (analytics)
//   — Frontend onboarding (industry → businessType mapping)
//
// Frontend Onboarding has 16 industry options. This layer maps them
// to the 8 engine strategies to keep AI logic clean.
// ============================================================================

import { z } from 'zod';

/**
 * Supported business types for the AI insight engine.
 * These are the canonical values stored in Tenant.settings.businessType.
 */
export const BUSINESS_TYPES = [
    'roofing',
    'clinic',
    'salon',
    'agency',
    'technology',
    'saas',
    'ecommerce',
    'realestate',
    'manufacturing',
    'consulting',
    'retail',
    'hospitality',
    'healthcare',
    'marketing',
    'general',
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

/**
 * Zod schema for validating businessType.
 * Accepts any value in BUSINESS_TYPES; rejects unknown strings.
 */
export const businessTypeSchema = z.enum(BUSINESS_TYPES);

/**
 * Maps frontend onboarding industry IDs (16 options) to canonical
 * BusinessType values used by the insight engine.
 *
 * Frontend IDs that match a BusinessType directly are passed through.
 * Others are mapped to the closest engine strategy.
 */
export const INDUSTRY_TO_BUSINESS_TYPE: Record<string, BusinessType> = {
    // Direct matches
    technology: 'technology',
    saas: 'saas',
    ecommerce: 'ecommerce',
    realestate: 'realestate',
    manufacturing: 'manufacturing',
    retail: 'retail',
    hospitality: 'hospitality',
    consulting: 'consulting',

    // Mapped to closest strategy
    marketing: 'marketing',       // → agency strategy in engine
    finance: 'agency',            // finance firms → agency-style insights
    healthcare: 'healthcare',     // → clinic strategy in engine
    education: 'agency',          // education orgs → agency/project-style
    logistics: 'manufacturing',   // logistics → manufacturing strategy
    media: 'agency',              // media → agency/project-style
    nonprofit: 'general',         // nonprofit → general insights
    other: 'general',             // catch-all

    // Legacy / direct aliases
    roofing: 'roofing',
    clinic: 'clinic',
    salon: 'salon',
    agency: 'agency',
    general: 'general',
};

/**
 * Normalizes any industry string to a valid BusinessType.
 * Returns 'general' for unknown values.
 */
export function normalizeBusinessType(input: string | null | undefined): BusinessType {
    if (!input) return 'general';
    const normalized = input.toLowerCase().trim();
    return INDUSTRY_TO_BUSINESS_TYPE[normalized] || 'general';
}
