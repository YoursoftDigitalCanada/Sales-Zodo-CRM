export function getFileExtension(filename: string): string {
  const trimmed = (filename || '').trim();
  const idx = trimmed.lastIndexOf('.');
  if (idx === -1) return '';
  return trimmed.slice(idx + 1).toLowerCase();
}

export function sanitizeFilename(filename: string): string {
  return (filename || '')
    .replace(/[\\/]/g, '-') // prevent path traversal
    .replace(/[\u0000-\u001F\u007F]/g, '') // control chars
    .replace(/\s+/g, ' ')
    .trim();
}

export function isAllowedExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const ext = getFileExtension(filename);
  if (!ext) return false;
  const allowed = allowedExtensions.map((t) => t.toLowerCase());
  return allowed.includes(ext);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );

  const value = bytes / Math.pow(1024, exponent);
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[exponent]}`;
}
