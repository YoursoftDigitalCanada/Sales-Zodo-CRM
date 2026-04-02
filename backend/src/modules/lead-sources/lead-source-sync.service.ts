import axios from 'axios';
import { LeadSource, LeadStatus, LeadTemperature, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';
import { UnauthorizedError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { leadsService } from '../leads/leads.service';
import { CreateLeadDto } from '../leads/leads.dto';
import { leadSourcesRepository } from './lead-sources.repository';

interface SyncResult {
  sourceId: string;
  imported: number;
  skipped: number;
  failed: number;
  totalReceived: number;
  errors: string[];
}

interface SyncSummary {
  processed: number;
  succeeded: number;
  failed: number;
  imported: number;
}

type HeaderBag = Record<string, string | string[] | undefined>;

const SYNC_EVENT = 'sync_pull';
const WEBHOOK_EVENT = 'webhook_received';

export class LeadSourceSyncService {
  private readonly syncTimeoutMs = 15000;

  /**
   * Auto-connect sources configured with an API endpoint.
   * Intended for fire-and-forget usage after create/update.
   */
  async maybeAutoConnectAndSync(sourceId: string, tenantId: string): Promise<void> {
    const source = await leadSourcesRepository.findById(sourceId, tenantId);
    if (!source) return;
    if (!source.apiEndpoint || !source.isActive || source.status !== 'ACTIVE') return;

    try {
      await this.syncSourceById(sourceId, tenantId, 'auto_connect');
    } catch (error) {
      logger.warn('[LeadSourceSync] Auto-connect sync failed', {
        sourceId,
        tenantId,
        error: (error as Error)?.message || String(error),
      });
    }
  }

  /**
   * Sync one source from its configured external API.
   */
  async syncSourceById(
    sourceId: string,
    tenantId: string,
    trigger: 'auto_connect' | 'manual' | 'scheduled' | 'connection_test' = 'manual'
  ): Promise<SyncResult> {
    const source = await leadSourcesRepository.findById(sourceId, tenantId);
    if (!source) {
      throw new Error('Lead source not found');
    }
    if (!source.apiEndpoint) {
      throw new Error('API endpoint is required to sync this source');
    }

    const updateConnecting =
      source.integrationStatus !== 'CONNECTED' && source.integrationStatus !== 'CONNECTING';

    if (updateConnecting) {
      await prisma.leadSource.update({
        where: { id_tenantId: { id: source.id, tenantId: source.tenantId } },
        data: { integrationStatus: 'CONNECTING' },
      });
    }

    try {
      const payload = await this.pullFromExternalApi(source);
      const result = await this.ingestPayload(source, payload, SYNC_EVENT);

      await Promise.all([
        prisma.leadSource.update({
          where: { id_tenantId: { id: source.id, tenantId: source.tenantId } },
          data: {
            integrationStatus: 'CONNECTED',
            lastSyncAt: new Date(),
            lastError: null,
            lastErrorAt: null,
            errorCount: result.failed > 0 ? { increment: 1 } : 0,
          },
        }),
        leadSourcesRepository.updateStats(source.id, source.tenantId),
        leadSourcesRepository.createLog({
          leadSourceId: source.id,
          eventType: SYNC_EVENT,
          status: result.failed > 0 ? 'partial' : 'success',
          direction: 'inbound',
          responsePayload: {
            trigger,
            imported: result.imported,
            skipped: result.skipped,
            failed: result.failed,
            totalReceived: result.totalReceived,
          },
        }),
      ]);

      return result;
    } catch (error) {
      const message = this.toSafeErrorMessage(error);
      await Promise.all([
        prisma.leadSource.update({
          where: { id_tenantId: { id: source.id, tenantId: source.tenantId } },
          data: {
            integrationStatus: 'ERROR',
            lastError: message,
            lastErrorAt: new Date(),
            errorCount: { increment: 1 },
          },
        }),
        leadSourcesRepository.createLog({
          leadSourceId: source.id,
          eventType: SYNC_EVENT,
          status: 'failed',
          direction: 'inbound',
          errorMessage: message,
          responsePayload: { trigger },
        }),
      ]);
      throw error;
    }
  }

  /**
   * Sync all connected API sources.
   */
  async syncConnectedSources(limit = 25): Promise<SyncSummary> {
    const candidates = await prisma.leadSource.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
        apiEndpoint: { not: null },
        integrationStatus: { in: ['CONNECTED', 'CONNECTING', 'ERROR'] },
      },
      select: {
        id: true,
        tenantId: true,
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });

    const summary: SyncSummary = {
      processed: candidates.length,
      succeeded: 0,
      failed: 0,
      imported: 0,
    };

    for (const candidate of candidates) {
      try {
        const result = await this.syncSourceById(candidate.id, candidate.tenantId, 'scheduled');
        summary.succeeded += 1;
        summary.imported += result.imported;
      } catch (error) {
        summary.failed += 1;
        logger.warn('[LeadSourceSync] Scheduled sync failed', {
          sourceId: candidate.id,
          tenantId: candidate.tenantId,
          error: (error as Error)?.message || String(error),
        });
      }
    }

    return summary;
  }

  /**
   * Public webhook receiver handler.
   */
  async ingestWebhook(
    sourceId: string,
    payload: unknown,
    headers: HeaderBag,
    querySecret?: string
  ): Promise<SyncResult> {
    const source = await prisma.leadSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) {
      throw new Error('Lead source not found');
    }
    this.assertWebhookSecret(source, headers, querySecret);

    try {
      const result = await this.ingestPayload(source, payload, WEBHOOK_EVENT);

      await Promise.all([
        prisma.leadSource.update({
          where: { id_tenantId: { id: source.id, tenantId: source.tenantId } },
          data: {
            integrationStatus: 'CONNECTED',
            lastSyncAt: new Date(),
            lastError: null,
            lastErrorAt: null,
          },
        }),
        leadSourcesRepository.updateStats(source.id, source.tenantId),
        leadSourcesRepository.createLog({
          leadSourceId: source.id,
          eventType: WEBHOOK_EVENT,
          status: result.failed > 0 ? 'partial' : 'success',
          direction: 'inbound',
          requestPayload: this.toLogPayload(payload),
          responsePayload: {
            imported: result.imported,
            skipped: result.skipped,
            failed: result.failed,
            totalReceived: result.totalReceived,
          },
        }),
      ]);

      return result;
    } catch (error) {
      const message = this.toSafeErrorMessage(error);
      await Promise.all([
        prisma.leadSource.update({
          where: { id_tenantId: { id: source.id, tenantId: source.tenantId } },
          data: {
            integrationStatus: 'ERROR',
            lastError: message,
            lastErrorAt: new Date(),
            errorCount: { increment: 1 },
          },
        }),
        leadSourcesRepository.createLog({
          leadSourceId: source.id,
          eventType: WEBHOOK_EVENT,
          status: 'failed',
          direction: 'inbound',
          requestPayload: this.toLogPayload(payload),
          errorMessage: message,
        }),
      ]);
      throw error;
    }
  }

  private async pullFromExternalApi(source: LeadSource): Promise<unknown> {
    const config = this.asRecord(source.integrationConfig);
    const method = (this.toString(config.requestMethod) || 'GET').toUpperCase();
    const params = this.asRecord(config.queryParams);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(this.asStringRecord(config.headers)),
    };

    this.applyAuth(headers, params, config);

    // Optional incremental sync if provider supports it
    const sinceParam = this.toString(config.sinceParam);
    if (sinceParam && source.lastSyncAt) {
      params[sinceParam] = source.lastSyncAt.toISOString();
    }

    const response = await axios.request({
      method,
      url: source.apiEndpoint || undefined,
      timeout: this.syncTimeoutMs,
      headers,
      params,
      data: this.asRecord(config.requestBody),
    });

    return response.data;
  }

  private async ingestPayload(source: LeadSource, payload: unknown, eventType: string): Promise<SyncResult> {
    const config = this.asRecord(source.integrationConfig);
    const rawLeads = this.extractLeads(payload, this.toString(config.leadsPath));

    const result: SyncResult = {
      sourceId: source.id,
      imported: 0,
      skipped: 0,
      failed: 0,
      totalReceived: rawLeads.length,
      errors: [],
    };

    for (let i = 0; i < rawLeads.length; i += 1) {
      const raw = rawLeads[i];
      try {
        const dto = this.mapToCreateLeadDto(source, raw);
        if (!dto) {
          result.skipped += 1;
          continue;
        }

        const duplicate = await this.isDuplicate(source.tenantId, source.id, dto);
        if (duplicate) {
          result.skipped += 1;
          continue;
        }

        await leadsService.create(source.tenantId, dto as any);
        result.imported += 1;
      } catch (error) {
        result.failed += 1;
        const message = this.toSafeErrorMessage(error);
        if (result.errors.length < 20) {
          result.errors.push(`Row ${i + 1}: ${message}`);
        }
      }
    }

    logger.info('[LeadSourceSync] Payload ingested', {
      sourceId: source.id,
      tenantId: source.tenantId,
      eventType,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      totalReceived: result.totalReceived,
    });

    return result;
  }

  private mapToCreateLeadDto(source: LeadSource, rawLead: unknown): CreateLeadDto | null {
    if (!this.isRecord(rawLead)) return null;

    const integrationConfig = this.asRecord(source.integrationConfig);
    const mapping = this.buildFieldMapping(source.fieldMapping, integrationConfig);
    const defaults: Record<string, unknown> = {
      ...this.asRecord(integrationConfig.defaultValues),
      ...this.asRecord(source.defaultValues),
    };

    const fullName = this.toString(this.pick(rawLead, mapping, 'fullName', ['fullName', 'full_name', 'name']));
    let firstName = this.toString(this.pick(rawLead, mapping, 'firstName', ['firstName', 'first_name', 'firstname']));
    let lastName = this.toString(this.pick(rawLead, mapping, 'lastName', ['lastName', 'last_name', 'lastname']));

    if ((!firstName || !lastName) && fullName) {
      const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);
      if (!firstName) firstName = first || undefined;
      if (!lastName) lastName = rest.join(' ') || undefined;
    }

    const email = this.toString(this.pick(rawLead, mapping, 'email', ['email', 'emailAddress', 'email_address']));
    const phone = this.toString(this.pick(rawLead, mapping, 'phone', ['phone', 'phoneNumber', 'phone_number', 'mobile']));

    if (!firstName && email) {
      firstName = email.split('@')[0] || undefined;
    }
    if (!firstName) firstName = this.toString(defaults.firstName) || 'Unknown';
    if (!lastName) lastName = this.toString(defaults.lastName) || 'Lead';

    const potentialValue = this.toNumber(this.pick(rawLead, mapping, 'potentialValue', ['potentialValue', 'value', 'amount', 'budget']));
    const status = this.parseLeadStatus(this.toString(this.pick(rawLead, mapping, 'status', ['status'])));
    const temperature = this.parseLeadTemperature(
      this.toString(this.pick(rawLead, mapping, 'temperature', ['temperature']))
    );

    const sourceNote = this.toString(this.pick(rawLead, mapping, 'notes', ['notes', 'message', 'description']));
    const externalId = this.toString(this.pick(rawLead, mapping, 'externalId', ['externalId', 'external_id', 'id', 'leadId']));
    const notes = [sourceNote, externalId ? `External ID: ${externalId}` : null]
      .filter(Boolean)
      .join('\n')
      .trim();

    return {
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      companyName: this.toString(this.pick(rawLead, mapping, 'companyName', ['companyName', 'company', 'company_name'])) || undefined,
      jobTitle: this.toString(this.pick(rawLead, mapping, 'jobTitle', ['jobTitle', 'title', 'job_title'])) || undefined,
      website: this.toString(this.pick(rawLead, mapping, 'website', ['website', 'url'])) || undefined,
      location: this.toString(this.pick(rawLead, mapping, 'location', ['location', 'address'])) || undefined,
      leadSourceId: source.id,
      leadSourceUTM: source.name,
      notes: notes || undefined,
      potentialValue: potentialValue ?? undefined,
      status: status || undefined,
      temperature: temperature || undefined,
    };
  }

  private async isDuplicate(tenantId: string, leadSourceId: string, lead: CreateLeadDto): Promise<boolean> {
    const orWhere: Prisma.LeadWhereInput[] = [];
    if (lead.email) {
      orWhere.push({ email: { equals: lead.email, mode: 'insensitive' } });
    }
    if (lead.phone) {
      orWhere.push({ phone: lead.phone });
    }

    if (!orWhere.length) return false;

    const existing = await prisma.lead.findFirst({
      where: {
        tenantId,
        leadSourceId,
        OR: orWhere,
      },
      select: { id: true },
    });

    return !!existing;
  }

  private extractLeads(payload: unknown, configuredPath?: string): unknown[] {
    if (configuredPath) {
      const byPath = this.getByPath(payload, configuredPath);
      if (Array.isArray(byPath)) return byPath;
    }

    if (Array.isArray(payload)) return payload;
    if (!this.isRecord(payload)) return [];

    const candidates: unknown[] = [
      payload.leads,
      payload.items,
      payload.results,
      payload.data,
      this.getByPath(payload, 'data.leads'),
      this.getByPath(payload, 'data.items'),
      this.getByPath(payload, 'data.results'),
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    // Accept single lead object payloads
    if (this.looksLikeLead(payload)) return [payload];

    return [];
  }

  private looksLikeLead(obj: Record<string, unknown>): boolean {
    const keys = Object.keys(obj);
    return keys.includes('email') || keys.includes('phone') || keys.includes('firstName') || keys.includes('first_name');
  }

  private pick(
    rawLead: Record<string, unknown>,
    mapping: Record<string, unknown>,
    internalField: string,
    fallbackPaths: string[]
  ): unknown {
    const mappedPath = mapping[internalField];
    if (typeof mappedPath === 'string') {
      const mappedValue = this.getByPath(rawLead, mappedPath);
      if (mappedValue !== undefined && mappedValue !== null && mappedValue !== '') return mappedValue;
    }

    for (const path of fallbackPaths) {
      const value = this.getByPath(rawLead, path);
      if (value !== undefined && value !== null && value !== '') return value;
    }

      return undefined;
  }

  private buildFieldMapping(
    sourceFieldMapping: unknown,
    integrationConfig: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      ...this.asRecord(sourceFieldMapping),
      ...this.asRecord(integrationConfig.fieldMapping),
      ...this.convertFieldMappingRows(
        integrationConfig.field_mapping_rows || integrationConfig.fieldMappingRows
      ),
    };
  }

  private convertFieldMappingRows(rowsValue: unknown): Record<string, string> {
    if (!Array.isArray(rowsValue)) return {};

    const crmFieldLabelToKey: Record<string, string> = {
      'Full Name': 'fullName',
      'First Name': 'firstName',
      'Last Name': 'lastName',
      Email: 'email',
      Phone: 'phone',
      'Phone (Secondary)': 'phoneSecondary',
      Company: 'companyName',
      'Job Title': 'jobTitle',
      'Address Line 1': 'location',
      'Address Line 2': 'locationLine2',
      City: 'city',
      State: 'state',
      'Zip Code': 'zipCode',
      Website: 'website',
      'Potential Value': 'potentialValue',
      Status: 'status',
      Temperature: 'temperature',
      'Service Needed': 'serviceNeeded',
      'Property Type': 'propertyType',
      Urgency: 'urgency',
      'Message/Notes': 'notes',
      'External ID': 'externalId',
    };

    return rowsValue.reduce<Record<string, string>>((acc, row) => {
      if (!this.isRecord(row)) return acc;
      const crmField = this.toString(row.crm);
      const sourceField = this.toString(row.form);
      if (!crmField || !sourceField || crmField === '-- Ignore --') return acc;

      const internalKey = crmFieldLabelToKey[crmField];
      if (!internalKey) return acc;

      acc[internalKey] = sourceField;
      return acc;
    }, {});
  }

  private applyAuth(
    headers: Record<string, string>,
    params: Record<string, unknown>,
    config: Record<string, unknown>
  ): void {
    const authType = (this.toString(config.authType) || '').toLowerCase();
    const token =
      this.toString(config.apiKey)
      || this.toString(config.api_key)
      || this.toString(config.bearerToken)
      || this.toString(config.token)
      || this.toString(config.accessToken);

    if (!token) return;

    if (authType === 'query') {
      const queryParam = this.toString(config.authQueryParam) || 'api_key';
      params[queryParam] = token;
      return;
    }

    if (authType === 'header') {
      const headerName = this.toString(config.apiKeyHeader) || 'X-API-Key';
      headers[headerName] = token;
      return;
    }

    const configuredHeader = this.toString(config.apiKeyHeader);
    if (configuredHeader && configuredHeader.toLowerCase() !== 'authorization') {
      headers[configuredHeader] = token;
      return;
    }

    headers.Authorization = `Bearer ${token}`;
  }

  private assertWebhookSecret(source: LeadSource, headers: HeaderBag, querySecret?: string): void {
    const requiredSecret = source.webhookSecret;
    if (!requiredSecret) return;

    const headerSecret =
      this.getHeader(headers, 'x-webhook-secret')
      || this.getHeader(headers, 'x-api-key')
      || this.extractBearer(this.getHeader(headers, 'authorization'));
    const providedSecret = headerSecret || querySecret;

    if (!providedSecret || providedSecret !== requiredSecret) {
      throw new UnauthorizedError('Invalid webhook secret', ErrorCodes.AUTH_TOKEN_INVALID);
    }
  }

  private getHeader(headers: HeaderBag, key: string): string | undefined {
    const value = headers[key];
    if (Array.isArray(value)) return value[0];
    return typeof value === 'string' ? value : undefined;
  }

  private extractBearer(authHeader?: string): string | undefined {
    if (!authHeader) return undefined;
    const [scheme, token] = authHeader.split(' ');
    if (!scheme || !token) return undefined;
    return scheme.toLowerCase() === 'bearer' ? token : undefined;
  }

  private parseLeadStatus(value?: string): LeadStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toUpperCase() as LeadStatus;
    const allowed: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    return allowed.includes(normalized) ? normalized : undefined;
  }

  private parseLeadTemperature(value?: string): LeadTemperature | undefined {
    if (!value) return undefined;
    const normalized = value.toUpperCase() as LeadTemperature;
    const allowed: LeadTemperature[] = ['COLD', 'WARM', 'HOT'];
    return allowed.includes(normalized) ? normalized : undefined;
  }

  private toSafeErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 1000);
  }

  private toLogPayload(payload: unknown): Record<string, unknown> | undefined {
    if (!this.isRecord(payload)) return undefined;

    // Avoid storing very large payloads
    const keys = Object.keys(payload).slice(0, 50);
    const compact: Record<string, unknown> = {};
    for (const key of keys) {
      compact[key] = payload[key];
    }
    return compact;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (this.isRecord(value)) return value;
    return {};
  }

  private asStringRecord(value: unknown): Record<string, string> {
    if (!this.isRecord(value)) return {};
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(value)) {
      const str = this.toString(val);
      if (str) out[key] = str;
    }
    return out;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private getByPath(obj: unknown, path: string): unknown {
    if (!path) return undefined;
    const segments = path.split('.');
    let cursor: unknown = obj;

    for (const segment of segments) {
      if (!this.isRecord(cursor)) return undefined;
      cursor = cursor[segment];
    }

    return cursor;
  }

  private toString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return undefined;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}

export const leadSourceSyncService = new LeadSourceSyncService();
