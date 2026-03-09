export interface PushPayload {
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface PushProvider {
  send(userId: string, payload: PushPayload): Promise<void>;
}
