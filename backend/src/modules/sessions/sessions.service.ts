import { prisma } from '../../config/database';
import { BadRequestError } from '../../common/errors/HttpErrors';
import { authManager } from '../auth/auth.manager';
import { type SessionResponseDto } from './sessions.dto';

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
  async getUserSessions(userId: string, context: { userAgent?: string; ipAddress?: string }): Promise<SessionResponseDto[]> {
    const sessions = await authManager.getActiveSessions(userId);

    return sessions.map((session) => {
      const matchesCurrentUserAgent = Boolean(context.userAgent && context.userAgent === session.userAgent);
      const matchesCurrentIp = Boolean(context.ipAddress && context.ipAddress === session.ipAddress);

      return {
        id: session.id,
        device: parseDevice(session.userAgent),
        browser: parseBrowser(session.userAgent),
        ip: session.ipAddress || 'Unknown',
        location: 'Unknown',
        lastActive: session.createdAt,
        createdAt: session.createdAt,
        current: matchesCurrentUserAgent && matchesCurrentIp,
      };
    });
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
