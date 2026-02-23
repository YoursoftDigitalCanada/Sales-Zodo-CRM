import axios from 'axios';
import OpenAI from 'openai';
import { config } from '../../config';
import { roofEstimatorRepository } from './roof-estimator.repository';
import {
    CreateEstimateDto, UpdateEstimateDto, EstimateQueryDto, UpdateSettingsDto,
} from './roof-estimator.dto';
import { logger } from '../../common/utils/logger';
import { activityLogger } from '../../common/services/activity-logger.service';

const GOOGLE_GEOCODING_API_KEY = process.env.GOOGLE_GEOCODING_API_KEY || '';
const GOOGLE_STATIC_MAPS_API_KEY = process.env.GOOGLE_STATIC_MAPS_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';

export class RoofEstimatorService {
    /**
     * Geocode an address using Google Geocoding API
     */
    async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
        if (!GOOGLE_GEOCODING_API_KEY) {
            throw new Error('GOOGLE_GEOCODING_API_KEY is not configured');
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: { address, key: GOOGLE_GEOCODING_API_KEY },
            timeout: 10000,
        });

        if (response.data.status !== 'OK' || !response.data.results?.length) {
            throw new Error(`Geocoding failed: ${response.data.status}. Could not find coordinates for the given address.`);
        }

        const result = response.data.results[0];
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formattedAddress: result.formatted_address,
        };
    }

    /**
     * Fetch satellite image URL from Google Maps Static API
     */
    getSatelliteImageUrl(lat: number, lng: number, zoom = 20, size = '640x640'): string {
        if (!GOOGLE_STATIC_MAPS_API_KEY) {
            throw new Error('GOOGLE_STATIC_MAPS_API_KEY is not configured');
        }

        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&key=${GOOGLE_STATIC_MAPS_API_KEY}`;
    }

    /**
     * Fetch the satellite image as a buffer (for sending to AI service)
     */
    async fetchSatelliteImageBuffer(url: string): Promise<Buffer> {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
        });
        return Buffer.from(response.data);
    }

    /**
     * Send image to Python AI microservice for roof detection
     */
    async detectRoof(imageBuffer: Buffer): Promise<{
        roof_area_sqft: number;
        confidence: number;
        processing_time_seconds: number;
        model: string;
    }> {
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        formData.append('file', imageBuffer, { filename: 'satellite.png', contentType: 'image/png' });

        let retries = 2;
        let lastError: Error | null = null;

        while (retries >= 0) {
            try {
                const response = await axios.post(`${AI_SERVICE_URL}/detect-roof`, formData, {
                    headers: formData.getHeaders(),
                    timeout: 30000, // 30s timeout for AI inference
                    maxBodyLength: 10 * 1024 * 1024,
                });
                return response.data;
            } catch (error: any) {
                lastError = error;
                retries--;
                if (retries >= 0) {
                    logger.warn(`AI service call failed, retrying... (${retries + 1} retries left)`, {
                        error: error.message,
                    });
                    await new Promise((r) => setTimeout(r, 1000));
                }
            }
        }

        throw new Error(`AI service unavailable after retries: ${lastError?.message}`);
    }

    /**
     * Check AI service health
     */
    async checkAiHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
            return response.data?.status === 'healthy';
        } catch {
            return false;
        }
    }

    /**
     * Generate a detailed roofing cost estimate using OpenAI GPT-4o-mini
     */
    async generateEstimate(params: {
        roofAreaSqft: number;
        roofType: string;
        material: string;
        location?: string;
        stories?: number;
        pitch?: string;
        currentCondition?: string;
    }): Promise<{
        summary: string;
        laborCost: number;
        materialCost: number;
        totalEstimate: number;
        breakdown: Array<{ item: string; quantity?: string; unitPrice?: number; total: number }>;
        timeline: string;
        notes: string[];
    }> {
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

        const prompt = `You are an expert roofing contractor estimator in Canada. Generate a detailed cost estimate for the following roof job.

Roof Details:
- Area: ${params.roofAreaSqft} sq ft
- Roof Type: ${params.roofType}
- Material: ${params.material}
- Location: ${params.location || 'Canada'}
- Stories: ${params.stories || 1}
- Pitch: ${params.pitch || 'Standard (4/12 to 6/12)'}
- Current Condition: ${params.currentCondition || 'Unknown'}

Provide a realistic estimate in CAD. Return ONLY valid JSON with this exact structure:
{
  "summary": "Brief description of the job",
  "laborCost": <number>,
  "materialCost": <number>,
  "totalEstimate": <number>,
  "breakdown": [
    { "item": "description", "quantity": "amount with unit", "unitPrice": <number>, "total": <number> }
  ],
  "timeline": "estimated completion time",
  "notes": ["important note 1", "important note 2"]
}

Be realistic with Canadian pricing. Include removal & disposal, underlayment, flashing, ventilation, labor, and cleanup.`;

        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error('No response from OpenAI');

            const parsed = JSON.parse(content);
            logger.info('OpenAI estimate generated', {
                roofArea: params.roofAreaSqft,
                material: params.material,
                total: parsed.totalEstimate,
            });

            return parsed;
        } catch (error: any) {
            logger.error('OpenAI estimate generation failed', { error: error.message });
            throw new Error(`Failed to generate estimate: ${error.message}`);
        }
    }

    // ---- CRUD operations (delegate to repository) ----

    async create(tenantId: string, data: CreateEstimateDto, createdBy: string) {
        const estimate = await roofEstimatorRepository.create(tenantId, data, createdBy);

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: (estimate as any).id,
            action: 'CREATE', module: 'roof-estimator',
            description: `Created roof estimate for "${data.address || 'unknown address'}"`,
            userId: createdBy,
            metadata: { address: data.address, roofArea: (estimate as any).roofAreaSqft },
        });

        return estimate;
    }

    async getById(id: string, tenantId: string) {
        const estimate = await roofEstimatorRepository.findById(id, tenantId);
        if (!estimate) {
            throw Object.assign(new Error('Estimate not found'), { statusCode: 404 });
        }
        return estimate;
    }

    async getMany(tenantId: string, query: EstimateQueryDto) {
        const { data, total } = await roofEstimatorRepository.findMany(tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async update(id: string, tenantId: string, data: UpdateEstimateDto) {
        await this.getById(id, tenantId); // ensure exists in tenant
        const estimate = await roofEstimatorRepository.update(id, tenantId, data);

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: id,
            action: 'UPDATE', module: 'roof-estimator',
            description: `Updated roof estimate`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return estimate;
    }

    async delete(id: string, tenantId: string) {
        await this.getById(id, tenantId); // ensure exists in tenant

        activityLogger.log({
            tenantId, entityType: 'RoofEstimate', entityId: id,
            action: 'DELETE', module: 'roof-estimator',
            description: `Deleted roof estimate`,
        });

        return roofEstimatorRepository.delete(id, tenantId);
    }

    async getSettings(tenantId: string) {
        const settings = await roofEstimatorRepository.getSettings(tenantId);
        // Return defaults if no settings exist
        return settings || {
            defaultPricePerSqft: 5.50,
            currency: 'CAD',
            snowModeDefault: true,
            companyName: null,
            companyLogo: null,
            companyPhone: null,
            companyEmail: null,
            companyAddress: null,
            pdfFooterText: null,
        };
    }

    async updateSettings(tenantId: string, data: UpdateSettingsDto) {
        return roofEstimatorRepository.upsertSettings(tenantId, data);
    }

    async getStatistics(tenantId: string) {
        return roofEstimatorRepository.getStatistics(tenantId);
    }
}

export const roofEstimatorService = new RoofEstimatorService();
