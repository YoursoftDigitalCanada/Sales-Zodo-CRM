import { Response } from 'express';

interface RealtimeClient {
  id: string;
  res: Response;
  close: () => void;
}

interface RequesterStreamClient extends RealtimeClient {
  tenantId: string;
  userId?: string;
  email?: string;
}

interface TicketRoutingIdentity {
  tenantId: string;
  requesterUserId?: string | null;
  requesterEmail?: string | null;
}

function createClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function writeEvent(res: Response, event: string, payload: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function initializeStream(res: Response): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

export class SupportTicketsRealtimeService {
  private adminClients = new Map<string, RealtimeClient>();
  private requesterClients = new Map<string, RequesterStreamClient>();

  subscribeAdmin(res: Response): () => void {
    initializeStream(res);

    const clientId = createClientId();
    const heartbeat = setInterval(() => {
      writeEvent(res, 'ping', { timestamp: new Date().toISOString() });
    }, 20000);

    const close = () => {
      clearInterval(heartbeat);
      this.adminClients.delete(clientId);
      res.end();
    };

    this.adminClients.set(clientId, { id: clientId, res, close });
    writeEvent(res, 'connected', { scope: 'admin' });

    return close;
  }

  subscribeRequester(
    res: Response,
    meta: {
      tenantId: string;
      userId?: string;
      email?: string;
    }
  ): () => void {
    initializeStream(res);

    const clientId = createClientId();
    const heartbeat = setInterval(() => {
      writeEvent(res, 'ping', { timestamp: new Date().toISOString() });
    }, 20000);

    const close = () => {
      clearInterval(heartbeat);
      this.requesterClients.delete(clientId);
      res.end();
    };

    this.requesterClients.set(clientId, {
      id: clientId,
      res,
      tenantId: meta.tenantId,
      userId: meta.userId,
      email: meta.email?.toLowerCase(),
      close,
    });
    writeEvent(res, 'connected', { scope: 'crm', tenantId: meta.tenantId });

    return close;
  }

  publishTicketEvent(
    event: 'ticket_created' | 'ticket_updated' | 'ticket_deleted',
    routing: TicketRoutingIdentity,
    payloads: {
      admin: unknown;
      requester: unknown;
    }
  ): void {
    for (const client of this.adminClients.values()) {
      writeEvent(client.res, event, payloads.admin);
    }

    for (const client of this.requesterClients.values()) {
      if (client.tenantId !== routing.tenantId) {
        continue;
      }

      const requesterMatchesUserId =
        Boolean(routing.requesterUserId) &&
        Boolean(client.userId) &&
        routing.requesterUserId === client.userId;
      const requesterMatchesEmail =
        Boolean(routing.requesterEmail) &&
        Boolean(client.email) &&
        routing.requesterEmail?.toLowerCase() === client.email;

      if (requesterMatchesUserId || requesterMatchesEmail) {
        writeEvent(client.res, event, payloads.requester);
      }
    }
  }
}

export const supportTicketsRealtimeService = new SupportTicketsRealtimeService();
