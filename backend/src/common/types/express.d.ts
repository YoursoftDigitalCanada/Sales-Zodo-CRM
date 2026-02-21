import { Employee, Tenant } from '@prisma/client';
import { RequestContext, AuthContext } from './request-context';

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user context — set by `authenticate` middleware.
       * After `loadEmployee` runs, `role` and full `tenantId` are guaranteed.
       *
       * Use `hasTenantContext(req.user)` or `requireTenantContext(req.user)`
       * from `@/common/types/request-context` instead of non-null assertions.
       */
      user?: RequestContext;

      /**
       * Full employee record with role & permissions — set by `loadEmployee` middleware.
       */
      employee?: Employee & {
        role: {
          id: string;
          name: string;
          permissions: Array<{
            permission: {
              id: string;
              code: string;
              module: string;
              action: string;
            };
          }>;
        };
      };

      /**
       * Full tenant record — set by `loadEmployee` middleware.
       */
      tenant?: Tenant;

      /**
       * Flat permission codes array — set by `loadEmployee` middleware.
       * e.g., ["leads.view", "leads.create", "clients.view"]
       */
      permissions?: string[];

      /**
       * Unique request trace ID (UUID v4) — set by `requestId` middleware.
       * Also available via `req.user.requestId` after auth middleware runs.
       */
      requestId?: string;
    }
  }
}

export { };