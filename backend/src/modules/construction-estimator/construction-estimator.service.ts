import { constructionEstimatorRepository } from './construction-estimator.repository';
import { logger } from '../../common/utils/logger';

class ConstructionEstimatorService {

    // ── Create draft estimate ──
    async create(tenantId: string, createdBy: string, body: any) {
        const data = {
            tenant: { connect: { id: tenantId } },
            createdBy,
            projectName: body.projectName || 'Untitled Estimate',
            projectType: body.projectType || 'RESIDENTIAL',
            address: body.address || '',
            formattedAddress: body.formattedAddress || body.address || '',
            placeId: body.placeId || null,
            latitude: body.latitude ? parseFloat(body.latitude) : null,
            longitude: body.longitude ? parseFloat(body.longitude) : null,
            city: body.city || null,
            postalCode: body.postalCode || null,
            country: body.country || 'CA',
            satelliteImageUrl: body.satelliteImageUrl || null,
            currency: body.currency || 'CAD',
            paymentTerms: body.paymentTerms || null,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
            taxPercent: body.taxPercent ?? 13,
            overheadPercent: body.overheadPercent ?? 10,
            profitPercent: body.profitPercent ?? 15,
            wastagePercent: body.wastagePercent ?? 5,
            clientNotes: body.clientNotes || null,
            internalNotes: body.internalNotes || null,
            termsAndConditions: body.termsAndConditions || null,
            clientId: body.clientId || null,
            leadId: body.leadId || null,
        };

        const estimate = await constructionEstimatorRepository.create(data as any);
        logger.info('[ConstructionEstimator] Created estimate', { id: estimate.id, tenantId });
        return estimate;
    }

    // ── Get by ID ──
    async getById(id: string, tenantId: string) {
        const est = await constructionEstimatorRepository.findById(id, tenantId);
        if (!est) throw new Error('Estimate not found');
        return est;
    }

    // ── List ──
    async getMany(tenantId: string, query: any) {
        return constructionEstimatorRepository.findMany(tenantId, {
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 20,
            status: query.status,
            search: query.search,
        });
    }

    // ── Full update (project details + line items + recalculate) ──
    async update(id: string, tenantId: string, body: any) {
        // Verify ownership
        const existing = await this.getById(id, tenantId);

        // 1. Update master fields
        const masterUpdate: any = {};
        const fields = [
            'projectName', 'projectType', 'status', 'currency', 'paymentTerms',
            'address', 'formattedAddress', 'placeId', 'latitude', 'longitude',
            'city', 'postalCode', 'country', 'satelliteImageUrl',
            'taxPercent', 'overheadPercent', 'profitPercent', 'wastagePercent',
            'miscellaneousCost', 'safetyEquipmentCost', 'contingencyBudget',
            'clientNotes', 'internalNotes', 'termsAndConditions',
            'clientId', 'leadId',
        ];
        for (const f of fields) {
            if (body[f] !== undefined) masterUpdate[f] = body[f];
        }
        if (body.startDate !== undefined) masterUpdate.startDate = body.startDate ? new Date(body.startDate) : null;
        if (body.endDate !== undefined) masterUpdate.endDate = body.endDate ? new Date(body.endDate) : null;

        // 2. Replace line items if provided
        if (Array.isArray(body.materials)) {
            const items = body.materials.map((m: any) => ({
                materialName: m.materialName || '',
                materialCategory: m.materialCategory || null,
                quantity: parseFloat(m.quantity) || 0,
                unit: m.unit || 'PCS',
                ratePerUnit: parseFloat(m.ratePerUnit) || 0,
                totalCost: (parseFloat(m.quantity) || 0) * (parseFloat(m.ratePerUnit) || 0),
                supplierName: m.supplierName || null,
                notes: m.notes || null,
            }));
            await constructionEstimatorRepository.replaceMaterials(id, items);
        }

        if (Array.isArray(body.labour)) {
            const items = body.labour.map((l: any) => {
                const workers = parseInt(l.numberOfWorkers) || 1;
                const days = parseInt(l.workingDays) || 1;
                const rate = parseFloat(l.ratePerDay) || 0;
                const otHours = parseFloat(l.overtimeHours) || 0;
                const otRate = parseFloat(l.overtimeRate) || 0;
                const baseCost = workers * days * rate;
                const overtimeCost = workers * otHours * otRate;
                return {
                    labourType: l.labourType || 'GENERAL',
                    description: l.description || null,
                    numberOfWorkers: workers,
                    workingDays: days,
                    hoursPerDay: parseFloat(l.hoursPerDay) || 8,
                    ratePerDay: rate,
                    overtimeHours: otHours,
                    overtimeRate: otRate,
                    baseCost,
                    overtimeCost,
                    totalCost: baseCost + overtimeCost,
                };
            });
            await constructionEstimatorRepository.replaceLabour(id, items);
        }

        if (Array.isArray(body.equipment)) {
            const items = body.equipment.map((e: any) => {
                const units = parseInt(e.numberOfUnits) || 1;
                const days = parseInt(e.durationDays) || 1;
                const cost = parseFloat(e.costPerDay) || 0;
                return {
                    equipmentName: e.equipmentName || '',
                    mode: e.mode || 'RENTAL',
                    numberOfUnits: units,
                    durationDays: days,
                    costPerDay: cost,
                    totalCost: units * days * cost,
                };
            });
            await constructionEstimatorRepository.replaceEquipment(id, items);
        }

        if (Array.isArray(body.transport)) {
            const items = body.transport.map((t: any) => {
                const trips = parseInt(t.numberOfTrips) || 1;
                const costPerTrip = parseFloat(t.costPerTrip) || 0;
                return {
                    transportType: t.transportType || '',
                    distance: parseFloat(t.distance) || null,
                    numberOfTrips: trips,
                    costPerTrip,
                    totalCost: trips * costPerTrip,
                };
            });
            await constructionEstimatorRepository.replaceTransport(id, items);
        }

        // 3. Update master then recalculate
        if (Object.keys(masterUpdate).length > 0) {
            await constructionEstimatorRepository.update(id, tenantId, masterUpdate);
        }

        return this.recalculate(id, tenantId);
    }

    // ── Recalculate totals ──
    async recalculate(id: string, tenantId: string) {
        const est = await this.getById(id, tenantId);

        const totalMaterialCost = (est.materials || []).reduce((s: number, m: any) => s + (m.totalCost || 0), 0);
        const totalLabourCost = (est.labour || []).reduce((s: number, l: any) => s + (l.totalCost || 0), 0);
        const totalEquipmentCost = (est.equipment || []).reduce((s: number, e: any) => s + (e.totalCost || 0), 0);
        const totalTransportCost = (est.transport || []).reduce((s: number, t: any) => s + (t.totalCost || 0), 0);

        const subtotal = totalMaterialCost + totalLabourCost + totalEquipmentCost + totalTransportCost;
        const taxAmount = subtotal * (est.taxPercent / 100);
        const overheadCost = subtotal * (est.overheadPercent / 100);
        const profitMargin = subtotal * (est.profitPercent / 100);
        const grandTotal = subtotal + taxAmount + overheadCost + profitMargin
            + (est.miscellaneousCost || 0) + (est.safetyEquipmentCost || 0) + (est.contingencyBudget || 0);

        return constructionEstimatorRepository.update(id, tenantId, {
            totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
            totalLabourCost: Math.round(totalLabourCost * 100) / 100,
            totalEquipmentCost: Math.round(totalEquipmentCost * 100) / 100,
            totalTransportCost: Math.round(totalTransportCost * 100) / 100,
            subtotal: Math.round(subtotal * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            overheadCost: Math.round(overheadCost * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100,
        });
    }

    // ── Save measurements ──
    async saveMeasurements(id: string, tenantId: string, body: any) {
        await this.getById(id, tenantId); // verify ownership
        const data = {
            roofArea: parseFloat(body.roofArea) || null,
            ridgeLength: parseFloat(body.ridgeLength) || null,
            valleyLength: parseFloat(body.valleyLength) || null,
            hipLength: parseFloat(body.hipLength) || null,
            eaveLength: parseFloat(body.eaveLength) || null,
            rakeLength: parseFloat(body.rakeLength) || null,
            pitch: body.pitch || null,
            facets: body.facets ? parseInt(body.facets) : null,
            roofPlanes: body.roofPlanes ? parseInt(body.roofPlanes) : null,
            totalPerimeter: parseFloat(body.totalPerimeter) || null,
            slopeChange: parseFloat(body.slopeChange) || null,
            stepFlashing: parseFloat(body.stepFlashing) || null,
            headwallFlashing: parseFloat(body.headwallFlashing) || null,
            source: body.source || 'manual',
            eagleViewOrderId: body.eagleViewOrderId || null,
            eagleViewReportId: body.eagleViewReportId || null,
        };
        await constructionEstimatorRepository.upsertMeasurements(id, data);
        return this.getById(id, tenantId);
    }

    // ── Delete ──
    async delete(id: string, tenantId: string) {
        await this.getById(id, tenantId);
        await constructionEstimatorRepository.delete(id, tenantId);
    }
}

export const constructionEstimatorService = new ConstructionEstimatorService();
