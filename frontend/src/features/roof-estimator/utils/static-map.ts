export const DEFAULT_STATIC_MAP_WIDTH = 1024;
export const DEFAULT_STATIC_MAP_HEIGHT = 1024;
export const DEFAULT_STATIC_MAP_ZOOM = 20;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseStaticMapSize(
  url: string,
  fallback: { width: number; height: number } = {
    width: DEFAULT_STATIC_MAP_WIDTH,
    height: DEFAULT_STATIC_MAP_HEIGHT,
  },
): { width: number; height: number } {
  try {
    const parsed = new URL(url);
    const size = parsed.searchParams.get("size");
    if (!size) return fallback;

    const [rawWidth, rawHeight] = size.split("x").map((value) => Number(value));
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight)) {
      return fallback;
    }

    return {
      width: clamp(rawWidth, 256, 2048),
      height: clamp(rawHeight, 256, 2048),
    };
  } catch {
    return fallback;
  }
}

export function parseStaticMapZoom(
  url: string,
  fallback = DEFAULT_STATIC_MAP_ZOOM,
): number {
  try {
    const parsed = new URL(url);
    const zoom = Number(parsed.searchParams.get("zoom"));
    if (!Number.isFinite(zoom)) return fallback;
    return clamp(zoom, 1, 23);
  } catch {
    return fallback;
  }
}
