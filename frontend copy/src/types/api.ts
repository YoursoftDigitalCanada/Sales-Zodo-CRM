export interface ApiResponse<TData = unknown> {
  success?: boolean;
  data?: TData;
  message?: string;
  errors?: unknown;
}

export type AnyRecord = Record<string, unknown>;

export function extractApiData<TData>(payload: ApiResponse<TData> | TData): TData {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    return (payload as ApiResponse<TData>).data as TData;
  }
  return payload as TData;
}

export function extractApiArray<TItem>(payload: unknown): TItem[] {
  if (Array.isArray(payload)) {
    return payload as TItem[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    const maybeData = (payload as ApiResponse<unknown>).data;
    return Array.isArray(maybeData) ? (maybeData as TItem[]) : [];
  }
  return [];
}
