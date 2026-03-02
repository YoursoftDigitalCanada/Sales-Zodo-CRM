/**
 * Roof Calculator Utilities
 *
 * Pure functions for pitch conversion, area adjustment, linear measurement
 * estimation, labor hour calculation, and waste factor application.
 */

// ── Pitch Lookup Table ────────────────────────────────────────────────────
// Pitch ratio → surface area multiplier
// Source: standard roofing industry tables

const PITCH_MULTIPLIERS: Record<string, number> = {
    '0/12': 1.000,
    '1/12': 1.003,
    '2/12': 1.014,
    '3/12': 1.031,
    '4/12': 1.054,
    '5/12': 1.083,
    '6/12': 1.118,
    '7/12': 1.158,
    '8/12': 1.202,
    '9/12': 1.250,
    '10/12': 1.302,
    '11/12': 1.357,
    '12/12': 1.414,
    '13/12': 1.474,
    '14/12': 1.537,
    '15/12': 1.601,
    '16/12': 1.667,
    '17/12': 1.734,
    '18/12': 1.803,
};

/**
 * Convert a pitch string like "6/12" to its surface area multiplier.
 * Falls back to linear interpolation for non-standard pitches.
 */
export function pitchToMultiplier(pitch: string | null | undefined): number {
    if (!pitch) return 1.0;

    const trimmed = pitch.trim();
    if (PITCH_MULTIPLIERS[trimmed]) return PITCH_MULTIPLIERS[trimmed];

    // Try parsing "X/12"
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/);
    if (!match) return 1.0;

    const rise = parseFloat(match[1]);
    if (!Number.isFinite(rise) || rise < 0) return 1.0;

    // Exact formula: sqrt(1 + (rise/12)^2)
    return Math.sqrt(1 + (rise / 12) ** 2);
}

/**
 * Convert a pitch string like "6/12" to degrees.
 */
export function pitchToDegrees(pitch: string | null | undefined): number {
    if (!pitch) return 0;

    const match = pitch.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/);
    if (!match) return 0;

    const rise = parseFloat(match[1]);
    if (!Number.isFinite(rise) || rise < 0) return 0;

    return Math.round(Math.atan(rise / 12) * (180 / Math.PI) * 100) / 100;
}

/**
 * Convert plan (flat) area to true surface area using pitch multiplier.
 * This prevents the 10–20% material error caused by ignoring slope.
 */
export function planAreaToTrueArea(planAreaSqft: number, pitch: string | null | undefined): number {
    const multiplier = pitchToMultiplier(pitch);
    return Math.round(planAreaSqft * multiplier * 10) / 10;
}

/**
 * Estimate ridge length based on roof area and type.
 * Heuristic estimates for when AI doesn't detect ridges.
 */
export function estimateRidgeLength(areaSqft: number, roofType: string | null | undefined): number {
    const side = Math.sqrt(areaSqft);
    const type = (roofType || 'gable').toLowerCase();

    switch (type) {
        case 'hip':
            return Math.round(side * 0.35);
        case 'gable':
            return Math.round(side * 0.5);
        case 'flat':
            return 0;
        case 'mansard':
            return Math.round(side * 0.45);
        case 'gambrel':
            return Math.round(side * 0.5);
        case 'shed':
            return 0;
        default:
            return Math.round(side * 0.45);
    }
}

/**
 * Estimate hip length based on area and type.
 */
export function estimateHipLength(areaSqft: number, roofType: string | null | undefined): number {
    const type = (roofType || 'gable').toLowerCase();
    if (type !== 'hip') return 0;
    const side = Math.sqrt(areaSqft);
    return Math.round(side * 0.6);
}

/**
 * Estimate valley length based on area and type.
 */
export function estimateValleyLength(areaSqft: number, roofType: string | null | undefined): number {
    const type = (roofType || 'gable').toLowerCase();
    if (type === 'flat' || type === 'shed') return 0;
    const side = Math.sqrt(areaSqft);
    // Valleys are common in complex roofs; simple gable has 0
    if (type === 'gable') return 0;
    return Math.round(side * 0.3);
}

/**
 * Estimate eave length (perimeter along the drip edge).
 */
export function estimateEaveLength(areaSqft: number, roofType: string | null | undefined): number {
    const side = Math.sqrt(areaSqft);
    const type = (roofType || 'gable').toLowerCase();

    switch (type) {
        case 'hip':
            return Math.round(side * 2.4); // 4 eave sides
        case 'gable':
            return Math.round(side * 2.0); // 2 eave sides (long)
        case 'shed':
            return Math.round(side * 1.0); // 1 eave side
        case 'flat':
            return Math.round(side * 4.0); // full perimeter
        default:
            return Math.round(side * 2.2);
    }
}

/**
 * Estimate rake length (gable end edges).
 */
export function estimateRakeLength(areaSqft: number, roofType: string | null | undefined): number {
    const type = (roofType || 'gable').toLowerCase();
    if (type === 'hip' || type === 'flat') return 0;
    const side = Math.sqrt(areaSqft);
    return Math.round(side * 1.0); // 2 rakes
}

/**
 * Estimate labor hours for a roofing job.
 */
export function laborHoursEstimate(params: {
    areaSqft: number;
    pitch?: string | null;
    stories?: number;
    tearOff?: boolean;
    layers?: number;
}): number {
    const { areaSqft, pitch, stories = 1, tearOff = false, layers = 1 } = params;

    // Base: roughly 1 square (100 sqft) per crew-hour for install
    let hours = areaSqft / 100;

    // Pitch adjustment
    const degrees = pitchToDegrees(pitch);
    if (degrees > 30) hours *= 1.5;       // steep
    else if (degrees > 20) hours *= 1.2;  // moderate
    // else standard

    // Story adjustment
    if (stories >= 3) hours *= 1.4;
    else if (stories >= 2) hours *= 1.2;

    // Tear-off adds time
    if (tearOff) {
        const tearOffHours = (areaSqft / 100) * 0.5 * Math.max(layers, 1);
        hours += tearOffHours;
    }

    return Math.round(hours * 10) / 10;
}

/**
 * Apply waste factor to a quantity.
 */
export function applyWaste(quantity: number, wastePercent: number): { waste: number; total: number } {
    const factor = Math.max(0, wastePercent) / 100;
    const waste = Math.ceil(quantity * factor * 100) / 100;
    return {
        waste,
        total: Math.ceil((quantity + waste) * 100) / 100,
    };
}

/**
 * Calculate tear-off cost based on layers, area, and stories.
 */
export function calculateTearOffCost(params: {
    areaSqft: number;
    layers: number;
    stories: number;
    ratePerSquare?: number;  // per 100 sqft
    dumpsterCost?: number;
}): { laborCost: number; dumpsterCost: number; total: number } {
    const {
        areaSqft,
        layers,
        stories,
        ratePerSquare = 75,    // $75 per square default
        dumpsterCost = 450,     // $450 per dumpster default
    } = params;

    const squares = areaSqft / 100;
    let labor = squares * ratePerSquare * layers;

    // Height premium
    if (stories >= 2) labor *= 1.15;
    if (stories >= 3) labor *= 1.25;

    // Dumpsters needed: roughly 1 per 20 squares per layer
    const dumpsters = Math.ceil((squares * layers) / 20);

    return {
        laborCost: Math.round(labor),
        dumpsterCost: dumpsters * dumpsterCost,
        total: Math.round(labor) + dumpsters * dumpsterCost,
    };
}

/**
 * Calculate ventilation requirements per building code.
 * Rule: 1 sq ft net free area per 150 sq ft attic floor (1:150 ratio without baffles)
 * or 1:300 with balanced intake/exhaust.
 */
export function calculateVentilationNeeds(atticSqft: number): {
    netFreeAreaSqft: number;
    ridgeVentLinearFt: number;
    intakeVentCount: number;
} {
    // Using 1:150 ratio (conservative)
    const nfa = atticSqft / 150;

    // Ridge vent provides ~18 sq in NFA per linear foot = 0.125 sqft/ft
    const ridgeVentFt = Math.ceil(nfa / 0.125);

    // Intake: soffit vents ~50 sq in each = 0.347 sqft each
    const intakeVents = Math.ceil(nfa / 0.347);

    return {
        netFreeAreaSqft: Math.round(nfa * 100) / 100,
        ridgeVentLinearFt: ridgeVentFt,
        intakeVentCount: intakeVents,
    };
}
