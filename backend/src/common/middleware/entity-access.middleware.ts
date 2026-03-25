import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { NotFoundError } from '../errors/HttpErrors';
import { ErrorCodes } from '../errors/errorCodes';
import {
  buildClientAccessWhere,
  buildLeadAccessWhere,
  buildProjectAccessWhere,
  buildTaskAccessWhere,
  mergeWhereWithAccess,
} from '../access/data-access';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined): boolean {
  return Boolean(value && UUID_PATTERN.test(value));
}

type ParamName = string;

function createEntityAccessMiddleware(
  entityLabel: string,
  paramName: ParamName,
  findAccessible: (req: Request, id: string) => Promise<boolean>,
) {
  return async function requireEntityAccess(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.dataAccess?.hasFullAccess) {
        return next();
      }

      const id = req.params[paramName];
      if (!isUuid(id)) {
        return next();
      }

      const isAccessible = await findAccessible(req, id);
      if (!isAccessible) {
        throw new NotFoundError(`${entityLabel} not found`, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAccessibleClient(paramName: ParamName = 'id') {
  return createEntityAccessMiddleware('Client', paramName, async (req, id) => {
    const where = mergeWhereWithAccess(
      { id, tenantId: req.context.tenantId },
      buildClientAccessWhere(req.dataAccess),
    );

    const client = await prisma.client.findFirst({
      where,
      select: { id: true },
    });

    return Boolean(client);
  });
}

export function requireAccessibleLead(paramName: ParamName = 'id') {
  return createEntityAccessMiddleware('Lead', paramName, async (req, id) => {
    const where = mergeWhereWithAccess(
      { id, tenantId: req.context.tenantId },
      buildLeadAccessWhere(req.dataAccess),
    );

    const lead = await prisma.lead.findFirst({
      where,
      select: { id: true },
    });

    return Boolean(lead);
  });
}

export function requireAccessibleProject(paramName: ParamName = 'id') {
  return createEntityAccessMiddleware('Project', paramName, async (req, id) => {
    const where = mergeWhereWithAccess(
      { id, tenantId: req.context.tenantId, deletedAt: null },
      buildProjectAccessWhere(req.dataAccess),
    );

    const project = await prisma.project.findFirst({
      where,
      select: { id: true },
    });

    return Boolean(project);
  });
}

export function requireAccessibleTask(paramName: ParamName = 'id') {
  return createEntityAccessMiddleware('Task', paramName, async (req, id) => {
    const where = mergeWhereWithAccess(
      { id, tenantId: req.context.tenantId },
      buildTaskAccessWhere(req.dataAccess),
    );

    const task = await prisma.task.findFirst({
      where,
      select: { id: true },
    });

    return Boolean(task);
  });
}
