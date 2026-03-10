import { Request, Response, NextFunction } from 'express';
import { proposalsService } from './proposals.service';
import { logger } from '../../common/utils/logger';

export class ProposalsController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const createdById = req.user!.employeeId!;
            const dto = await proposalsService.create(tenantId, req.body, createdById);

            // Auto-generate PDF and emit event after creation
            proposalsService.generateAndEmit(dto.id, tenantId).catch((err) => {
                logger.error('[ProposalsController] Background PDF generation failed', { err: err.message, proposalId: dto.id });
            });

            res.status(201).json(dto);
        } catch (err) { next(err); }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await proposalsService.getById(req.params.id, tenantId);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async getMany(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const result = await proposalsService.getMany(tenantId, req.query as any);
            res.json(result);
        } catch (err) { next(err); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await proposalsService.update(req.params.id, tenantId, req.body);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            await proposalsService.delete(req.params.id, tenantId);
            res.status(204).send();
        } catch (err) { next(err); }
    }

    // Download proposal PDF
    async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { buffer, fileName } = await proposalsService.generatePdf(req.params.id, tenantId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(buffer);
        } catch (err) { next(err); }
    }

    // Regenerate PDF and emit event
    async regeneratePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            await proposalsService.generateAndEmit(req.params.id, tenantId);
            res.json({ success: true, message: 'Proposal PDF regenerated and event emitted' });
        } catch (err) { next(err); }
    }

    // Stage 4: Send proposal to lead
    async send(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const salesRepId = req.user!.employeeId!;
            const { deliveryMethod } = req.body;

            if (!deliveryMethod || !['email', 'sms', 'email_sms'].includes(deliveryMethod)) {
                res.status(400).json({
                    success: false,
                    message: 'deliveryMethod is required. Must be "email", "sms", or "email_sms".',
                });
                return;
            }

            const result = await proposalsService.sendProposal(
                req.params.id,
                tenantId,
                deliveryMethod,
                salesRepId,
            );
            res.json(result);
        } catch (err) { next(err); }
    }

    // ── Public endpoints (no auth) ──────────────────────────────────────

    // View proposal by public token
    async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const proposal = await proposalsService.getByPublicToken(req.params.token);
            res.json(proposal);
        } catch (err) { next(err); }
    }

    // Sign proposal via public token (Stage 5: e-signature)
    async signPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { signedByName, signatureData, initials } = req.body;
            if (!signedByName) {
                res.status(400).json({ success: false, message: 'signedByName is required' });
                return;
            }
            const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
                || req.socket?.remoteAddress
                || 'unknown';
            const result = await proposalsService.signProposal(req.params.token, {
                signedByName,
                signatureData,
                initials,
                ipAddress,
            });
            res.json(result);
        } catch (err) { next(err); }
    }

    // Decline proposal via public token
    async declinePublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await proposalsService.declineProposal(req.params.token);
            res.json(result);
        } catch (err) { next(err); }
    }

    // Stage 4: Tracking pixel (1x1 transparent GIF)
    async trackView(req: Request, res: Response): Promise<void> {
        // Fire-and-forget tracking — always return the pixel
        proposalsService.trackView(req.params.token).catch(() => { });

        // Return 1x1 transparent GIF
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64',
        );
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(pixel);
    }
}

export const proposalsController = new ProposalsController();
