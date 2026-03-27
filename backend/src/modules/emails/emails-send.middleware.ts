import fs from 'fs/promises';
import { NextFunction, Request, Response } from 'express';

type EmailAddress = { email: string; name?: string };

function parseAddressList(value: unknown): EmailAddress[] {
    if (Array.isArray(value)) {
        return value
            .map((entry) => {
                if (typeof entry === 'string') {
                    return { email: entry.trim() };
                }

                if (entry && typeof entry === 'object' && typeof (entry as any).email === 'string') {
                    return {
                        email: (entry as any).email.trim(),
                        name: typeof (entry as any).name === 'string' ? (entry as any).name.trim() : undefined,
                    };
                }

                return null;
            })
            .filter((entry): entry is EmailAddress => Boolean(entry?.email));
    }

    if (typeof value !== 'string') {
        return [];
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return [];
    }

    try {
        return parseAddressList(JSON.parse(trimmed));
    } catch {
        return trimmed
            .split(/[,;]/)
            .map((email) => email.trim())
            .filter(Boolean)
            .map((email) => ({ email }));
    }
}

function parseOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

export function normalizeSendEmailBody(req: Request, _res: Response, next: NextFunction): void {
    const files = ((req as any).files as Express.Multer.File[] | undefined) || [];

    req.body = {
        toAddresses: parseAddressList(req.body?.toAddresses),
        ccAddresses: parseAddressList(req.body?.ccAddresses),
        bccAddresses: parseAddressList(req.body?.bccAddresses),
        subject: parseOptionalString(req.body?.subject) || '',
        bodyText: parseOptionalString(req.body?.bodyText),
        bodyHtml: parseOptionalString(req.body?.bodyHtml),
        clientId: parseOptionalString(req.body?.clientId),
        leadId: parseOptionalString(req.body?.leadId),
        attachmentsCount: files.length,
    };

    next();
}

export async function cleanupUploadedEmailFilesOnError(error: Error, req: Request, _res: Response, next: NextFunction): Promise<void> {
    const files = ((req as any).files as Express.Multer.File[] | undefined) || [];

    await Promise.all(files.map(async (file) => {
        try {
            await fs.unlink(file.path);
        } catch {
            // Ignore best-effort cleanup failures on aborted email sends.
        }
    }));

    next(error);
}
