import {
  buildClientAccessWhere,
  buildLeadAccessWhere,
  type DataAccessContext,
} from '../../common/access/data-access';
import { PERMISSIONS } from '../../common/constants/permissions';
import { logger } from '../../common/utils/logger';
import { prisma } from '../../config/database';
import { clientsService } from '../clients/clients.service';
import { leadsService } from '../leads/leads.service';
import { invoicesService } from '../invoices/invoices.service';
import { projectsService } from '../projects/projects.service';
import { quotesService } from '../quotes/quotes.service';
import { tasksService } from '../tasks/tasks.service';

type LeadsListResult = Awaited<ReturnType<typeof leadsService.getMany>>;
type ClientsListResult = Awaited<ReturnType<typeof clientsService.getMany>>;
type ProjectsListResult = Awaited<ReturnType<typeof projectsService.getMany>>;
type InvoicesListResult = Awaited<ReturnType<typeof invoicesService.getMany>>;
type QuotesListResult = Awaited<ReturnType<typeof quotesService.getMany>>;
type TaskStatsResult = Awaited<ReturnType<typeof tasksService.getStatistics>>;

interface InspectionItem {
  id: string;
  inspectionDate: Date | null;
  inspectionType?: string | null;
  totalEstimate?: number | null;
  leadId: string | null;
  clientId?: string | null;
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string | null;
    propertyAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
  client?: {
    id: string;
    clientName?: string | null;
    companyName?: string | null;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
    streetAddress?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  } | null;
}

export interface DashboardSummaryIncludes {
  includeLeads?: boolean;
  includeInvoices?: boolean;
  includeProjects?: boolean;
  includeClients?: boolean;
  includeTasks?: boolean;
  includeQuotes?: boolean;
  includeInspections?: boolean;
}

export interface DashboardSummaryDto {
  leads: LeadsListResult['data'];
  invoices: InvoicesListResult['data'];
  projects: ProjectsListResult['data'];
  quotes: QuotesListResult['data'];
  inspections: InspectionItem[];
  clients: ClientsListResult['data'];
  projectsCount: number;
  clientsCount: number;
  pendingTasks: number;
  totalEarnings: number;
}

const EMPTY_LEADS_RESULT: LeadsListResult = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const EMPTY_CLIENTS_RESULT: ClientsListResult = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const EMPTY_PROJECTS_RESULT: ProjectsListResult = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const EMPTY_INVOICES_RESULT: InvoicesListResult = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const EMPTY_QUOTES_RESULT: QuotesListResult = {
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const EMPTY_TASK_STATS: TaskStatsResult = {
  total: 0,
  todo: 0,
  inProgress: 0,
  review: 0,
  done: 0,
  overdue: 0,
};

export class DashboardService {
  private shouldLoad(
    enabled: boolean | undefined,
    permissions: Set<string>,
    permissionCode: string,
  ): boolean {
    return enabled !== false && permissions.has(permissionCode);
  }

  private async safeLoad<T>(label: string, fallback: T, loader: () => Promise<T>): Promise<T> {
    try {
      return await loader();
    } catch (error) {
      logger.warn('[DashboardService] Failed to load summary segment', {
        segment: label,
        error: error instanceof Error ? error.message : String(error),
      });
      return fallback;
    }
  }

  private async getRecentInspections(tenantId: string, dataAccess?: DataAccessContext): Promise<InspectionItem[]> {
    const leadAccessWhere = buildLeadAccessWhere(dataAccess);
    const clientAccessWhere = buildClientAccessWhere(dataAccess);
    const inspections = await prisma.leadInspection.findMany({
      where: {
        tenantId,
        inspectionDate: { not: null },
        ...(
          dataAccess?.hasFullAccess
            ? {}
            : {
                OR: [
                  ...(Object.keys(leadAccessWhere).length > 0 ? [{ lead: leadAccessWhere }] : []),
                  ...(Object.keys(clientAccessWhere).length > 0 ? [{ client: clientAccessWhere }] : []),
                ],
              }
        ),
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            propertyAddress: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        client: {
          select: {
            id: true,
            clientName: true,
            companyName: true,
            primaryEmail: true,
            primaryPhone: true,
            streetAddress: true,
            city: true,
            province: true,
            postalCode: true,
          },
        },
      },
      orderBy: [{ inspectionDate: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });

    return inspections.map((inspection) => ({
      id: inspection.id,
      inspectionDate: inspection.inspectionDate,
      inspectionType: inspection.inspectionType,
      totalEstimate: inspection.totalEstimate ? Number(inspection.totalEstimate) : null,
      leadId: inspection.leadId,
      clientId: inspection.clientId,
      lead: inspection.lead
        ? {
            id: inspection.lead.id,
            firstName: inspection.lead.firstName,
            lastName: inspection.lead.lastName,
            companyName: inspection.lead.companyName,
            propertyAddress: inspection.lead.propertyAddress,
            city: inspection.lead.city,
            state: inspection.lead.state,
            zipCode: inspection.lead.zipCode,
          }
        : null,
      client: inspection.client
        ? {
            id: inspection.client.id,
            clientName: inspection.client.clientName,
            companyName: inspection.client.companyName,
            primaryEmail: inspection.client.primaryEmail,
            primaryPhone: inspection.client.primaryPhone,
            streetAddress: inspection.client.streetAddress,
            city: inspection.client.city,
            province: inspection.client.province,
            postalCode: inspection.client.postalCode,
          }
        : null,
    }));
  }

  async getSummary(input: {
    tenantId: string;
    permissions: string[];
    dataAccess?: DataAccessContext;
    includes?: DashboardSummaryIncludes;
  }): Promise<DashboardSummaryDto> {
    const permissions = new Set(input.permissions);
    const includes = input.includes ?? {};

    const leadsPromise = this.shouldLoad(includes.includeLeads, permissions, PERMISSIONS.LEADS_VIEW)
      ? this.safeLoad('leads', EMPTY_LEADS_RESULT, () => leadsService.getMany(input.tenantId, {
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }, input.dataAccess))
      : Promise.resolve(EMPTY_LEADS_RESULT);

    const invoicesPromise = this.shouldLoad(includes.includeInvoices, permissions, PERMISSIONS.INVOICES_VIEW)
      ? this.safeLoad('invoices', EMPTY_INVOICES_RESULT, () => invoicesService.getMany(input.tenantId, {
          limit: 20,
          sortBy: 'issueDate',
          sortOrder: 'desc',
        }))
      : Promise.resolve(EMPTY_INVOICES_RESULT);

    const projectsPromise = this.shouldLoad(includes.includeProjects, permissions, PERMISSIONS.PROJECTS_VIEW)
      ? this.safeLoad('projects', EMPTY_PROJECTS_RESULT, () => projectsService.getMany(input.tenantId, {
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }, input.dataAccess))
      : Promise.resolve(EMPTY_PROJECTS_RESULT);

    const clientsPromise = this.shouldLoad(includes.includeClients, permissions, PERMISSIONS.CLIENTS_VIEW)
      ? this.safeLoad('clients', EMPTY_CLIENTS_RESULT, () => clientsService.getMany(input.tenantId, {
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }, input.dataAccess))
      : Promise.resolve(EMPTY_CLIENTS_RESULT);

    const tasksPromise = this.shouldLoad(includes.includeTasks, permissions, PERMISSIONS.TASKS_VIEW)
      ? this.safeLoad('tasks', EMPTY_TASK_STATS, () => tasksService.getStatistics(input.tenantId, input.dataAccess))
      : Promise.resolve(EMPTY_TASK_STATS);

    const quotesPromise = this.shouldLoad(includes.includeQuotes, permissions, PERMISSIONS.QUOTES_VIEW)
      ? this.safeLoad('quotes', EMPTY_QUOTES_RESULT, () => quotesService.getMany(input.tenantId, {
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }))
      : Promise.resolve(EMPTY_QUOTES_RESULT);

    const inspectionsPromise = this.shouldLoad(includes.includeInspections, permissions, PERMISSIONS.LEADS_VIEW)
      ? this.safeLoad('inspections', [], () => this.getRecentInspections(input.tenantId, input.dataAccess))
      : Promise.resolve([]);

    const [leadsResult, invoicesResult, projectsResult, clientsResult, taskStats, quotesResult, inspections] =
      await Promise.all([
        leadsPromise,
        invoicesPromise,
        projectsPromise,
        clientsPromise,
        tasksPromise,
        quotesPromise,
        inspectionsPromise,
      ]);

    const totalEarnings = invoicesResult.data
      .filter((invoice) => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

    return {
      leads: leadsResult.data,
      invoices: invoicesResult.data,
      projects: projectsResult.data,
      quotes: quotesResult.data,
      inspections,
      clients: clientsResult.data,
      projectsCount: projectsResult.meta.total,
      clientsCount: clientsResult.meta.total,
      pendingTasks: taskStats.todo + taskStats.inProgress,
      totalEarnings,
    };
  }
}

export const dashboardService = new DashboardService();
