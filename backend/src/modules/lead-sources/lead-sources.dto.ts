// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateLeadSourceDto {
  name: string;
  description?: string | null;
  isActive?: boolean;

  sourceType?: string;
  category?: string;
  icon?: string | null;
  color?: string | null;

  integrationConfig?: any;
  apiEndpoint?: string | null;

  costPerLead?: number | null;
  monthlyBudget?: number | null;

  autoAssign?: boolean;
  assignmentMethod?: string;
  assignedUserId?: string | null;
  assignedTeamId?: string | null;
  territoryRules?: any;

  sendWelcomeEmail?: boolean;
  sendWelcomeSms?: boolean;
  createFollowupTask?: boolean;
  followupDelayMinutes?: number;
  notifyAssignee?: boolean;
  notificationChannels?: string[];

  fieldMapping?: any;
  defaultValues?: any;

  status?: string;
}

export interface UpdateLeadSourceDto {
  name?: string;
  description?: string | null;
  isActive?: boolean;

  sourceType?: string;
  category?: string;
  icon?: string | null;
  color?: string | null;

  integrationConfig?: any;
  apiEndpoint?: string | null;

  costPerLead?: number | null;
  monthlyBudget?: number | null;

  autoAssign?: boolean;
  assignmentMethod?: string;
  assignedUserId?: string | null;
  assignedTeamId?: string | null;
  territoryRules?: any;

  sendWelcomeEmail?: boolean;
  sendWelcomeSms?: boolean;
  createFollowupTask?: boolean;
  followupDelayMinutes?: number;
  notifyAssignee?: boolean;
  notificationChannels?: string[];

  fieldMapping?: any;
  defaultValues?: any;

  status?: string;
}

export interface LeadSourceQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sourceType?: string;
  category?: string;
  status?: string;
  integrationStatus?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface LeadSourceResponseDto {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  isActive: boolean;

  sourceType: string;
  category: string;
  icon?: string | null;
  color?: string | null;

  integrationStatus: string;
  integrationConfig?: any;
  webhookUrl?: string | null;
  apiEndpoint?: string | null;

  externalAccountId?: string | null;
  externalAccountName?: string | null;

  costPerLead?: number | null;
  monthlyBudget?: number | null;
  autoSyncCost: boolean;

  autoAssign: boolean;
  assignmentMethod: string;
  assignedUserId?: string | null;
  assignedTeamId?: string | null;
  territoryRules?: any;

  sendWelcomeEmail: boolean;
  sendWelcomeSms: boolean;
  createFollowupTask: boolean;
  followupDelayMinutes: number;
  notifyAssignee: boolean;
  notificationChannels: string[];

  fieldMapping?: any;
  defaultValues?: any;

  totalLeads: number;
  convertedLeads: number;
  totalRevenue?: number | null;
  lastLeadAt?: Date | null;

  status: string;
  lastSyncAt?: Date | null;
  lastError?: string | null;
  lastErrorAt?: Date | null;
  errorCount: number;

  leadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadSourceWithStatsDto extends LeadSourceResponseDto {
  leadCount: number;
  convertedCount: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadSourceListResponseDto {
  data: LeadSourceResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface LeadSourceLogResponseDto {
  id: string;
  leadSourceId: string;
  eventType: string;
  status: string;
  direction: string;
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string | null;
  processingTimeMs?: number | null;
  leadId?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
}

// ============================================================================
// MAPPER
// ============================================================================

export function toLeadSourceResponseDto(source: any): LeadSourceResponseDto {
  return {
    id: source.id,
    name: source.name,
    slug: source.slug || null,
    description: source.description || undefined,
    isActive: source.isActive ?? true,

    sourceType: source.sourceType || 'WEBSITE',
    category: source.category || 'DIGITAL',
    icon: source.icon || null,
    color: source.color || null,

    integrationStatus: source.integrationStatus || 'DISCONNECTED',
    integrationConfig: source.integrationConfig || null,
    webhookUrl: source.webhookUrl || null,
    apiEndpoint: source.apiEndpoint || null,

    externalAccountId: source.externalAccountId || null,
    externalAccountName: source.externalAccountName || null,

    costPerLead: source.costPerLead ? Number(source.costPerLead) : null,
    monthlyBudget: source.monthlyBudget ? Number(source.monthlyBudget) : null,
    autoSyncCost: source.autoSyncCost ?? false,

    autoAssign: source.autoAssign ?? false,
    assignmentMethod: source.assignmentMethod || 'MANUAL_ASSIGN',
    assignedUserId: source.assignedUserId || null,
    assignedTeamId: source.assignedTeamId || null,
    territoryRules: source.territoryRules || null,

    sendWelcomeEmail: source.sendWelcomeEmail ?? false,
    sendWelcomeSms: source.sendWelcomeSms ?? false,
    createFollowupTask: source.createFollowupTask ?? true,
    followupDelayMinutes: source.followupDelayMinutes ?? 30,
    notifyAssignee: source.notifyAssignee ?? true,
    notificationChannels: source.notificationChannels || ['email', 'in_app'],

    fieldMapping: source.fieldMapping || null,
    defaultValues: source.defaultValues || null,

    totalLeads: source.totalLeads ?? 0,
    convertedLeads: source.convertedLeads ?? 0,
    totalRevenue: source.totalRevenue ? Number(source.totalRevenue) : null,
    lastLeadAt: source.lastLeadAt || null,

    status: source.status || 'ACTIVE',
    lastSyncAt: source.lastSyncAt || null,
    lastError: source.lastError || null,
    lastErrorAt: source.lastErrorAt || null,
    errorCount: source.errorCount ?? 0,

    leadCount: source._count?.leads ?? 0,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}