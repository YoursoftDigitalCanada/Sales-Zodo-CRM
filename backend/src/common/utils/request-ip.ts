import { Request } from 'express';

export function getRequestIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}
