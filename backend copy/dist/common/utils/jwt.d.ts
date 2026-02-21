import { JwtPayload } from 'jsonwebtoken';
export interface TokenPayload {
    userId: string;
    email: string;
    tenantId?: string;
    employeeId?: string;
    type: 'access' | 'refresh';
}
export interface DecodedToken extends JwtPayload, TokenPayload {
}
export declare function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string;
export declare function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): string;
export declare function verifyAccessToken(token: string): DecodedToken;
export declare function verifyRefreshToken(token: string): DecodedToken;
export declare function decodeToken(token: string): DecodedToken | null;
export declare function getTokenExpiry(token: string): Date | null;
//# sourceMappingURL=jwt.d.ts.map