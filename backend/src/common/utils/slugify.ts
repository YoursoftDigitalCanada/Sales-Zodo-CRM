export interface SlugifyOptions {
  maxLength?: number;
}

export function slugify(value: string, options: SlugifyOptions = {}): string {
  const maxLength = options.maxLength ?? 50;

  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}
