import { getAccessToken } from "@/features/auth/lib/auth-storage";
import { buildApiUrl } from "@/services/api/config";

export interface RealtimeStreamOptions {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onEvent: (event: string, payload: unknown) => void;
}

function parseSseChunk(chunk: string): Array<{ event: string; data: unknown }> {
  return chunk
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const lines = part.split("\n");
      let event = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data) {
        return [];
      }

      try {
        return [{ event, data: JSON.parse(data) }];
      } catch {
        return [];
      }
    });
}

export function createSupportTicketsRealtimeStream(options: RealtimeStreamOptions): () => void {
  const token = getAccessToken();
  if (!token) {
    return () => undefined;
  }

  let cancelled = false;
  let controller: AbortController | null = null;
  let reconnectTimer: number | null = null;
  const streamUrl = buildApiUrl("/support-tickets/stream");

  const connect = async () => {
    controller = new AbortController();

    try {
      const response = await fetch(streamUrl, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Support ticket stream failed with ${response.status}`);
      }

      options.onConnected?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) {
          throw new Error("Support ticket stream closed");
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const entry of chunks.flatMap(parseSseChunk)) {
          if (entry.event !== "ping" && entry.event !== "connected") {
            options.onEvent(entry.event, entry.data);
          }
        }
      }
    } catch {
      if (cancelled) {
        return;
      }

      options.onDisconnected?.();
      reconnectTimer = window.setTimeout(() => {
        connect().catch(() => undefined);
      }, 3000);
    }
  };

  connect().catch(() => undefined);

  return () => {
    cancelled = true;
    controller?.abort();
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
    }
  };
}
