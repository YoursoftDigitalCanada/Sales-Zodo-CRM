/**
 * Material Calculator Service
 *
 * Deterministic roofing material calculator using EagleView roof geometry.
 * No external API calls — pure math.
 *
 * Formulas:
 *   Shingles (SQ)         = ceil(areaSq × (1 + wasteFactor))
 *   Underlayment (rolls)  = ceil(totalSqFt / rollCoverage)
 *   Ridge Cap (bundles)    = ceil((ridgeLen + hipLen) / bundleCoverage)
 *   Starter Strip (bundles)= ceil((eaveLen + rakeLen) / bundleCoverage)
 *   Ice & Water (rolls)    = ceil((valleyLen + eaveLen) / rollCoverage)
 *   Drip Edge (pieces)     = ceil((eaveLen + rakeLen) / pieceCoverage)
 *   Labor                  = squares × laborRate
 */

import { logger } from '../../common/utils/logger';

// ── Types ────────────────────────────────────────────────────────────────

export interface RoofGeometry {
    totalAreaSq: number;        // Total roof area in roofing squares (1 SQ = 100 sq ft)
    totalAreaSqFt?: number;     // Total roof area in sq ft (if provided instead of SQ)
    pitch?: string;             // e.g. "6/12"
    ridgeLengthFt: number;
    hipLengthFt?: number;
    valleyLengthFt: number;
    eaveLengthFt: number;
    rakeLengthFt: number;
    roofPlanes?: number;
}

export type RoofComplexity = 'simple' | 'medium' | 'complex';

export interface MaterialPricing {
    shinglePerSq?: number;         // default $140
    underlaymentPerRoll?: number;  // default $90
    ridgeCapPerBundle?: number;    // default $45
    starterPerBundle?: number;     // default $40
    iceShieldPerRoll?: number;     // default $95
    dripEdgePerPiece?: number;     // default $12
    laborPerSq?: number;           // default $120
    removalPerSq?: number;         // default $30
}

export interface MaterialLineItem {
    item: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
}

export interface MaterialEstimate {
    // Summary
    roofAreaSq: number;
    roofAreaSqFt: number;
    wasteFactor: number;
    adjustedSq: number;
    complexity: RoofComplexity;
    pitch: string;

    // Line items
    materials: MaterialLineItem[];

    // Totals
    materialCost: number;
    laborCost: number;
    removalCost: number;
    subtotal: number;
    tax: number;         // 13% HST default
    totalEstimate: number;

    // Metadata
    roofPlanes: number;
    ridgeLengthFt: number;
    valleyLengthFt: number;
    eaveLengthFt: number;
    rakeLengthFt: number;
    hipLengthFt: number;
}

// ── Default Pricing ──────────────────────────────────────────────────────

const DEFAULT_PRICING: Required<MaterialPricing> = {
    shinglePerSq: 140,
    underlaymentPerRoll: 90,
    ridgeCapPerBundle: 45,
    starterPerBundle: 40,
    iceShieldPerRoll: 95,
    dripEdgePerPiece: 12,
    laborPerSq: 120,
    removalPerSq: 30,
};

// Coverage constants
const UNDERLAYMENT_ROLL_SQFT = 1000;
const RIDGE_CAP_BUNDLE_FT = 20;
const STARTER_BUNDLE_FT = 120;
const ICE_SHIELD_ROLL_FT = 75;
const DRIP_EDGE_PIECE_FT = 10;
const TAX_RATE = 0.13; // 13% HST (Ontario/BC)

// Waste factors by complexity
const WASTE_FACTORS: Record<RoofComplexity, number> = {
    simple: 0.07,
    medium: 0.10,
    complex: 0.15,
};

// ── Service ──────────────────────────────────────────────────────────────

class MaterialCalculatorService {

    /**
     * Determine roof complexity from facet count.
     */
    determineComplexity(roofPlanes: number): RoofComplexity {
        if (roofPlanes <= 6) return 'simple';
        if (roofPlanes <= 15) return 'medium';
        return 'complex';
    }

    /**
     * Parse EagleView area string (e.g. "34741 sq. ft") into a number.
     */
    parseArea(areaStr: string | number | undefined): number {
        if (typeof areaStr === 'number') return areaStr;
        if (!areaStr) return 0;
        const cleaned = String(areaStr).replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Parse EagleView length string (e.g. "638 ft") into a number.
     */
    parseLength(lengthStr: string | number | undefined): number {
        if (typeof lengthStr === 'number') return lengthStr;
        if (!lengthStr) return 0;
        const cleaned = String(lengthStr).replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Main calculation: takes roof geometry + optional pricing overrides,
     * returns a complete material estimate.
     */
    calculate(geometry: RoofGeometry, pricing?: MaterialPricing, taxRate?: number): MaterialEstimate {
        const p = { ...DEFAULT_PRICING, ...pricing };
        const tax = taxRate ?? TAX_RATE;

        // Determine area in both SQ and sq ft
        let areaSqFt: number;
        let areaSq: number;

        if (geometry.totalAreaSqFt && geometry.totalAreaSqFt > 0) {
            areaSqFt = geometry.totalAreaSqFt;
            areaSq = areaSqFt / 100;
        } else {
            areaSq = geometry.totalAreaSq;
            areaSqFt = areaSq * 100;
        }

        const roofPlanes = geometry.roofPlanes || 1;
        const complexity = this.determineComplexity(roofPlanes);
        const wasteFactor = WASTE_FACTORS[complexity];
        const adjustedSq = Math.ceil(areaSq * (1 + wasteFactor));

        const ridgeLen = geometry.ridgeLengthFt || 0;
        const hipLen = geometry.hipLengthFt || 0;
        const valleyLen = geometry.valleyLengthFt || 0;
        const eaveLen = geometry.eaveLengthFt || 0;
        const rakeLen = geometry.rakeLengthFt || 0;

        // ── Material Quantities ──────────────────────────────────

        const shingleQty = adjustedSq;
        const underlaymentQty = Math.ceil((adjustedSq * 100) / UNDERLAYMENT_ROLL_SQFT);
        const ridgeCapQty = Math.ceil((ridgeLen + hipLen) / RIDGE_CAP_BUNDLE_FT);
        const starterQty = Math.ceil((eaveLen + rakeLen) / STARTER_BUNDLE_FT);
        const iceShieldQty = Math.ceil((valleyLen + eaveLen) / ICE_SHIELD_ROLL_FT);
        const dripEdgeQty = Math.ceil((eaveLen + rakeLen) / DRIP_EDGE_PIECE_FT);

        // ── Line Items ───────────────────────────────────────────

        const materials: MaterialLineItem[] = [
            {
                item: 'Shingles',
                description: `${areaSq.toFixed(1)} SQ + ${(wasteFactor * 100).toFixed(0)}% waste`,
                quantity: shingleQty,
                unit: 'squares',
                unitPrice: p.shinglePerSq,
                total: shingleQty * p.shinglePerSq,
            },
            {
                item: 'Underlayment',
                description: `Synthetic underlayment — ${UNDERLAYMENT_ROLL_SQFT} sq ft/roll`,
                quantity: underlaymentQty,
                unit: 'rolls',
                unitPrice: p.underlaymentPerRoll,
                total: underlaymentQty * p.underlaymentPerRoll,
            },
            {
                item: 'Ridge Cap',
                description: `Ridge (${ridgeLen} ft) + Hip (${hipLen} ft) — ${RIDGE_CAP_BUNDLE_FT} ft/bundle`,
                quantity: ridgeCapQty,
                unit: 'bundles',
                unitPrice: p.ridgeCapPerBundle,
                total: ridgeCapQty * p.ridgeCapPerBundle,
            },
            {
                item: 'Starter Strip',
                description: `Eaves (${eaveLen} ft) + Rakes (${rakeLen} ft) — ${STARTER_BUNDLE_FT} ft/bundle`,
                quantity: starterQty,
                unit: 'bundles',
                unitPrice: p.starterPerBundle,
                total: starterQty * p.starterPerBundle,
            },
            {
                item: 'Ice & Water Shield',
                description: `Valleys (${valleyLen} ft) + Eaves (${eaveLen} ft) — ${ICE_SHIELD_ROLL_FT} ft/roll`,
                quantity: iceShieldQty,
                unit: 'rolls',
                unitPrice: p.iceShieldPerRoll,
                total: iceShieldQty * p.iceShieldPerRoll,
            },
            {
                item: 'Drip Edge',
                description: `Eaves (${eaveLen} ft) + Rakes (${rakeLen} ft) — ${DRIP_EDGE_PIECE_FT} ft/piece`,
                quantity: dripEdgeQty,
                unit: 'pieces',
                unitPrice: p.dripEdgePerPiece,
                total: dripEdgeQty * p.dripEdgePerPiece,
            },
        ];

        // ── Costs ────────────────────────────────────────────────

        const materialCost = materials.reduce((sum, m) => sum + m.total, 0);
        const laborCost = adjustedSq * p.laborPerSq;
        const removalCost = adjustedSq * p.removalPerSq;

        const subtotal = materialCost + laborCost + removalCost;
        const taxAmount = Math.round(subtotal * tax * 100) / 100;
        const totalEstimate = Math.round((subtotal + taxAmount) * 100) / 100;

        logger.info('[MaterialCalculator] Estimate calculated', {
            areaSq,
            adjustedSq,
            complexity,
            materialCost,
            laborCost,
            totalEstimate,
        });

        return {
            roofAreaSq: areaSq,
            roofAreaSqFt: areaSqFt,
            wasteFactor,
            adjustedSq,
            complexity,
            pitch: geometry.pitch || 'unknown',
            materials,
            materialCost,
            laborCost,
            removalCost,
            subtotal,
            tax: taxAmount,
            totalEstimate,
            roofPlanes,
            ridgeLengthFt: ridgeLen,
            valleyLengthFt: valleyLen,
            eaveLengthFt: eaveLen,
            rakeLengthFt: rakeLen,
            hipLengthFt: hipLen,
        };
    }

    /**
     * Convenience: takes raw EagleView report strings and calculates.
     */
    calculateFromEagleView(report: {
        area?: string | number;
        pitch?: string;
        lengthRidge?: string | number;
        lengthHip?: string | number;
        lengthValley?: string | number;
        lengthEave?: string | number;
        lengthRake?: string | number;
        totalRoofFacets?: string | number;
    }, pricing?: MaterialPricing): MaterialEstimate {
        const geometry: RoofGeometry = {
            totalAreaSq: 0,
            totalAreaSqFt: this.parseArea(report.area),
            pitch: report.pitch,
            ridgeLengthFt: this.parseLength(report.lengthRidge),
            hipLengthFt: this.parseLength(report.lengthHip),
            valleyLengthFt: this.parseLength(report.lengthValley),
            eaveLengthFt: this.parseLength(report.lengthEave),
            rakeLengthFt: this.parseLength(report.lengthRake),
            roofPlanes: typeof report.totalRoofFacets === 'number'
                ? report.totalRoofFacets
                : parseInt(String(report.totalRoofFacets), 10) || 1,
        };

        return this.calculate(geometry, pricing);
    }
}

export const materialCalculatorService = new MaterialCalculatorService();
