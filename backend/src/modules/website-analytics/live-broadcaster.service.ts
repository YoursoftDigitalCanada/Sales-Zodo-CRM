import { Response } from 'express';

type LiveEvent = {
  type: string;
  tenantId: string;
  siteId?: string | null;
  payload?: Record<string, unknown>;
};

type Subscriber = {
  id: string;
  tenantId: string;
  siteId?: string | null;
  eventTypes: Set<string>;
  path?: string | null;
  response: Response;
};

class WebsiteAnalyticsLiveBroadcaster {
  private subscribers = new Map<string, Subscriber>();
  private pingTimer: NodeJS.Timeout;

  constructor() {
    this.pingTimer = setInterval(() => this.ping(), 25_000);
    this.pingTimer.unref?.();
  }

  subscribe(input: Omit<Subscriber, 'id'>) {
    const id = `live_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const subscriber: Subscriber = { ...input, id };
    this.subscribers.set(id, subscriber);
    this.write(subscriber, 'connected', { connectedAt: new Date().toISOString() });
    input.response.on('close', () => this.unsubscribe(id));
    return id;
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  publish(event: LiveEvent) {
    for (const subscriber of this.subscribers.values()) {
      if (subscriber.tenantId !== event.tenantId) continue;
      if (subscriber.siteId && event.siteId && subscriber.siteId !== event.siteId) continue;
      if (subscriber.eventTypes.size && !subscriber.eventTypes.has(event.type)) continue;
      const path = String((event.payload as any)?.currentPath || (event.payload as any)?.path || '');
      if (subscriber.path && path && !path.toLowerCase().includes(subscriber.path.toLowerCase())) continue;
      this.write(subscriber, event.type, event.payload || {});
    }
  }

  private ping() {
    for (const subscriber of this.subscribers.values()) this.write(subscriber, 'ping', { at: new Date().toISOString() });
  }

  private write(subscriber: Subscriber, event: string, data: Record<string, unknown>) {
    try {
      subscriber.response.write(`event: ${event}\n`);
      subscriber.response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.unsubscribe(subscriber.id);
    }
  }
}

export const websiteAnalyticsLiveBroadcaster = new WebsiteAnalyticsLiveBroadcaster();
