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
    slug: source.slug,
    description: source.description || undefined,
    isActive: source.isActive,

    sourceType: source.sourceType,
    category: source.category,
    icon: source.icon,
    color: source.color,

    integrationStatus: source.integrationStatus,
    integrationConfig: source.integrationConfig,
    webhookUrl: source.webhookUrl,
    apiEndpoint: source.apiEndpoint,

    externalAccountId: source.externalAccountId,
    externalAccountName: source.externalAccountName,

    costPerLead: source.costPerLead ? Number(source.costPerLead) : null,
    monthlyBudget: source.monthlyBudget ? Number(source.monthlyBudget) : null,
    autoSyncCost: source.autoSyncCost,

    autoAssign: source.autoAssign,
    assignmentMethod: source.assignmentMethod,
    assignedUserId: source.assignedUserId,
    assignedTeamId: source.assignedTeamId,
    territoryRules: source.territoryRules,

    sendWelcomeEmail: source.sendWelcomeEmail,
    sendWelcomeSms: source.sendWelcomeSms,
    createFollowupTask: source.createFollowupTask,
    followupDelayMinutes: source.followupDelayMinutes,
    notifyAssignee: source.notifyAssignee,
    notificationChannels: source.notificationChannels,

    fieldMapping: source.fieldMapping,
    defaultValues: source.defaultValues,

    totalLeads: source.totalLeads,
    convertedLeads: source.convertedLeads,
    totalRevenue: source.totalRevenue ? Number(source.totalRevenue) : null,
    lastLeadAt: source.lastLeadAt,

    status: source.status,
    lastSyncAt: source.lastSyncAt,
    lastError: source.lastError,
    lastErrorAt: source.lastErrorAt,
    errorCount: source.errorCount,

    leadCount: source._count?.leads,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}