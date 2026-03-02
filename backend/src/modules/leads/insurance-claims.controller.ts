import { Request, Response, NextFunction } from 'express';
import { insuranceClaimsService } from './insurance-claims.service';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateInsuranceClaimDto, UpdateInsuranceClaimDto } from './insurance-claims.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class InsuranceClaimsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user?.employeeId;
            const { leadId } = req.params;
            const data = sanitizeBody<CreateInsuranceClaimDto>(req.body);
            const claim = await insuranceClaimsService.create(leadId, tenantId, data, employeeId);
            sendCreated(res, claim, 'Insurance claim created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getByLeadId(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { leadId } = req.params;
            const claims = await insuranceClaimsService.getByLeadId(leadId, tenantId);
            sendSuccess(res, claims);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { claimId } = req.params;
            const claim = await insuranceClaimsService.getById(claimId, tenantId);
            sendSuccess(res, claim);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { claimId } = req.params;
            const data = sanitizeBody<UpdateInsuranceClaimDto>(req.body);
            const claim = await insuranceClaimsService.update(claimId, tenantId, data);
            sendSuccess(res, claim, 'Insurance claim updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { claimId } = req.params;
            await insuranceClaimsService.delete(claimId, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const insuranceClaimsController = new InsuranceClaimsController();
