export type TransportEncryption = 'SSL/TLS' | 'STARTTLS' | 'NONE';

function normalizeHost(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^(smtp|imap|pop3):\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
}

function coercePort(value: unknown, fallback: number): number {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : fallback;
}

export function normalizeSmtpTransportConfig<T extends { host?: unknown; port?: unknown; encryption?: string | null }>(config: T) {
  const port = coercePort(config.port, 587);
  const host = normalizeHost(config.host);
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
    host,
    port,
    encryption: encryption as TransportEncryption,
  };
}

export function normalizeImapTransportConfig<T extends { host?: unknown; port?: unknown; encryption?: string | null }>(config: T) {
  const port = coercePort(config.port, 993);
  const host = normalizeHost(config.host);
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
    host,
    port,
    encryption: encryption as TransportEncryption,
  };
}

export function getSmtpTransportGuidance(port: number, host?: string): string {
  const normalizedHost = normalizeHost(host);
  const providerHints: string[] = [];

  if (normalizedHost.includes('gmail')) {
    providerHints.push('Gmail usually uses smtp.gmail.com with port 587 STARTTLS or 465 SSL/TLS, and requires an App Password when 2FA is enabled.');
  } else if (normalizedHost.includes('office365') || normalizedHost.includes('outlook') || normalizedHost.includes('microsoft')) {
    providerHints.push('Microsoft 365 usually uses smtp.office365.com with port 587 STARTTLS. SMTP AUTH must be enabled for the mailbox.');
  } else if (normalizedHost.includes('hostinger')) {
    providerHints.push('Hostinger usually uses smtp.hostinger.com with port 465 SSL/TLS or 587 STARTTLS.');
  } else if (normalizedHost.includes('titan')) {
    providerHints.push('Titan Mail uses smtp.titan.email with port 465 SSL/TLS or 587 STARTTLS. Third-party app access must be enabled in Titan.');
  } else if (normalizedHost.includes('zoho')) {
    providerHints.push('Zoho usually uses smtp.zoho.com with port 465 SSL/TLS or 587 STARTTLS and may require an app-specific password.');
  }

  if (port === 465) {
    providerHints.unshift('SMTP port 465 requires SSL/TLS.');
  } else if (port === 587 || port === 25) {
    providerHints.unshift(`SMTP port ${port} typically requires STARTTLS.`);
  } else {
    providerHints.unshift('Check the SMTP host, port, and encryption settings with your mail provider.');
  }

  providerHints.push('If this is still timing out, the VPS/network may be blocked from reaching that SMTP port. Ask the provider to enable SMTP for the server IP or try the alternate provider-supported port.');
  return providerHints.join(' ');
}

export function getSmtpAuthenticationGuidance(host?: string): string {
  const normalizedHost = normalizeHost(host);

  if (normalizedHost.includes('gmail')) {
    return 'Gmail requires the full Gmail address as the username and an App Password when 2FA is enabled.';
  }

  if (normalizedHost.includes('office365') || normalizedHost.includes('outlook') || normalizedHost.includes('microsoft')) {
    return 'Microsoft 365 requires the full mailbox email as the username, the mailbox password, and SMTP AUTH enabled for that mailbox.';
  }

  if (normalizedHost.includes('hostinger')) {
    return 'Hostinger requires the full mailbox email as the username and the mailbox password from hPanel. Do not use the Hostinger account login password unless it is also the mailbox password.';
  }

  if (normalizedHost.includes('titan')) {
    return 'Titan Mail requires the full mailbox email as the username and the Titan mailbox password. Third-party app access must be enabled, and Titan 2FA can block third-party clients.';
  }

  if (normalizedHost.includes('zoho')) {
    return 'Zoho requires the full mailbox email as the username and may require an app-specific password.';
  }

  return 'Check that the SMTP username is the full mailbox email and that the password belongs to that mailbox.';
}
