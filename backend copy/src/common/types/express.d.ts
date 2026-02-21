import { User, Employee, Tenant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        tenantId?: string;
        employeeId?: string;
      };
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
      tenant?: Tenant;
      permissions?: string[];
      requestId?: string;
    }
  }
}

export {};