/**
 * EagleView Measurement Service
 *
 * Uses the EagleView Measurement Order API:
 *   POST /v2/Order/PlaceOrder        — Place measurement order
 *   GET  /v3/Report/GetReport        — Get report data (area, pitch, lengths)
 *   GET  /v1/File/GetReportFile      — Download report file (PDF/image)
 *
 * Base URL:
 *   Sandbox:    https://sandbox.apis.eagleview.com
 *   Production: https://apis.eagleview.com
 */

import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';
import { ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { eagleViewAuthService } from './eagleview-auth.service';

const BASE_URL = config.integrations.eagleview.baseUrl || 'https://sandbox.apis.eagleview.com';
const PREFERRED_IMAGE_FILE_TYPES = [6, 22, 24, 25, 23];
const PREFERRED_MEASUREMENT_TYPES = [3, 1, 2, 5];
const PREFERRED_PRODUCT_MATCHERS = [
    /bid perfect/i,
    /inform essentials\+/i,
    /^roof$/i,
    /premium - residential/i,
];
const PREFERRED_DELIVERY_MATCHERS = [/quick/i, /regular/i, /express/i, /3\s*hour/i];

// ── Types ────────────────────────────────────────────────────────────────

export interface OrderAddress {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    latitude?: number;
    longitude?: number;
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
    deliveryFilesAvailable?: Array<{ deliveryFileTypeId: number; effectiveDate?: string }>;
}

interface AvailableDeliveryProduct {
    productID: number;
    name: string;
    description?: string;
    isTemporarilyUnavailable?: boolean;
}

interface AvailableProduct {
    productID: number;
    name: string;
    description?: string;
    isTemporarilyUnavailable?: boolean;
    deliveryProducts: AvailableDeliveryProduct[];
    measurementInstructionTypes: number[];
    TypeOfStructure?: number;
    IsRoofProduct?: boolean;
    DetailedDescription?: string | null;
}

interface SelectedOrderProduct {
    primaryProductId: number;
    primaryProductName: string;
    deliveryProductId: number;
    deliveryProductName: string;
    measurementInstructionType: number;
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

    private async getAvailableProducts(): Promise<AvailableProduct[]> {
        const headers = await this.getHeaders();
        const response = await axios.get(`${BASE_URL}/v2/Product/GetAvailableProducts`, {
            headers,
            timeout: 30_000,
        });

        return Array.isArray(response.data) ? response.data : [];
    }

    private pickPreferredProduct(products: AvailableProduct[]): SelectedOrderProduct {
        const roofProducts = products.filter((product) =>
            product?.IsRoofProduct
            && !product?.isTemporarilyUnavailable
            && Array.isArray(product.deliveryProducts)
            && product.deliveryProducts.some((delivery) => !delivery?.isTemporarilyUnavailable),
        );

        const residentialRoofProducts = roofProducts.filter((product) => product.TypeOfStructure === 1);
        const candidates = residentialRoofProducts.length > 0 ? residentialRoofProducts : roofProducts;

        for (const matcher of PREFERRED_PRODUCT_MATCHERS) {
            const product = candidates.find((candidate) => matcher.test(candidate.name || candidate.description || ''));
            if (!product) continue;

            const availableDeliveries = product.deliveryProducts.filter((delivery) => !delivery?.isTemporarilyUnavailable);
            const delivery = PREFERRED_DELIVERY_MATCHERS
                .map((deliveryMatcher) => availableDeliveries.find((candidate) => deliveryMatcher.test(candidate.name || candidate.description || '')))
                .find(Boolean) || availableDeliveries[0];

            if (!delivery) continue;

            const measurementInstructionType = PREFERRED_MEASUREMENT_TYPES.find((type) =>
                Array.isArray(product.measurementInstructionTypes) && product.measurementInstructionTypes.includes(type),
            ) || product.measurementInstructionTypes?.[0];

            if (!measurementInstructionType) continue;

            return {
                primaryProductId: product.productID,
                primaryProductName: product.name,
                deliveryProductId: delivery.productID,
                deliveryProductName: delivery.name,
                measurementInstructionType,
            };
        }

        throw new ServiceUnavailableError(
            'EagleView is configured, but no supported residential roof measurement product is available for this account.',
        );
    }

    private buildOrderUnavailableError(error: any, selectedProduct?: SelectedOrderProduct): ServiceUnavailableError {
        const upstreamMessage = error?.response?.data?.fault?.faultstring
            || error?.response?.data?.message
            || error?.response?.data?.error_description
            || error?.message
            || 'Unknown EagleView error';

        logger.error('[EagleView] Place order failed', {
            status: error?.response?.status,
            data: error?.response?.data,
            selectedProduct,
        });

        if (error?.response?.status === 503) {
            return new ServiceUnavailableError(
                'EagleView sandbox order creation is currently unavailable upstream. Product lookup works, but PlaceOrder is failing inside EagleView.',
            );
        }

        return new ServiceUnavailableError(`EagleView order failed: ${upstreamMessage}`);
    }

    /**
     * POST /v2/Order/PlaceOrder
     */
    async placeOrder(address: OrderAddress, _referenceId?: string): Promise<PlaceOrderResponse> {
        logger.info('[EagleView] Placing measurement order', { address: address.addressLine1 });

        const headers = await this.getHeaders();
        const selectedProduct = this.pickPreferredProduct(await this.getAvailableProducts());

        const hasCoordinates = Number.isFinite(address.latitude) && Number.isFinite(address.longitude);
        const reportAddress = {
            Address: address.addressLine1,
            City: address.city,
            State: address.state,
            Zip: address.postalCode,
            Country: address.country || 'US',
            AddressType: 0,
            ...(hasCoordinates
                ? {
                    Latitude: address.latitude,
                    Longitude: address.longitude,
                }
                : {}),
        };

        const body = {
            OrderReports: [
                {
                    ReportAddresses: [reportAddress],
                    BuildingId: 'House',
                    PrimaryProductId: selectedProduct.primaryProductId,
                    DeliveryProductId: selectedProduct.deliveryProductId,
                    AddOnProductIds: [],
                    MeasurementInstructionType: selectedProduct.measurementInstructionType,
                    ChangesInLast4Years: false,
                    Comments: '',
                },
            ],
        };

        logger.info('[EagleView] Selected order product', selectedProduct);

        let response;
        try {
            response = await axios.post(`${BASE_URL}/v2/Order/PlaceOrder`, body, {
                headers,
                timeout: 30_000,
            });
        } catch (error: any) {
            throw this.buildOrderUnavailableError(error, selectedProduct);
        }

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
            deliveryFilesAvailable: Array.isArray(d.DeliveryFilesAvailable)
                ? d.DeliveryFilesAvailable.map((file: any) => ({
                    deliveryFileTypeId: file.DeliveryFileTypeId,
                    effectiveDate: file.EffectiveDate,
                }))
                : [],
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

    async getPrimaryAerialImageDataUrl(reportId: number, report?: ReportData): Promise<{ dataUrl: string; fileTypeId: number } | null> {
        const resolvedReport = report || await this.getReport(reportId);
        const availableFileTypes = Array.isArray(resolvedReport.deliveryFilesAvailable)
            ? resolvedReport.deliveryFilesAvailable.map((file) => file.deliveryFileTypeId)
            : [];

        const selectedFileTypeId = PREFERRED_IMAGE_FILE_TYPES.find((fileTypeId) => availableFileTypes.includes(fileTypeId));
        if (!selectedFileTypeId) {
            return null;
        }

        const headers = await this.getHeaders();
        const response = await axios.get(`${BASE_URL}/v1/File/GetReportFileAnyFormat`, {
            headers,
            params: {
                fileType: selectedFileTypeId,
                reportId,
            },
            responseType: 'arraybuffer',
            timeout: 30_000,
        });

        const rawContentType = response.headers['content-type'] || '';
        const contentType = rawContentType === 'application/octet-stream' || !rawContentType
            ? 'image/jpeg'
            : rawContentType;
        const imageBuffer = Buffer.from(response.data);
        const dataUrl = `data:${contentType};base64,${imageBuffer.toString('base64')}`;

        return {
            dataUrl,
            fileTypeId: selectedFileTypeId,
        };
    }
}

export const eagleViewMeasurementService = new EagleViewMeasurementService();
