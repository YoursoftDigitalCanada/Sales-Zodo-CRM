"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContext = tenantContext;
exports.tenantFromSlug = tenantFromSlug;
exports.validateTenantAccess = validateTenantAccess;
exports.withTenantScope = withTenantScope;
exports.createTenantScope = createTenantScope;
const database_1 = require("../../config/database");
const HttpErrors_1 = require("../errors/HttpErrors");
const errorCodes_1 = require("../errors/errorCodes");
/**
 * Tenant context middleware
 * Ensures tenant is loaded and validates tenant status
 */
async function tenantContext(req, res, next) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw new HttpErrors_1.ForbiddenError('Tenant context required', errorCodes_1.ErrorCodes.TENANT_NOT_FOUND);
        }
        // Check if tenant is already loaded
        if (req.tenant) {
            return next();
        }
        // Load tenant
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new HttpErrors_1.NotFoundError('Tenant not found', errorCodes_1.ErrorCodes.TENANT_NOT_FOUND);
        }
        // Check tenant status
        if (tenant.status === 'SUSPENDED') {
            throw new HttpErrors_1.ForbiddenError('Your organization has been suspended', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        if (tenant.status === 'CANCELLED') {
            throw new HttpErrors_1.ForbiddenError('Your organization account has been cancelled', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        req.tenant = tenant;
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Extract tenant from slug in URL
 * Used for public routes that identify tenant by slug
 */
async function tenantFromSlug(req, res, next) {
    try {
        const { tenantSlug } = req.params;
        if (!tenantSlug) {
            throw new HttpErrors_1.NotFoundError('Tenant slug required', errorCodes_1.ErrorCodes.TENANT_NOT_FOUND);
        }
        const tenant = await database_1.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant) {
            throw new HttpErrors_1.NotFoundError('Organization not found', errorCodes_1.ErrorCodes.TENANT_NOT_FOUND);
        }
        if (tenant.status !== 'ACTIVE' && tenant.status !== 'TRIAL') {
            throw new HttpErrors_1.ForbiddenError('This organization is not accessible', errorCodes_1.ErrorCodes.TENANT_SUSPENDED);
        }
        req.tenant = tenant;
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Validate that user has access to the tenant in the URL
 */
async function validateTenantAccess(req, res, next) {
    try {
        const urlTenantId = req.params.tenantId;
        const userTenantId = req.user?.tenantId;
        if (!urlTenantId) {
            return next();
        }
        if (urlTenantId !== userTenantId) {
            throw new HttpErrors_1.ForbiddenError('You do not have access to this organization', errorCodes_1.ErrorCodes.TENANT_ACCESS_DENIED);
        }
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Tenant isolation helper - adds tenantId filter to queries
 * This is a utility function, not middleware
 */
function withTenantScope(query, tenantId) {
    return {
        ...query,
        tenantId,
    };
}
/**
 * Create a tenant-scoped prisma query wrapper
 */
function createTenantScope(tenantId) {
    return {
        /**
         * Add tenant filter to where clause
         */
        where: (where = {}) => ({
            ...where,
            tenantId,
        }),
        /**
         * Add tenant to create data
         */
        create: (data) => ({
            ...data,
            tenantId,
        }),
        /**
         * Validate that a record belongs to the tenant
         */
        validate: async (model, recordId, errorMessage = 'Record not found') => {
            const record = await model.findFirst({
                where: {
                    id: recordId,
                    tenantId,
                },
            });
            if (!record) {
                throw new HttpErrors_1.NotFoundError(errorMessage, errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
            }
            return record;
        },
    };
}
//# sourceMappingURL=tenant.middleware.js.map