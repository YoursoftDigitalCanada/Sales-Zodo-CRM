export type TransportEncryption = 'SSL/TLS' | 'STARTTLS' | 'NONE';

function coercePort(value: unknown, fallback: number): number {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : fallback;
}

export function normalizeSmtpTransportConfig<T extends { port?: unknown; encryption?: string | null }>(config: T) {
  const port = coercePort(config.port, 587);
  let encryption = typeof config.encryption === 'string' && config.encryption.trim()
    ? config.encryption.trim().toUpperCase()
    : '';

  if (port === 465) {
    encryption = 'SSL/TLS';
  } else if (port === 587 || port === 25) {
    encryption = encryption === 'NONE' ? 'NONE' : 'STARTTLS';
  } else if (encryption !== 'SSL/TLS' && encryption !== 'STARTTLS' && encryption !== 'NONE') {
    encryption = 'STARTTLS';
  }

  return {
    ...config,
    port,
    encryption: encryption as TransportEncryption,
  };
}

export function normalizeImapTransportConfig<T extends { port?: unknown; encryption?: string | null }>(config: T) {
  const port = coercePort(config.port, 993);
  let encryption = typeof config.encryption === 'string' && config.encryption.trim()
    ? config.encryption.trim().toUpperCase()
    : '';

  if (port === 993) {
    encryption = 'SSL/TLS';
  } else if (port === 143) {
    encryption = encryption === 'NONE' ? 'NONE' : 'STARTTLS';
  } else if (encryption !== 'SSL/TLS' && encryption !== 'STARTTLS' && encryption !== 'NONE') {
    encryption = 'SSL/TLS';
  }

  return {
    ...config,
    port,
    encryption: encryption as TransportEncryption,
  };
}

export function getSmtpTransportGuidance(port: number): string {
  if (port === 465) {
    return 'SMTP port 465 requires SSL/TLS.';
  }

  if (port === 587 || port === 25) {
    return `SMTP port ${port} typically requires STARTTLS.`;
  }

  return 'Check the SMTP host, port, and encryption settings with your mail provider.';
}
