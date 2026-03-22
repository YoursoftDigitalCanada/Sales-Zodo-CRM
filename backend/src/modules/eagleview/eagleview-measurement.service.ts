/**
 * EagleView Measurement Service
 *
 * Uses the Measurement Order API (apicenter.eagleview.com):
 *   POST /v2/Order/PlaceOrder        — Place measurement order
 *   GET  /v3/Report/GetReport        — Get report data (area, pitch, lengths)
 *   GET  /v1/File/GetReportFile      — Download report file (PDF/image)
 *
 * Base URL:
 *   Sandbox:    https://sandbox.apicenter.eagleview.com
 *   Production: https://apicenter.eagleview.com
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { eagleViewAuthService } from './eagleview-auth.service';

const BASE_URL = config.integrations.eagleview.baseUrl || 'https://sandbox.apicenter.eagleview.com';

// ── Types ────────────────────────────────────────────────────────────────

export interface OrderAddress {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
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
    area?: string;
    pitch?: string;
    lengthRidge?: string;
    lengthValley?: string;
    lengthEave?: string;
    lengthRake?: string;
    lengthHip?: string;
    totalRoofFacets?: string;
    reportDownloadLink?: string;
    pitchTable?: Array<{ Pitch: string; RoofArea: string; PercentageRoofArea: string }>;
    measurementByStructure?: any[];
}

// ── Service ──────────────────────────────────────────────────────────────

class EagleViewMeasurementService {
    private async getHeaders(): Promise<Record<string, string>> {
        const token = await eagleViewAuthService.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * POST /v2/Order/PlaceOrder
     */
    async placeOrder(address: OrderAddress, referenceId?: string): Promise<PlaceOrderResponse> {
        logger.info('[EagleView] Placing measurement order', { address: address.addressLine1 });

        const headers = await this.getHeaders();

        const body = {
            OrderReports: {
                ReportAddresses: {
                    Address: address.addressLine1,
                    City: address.city,
                    State: address.state,
                    Zip: address.postalCode,
                    Country: address.country || 'CA',
                    AddressType: 0,
                },
                PrimaryProductId: 2,
                DeliveryProductId: 7,
                MeasurementInstructionType: 1,
                ChangesInLast4Years: false,
            },
        };

        const response = await axios.post(`${BASE_URL}/v2/Order/PlaceOrder`, body, {
            headers,
            timeout: 30_000,
        });

        logger.info('[EagleView] Order placed', { data: response.data });

        return {
            orderId: response.data.OrderId,
            reportIds: response.data.ReportIds || [],
        };
    }

    /**
     * GET /v3/Report/GetReport?reportId=xxx
     */
    async getReport(reportId: number): Promise<ReportData> {
        logger.info('[EagleView] Getting report', { reportId });

        const headers = await this.getHeaders();

        const response = await axios.get(`${BASE_URL}/v3/Report/GetReport`, {
            headers,
            params: { reportId },
            timeout: 30_000,
        });

        const d = response.data;

        return {
            reportId: d.ReportId,
            status: d.Status || d.DisplayStatus,
            displayStatus: d.DisplayStatus,
            street: d.Street,
            city: d.City,
            state: d.State,
            zip: d.Zip,
            latitude: d.Latitude,
            longitude: d.Longitude,
            area: d.Area,
            pitch: d.Pitch,
            lengthRidge: d.LengthRidge,
            lengthValley: d.LengthValley,
            lengthEave: d.LengthEave,
            lengthRake: d.LengthRake,
            lengthHip: d.LengthHip,
            totalRoofFacets: d.TotalRoofFacets,
            reportDownloadLink: d.ReportDownloadLink,
            pitchTable: d.PitchTable,
            measurementByStructure: d.MeasurementByStructure,
        };
    }

    /**
     * Place order + poll for report (convenience for wizard)
     */
    async placeOrderAndWait(
        address: OrderAddress,
        maxRetries = 5,
        pollIntervalMs = 3000,
    ): Promise<ReportData> {
        const order = await this.placeOrder(address);

        if (!order.reportIds?.length) {
            throw new Error('EagleView order placed but no report IDs returned');
        }

        const reportId = order.reportIds[0];
        logger.info('[EagleView] Polling for report', { reportId, maxRetries });

        for (let i = 0; i < maxRetries; i++) {
            await new Promise(r => setTimeout(r, pollIntervalMs));

            const report = await this.getReport(reportId);
            if (report.status === 'Completed' || report.area) {
                logger.info('[EagleView] Report completed', {
                    reportId,
                    area: report.area,
                    pitch: report.pitch,
                });
                return report;
            }

            logger.info('[EagleView] Still processing', { reportId, attempt: i + 1, status: report.status });
        }

        // Return whatever we have
        return this.getReport(reportId);
    }

    /**
     * GET report download link (PDF)
     */
    async getReportDownloadLink(reportId: number): Promise<string | null> {
        const report = await this.getReport(reportId);
        return report.reportDownloadLink || null;
    }
}

export const eagleViewMeasurementService = new EagleViewMeasurementService();
