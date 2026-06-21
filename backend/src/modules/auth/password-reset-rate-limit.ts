import crypto from 'crypto';
import { Request } from 'express';

function fingerprint(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function clientAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return String(value || req.ip || req.socket?.remoteAddress || 'unknown').trim();
}

export function passwordResetRequestRateLimitKey(req: Request): string {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `password-reset-request:${fingerprint(email || 'missing')}:${fingerprint(clientAddress(req))}`;
}

export function passwordResetSubmissionRateLimitKey(req: Request): string {
  const token = String(req.body?.token || '').trim();
  return token
    ? `password-reset-token:${fingerprint(token)}`
    : `password-reset-ip:${fingerprint(clientAddress(req))}`;
}
