/**
 * Material Takeoff Service
 *
 * Core engine for features 5 (smart takeoff), 6 (waste factor),
 * 9 (multi-scenario), 10 (cost + markup), 11 (accessories), 12 (tear-off).
 *
 * Auto-calculates quantities for all roofing materials based on
 * roof area, pitch, edge lengths, and configurable waste factors.
 */

import { PrismaClient } from '@prisma/client';
import {
    pitchToMultiplier,
    planAreaToTrueArea,
    estimateRidgeLength,
    estimateHipLength,
    estimateValleyLength,
    estimateEaveLength,
    estimateRakeLength,
    applyWaste,
    laborHoursEstimate,
    calculateTearOffCost,
    calculateVentilationNeeds,
} from './roof-calculator.utils';
import { logger } from '../../common/utils/logger';

const prisma = new PrismaClient();

// ── Default Material Specs (used when no supplier pricing exists) ─────────

interface DefaultMaterialSpec {
    description: string;
    category: string;
    unit: string;
    coveragePerUnit: number;
    defaultPrice: number;
    calcBasis: 'area' | 'ridge' | 'hip' | 'valley' | 'eave' | 'rake' | 'perimeter' | 'fixed' | 'vent';
    sortOrder: number;
}

const ASPHALT_DEFAULTS: DefaultMaterialSpec[] = [
    { description: '3-Tab / Architectural Shingles', category: 'shingles', unit: 'bundle', coveragePerUnit: 33.3, defaultPrice: 38, calcBasis: 'area', sortOrder: 1 },
    { description: 'Synthetic Underlayment', category: 'underlayment', unit: 'roll', coveragePerUnit: 1000, defaultPrice: 85, calcBasis: 'area', sortOrder: 2 },
    { description: 'Ice & Water Shield (eave)', category: 'ice_shield', unit: 'roll', coveragePerUnit: 75, defaultPrice: 110, calcBasis: 'eave', sortOrder: 3 },
    { description: 'Starter Strip', category: 'starter', unit: 'bundle', coveragePerUnit: 105, defaultPrice: 32, calcBasis: 'perimeter', sortOrder: 4 },
    { description: 'Ridge / Hip Cap Shingles', category: 'cap', unit: 'bundle', coveragePerUnit: 33, defaultPrice: 45, calcBasis: 'ridge', sortOrder: 5 },
    { description: 'Drip Edge (eave)', category: 'drip_edge', unit: 'piece', coveragePerUnit: 10, defaultPrice: 8, calcBasis: 'eave', sortOrder: 6 },
    { description: 'Drip Edge (rake)', category: 'drip_edge', unit: 'piece', coveragePerUnit: 10, defaultPrice: 8, calcBasis: 'rake', sortOrder: 7 },
    { description: 'Step Flashing', category: 'flashing', unit: 'piece', coveragePerUnit: 1, defaultPrice: 2.5, calcBasis: 'fixed', sortOrder: 8 },
    { description: 'Roofing Nails (coil)', category: 'nails', unit: 'box', coveragePerUnit: 250, defaultPrice: 45, calcBasis: 'area', sortOrder: 9 },
    { description: 'Pipe Boot (3")', category: 'boot', unit: 'each', coveragePerUnit: 1, defaultPrice: 18, calcBasis: 'fixed', sortOrder: 10 },
    { description: 'Ridge Vent', category: 'vent', unit: 'piece', coveragePerUnit: 4, defaultPrice: 14, calcBasis: 'ridge', sortOrder: 11 },
];

const METAL_DEFAULTS: DefaultMaterialSpec[] = [
    { description: 'Standing Seam Metal Panels', category: 'shingles', unit: 'panel', coveragePerUnit: 24, defaultPrice: 85, calcBasis: 'area', sortOrder: 1 },
    { description: 'Synthetic Underlayment', category: 'underlayment', unit: 'roll', coveragePerUnit: 1000, defaultPrice: 85, calcBasis: 'area', sortOrder: 2 },
    { description: 'Ice & Water Shield (eave)', category: 'ice_shield', unit: 'roll', coveragePerUnit: 75, defaultPrice: 110, calcBasis: 'eave', sortOrder: 3 },
    { description: 'Metal Ridge Cap', category: 'cap', unit: 'piece', coveragePerUnit: 10, defaultPrice: 28, calcBasis: 'ridge', sortOrder: 4 },
    { description: 'Metal Drip Edge', category: 'drip_edge', unit: 'piece', coveragePerUnit: 10, defaultPrice: 12, calcBasis: 'eave', sortOrder: 5 },
    { description: 'Metal Rake Trim', category: 'drip_edge', unit: 'piece', coveragePerUnit: 10, defaultPrice: 14, calcBasis: 'rake', sortOrder: 6 },
    { description: 'Metal Closure Strip', category: 'flashing', unit: 'piece', coveragePerUnit: 3, defaultPrice: 6, calcBasis: 'eave', sortOrder: 7 },
    { description: 'Metal Fasteners (bag)', category: 'nails', unit: 'bag', coveragePerUnit: 200, defaultPrice: 35, calcBasis: 'area', sortOrder: 8 },
    { description: 'Pipe Boot (metal)', category: 'boot', unit: 'each', coveragePerUnit: 1, defaultPrice: 35, calcBasis: 'fixed', sortOrder: 9 },
    { description: 'Ridge Vent (metal)', category: 'vent', unit: 'piece', coveragePerUnit: 4, defaultPrice: 22, calcBasis: 'ridge', sortOrder: 10 },
];

const TILE_DEFAULTS: DefaultMaterialSpec[] = [
    { description: 'Concrete / Clay Tile', category: 'shingles', unit: 'piece', coveragePerUnit: 1, defaultPrice: 5, calcBasis: 'area', sortOrder: 1 },
    { description: 'Tile Underlayment (2-ply)', category: 'underlayment', unit: 'roll', coveragePerUnit: 500, defaultPrice: 95, calcBasis: 'area', sortOrder: 2 },
    { description: 'Ice & Water Shield (eave)', category: 'ice_shield', unit: 'roll', coveragePerUnit: 75, defaultPrice: 110, calcBasis: 'eave', sortOrder: 3 },
    { description: 'Ridge Tile', category: 'cap', unit: 'piece', coveragePerUnit: 1, defaultPrice: 8, calcBasis: 'ridge', sortOrder: 4 },
    { description: 'Tile Fasteners (box)', category: 'nails', unit: 'box', coveragePerUnit: 100, defaultPrice: 55, calcBasis: 'area', sortOrder: 5 },
    { description: 'Hip Tile', category: 'cap', unit: 'piece', coveragePerUnit: 1, defaultPrice: 8, calcBasis: 'hip', sortOrder: 6 },
];

const TPO_DEFAULTS: DefaultMaterialSpec[] = [
    { description: 'TPO Membrane (60 mil)', category: 'shingles', unit: 'roll', coveragePerUnit: 500, defaultPrice: 550, calcBasis: 'area', sortOrder: 1 },
    { description: 'TPO Adhesive', category: 'underlayment', unit: 'bucket', coveragePerUnit: 200, defaultPrice: 120, calcBasis: 'area', sortOrder: 2 },
    { description: 'Insulation Board (polyiso)', category: 'underlayment', unit: 'sheet', coveragePerUnit: 32, defaultPrice: 45, calcBasis: 'area', sortOrder: 3 },
    { description: 'Metal Edge / Coping', category: 'drip_edge', unit: 'piece', coveragePerUnit: 10, defaultPrice: 18, calcBasis: 'perimeter', sortOrder: 4 },
    { description: 'Fasteners (box)', category: 'nails', unit: 'box', coveragePerUnit: 250, defaultPrice: 40, calcBasis: 'area', sortOrder: 5 },
];

const MATERIAL_DEFAULTS: Record<string, DefaultMaterialSpec[]> = {
    asphalt: ASPHALT_DEFAULTS,
    metal: METAL_DEFAULTS,
    tile: TILE_DEFAULTS,
    tpo: TPO_DEFAULTS,
};

const LABOR_RATES_PER_SQFT: Record<string, number> = {
    asphalt: 2.50,
    metal: 5.00,
    tile: 6.50,
    tpo: 3.50,
    cedar: 7.00,
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface TakeoffInput {
    estimateId: string;
    tenantId: string;
    materialType: string;
    scenarioName?: string;
    wasteFactor?: number;
    markupPercent?: number;
    customLaborRate?: number;
}

export interface TakeoffLineItem {
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    wasteFactor: number;
    wasteQuantity: number;
    totalQuantity: number;
    totalPrice: number;
    materialId?: string;
    sortOrder: number;
}

export interface TakeoffResult {
    scenarioName: string;
    materialType: string;
    wasteFactor: number;
    adjustedAreaSqft: number;
    items: TakeoffLineItem[];
    materialCost: number;
    accessoryCost: number;
    laborHours: number;
    laborCost: number;
    tearOffCost: number;
    subtotal: number;
    markupPercent: number;
    profit: number;
    totalPrice: number;
}

// ── Service ───────────────────────────────────────────────────────────────

export class MaterialTakeoffService {
    /**
     * Generate a full material takeoff for a given estimate and material type.
     */
    async generateTakeoff(input: TakeoffInput): Promise<TakeoffResult> {
        const { estimateId, tenantId, materialType, scenarioName, wasteFactor = 10, markupPercent = 20, customLaborRate } = input;

        // 1. Fetch the estimate
        const estimate = await prisma.roofEstimate.findFirst({
            where: { id: estimateId, tenantId },
        });
        if (!estimate) throw new Error('Estimate not found');

        // 2. Determine roof measurements
        const planArea = estimate.roofAreaSqft;
        const pitch = estimate.pitch;
        const trueArea = estimate.trueSurfaceAreaSqft || planAreaToTrueArea(planArea, pitch);
        const roofType = estimate.roofType;
        const stories = estimate.stories || 1;
        const layers = estimate.layers || 1;
        const tearOff = estimate.tearOffRequired;

        const ridge = estimate.ridgeLengthFt ?? estimateRidgeLength(trueArea, roofType);
        const hip = estimate.hipLengthFt ?? estimateHipLength(trueArea, roofType);
        const valley = estimate.valleyLengthFt ?? estimateValleyLength(trueArea, roofType);
        const eave = estimate.eaveLengthFt ?? estimateEaveLength(trueArea, roofType);
        const rake = estimate.rakeLengthFt ?? estimateRakeLength(trueArea, roofType);
        const perimeter = eave + rake;

        // 3. Try to load tenant's custom material pricing, fall back to defaults
        const tenantMaterials = await prisma.roofMaterial.findMany({
            where: { tenantId, category: { in: this.getCategoriesForType(materialType) }, isActive: true },
        });
        const materialMap = new Map(tenantMaterials.map(m => [`${m.category}:${m.name}`, m]));

        // 4. Build line items
        const specs = MATERIAL_DEFAULTS[materialType] || ASPHALT_DEFAULTS;
        const items: TakeoffLineItem[] = [];
        let materialCost = 0;
        let accessoryCost = 0;

        for (const spec of specs) {
            const rawQty = this.calculateQuantity(spec, trueArea, ridge, hip, valley, eave, rake, perimeter);
            if (rawQty <= 0) continue;

            // Check if tenant has custom pricing for this material
            const custom = this.findCustomMaterial(materialMap, spec);
            const unitPrice = custom?.defaultPrice ?? spec.defaultPrice;
            const coveragePerUnit = custom?.coveragePerUnit ?? spec.coveragePerUnit;
            const unit = custom?.unit ?? spec.unit;

            const unitsNeeded = spec.calcBasis === 'fixed'
                ? rawQty
                : Math.ceil(rawQty / coveragePerUnit);

            const { waste: wasteQty, total: totalQty } = applyWaste(unitsNeeded, wasteFactor);
            const lineTotal = Math.round(totalQty * unitPrice * 100) / 100;

            const isAccessory = ['boot', 'vent', 'flashing', 'snow_guard'].includes(spec.category);
            if (isAccessory) accessoryCost += lineTotal;
            else materialCost += lineTotal;

            items.push({
                description: spec.description,
                category: spec.category,
                quantity: unitsNeeded,
                unit,
                unitPrice,
                wasteFactor,
                wasteQuantity: wasteQty,
                totalQuantity: totalQty,
                totalPrice: lineTotal,
                materialId: custom?.id,
                sortOrder: spec.sortOrder,
            });
        }

        // 5. Snow guards (if applicable — for metal/tile, add automatically)
        if (['metal', 'tile'].includes(materialType) && eave > 0) {
            const snowGuardCount = Math.ceil(eave / 2); // 1 every 2ft along eave
            const snowGuardPrice = materialType === 'metal' ? 8 : 6;
            const { waste: sgWaste, total: sgTotal } = applyWaste(snowGuardCount, wasteFactor);
            const sgLineTotal = Math.round(sgTotal * snowGuardPrice * 100) / 100;
            accessoryCost += sgLineTotal;

            items.push({
                description: 'Snow Guards',
                category: 'snow_guard',
                quantity: snowGuardCount,
                unit: 'each',
                unitPrice: snowGuardPrice,
                wasteFactor,
                wasteQuantity: sgWaste,
                totalQuantity: sgTotal,
                totalPrice: sgLineTotal,
                sortOrder: 20,
            });
        }

        // 6. Labor calculation
        const baseLaborRate = customLaborRate ?? (LABOR_RATES_PER_SQFT[materialType] || 2.50);
        const hours = laborHoursEstimate({
            areaSqft: trueArea,
            pitch,
            stories,
            tearOff,
            layers,
        });
        const laborCostTotal = Math.round(trueArea * baseLaborRate * 100) / 100;

        // 7. Tear-off cost
        let tearOffTotal = 0;
        if (tearOff) {
            const tearOffResult = calculateTearOffCost({ areaSqft: trueArea, layers, stories });
            tearOffTotal = tearOffResult.total;
        }

        // 8. Totals
        const subtotal = materialCost + accessoryCost + laborCostTotal + tearOffTotal;
        const profit = Math.round(subtotal * (markupPercent / 100) * 100) / 100;
        const totalPrice = Math.round((subtotal + profit) * 100) / 100;

        // 9. Apply waste to area
        const adjustedArea = Math.round(trueArea * (1 + wasteFactor / 100) * 10) / 10;

        const result: TakeoffResult = {
            scenarioName: scenarioName || `${materialType.charAt(0).toUpperCase() + materialType.slice(1)} Standard`,
            materialType,
            wasteFactor,
            adjustedAreaSqft: adjustedArea,
            items,
            materialCost: Math.round(materialCost * 100) / 100,
            accessoryCost: Math.round(accessoryCost * 100) / 100,
            laborHours: hours,
            laborCost: laborCostTotal,
            tearOffCost: tearOffTotal,
            subtotal: Math.round(subtotal * 100) / 100,
            markupPercent,
            profit,
            totalPrice,
        };

        logger.info('Takeoff generated', {
            estimateId,
            materialType,
            totalPrice,
            itemCount: items.length,
        });

        return result;
    }

    /**
     * Generate multiple material scenarios for side-by-side comparison.
     */
    async generateScenarios(
        estimateId: string,
        tenantId: string,
        materialTypes: string[],
        wasteFactor?: number,
        markupPercent?: number,
    ): Promise<TakeoffResult[]> {
        const results: TakeoffResult[] = [];
        for (const materialType of materialTypes) {
            const takeoff = await this.generateTakeoff({
                estimateId,
                tenantId,
                materialType,
                wasteFactor,
                markupPercent,
            });
            results.push(takeoff);
        }
        return results;
    }

    /**
     * Save a takeoff result to database.
     */
    async saveTakeoff(tenantId: string, estimateId: string, result: TakeoffResult): Promise<string> {
        const takeoff = await prisma.roofTakeoff.create({
            data: {
                estimateId,
                tenantId,
                scenarioName: result.scenarioName,
                materialType: result.materialType,
                wasteFactor: result.wasteFactor,
                adjustedAreaSqft: result.adjustedAreaSqft,
                laborRatePerSqft: result.laborCost / (result.adjustedAreaSqft || 1),
                laborHours: result.laborHours,
                laborCost: result.laborCost,
                materialCost: result.materialCost,
                accessoryCost: result.accessoryCost,
                tearOffCost: result.tearOffCost,
                subtotal: result.subtotal,
                markupPercent: result.markupPercent,
                profit: result.profit,
                totalPrice: result.totalPrice,
                items: {
                    create: result.items.map(item => ({
                        description: item.description,
                        category: item.category,
                        quantity: item.quantity,
                        unit: item.unit,
                        unitPrice: item.unitPrice,
                        wasteFactor: item.wasteFactor,
                        wasteQuantity: item.wasteQuantity,
                        totalQuantity: item.totalQuantity,
                        totalPrice: item.totalPrice,
                        materialId: item.materialId || null,
                        sortOrder: item.sortOrder,
                    })),
                },
            },
        });

        return takeoff.id;
    }

    /**
     * Get all takeoffs for an estimate (for scenario comparison).
     */
    async getTakeoffsByEstimate(estimateId: string, tenantId: string) {
        return prisma.roofTakeoff.findMany({
            where: { estimateId, tenantId },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Delete a takeoff.
     */
    async deleteTakeoff(id: string, tenantId: string) {
        const existing = await prisma.roofTakeoff.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Takeoff not found');
        return prisma.roofTakeoff.delete({ where: { id } });
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private calculateQuantity(
        spec: DefaultMaterialSpec,
        area: number,
        ridge: number,
        hip: number,
        valley: number,
        eave: number,
        rake: number,
        perimeter: number,
    ): number {
        switch (spec.calcBasis) {
            case 'area': return area;
            case 'ridge': return ridge + hip; // ridge cap covers both
            case 'hip': return hip;
            case 'valley': return valley;
            case 'eave': return eave;
            case 'rake': return rake;
            case 'perimeter': return perimeter;
            case 'fixed':
                // Fixed items (pipe boots, step flashing)
                if (spec.category === 'boot') return 3;          // average 3 pipe boots
                if (spec.category === 'flashing') return Math.ceil(perimeter * 0.1); // ~10% of perimeter
                return 1;
            case 'vent': return ridge;
            default: return 0;
        }
    }

    private getCategoriesForType(materialType: string): string[] {
        const base = ['shingles', 'underlayment', 'ice_shield', 'starter', 'cap', 'drip_edge', 'flashing', 'nails', 'boot', 'vent'];
        if (materialType === 'metal') base.push('snow_guard');
        if (materialType === 'tile') base.push('snow_guard');
        return base;
    }

    private findCustomMaterial(
        materialMap: Map<string, { id: string; defaultPrice: number; coveragePerUnit: number; unit: string }>,
        spec: DefaultMaterialSpec,
    ) {
        // Try exact match first
        const key = `${spec.category}:${spec.description}`;
        if (materialMap.has(key)) return materialMap.get(key);

        // Try category-only match
        for (const [k, v] of materialMap) {
            if (k.startsWith(`${spec.category}:`)) return v;
        }

        return undefined;
    }
}

export const materialTakeoffService = new MaterialTakeoffService();
