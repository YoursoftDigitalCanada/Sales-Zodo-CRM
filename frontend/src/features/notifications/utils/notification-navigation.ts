export interface NotificationNavigationSource {
  actionUrl?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
}

function readString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function withLeadingSlash(target: string): string {
  return target.startsWith("/") ? target : `/${target}`;
}

function withQuery(pathname: string, key: string, value: string): string {
  return `${pathname}?${key}=${encodeURIComponent(value)}`;
}

export function resolveNotificationTarget(source?: NotificationNavigationSource | null): string | undefined {
  const rawTarget = readString(source?.actionUrl) || readString(source?.link);
  const metadata = source?.metadata || {};

  if (rawTarget && /^https?:\/\//i.test(rawTarget)) {
    return rawTarget;
  }

  const metadataInvoiceId = readString(metadata.invoiceId);
  const metadataProjectId = readString(metadata.projectId);
  const metadataLeadId = readString(metadata.leadId);
  const metadataClientId = readString(metadata.clientId);
  const metadataRoomId = readString(metadata.roomId);
  const metadataTaskId = readString(metadata.taskId);
  const metadataExpenseId = readString(metadata.expenseId);
  const metadataBookingId = readString(metadata.bookingId);
  const metadataEventId = readString(metadata.eventId);
  const metadataQuoteId = readString(metadata.quoteId);

  if (!rawTarget) {
    if (metadataInvoiceId) return `/invoice/${metadataInvoiceId}`;
    if (metadataProjectId) return withQuery("/deals", "dealId", metadataProjectId);
    if (metadataLeadId) return `/leads/${metadataLeadId}`;
    if (metadataClientId) return `/client-list/${metadataClientId}`;
    if (metadataQuoteId) return withQuery("/proposals", "quoteId", metadataQuoteId);
    if (metadataRoomId) return withQuery("/chats", "conversationId", metadataRoomId);
    if (metadataTaskId) return withQuery("/tasks", "taskId", metadataTaskId);
    if (metadataExpenseId) return withQuery("/expenses", "expenseId", metadataExpenseId);
    if (metadataBookingId) return withQuery("/bookings", "bookingId", metadataBookingId);
    if (metadataEventId) return withQuery("/calendar", "event", metadataEventId);
    return undefined;
  }

  const normalized = withLeadingSlash(rawTarget);
  const [pathname, queryString] = normalized.split("?");
  const search = queryString ? `?${queryString}` : "";

  if (pathname === "/invoices") return `/invoice${search}`;
  if (/^\/invoices\/[^/]+$/.test(pathname)) {
    return pathname.replace(/^\/invoices\//, "/invoice/") + search;
  }
  if (pathname === "/clients") return `/client-list${search}`;
  if (/^\/clients\/[^/]+$/.test(pathname)) {
    return pathname.replace(/^\/clients\//, "/client-list/") + search;
  }
  if (pathname === "/projects" || pathname === "/kanban") return `/deals${search}`;
  if (/^\/projects\/[^/]+$/.test(pathname)) {
    const dealId = pathname.split("/")[2];
    return withQuery("/deals", "dealId", dealId);
  }
  if (pathname === "/quotes") return `/proposals${search}`;
  if (pathname === "/proposals") return `/proposals${search}`;
  if (/^\/proposals\/[^/]+$/.test(pathname)) {
    const proposalId = pathname.split("/")[2];
    return withQuery("/proposals", "proposalId", proposalId);
  }
  if (pathname === "/chat") return `/chats${search}`;
  if (/^\/chat\/[^/]+$/.test(pathname)) {
    const roomId = pathname.split("/")[2];
    return withQuery("/chats", "conversationId", roomId);
  }
  if (/^\/quotes\/[^/]+$/.test(pathname)) {
    const quoteId = pathname.split("/")[2];
    return withQuery("/proposals", "quoteId", quoteId);
  }
  if (/^\/tasks\/[^/]+$/.test(pathname)) {
    const taskId = pathname.split("/")[2];
    return withQuery("/tasks", "taskId", taskId);
  }
  if (/^\/expenses\/[^/]+$/.test(pathname)) {
    const expenseId = pathname.split("/")[2];
    return withQuery("/expenses", "expenseId", expenseId);
  }
  if (/^\/bookings\/[^/]+$/.test(pathname)) {
    const bookingId = pathname.split("/")[2];
    return withQuery("/bookings", "bookingId", bookingId);
  }

  return normalized;
}
