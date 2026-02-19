import { Request } from 'express';
import { roofEstimatorService } from './roof-estimator.service';
import { CreateEstimateDto, UpdateEstimateDto } from './roof-estimator.dto';
import { logger } from '../../common/utils/logger';

export class RoofEstimatorManager {
    /**
     * Full satellite + AI detection flow
     */
    async getSatellite(tenantId: string, address: string) {
        // 1. Geocode the address
        const geo = await roofEstimatorService.geocodeAddress(address);

        // 2. Build satellite image URL
        const satelliteImageUrl = roofEstimatorService.getSatelliteImageUrl(geo.lat, geo.lng);

        logger.info('Satellite image fetched', {
            tenantId,
            address: geo.formattedAddress,
            lat: geo.lat,
            lng: geo.lng,
        });

        return {
            latitude: geo.lat,
            longitude: geo.lng,
            formattedAddress: geo.formattedAddress,
            satelliteImageUrl,
        };
    }

    /**
     * Run AI roof detection on a satellite image
     */
    async detectRoof(tenantId: string, satelliteImageUrl: string, latitude: number, longitude: number) {
        // 1. Fetch image buffer
        const imageBuffer = await roofEstimatorService.fetchSatelliteImageBuffer(satelliteImageUrl);

        // 2. Send to AI service
        const result = await roofEstimatorService.detectRoof(imageBuffer);

        logger.info('Roof detection completed', {
            tenantId,
            roofAreaSqft: result.roof_area_sqft,
            confidence: result.confidence,
            processingTime: result.processing_time_seconds,
        });

        return {
            roofAreaSqft: result.roof_area_sqft,
            confidence: result.confidence,
            processingTimeSec: result.processing_time_seconds,
            aiModel: result.model,
            satelliteImageUrl,
            latitude,
            longitude,
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
