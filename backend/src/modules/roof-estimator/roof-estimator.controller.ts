import { Request, Response, NextFunction } from 'express';
import { roofEstimatorService } from './roof-estimator.service';
import { roofEstimatorManager } from './roof-estimator.manager';
import { materialTakeoffService } from './material-takeoff.service';
import { roofEstimatorRepository } from './roof-estimator.repository';
import { nearmapService } from './nearmap.service';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import {
    CreateEstimateDto, UpdateEstimateDto, UpdateSettingsDto,
    ManualEntryDto, CreateMaterialDto, UpdateMaterialDto,
    CreateLaborRateDto, UpdateLaborRateDto,
    CalculateAreaDto, CalculateLaborDto, CalculateTotalDto,
    GenerateTakeoffDto, GenerateScenariosDto,
} from './roof-estimator.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import {
    planAreaToTrueArea,
    pitchToDegrees,
    laborHoursEstimate,
    calculateTearOffCost,
} from './roof-calculator.utils';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class RoofEstimatorController {
    // ── Address & Satellite (existing) ─────────────────────────────────────

    async autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const input = req.query.input as string;
            if (!input || input.length < 3) {
                sendSuccess(res, [], 'Type at least 3 characters');
                return;
            }
            const suggestions = await roofEstimatorService.autocompleteAddress(input);
            sendSuccess(res, suggestions, 'Address suggestions');
        } catch (error) {
            next(error);
        }
    }

    async getPlaceDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { placeId } = req.body;
            const details = await roofEstimatorService.getPlaceDetails(placeId);
            sendSuccess(res, details, 'Place details retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getSatellite(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { address, placeId } = req.body;
            const result = await roofEstimatorManager.getSatellite(tenantId, address, placeId);
            sendSuccess(res, result, 'Satellite image retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getParcelBoundary(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { latitude, longitude } = req.body;
            const result = await roofEstimatorService.getParcelBoundary(latitude, longitude);
            sendSuccess(res, result, result.parcelPolygon
                ? 'Parcel boundary retrieved'
                : 'Parcel boundary not available for this location');
        } catch (error) {
            next(error);
        }
    }

    async detectRoof(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { satelliteImageUrl, latitude, longitude } = req.body;
            const result = await roofEstimatorManager.detectRoof(tenantId, satelliteImageUrl, latitude, longitude);
            sendSuccess(res, result, 'Roof detection completed');
        } catch (error) {
            next(error);
        }
    }

    // ── Nearmap AI Extraction ─────────────────────────────────────────────

    async nearmapExtract(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { clientId, address, latitude, longitude, forceRefresh } = req.body;

            // Validate client exists
            const client = await prisma.client.findFirst({
                where: { id: clientId, tenantId },
            });
            if (!client) {
                throw new NotFoundError('Client not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }

            // Geocode address if lat/lng not provided
            let lat = latitude;
            let lng = longitude;

            if (!lat || !lng) {
                if (!address) {
                    res.status(400).json({
                        success: false,
                        message: 'Either address or latitude/longitude is required',
                    });
                    return;
                }
                const geo = await roofEstimatorService.geocodeAddressWithFallback(address, 'nearmap-extract');
                lat = geo.lat;
                lng = geo.lng;
            }

            // Call Nearmap service (with caching)
            const result = await nearmapService.extract({
                clientId,
                tenantId,
                address: address || client.streetAddress || undefined,
                latitude: lat,
                longitude: lng,
                forceRefresh: forceRefresh || false,
            });

            sendSuccess(res, {
                cached: result.cached,
                roofData: result.data,
            }, result.cached ? 'Cached roof data returned' : 'Nearmap extraction completed');
        } catch (error) {
            next(error);
        }
    }

    async getRoofData(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { clientId } = req.params;

            const roofData = await prisma.roofData.findMany({
                where: { clientId, tenantId },
                orderBy: { createdAt: 'desc' },
            });

            sendSuccess(res, roofData, `Found ${roofData.length} roof data records`);
        } catch (error) {
            next(error);
        }
    }

    async checkNearmapCoverage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { latitude, longitude } = req.query;

            const lat = Number(latitude);
            const lng = Number(longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid latitude and longitude query params required',
                });
                return;
            }

            const coverage = await nearmapService.checkCoverage(lat, lng);

            sendSuccess(res, coverage, coverage.hasCoverage
                ? `Nearmap AI coverage available (survey: ${coverage.latestSurveyDate || 'unknown'})`
                : 'No Nearmap AI coverage at this location'
            );
        } catch (error) {
            next(error);
        }
    }

    // ── F3: Manual Dimension + Pitch Entry ─────────────────────────────────

    async manualEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const createdBy = req.user!.employeeId || req.user!.userId;
            const data = sanitizeBody<ManualEntryDto>(req.body);

            const trueSurface = planAreaToTrueArea(data.roofAreaSqft, data.pitch);

            const estimate = await roofEstimatorManager.createEstimate(req, tenantId, {
                ...data,
                confidence: 100,
                pricePerSqft: 0,
                totalEstimate: 0,
                aiModel: 'manual',
                measurementSource: 'manual',
                trueSurfaceAreaSqft: trueSurface,
                pitchDegrees: pitchToDegrees(data.pitch),
            } as any, createdBy);

            sendCreated(res, estimate, 'Manual estimate created');
        } catch (error) {
            next(error);
        }
    }

    // ── F4: Pitch-Adjusted True Surface Area ───────────────────────────────

    async calculateArea(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roofAreaSqft, pitch } = req.body as CalculateAreaDto;
            const trueArea = planAreaToTrueArea(roofAreaSqft, pitch);
            const pitchDeg = pitchToDegrees(pitch);

            sendSuccess(res, {
                planAreaSqft: roofAreaSqft,
                pitch,
                pitchDegrees: pitchDeg,
                trueSurfaceAreaSqft: trueArea,
                multiplier: Math.round((trueArea / roofAreaSqft) * 1000) / 1000,
            }, 'Pitch-adjusted area calculated');
        } catch (error) {
            next(error);
        }
    }

    // ── F5 & F9: Material Takeoff & Scenarios ──────────────────────────────

    async generateTakeoff(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<GenerateTakeoffDto>(req.body);

            const result = await materialTakeoffService.generateTakeoff({
                ...data,
                tenantId,
            });

            // Save to DB
            const takeoffId = await materialTakeoffService.saveTakeoff(tenantId, data.estimateId, result);

            sendCreated(res, { takeoffId, ...result }, 'Material takeoff generated');
        } catch (error) {
            next(error);
        }
    }

    async generateScenarios(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<GenerateScenariosDto>(req.body);

            const results = await materialTakeoffService.generateScenarios(
                data.estimateId,
                tenantId,
                data.materialTypes,
                data.wasteFactor,
                data.markupPercent,
            );

            // Save all scenarios
            for (const result of results) {
                await materialTakeoffService.saveTakeoff(tenantId, data.estimateId, result);
            }

            sendCreated(res, results, 'Material scenarios generated');
        } catch (error) {
            next(error);
        }
    }

    async getTakeoffsByEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { estimateId } = req.params;
            const takeoffs = await materialTakeoffService.getTakeoffsByEstimate(estimateId, tenantId);
            sendSuccess(res, takeoffs);
        } catch (error) {
            next(error);
        }
    }

    async deleteTakeoff(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            await materialTakeoffService.deleteTakeoff(id, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // ── F7: Labor Hours & Cost Calculator ──────────────────────────────────

    async calculateLabor(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = sanitizeBody<CalculateLaborDto>(req.body);

            const hours = laborHoursEstimate({
                areaSqft: data.areaSqft,
                pitch: data.pitch,
                stories: data.stories,
                tearOff: data.tearOff,
                layers: data.layers,
            });

            const LABOR_RATES: Record<string, number> = {
                asphalt: 2.50,
                metal: 5.00,
                tile: 6.50,
                tpo: 3.50,
                cedar: 7.00,
            };

            const ratePerSqft = LABOR_RATES[data.materialType || 'asphalt'] || 2.50;
            const laborCost = Math.round(data.areaSqft * ratePerSqft * 100) / 100;

            let tearOff = null;
            if (data.tearOff) {
                tearOff = calculateTearOffCost({
                    areaSqft: data.areaSqft,
                    layers: data.layers || 1,
                    stories: data.stories || 1,
                });
            }

            sendSuccess(res, {
                crewHours: hours,
                laborRatePerSqft: ratePerSqft,
                laborCost,
                tearOff,
                grossTotalLabor: laborCost + (tearOff?.total || 0),
            }, 'Labor calculated');
        } catch (error) {
            next(error);
        }
    }

    // ── F10: Instant Total + Markup/Margin ─────────────────────────────────

    async calculateTotal(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = sanitizeBody<CalculateTotalDto>(req.body);

            const subtotal = data.materialCost + data.laborCost + (data.accessoryCost || 0) + (data.tearOffCost || 0);
            const profit = Math.round(subtotal * (data.markupPercent / 100) * 100) / 100;
            const total = Math.round((subtotal + profit) * 100) / 100;
            const margin = total > 0 ? Math.round((profit / total) * 10000) / 100 : 0;

            sendSuccess(res, {
                materialCost: data.materialCost,
                laborCost: data.laborCost,
                accessoryCost: data.accessoryCost || 0,
                tearOffCost: data.tearOffCost || 0,
                subtotal,
                markupPercent: data.markupPercent,
                profit,
                total,
                marginPercent: margin,
            }, 'Total calculated');
        } catch (error) {
            next(error);
        }
    }

    // ── F8: Supplier Pricing CRUD ──────────────────────────────────────────

    async getMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const category = req.query.category as string | undefined;
            const materials = await roofEstimatorRepository.findMaterials(tenantId, category);
            sendSuccess(res, materials);
        } catch (error) {
            next(error);
        }
    }

    async createMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<CreateMaterialDto>(req.body);
            const material = await roofEstimatorRepository.createMaterial(tenantId, data);
            sendCreated(res, material, 'Material created');
        } catch (error) {
            next(error);
        }
    }

    async updateMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateMaterialDto>(req.body);
            const material = await roofEstimatorRepository.updateMaterial(id, tenantId, data);
            sendSuccess(res, material, 'Material updated');
        } catch (error) {
            next(error);
        }
    }

    async deleteMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            await roofEstimatorRepository.deleteMaterial(id, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // ── F7: Labor Rates CRUD ───────────────────────────────────────────────

    async getLaborRates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const rates = await roofEstimatorRepository.findLaborRates(tenantId);
            sendSuccess(res, rates);
        } catch (error) {
            next(error);
        }
    }

    async createLaborRate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<CreateLaborRateDto>(req.body);
            const rate = await roofEstimatorRepository.createLaborRate(tenantId, data);
            sendCreated(res, rate, 'Labor rate created');
        } catch (error) {
            next(error);
        }
    }

    async updateLaborRate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateLaborRateDto>(req.body);
            const rate = await roofEstimatorRepository.updateLaborRate(id, tenantId, data);
            sendSuccess(res, rate, 'Labor rate updated');
        } catch (error) {
            next(error);
        }
    }

    async deleteLaborRate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            await roofEstimatorRepository.deleteLaborRate(id, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // ── AI Segmentation + Solar API (upgraded pipeline) ──────────────────

    async solarInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { latitude, longitude, address, estimateId } = req.body;

            const { solarRoofService } = await import('./solar-roof.service');
            const insights = await solarRoofService.getRoofInsights(
                latitude,
                longitude,
                tenantId,
                estimateId,
                address,
            );

            sendSuccess(res, insights, 'Solar roof insights retrieved');
        } catch (error) {
            next(error);
        }
    }

    async detectSegmented(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { latitude, longitude, address, estimateId, zoom, imageSize, roofType } = req.body;

            const result = await roofEstimatorService.detectRoofSegmented({
                lat: latitude,
                lng: longitude,
                address,
                tenantId,
                estimateId,
                zoom,
                imageSize,
                roofType,
            });

            // Optionally persist segmentation results on the estimate
            if (estimateId) {
                await prisma.roofEstimate.update({
                    where: { id: estimateId, tenantId },
                    data: {
                        roofAreaSqft: result.measurements.roofAreaSqft,
                        trueSurfaceAreaSqft: result.measurements.trueSurfaceAreaSqft,
                        ridgeLengthFt: result.measurements.ridgeLengthFt,
                        valleyLengthFt: result.measurements.valleyLengthFt,
                        hipLengthFt: result.measurements.hipLengthFt,
                        eaveLengthFt: result.measurements.eaveLengthFt,
                        rakeLengthFt: result.measurements.rakeLengthFt,
                        roofPolygon: result.measurements.polygon as any,
                        roofPlanes: result.measurements.planes as any,
                        confidence: result.measurements.confidenceScore,
                        confidenceScore: result.measurements.confidenceScore,
                        flaggedForReview: result.measurements.flaggedForReview,
                        solarValidated: !!result.validation?.valid,
                        correctionFactor: result.validation?.correctionFactor,
                        aiModel: result.aiModel,
                        processingTimeSec: result.processingTimeSec,
                        measurementSource: 'ai_segmented',
                    },
                }).catch((err: Error) => {
                    // Non-blocking: estimate may not exist yet
                    // (detectSegmented can be called before saving estimate)
                });
            }

            sendSuccess(res, result, 'Segmented roof detection completed');
        } catch (error) {
            next(error);
        }
    }

    async validatePolygon(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { aiAreaSqft, solarAreaSqft } = req.body;

            const { solarRoofService } = await import('./solar-roof.service');
            const result = solarRoofService.validateRoofArea(aiAreaSqft, solarAreaSqft);

            sendSuccess(res, result, 'Polygon validation completed');
        } catch (error) {
            next(error);
        }
    }

    // ── Existing CRUD ─────────────────────────────────────────────────────

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const createdBy = req.user!.employeeId || req.user!.userId;
            const data = sanitizeBody<CreateEstimateDto>(req.body);
            const estimate = await roofEstimatorManager.createEstimate(req, tenantId, data, createdBy);
            sendCreated(res, estimate, 'Estimate saved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const query = req.query as any;
            const result = await roofEstimatorService.getMany(tenantId, query);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const estimate = await roofEstimatorService.getById(id, tenantId);
            sendSuccess(res, estimate);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateEstimateDto>(req.body);
            const estimate = await roofEstimatorManager.updateEstimate(req, id, tenantId, data);
            sendSuccess(res, estimate, 'Estimate updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            await roofEstimatorManager.deleteEstimate(req, id, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // ── Settings & Stats (existing) ────────────────────────────────────────

    async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const settings = await roofEstimatorService.getSettings(tenantId);
            sendSuccess(res, settings);
        } catch (error) {
            next(error);
        }
    }

    async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const data = sanitizeBody<UpdateSettingsDto>(req.body);
            const settings = await roofEstimatorService.updateSettings(tenantId, data);
            sendSuccess(res, settings, 'Settings updated');
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const stats = await roofEstimatorService.getStatistics(tenantId);
            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    async checkAiHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const [aiHealthy, heatHealthy] = await Promise.all([
                roofEstimatorService.checkAiHealth(),
                roofEstimatorService.checkHeatHealth(),
            ]);
            sendSuccess(res, {
                healthy: aiHealthy || heatHealthy,
                services: {
                    yolov8: { healthy: aiHealthy, service: 'ai-roof-estimator' },
                    heat: { healthy: heatHealthy, service: 'heat-roof-planes' },
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async generateEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { roofAreaSqft, roofType, material, location, stories, pitch, currentCondition } = req.body;
            const estimate = await roofEstimatorService.generateEstimate({
                roofAreaSqft,
                roofType,
                material,
                location,
                stories,
                pitch,
                currentCondition,
            });
            sendSuccess(res, estimate, 'Estimate generated successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const roofEstimatorController = new RoofEstimatorController();
