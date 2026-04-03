import { prisma } from '../../config/database';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { authManager } from '../auth/auth.manager';
import { type CurrentSessionStatusDto, type SessionResponseDto } from './sessions.dto';

function parseBrowser(userAgent?: string | null): string {
  const agent = String(userAgent || '').toLowerCase();

  if (agent.includes('edg/')) return 'Microsoft Edge';
  if (agent.includes('chrome/')) return 'Google Chrome';
  if (agent.includes('firefox/')) return 'Mozilla Firefox';
  if (agent.includes('safari/') && !agent.includes('chrome/')) return 'Safari';
  if (agent.includes('iphone')) return 'iPhone Safari';

  return 'Unknown Browser';
}

function parseDevice(userAgent?: string | null): string {
  const agent = String(userAgent || '').toLowerCase();

  if (agent.includes('iphone')) return 'iPhone';
  if (agent.includes('ipad')) return 'iPad';
  if (agent.includes('android')) return 'Android Device';
  if (agent.includes('macintosh') || agent.includes('mac os x')) return 'Mac';
  if (agent.includes('windows')) return 'Windows PC';
  if (agent.includes('linux')) return 'Linux Device';

  return 'Unknown Device';
}

export class SessionsService {
  async getUserSessions(
    userId: string,
    context: { userAgent?: string; ipAddress?: string; sessionId?: string },
  ): Promise<SessionResponseDto[]> {
    const sessions = await authManager.getActiveSessions(userId);

    if (sessions.length === 0 && context.userAgent) {
      return [
        {
          id: context.sessionId || `legacy-${userId}`,
          device: parseDevice(context.userAgent),
          browser: parseBrowser(context.userAgent),
          ip: context.ipAddress || 'Unknown',
          location: 'Unknown',
          lastActive: new Date(),
          createdAt: new Date(),
          current: true,
          scheduledLogoutAt: null,
        },
      ];
    }

    return sessions.map((session) => {
      const matchesCurrentSession = Boolean(context.sessionId && context.sessionId === session.id);
      const matchesCurrentUserAgent = Boolean(context.userAgent && context.userAgent === session.userAgent);
      const matchesCurrentIp = Boolean(context.ipAddress && context.ipAddress === session.ipAddress);

      return {
        id: session.id,
        device: parseDevice(session.userAgent),
        browser: parseBrowser(session.userAgent),
        ip: session.ipAddress || 'Unknown',
        location: 'Unknown',
        lastActive: session.lastSeenAt || session.createdAt,
        createdAt: session.createdAt,
        current: matchesCurrentSession || (matchesCurrentUserAgent && matchesCurrentIp),
        scheduledLogoutAt: session.forceLogoutAt || null,
      };
    });
  }

  async getCurrentSessionStatus(userId: string, sessionId?: string): Promise<CurrentSessionStatusDto> {
    if (!sessionId) {
      return {
        active: true,
        current: true,
        warning: false,
        reason: null,
        logoutAt: null,
        secondsRemaining: null,
      };
    }

    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return {
        active: false,
        current: false,
        warning: false,
        reason: session?.revokedReason || 'SESSION_ENDED',
        logoutAt: null,
        secondsRemaining: null,
      };
    }

    if (session.forceLogoutAt && session.forceLogoutAt > new Date()) {
      const secondsRemaining = Math.max(0, Math.ceil((session.forceLogoutAt.getTime() - Date.now()) / 1000));
      return {
        active: true,
        current: true,
        warning: true,
        reason: session.revokedReason || 'REPLACED_BY_NEW_LOGIN',
        logoutAt: session.forceLogoutAt,
        secondsRemaining,
      };
    }

    if (session.forceLogoutAt && session.forceLogoutAt <= new Date()) {
      return {
        active: false,
        current: false,
        warning: false,
        reason: session.revokedReason || 'REPLACED_BY_NEW_LOGIN',
        logoutAt: session.forceLogoutAt,
        secondsRemaining: 0,
      };
    }

    return {
      active: true,
      current: true,
      warning: false,
      reason: null,
      logoutAt: null,
      secondsRemaining: null,
    };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new BadRequestError('Session not found');
    }

    await authManager.revokeSession(userId, sessionId);
  }
}

export const sessionsService = new SessionsService();
