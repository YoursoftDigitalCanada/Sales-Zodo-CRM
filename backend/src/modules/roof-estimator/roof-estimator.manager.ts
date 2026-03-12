import { Request } from 'express';
import { roofEstimatorService } from './roof-estimator.service';
import { CreateEstimateDto, UpdateEstimateDto } from './roof-estimator.dto';
import { logger } from '../../common/utils/logger';

export class RoofEstimatorManager {
    private parseZoomFromSatelliteUrl(satelliteImageUrl: string): number | undefined {
        try {
            const url = new URL(satelliteImageUrl);
            const zoom = Number(url.searchParams.get('zoom'));
            return Number.isFinite(zoom) ? zoom : undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Full satellite + AI detection flow
     */
    async getSatellite(tenantId: string, address: string, placeId?: string) {
        // 1. Geocode the address
        const geo = await roofEstimatorService.geocodeAddress(address, placeId);

        // 2. Build satellite image URL
        const satelliteImageUrl = roofEstimatorService.getSatelliteImageUrl(geo.lat, geo.lng);

        logger.info('Satellite image fetched', {
            tenantId,
            address: geo.formattedAddress,
            lat: geo.lat,
            lng: geo.lng,
            locationType: geo.locationType,
        });

        return {
            latitude: geo.lat,
            longitude: geo.lng,
            formattedAddress: geo.formattedAddress,
            satelliteImageUrl,
            locationType: geo.locationType,
            placeId: placeId || undefined,
        };
    }

    /**
     * Run AI roof detection on a satellite image.
     * Calls both the YOLOv8 segmentation service AND the HEAT roof-plane service in parallel.
     */
    async detectRoof(tenantId: string, satelliteImageUrl: string, latitude: number, longitude: number) {
        // 1. Fetch image buffer (for YOLOv8)
        const imageBuffer = await roofEstimatorService.fetchSatelliteImageBuffer(satelliteImageUrl);
        const zoom = this.parseZoomFromSatelliteUrl(satelliteImageUrl);

        // 2. Call both AI services in parallel
        const [segResult, heatResult] = await Promise.all([
            roofEstimatorService.detectRoof({
                imageBuffer,
                latitude,
                zoom,
            }),
            roofEstimatorService.detectRoofPlanes(satelliteImageUrl).catch((err: Error) => {
                logger.warn('HEAT plane detection failed (non-blocking)', {
                    tenantId,
                    error: err.message,
                });
                return null;
            }),
        ]);

        logger.info('Roof detection completed', {
            tenantId,
            roofAreaSqft: segResult.roof_area_sqft,
            confidence: segResult.confidence,
            processingTime: segResult.processing_time_seconds,
            heatPlanes: heatResult?.plane_count ?? 0,
            heatInferenceTime: heatResult?.inference_time_seconds,
        });

        return {
            roofAreaSqft: segResult.roof_area_sqft,
            confidence: segResult.confidence,
            processingTimeSec: segResult.processing_time_seconds,
            aiModel: segResult.model,
            satelliteImageUrl,
            latitude,
            longitude,
            // HEAT plane data (null if service unavailable)
            heatPlanes: heatResult?.roof_planes ?? null,
            heatPlaneCount: heatResult?.plane_count ?? 0,
            heatVertices: heatResult?.vertices ?? null,
            heatEdges: heatResult?.edges ?? null,
            heatInferenceTimeSec: heatResult?.inference_time_seconds ?? null,
        };
    }

    /**
     * Create and save an estimate
     */
    async createEstimate(req: Request, tenantId: string, data: CreateEstimateDto, createdBy: string) {
        const estimate = await roofEstimatorService.create(tenantId, data, createdBy);

        logger.info('Roof estimate created', {
            tenantId,
            estimateId: estimate.id,
            address: data.address,
            total: data.totalEstimate,
        });

        return estimate;
    }

    /**
     * Update an estimate
     */
    async updateEstimate(req: Request, id: string, tenantId: string, data: UpdateEstimateDto) {
        const estimate = await roofEstimatorService.update(id, tenantId, data);

        logger.info('Roof estimate updated', { tenantId, estimateId: id });

        return estimate;
    }

    /**
     * Delete an estimate
     */
    async deleteEstimate(req: Request, id: string, tenantId: string) {
        await roofEstimatorService.delete(id, tenantId);
        logger.info('Roof estimate deleted', { tenantId, estimateId: id });
    }
}

export const roofEstimatorManager = new RoofEstimatorManager();
