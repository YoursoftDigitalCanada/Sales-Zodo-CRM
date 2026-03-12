/**
 * EagleView Measurement Orders Service
 *
 * Handles creating, tracking, and downloading roof measurement reports.
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { eagleViewAuthService } from './eagleview-auth.service';

const BASE_URL = config.integrations.eagleview.baseUrl;

// ── Types ────────────────────────────────────────────────────────────────

export interface MeasurementAddress {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
}

export interface MeasurementOrderRequest {
    address: MeasurementAddress;
    referenceId?: string;       // CRM lead/estimate ID for correlation
    productType?: string;       // e.g. "PremiumRoofMeasurement"
    callbackUrl?: string;       // webhook URL for status updates
}

export interface MeasurementOrderResponse {
    orderId: string;
    status: string;
    referenceId?: string;
    createdAt?: string;
    estimatedCompletionDate?: string;
}

export interface MeasurementReport {
    orderId: string;
    status: string;
    reportUrl?: string;
    completedAt?: string;
    totalArea?: number;
    totalSquares?: number;
    roofFacets?: Array<{
        id: string;
        area: number;
        pitch: string;
        orientation: string;
    }>;
    rawData?: any;
}

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewMeasurementService {
    /**
     * Get authenticated axios headers.
     */
    private async getHeaders(): Promise<Record<string, string>> {
        const token = await eagleViewAuthService.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    /**
     * Retry on 401 by refreshing token.
     */
    private async requestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        try {
            return await fn();
        } catch (error: any) {
            if (error?.response?.status === 401) {
                logger.warn('[EagleView] Got 401, refreshing token and retrying');
                eagleViewAuthService.invalidateToken();
                return await fn();
            }
            throw error;
        }
    }

    /**
     * Create a new measurement order.
     */
    async createOrder(payload: MeasurementOrderRequest): Promise<MeasurementOrderResponse> {
        logger.info('[EagleView] Creating measurement order', {
            address: payload.address.addressLine1,
            city: payload.address.city,
            referenceId: payload.referenceId,
        });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const body: any = {
                address: {
                    addressLine1: payload.address.addressLine1,
                    addressLine2: payload.address.addressLine2 || '',
                    city: payload.address.city,
                    state: payload.address.state,
                    postalCode: payload.address.postalCode,
                    country: payload.address.country || 'US',
                },
            };

            if (payload.referenceId) body.referenceId = payload.referenceId;
            if (payload.productType) body.productType = payload.productType;
            if (payload.callbackUrl) body.callbackUrl = payload.callbackUrl;

            const response = await axios.post(
                `${BASE_URL}/measurement-orders`,
                body,
                { headers, timeout: 30_000 },
            );

            const data = response.data;

            logger.info('[EagleView] Order created', {
                orderId: data.orderId || data.id,
                status: data.status,
            });

            return {
                orderId: data.orderId || data.id || data.order_id,
                status: data.status || 'pending',
                referenceId: data.referenceId || payload.referenceId,
                createdAt: data.createdAt || data.created_at,
                estimatedCompletionDate: data.estimatedCompletionDate || data.estimated_completion_date,
            };
        });
    }

    /**
     * Get order status and report data.
     */
    async getOrder(orderId: string): Promise<MeasurementReport> {
        logger.info('[EagleView] Fetching order status', { orderId });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const response = await axios.get(
                `${BASE_URL}/measurement-orders/${orderId}`,
                { headers, timeout: 15_000 },
            );

            const data = response.data;

            return {
                orderId: data.orderId || data.id || orderId,
                status: data.status || 'unknown',
                reportUrl: data.reportUrl || data.report_url,
                completedAt: data.completedAt || data.completed_at,
                totalArea: data.totalArea || data.total_area,
                totalSquares: data.totalSquares || data.total_squares,
                roofFacets: data.roofFacets || data.roof_facets,
                rawData: data,
            };
        });
    }

    /**
     * Download report PDF/data when order is completed.
     */
    async downloadReport(reportUrl: string): Promise<Buffer> {
        logger.info('[EagleView] Downloading report', { reportUrl: reportUrl.substring(0, 80) });

        const token = await eagleViewAuthService.getToken();

        const response = await axios.get(reportUrl, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer',
            timeout: 60_000,
        });

        return Buffer.from(response.data);
    }

    /**
     * List recent orders (optional filtering).
     */
    async listOrders(params?: { status?: string; limit?: number }): Promise<MeasurementOrderResponse[]> {
        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const queryParams = new URLSearchParams();
            if (params?.status) queryParams.set('status', params.status);
            if (params?.limit) queryParams.set('limit', String(params.limit));

            const url = `${BASE_URL}/measurement-orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

            const response = await axios.get(url, { headers, timeout: 15_000 });

            const orders = Array.isArray(response.data)
                ? response.data
                : response.data?.orders || response.data?.data || [];

            return orders.map((o: any) => ({
                orderId: o.orderId || o.id || o.order_id,
                status: o.status,
                referenceId: o.referenceId || o.reference_id,
                createdAt: o.createdAt || o.created_at,
            }));
        });
    }
}

export const eagleViewMeasurementService = new EagleViewMeasurementService();
