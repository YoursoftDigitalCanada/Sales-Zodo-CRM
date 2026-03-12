/**
 * EagleView Imagery Service
 *
 * Fetches orthographic property imagery from EagleView Imagery API.
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { eagleViewAuthService } from './eagleview-auth.service';

const BASE_URL = config.integrations.eagleview.baseUrl;

// ── Types ────────────────────────────────────────────────────────────────

export interface PropertyImagery {
    imageUrl: string;
    imageType: string;
    captureDate?: string;
    resolution?: string;
    lat: number;
    lng: number;
}

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewImageryService {
    /**
     * Fetch orthographic (top-down) imagery for a lat/lng location.
     */
    async getPropertyImagery(lat: number, lng: number): Promise<PropertyImagery> {
        if (!eagleViewAuthService.isConfigured()) {
            throw new Error('EagleView credentials not configured');
        }

        logger.info('[EagleView] Fetching property imagery', { lat, lng });

        const token = await eagleViewAuthService.getToken();

        try {
            const response = await axios.get(`${BASE_URL}/imagery`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
                params: {
                    lat,
                    lng,
                    imageType: 'orthographic',
                },
                timeout: 30_000,
            });

            const data = response.data;

            return {
                imageUrl: data.imageUrl || data.image_url || data.url,
                imageType: data.imageType || data.image_type || 'orthographic',
                captureDate: data.captureDate || data.capture_date,
                resolution: data.resolution,
                lat,
                lng,
            };
        } catch (error: any) {
            // Retry on 401
            if (error?.response?.status === 401) {
                eagleViewAuthService.invalidateToken();
                const newToken = await eagleViewAuthService.getToken();

                const response = await axios.get(`${BASE_URL}/imagery`, {
                    headers: {
                        Authorization: `Bearer ${newToken}`,
                        Accept: 'application/json',
                    },
                    params: { lat, lng, imageType: 'orthographic' },
                    timeout: 30_000,
                });

                const data = response.data;
                return {
                    imageUrl: data.imageUrl || data.image_url || data.url,
                    imageType: data.imageType || data.image_type || 'orthographic',
                    captureDate: data.captureDate || data.capture_date,
                    resolution: data.resolution,
                    lat,
                    lng,
                };
            }

            logger.error('[EagleView] Imagery fetch failed', {
                status: error?.response?.status,
                message: error.message,
            });
            throw error;
        }
    }

    /**
     * Get available imagery types for a property.
     */
    async getAvailableImagery(lat: number, lng: number): Promise<string[]> {
        const token = await eagleViewAuthService.getToken();

        try {
            const response = await axios.get(`${BASE_URL}/imagery/available`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { lat, lng },
                timeout: 15_000,
            });

            return response.data?.imageTypes || response.data?.image_types || [];
        } catch (error: any) {
            logger.error('[EagleView] Available imagery check failed', { error: error.message });
            return [];
        }
    }
}

export const eagleViewImageryService = new EagleViewImageryService();
