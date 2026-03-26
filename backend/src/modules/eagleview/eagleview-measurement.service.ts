/**
 * EagleView Measurement Service
 *
 * Sandbox:
 *   POST /property/v2/request            — Start property data job
 *   GET  /property/v2/result/:jobId      — Poll for completed property data
 *   GET  /property/v2/image/:imageToken  — Fetch aerial image
 *
 * Production:
 *   POST /v2/Order/PlaceOrder            — Place measurement order
 *   GET  /v3/Report/GetReport            — Get report data (area, pitch, lengths)
 *   GET  /v1/File/GetReportFileAnyFormat — Download aerial/image file
 */

import axios from 'axios';
import { config } from '../../config';
import { ServiceUnavailableError } from '../../common/errors/HttpErrors';
import { logger } from '../../common/utils/logger';
import { eagleViewAuthService } from './eagleview-auth.service';

const BASE_URL = config.integrations.eagleview.baseUrl || 'https://sandbox.apis.eagleview.com';
const SANDBOX_PROPERTY_REQUEST_PATH = '/property/v2/request';
const SANDBOX_PROPERTY_RESULT_PATH = '/property/v2/result';
const SANDBOX_PROPERTY_IMAGE_PATH = '/property/v2/image';
const PREFERRED_IMAGE_FILE_TYPES = [6, 22, 24, 25, 23];
const PREFERRED_MEASUREMENT_TYPES = [3, 1, 2, 5];
const PREFERRED_PRODUCT_MATCHERS = [
    /bid perfect/i,
    /inform essentials\+/i,
    /^roof$/i,
    /premium - residential/i,
];
const PREFERRED_DELIVERY_MATCHERS = [/quick/i, /regular/i, /express/i, /3\s*hour/i];

type PathSegment = string | number;
type UnknownRecord = Record<string, unknown>;

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
    reportId?: number;
    jobId?: string;
    status?: string;
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
    imageUrl?: string;
    imageDataUrl?: string;
    roofType?: string;
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
    isSandboxMode(): boolean {
        return config.integrations.eagleview.environment === 'sandbox';
    }

    private async getHeaders(): Promise<Record<string, string>> {
        const token = await eagleViewAuthService.getToken();
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    private async getSandboxHeaders(): Promise<Record<string, string>> {
        const headers = await this.getHeaders();

        return {
            ...headers,
            Accept: 'application/json',
            ...(config.integrations.eagleview.apiKey ? { 'x-api-key': config.integrations.eagleview.apiKey } : {}),
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

    private formatLookupAddress(address: OrderAddress): string {
        return [
            address.addressLine1,
            address.city,
            [address.state, address.postalCode].filter(Boolean).join(' ').trim(),
            address.country || 'US',
        ]
            .filter(Boolean)
            .join(', ');
    }

    private getValueAtPath(source: unknown, path: PathSegment[]): unknown {
        let current: unknown = source;

        for (const segment of path) {
            if (current === null || current === undefined) {
                return undefined;
            }

            if (typeof segment === 'number') {
                if (!Array.isArray(current) || segment >= current.length) {
                    return undefined;
                }
                current = current[segment];
                continue;
            }

            if (typeof current !== 'object' || Array.isArray(current)) {
                return undefined;
            }

            current = (current as UnknownRecord)[segment];
        }

        return current;
    }

    private findValue(source: unknown, paths: PathSegment[][]): unknown {
        for (const path of paths) {
            const value = this.getValueAtPath(source, path);
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }

        return undefined;
    }

    private normalizeNumber(value: unknown): number | null {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
            if (!match) {
                return null;
            }

            const parsed = Number(match[0]);
            return Number.isFinite(parsed) ? parsed : null;
        }

        return null;
    }

    private readStringFromPaths(source: unknown, paths: PathSegment[][]): string | undefined {
        const value = this.findValue(source, paths);
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || undefined;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }

        return undefined;
    }

    private readNumberFromPaths(source: unknown, paths: PathSegment[][]): number | undefined {
        const value = this.findValue(source, paths);
        const parsed = this.normalizeNumber(value);
        return parsed === null ? undefined : parsed;
    }

    private hasPitchValue(report: Pick<ReportData, 'pitch' | 'pitchTable'>): boolean {
        if (report.pitch?.trim()) {
            return true;
        }

        return Array.isArray(report.pitchTable)
            && report.pitchTable.some((row) => typeof row?.Pitch === 'string' && row.Pitch.trim());
    }

    private hasRequiredMeasurementData(report: Pick<ReportData, 'area' | 'pitch' | 'pitchTable'>): boolean {
        const roofArea = this.normalizeNumber(report.area);
        return roofArea !== null && roofArea > 0 && this.hasPitchValue(report);
    }

    private assertRequiredMeasurementData(
        report: Pick<ReportData, 'area' | 'pitch' | 'pitchTable'>,
        contextMessage: string,
    ): void {
        if (!this.hasRequiredMeasurementData(report)) {
            throw new Error(contextMessage);
        }
    }

    private buildSandboxRequestBody(address: OrderAddress): { address: { completeAddress: string } } {
        const formattedAddress = this.formatLookupAddress(address);
        if (!formattedAddress) {
            throw new Error('EagleView property request failed: Missing address data');
        }

        return {
            address: {
                completeAddress: formattedAddress,
            },
        };
    }

    private toRecord(value: unknown): UnknownRecord | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        return value as UnknownRecord;
    }

    private normalizePitchValue(value: unknown): string | undefined {
        const parsed = this.normalizeNumber(value);
        if (parsed === null || parsed <= 0) {
            return undefined;
        }

        const normalized = Number.isInteger(parsed) ? String(parsed) : String(parsed);
        return `${normalized}/12`;
    }

    private parseSandboxShotDate(value: unknown): number {
        if (typeof value !== 'string' || !value.trim()) {
            return 0;
        }

        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private pickSandboxPrimaryStructure(payload: unknown): UnknownRecord {
        const structuresValue = this.getValueAtPath(payload, ['structures']);
        if (!Array.isArray(structuresValue) || structuresValue.length === 0) {
            throw new Error('EagleView lookup failed: Missing roof data');
        }

        let selectedStructure: UnknownRecord | null = null;
        let maxRoofArea = 0;

        for (const structureValue of structuresValue) {
            const structure = this.toRecord(structureValue);
            if (!structure) continue;

            const area = this.readNumberFromPaths(structure, [['roof', 'structure_roof_area', 'value']]) ?? 0;
            if (area > maxRoofArea) {
                maxRoofArea = area;
                selectedStructure = structure;
            }
        }

        if (!selectedStructure || maxRoofArea <= 0) {
            throw new Error('EagleView lookup failed: Missing roof data');
        }

        return selectedStructure;
    }

    private pickSandboxImageToken(payload: unknown, structure: UnknownRecord): string {
        const imagery = this.toRecord(this.getValueAtPath(payload, ['imagery']));
        if (!imagery) {
            throw new Error('EagleView lookup failed: Missing aerial image');
        }

        const candidateReferenceSets = [
            this.getValueAtPath(structure, ['structure_images', 'image_references']),
            this.getValueAtPath(payload, ['property_images', 'image_references']),
        ];

        const rankedImages = candidateReferenceSets
            .flatMap((referenceSet) => Array.isArray(referenceSet) ? referenceSet : [])
            .map((reference) => typeof reference === 'string' ? reference : '')
            .filter(Boolean)
            .map((reference) => {
                const image = this.toRecord(imagery[reference]);
                const metadata = this.toRecord(image?.metadata);
                const token = typeof image?.image_token === 'string' ? image.image_token.trim() : '';
                if (!token || !metadata) {
                    return null;
                }

                const view = typeof metadata.view === 'string' ? metadata.view.toLowerCase() : '';
                const masked = metadata.masked === true;
                const score = [
                    view === 'ortho' ? 100 : 0,
                    !masked ? 20 : 0,
                    this.parseSandboxShotDate(metadata.shot_date),
                ];

                return {
                    token,
                    score,
                };
            })
            .filter((image): image is { token: string; score: number[] } => Boolean(image))
            .sort((left, right) => {
                for (let index = 0; index < left.score.length; index += 1) {
                    if (left.score[index] !== right.score[index]) {
                        return right.score[index] - left.score[index];
                    }
                }

                return 0;
            });

        if (!rankedImages.length) {
            throw new Error('EagleView lookup failed: Missing aerial image');
        }

        return rankedImages[0].token;
    }

    private async fetchSandboxImageDataUrl(imageToken: string): Promise<string> {
        const response = await axios.get(`${BASE_URL}${SANDBOX_PROPERTY_IMAGE_PATH}/${encodeURIComponent(imageToken)}`, {
            headers: await this.getSandboxHeaders(),
            responseType: 'arraybuffer',
            timeout: 30_000,
        });

        const rawContentType = response.headers['content-type'] || '';
        const contentType = rawContentType === 'application/octet-stream' || !rawContentType
            ? 'image/jpeg'
            : rawContentType;

        return `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;
    }

    private mapSandboxResultPayload(payload: unknown, imageDataUrl: string): ReportData {
        const responseAddress = this.toRecord(this.getValueAtPath(payload, ['response_address']));
        const responseCoordinates = this.toRecord(this.getValueAtPath(payload, ['response_coordinates']));
        const request = this.toRecord(this.getValueAtPath(payload, ['request']));
        const structure = this.pickSandboxPrimaryStructure(payload);
        const roof = this.toRecord(this.getValueAtPath(structure, ['roof']));
        const roofArea = this.readNumberFromPaths(structure, [['roof', 'structure_roof_area', 'value']]);
        const roofSquares = this.readNumberFromPaths(structure, [['roof', 'structure_roof_area_squares', 'value']]);
        const pitch = this.normalizePitchValue(this.getValueAtPath(structure, ['roof', 'structure_roof_predominant_pitch', 'value']));
        const roofType = this.readStringFromPaths(structure, [['roof', 'structure_roof_shape', 'value']]);
        const roofFacetCount = this.readNumberFromPaths(structure, [['roof', 'structure_roof_facet_count', 'value']])
            ?? (Array.isArray(roof?.structure_roof_facets) ? roof.structure_roof_facets.length : undefined);

        const report: ReportData = {
            jobId: typeof request?.id === 'string' ? request.id : undefined,
            status: typeof request?.status === 'string' ? request.status : undefined,
            street: typeof responseAddress?.line1 === 'string' ? responseAddress.line1 : undefined,
            city: typeof responseAddress?.locality === 'string' ? responseAddress.locality : undefined,
            state: typeof responseAddress?.admin1 === 'string' ? responseAddress.admin1 : undefined,
            zip: typeof responseAddress?.zip === 'string' ? responseAddress.zip : undefined,
            latitude: typeof responseCoordinates?.lat === 'number' ? responseCoordinates.lat : undefined,
            longitude: typeof responseCoordinates?.lon === 'number' ? responseCoordinates.lon : undefined,
            area: roofArea !== undefined ? `${roofArea} sq ft` : undefined,
            pitch,
            roofType,
            imageDataUrl,
            imageUrl: imageDataUrl,
            totalRoofFacets: roofFacetCount !== undefined ? String(roofFacetCount) : undefined,
            measurementByStructure: Array.isArray(this.getValueAtPath(payload, ['structures']))
                ? this.getValueAtPath(payload, ['structures']) as any[]
                : undefined,
            pitchTable: roofArea !== undefined && pitch
                ? [{
                    Pitch: pitch,
                    RoofArea: String(roofArea),
                    PercentageRoofArea: roofSquares !== undefined && roofSquares > 0 ? '100' : '',
                }]
                : undefined,
        };

        this.assertRequiredMeasurementData(report, 'EagleView lookup failed: Missing roof data');
        if (!report.imageDataUrl) {
            throw new Error('EagleView lookup failed: Missing aerial image');
        }

        return report;
    }

    private async createSandboxPropertyRequest(address: OrderAddress): Promise<string> {
        const body = this.buildSandboxRequestBody(address);
        logger.info('[EagleView] Creating sandbox property request', {
            address: body.address.completeAddress,
            baseUrl: BASE_URL,
        });

        const response = await axios.post(`${BASE_URL}${SANDBOX_PROPERTY_REQUEST_PATH}`, body, {
            headers: await this.getSandboxHeaders(),
            timeout: 30_000,
        });

        const jobId = this.readStringFromPaths(response.data, [['request', 'id']]);
        if (!jobId) {
            logger.error('[EagleView] Sandbox property request returned invalid payload', {
                data: response.data,
            });
            throw new Error('EagleView property request failed: Missing job id');
        }

        return jobId;
    }

    private async getSandboxPropertyResult(jobId: string): Promise<unknown> {
        const response = await axios.get(`${BASE_URL}${SANDBOX_PROPERTY_RESULT_PATH}/${encodeURIComponent(jobId)}`, {
            headers: await this.getSandboxHeaders(),
            timeout: 30_000,
        });

        return response.data;
    }

    async lookupProperty(address: OrderAddress, maxRetries = 6, pollIntervalMs = 3000): Promise<ReportData> {
        const jobId = await this.createSandboxPropertyRequest(address);
        logger.info('[EagleView] Polling sandbox property result', { jobId, maxRetries });

        let latestPayload: unknown;
        let latestStatus = '';

        try {
            for (let attempt = 0; attempt < maxRetries; attempt += 1) {
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                latestPayload = await this.getSandboxPropertyResult(jobId);
                latestStatus = this.readStringFromPaths(latestPayload, [['request', 'status']]) || '';

                if (/complete/i.test(latestStatus)) {
                    const structure = this.pickSandboxPrimaryStructure(latestPayload);
                    const imageToken = this.pickSandboxImageToken(latestPayload, structure);
                    const imageDataUrl = await this.fetchSandboxImageDataUrl(imageToken);
                    const report = this.mapSandboxResultPayload(latestPayload, imageDataUrl);

                    logger.info('[EagleView] Sandbox property result completed', {
                        jobId,
                        area: report.area,
                        pitch: report.pitch,
                        roofType: report.roofType,
                    });

                    return report;
                }

                if (/failed|error|cancel/i.test(latestStatus)) {
                    throw new Error(`EagleView property result failed with status: ${latestStatus}`);
                }

                logger.info('[EagleView] Sandbox property result still processing', {
                    jobId,
                    attempt: attempt + 1,
                    status: latestStatus || 'Unknown',
                });
            }

            throw new Error(`EagleView property result did not complete in time. Last status: ${latestStatus || 'Unknown'}`);
        } catch (error: any) {
            logger.error('[EagleView] Sandbox property lookup failed', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
                jobId,
            });
            throw error;
        }
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

    async getInstantMeasurement(address: OrderAddress): Promise<ReportData> {
        if (this.isSandboxMode()) {
            return this.lookupProperty(address);
        }

        return this.placeOrderAndWait(address);
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

        let latestReport: ReportData | null = null;

        for (let i = 0; i < maxRetries; i++) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

            latestReport = await this.getReport(reportId);
            if (this.hasRequiredMeasurementData(latestReport)) {
                logger.info('[EagleView] Report completed', {
                    reportId,
                    area: latestReport.area,
                    pitch: latestReport.pitch,
                });
                return latestReport;
            }

            logger.info('[EagleView] Still processing', {
                reportId,
                attempt: i + 1,
                status: latestReport.status,
                area: latestReport.area,
                pitch: latestReport.pitch,
            });
        }

        latestReport = latestReport || await this.getReport(reportId);
        this.assertRequiredMeasurementData(
            latestReport,
            'EagleView report failed: Missing roof data',
        );

        return latestReport;
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
