import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../../config';

export interface TokenPayload {
  userId: string;
  email: string;
  tenantId?: string;
  employeeId?: string;
  role?: string;
  type: 'access' | 'refresh';
}

export interface DecodedToken extends JwtPayload, TokenPayload { }

export function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  const tokenPayload: TokenPayload = { ...payload, type: 'access' };

  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as any,
    issuer: config.app.name,
    subject: payload.userId,
  };

  return jwt.sign(tokenPayload, config.jwt.accessSecret, options);
}

export function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  const tokenPayload: TokenPayload = { ...payload, type: 'refresh' };

  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as any,
    issuer: config.app.name,
    subject: payload.userId,
  };

  return jwt.sign(tokenPayload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.accessSecret) as DecodedToken;
}

export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.refreshSecret) as DecodedToken;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): Date | null {
  const decoded = decodeToken(token);
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
}