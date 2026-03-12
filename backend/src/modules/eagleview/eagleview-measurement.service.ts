/**
 * EagleView Measurement Orders Service
 *
 * Built from the official EagleView Measurement Order API Swagger spec.
 *
 * Endpoints used:
 *   POST /v2/Order/PlaceOrder          — create order
 *   GET  /v3/Report/GetReport          — get report status + measurements
 *   POST /v3/Report/GetReports         — list reports (paginated)
 *   GET  /v1/File/GetReportFile        — download report file
 *   GET  /v2/Product/GetAvailableProducts — list available products
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
    latitude?: number;
    longitude?: number;
}

export interface PlaceOrderRequest {
    address: MeasurementAddress;
    primaryProductId?: number;       // default 2 (PremiumRoof)
    deliveryProductId?: number;      // default 7 (PDF)
    measurementInstructionType?: number; // default 1
    changesInLast4Years?: boolean;
    referenceId?: string;            // CRM lead/estimate ID
    claimNumber?: string;
    comments?: string;
}

export interface PlaceOrderResponse {
    orderId: number;
    reportIds: number[];
}

export interface ReportData {
    reportId: number;
    status: string;
    displayStatus?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
    datePlaced?: string;
    dateCompleted?: string | null;
    referenceId?: string;
    area?: string;
    pitch?: string;
    lengthRidge?: string;
    lengthValley?: string;
    lengthEave?: string;
    lengthRake?: string;
    lengthHip?: string;
    totalRoofFacets?: string;
    productPrimary?: string;
    productDelivery?: string;
    reportDownloadLink?: string;
    eligibleForUpgrade?: boolean;
    canCancelReport?: boolean;
    rawData?: any;
}

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewMeasurementService {
    private async getHeaders(): Promise<Record<string, string>> {
        const token = await eagleViewAuthService.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

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
     * POST /v2/Order/PlaceOrder
     *
     * Required body fields:
     *   OrderReports.ReportAddresses  { Address, City, State, Zip, AddressType }
     *   OrderReports.PrimaryProductId
     *   OrderReports.DeliveryProductId
     *   OrderReports.MeasurementInstructionType
     *   OrderReports.ChangesInLast4Years
     */
    async placeOrder(payload: PlaceOrderRequest): Promise<PlaceOrderResponse> {
        logger.info('[EagleView] Placing order', {
            address: payload.address.addressLine1,
            city: payload.address.city,
        });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const body = {
                OrderReports: {
                    ReportAddresses: {
                        Address: payload.address.addressLine1,
                        City: payload.address.city,
                        State: payload.address.state,
                        Zip: payload.address.postalCode,
                        Country: payload.address.country || 'US',
                        AddressType: 0,
                        ...(payload.address.latitude && { Latitude: payload.address.latitude }),
                        ...(payload.address.longitude && { Longitude: payload.address.longitude }),
                    },
                    PrimaryProductId: payload.primaryProductId || 2,
                    DeliveryProductId: payload.deliveryProductId || 7,
                    MeasurementInstructionType: payload.measurementInstructionType || 1,
                    ChangesInLast4Years: payload.changesInLast4Years ?? false,
                    ...(payload.referenceId && { ReferenceId: payload.referenceId }),
                    ...(payload.claimNumber && { ClaimNumber: payload.claimNumber }),
                    ...(payload.comments && { Comments: payload.comments }),
                },
            };

            const response = await axios.post(
                `${BASE_URL}/v2/Order/PlaceOrder`,
                body,
                { headers, timeout: 30_000 },
            );

            const data = response.data;

            logger.info('[EagleView] Order placed successfully', {
                orderId: data.OrderId,
                reportIds: data.ReportIds,
            });

            return {
                orderId: data.OrderId,
                reportIds: data.ReportIds || [],
            };
        });
    }

    /**
     * GET /v3/Report/GetReport?reportId=...
     *
     * Returns full report data including measurements.
     */
    async getReport(reportId: number): Promise<ReportData> {
        logger.info('[EagleView] Fetching report', { reportId });

        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const response = await axios.get(
                `${BASE_URL}/v3/Report/GetReport`,
                { headers, params: { reportId }, timeout: 15_000 },
            );

            const d = response.data;

            return {
                reportId: d.ReportId || reportId,
                status: d.Status || d.DisplayStatus || 'unknown',
                displayStatus: d.DisplayStatus,
                street: d.Street,
                city: d.City,
                state: d.State,
                zip: d.Zip,
                latitude: d.Latitude,
                longitude: d.Longitude,
                datePlaced: d.DatePlaced,
                dateCompleted: d.DateCompleted,
                referenceId: d.ReferenceId,
                area: d.Area,
                pitch: d.Pitch,
                lengthRidge: d.LengthRidge,
                lengthValley: d.LengthValley,
                lengthEave: d.LengthEave,
                lengthRake: d.LengthRake,
                lengthHip: d.LengthHip,
                totalRoofFacets: d.TotalRoofFacets,
                productPrimary: d.ProductPrimary,
                productDelivery: d.ProductDelivery,
                reportDownloadLink: d.ReportDownloadLink,
                eligibleForUpgrade: d.EligibleForUpgrade,
                canCancelReport: d.CanCancelReport,
                rawData: d,
            };
        });
    }

    /**
     * POST /v3/Report/GetReports?page=&count=
     *
     * List reports with optional filters.
     */
    async getReports(page = 1, count = 20, filters?: {
        productsToFilterBy?: number[];
        statusesToFilterBy?: string;
        referenceId?: string;
    }): Promise<{ reports: ReportData[]; total: number }> {
        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const body = {
                productsToFiterBy: filters?.productsToFilterBy || [],
                ...(filters?.statusesToFilterBy && { statusesToFilterBy: filters.statusesToFilterBy }),
                ...(filters?.referenceId && { referenceId: filters.referenceId }),
            };

            const response = await axios.post(
                `${BASE_URL}/v3/Report/GetReports`,
                body,
                { headers, params: { page, count }, timeout: 15_000 },
            );

            const data = response.data;
            const list = data?.ReportList || [];

            return {
                reports: (Array.isArray(list) ? list : [list]).map((r: any) => ({
                    reportId: r.Id || r.ReportId,
                    status: r.ReportStatus?.Status || r.ReportStatus?.DisplayStatus || 'unknown',
                    displayStatus: r.ReportStatus?.DisplayStatus,
                    street: r.Street1,
                    city: r.City,
                    state: r.State,
                    zip: r.Zip,
                    latitude: r.Latitude,
                    longitude: r.Longitude,
                    datePlaced: r.DatePlaced,
                    dateCompleted: r.DateCompleted,
                    referenceId: r.ReferenceId,
                    reportDownloadLink: r.ReportDownloadLink,
                    canCancelReport: r.CanCancelReport,
                })),
                total: data?.TotalOfReports || 0,
            };
        });
    }

    /**
     * GET /v1/File/GetReportFile?reportId=&fileType=&fileFormat=
     *
     * fileType: 1=PDF, etc.
     * fileFormat: 1=PDF, etc.
     */
    async getReportFile(reportId: number, fileType = 1, fileFormat = 1): Promise<Buffer> {
        logger.info('[EagleView] Downloading report file', { reportId, fileType, fileFormat });

        const token = await eagleViewAuthService.getToken();

        const response = await axios.get(
            `${BASE_URL}/v1/File/GetReportFile`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { reportId, fileType, fileFormat },
                responseType: 'arraybuffer',
                timeout: 60_000,
            },
        );

        return Buffer.from(response.data);
    }

    /**
     * GET /v2/Product/GetAvailableProducts
     */
    async getAvailableProducts(): Promise<any[]> {
        return this.requestWithRetry(async () => {
            const headers = await this.getHeaders();

            const response = await axios.get(
                `${BASE_URL}/GetAvailableProducts`,
                { headers, timeout: 15_000 },
            );

            return Array.isArray(response.data) ? response.data : [];
        });
    }
}

export const eagleViewMeasurementService = new EagleViewMeasurementService();
