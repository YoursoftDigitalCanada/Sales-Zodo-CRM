import { AuditAction } from '@prisma/client';

/**
 * Audit Log DTOs
 */

// ============================================================================
// REQUEST DTOs
// ============================================================================

export interface CreateAuditLogDto {
  action: AuditAction;
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
}

export interface AuditLogQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  action?: AuditAction;
  module?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface AuditLogResponseDto {
  id: string;
  action: AuditAction;
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
}

export interface AuditLogListResponseDto {
  data: AuditLogResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// AUDIT CONTEXT (for middleware)
// ============================================================================

export interface AuditContext {
  userId?: string;
  tenantId: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
}