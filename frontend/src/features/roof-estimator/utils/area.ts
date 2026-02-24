export type PolygonPoint = { x: number; y: number };

const SQFT_PER_SQM = 10.7639;

/**
 * Calculates polygon area in pixel^2 using the Shoelace formula.
 * Works for convex and concave polygons.
 */
export function calculatePolygonAreaPixels(points: PolygonPoint[]): number {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );

  if (finitePoints.length < 3) {
    return 0;
  }

  // Translate by first point to reduce floating point drift for large coordinates.
  const origin = finitePoints[0];
  let twiceArea = 0;

  for (let index = 0; index < finitePoints.length; index += 1) {
    const current = finitePoints[index];
    const next = finitePoints[(index + 1) % finitePoints.length];
    const currentX = current.x - origin.x;
    const currentY = current.y - origin.y;
    const nextX = next.x - origin.x;
    const nextY = next.y - origin.y;

    twiceArea += currentX * nextY - nextX * currentY;
  }

  return Math.abs(twiceArea) / 2;
}

/**
 * Converts polygon pixel area into roof area in square feet for Google Static Maps imagery.
 *
 * Ground resolution formula:
 * metersPerPixel = (156543.03392 * cos(latitude)) / (2^zoom)
 */
export function calculateRoofAreaSqFt(params: {
  points: PolygonPoint[];
  centerLat: number;
  zoom: number;
}): number {
  const { points, centerLat, zoom } = params;

  if (!Number.isFinite(centerLat) || !Number.isFinite(zoom)) {
    return 0;
  }

  const pixelArea = calculatePolygonAreaPixels(points);
  if (pixelArea <= 0) {
    return 0;
  }

  const safeLatitude = Math.max(-85, Math.min(85, centerLat));
  const safeZoom = Math.max(1, Math.min(23, zoom));

  const metersPerPixel =
    (156543.03392 * Math.cos((safeLatitude * Math.PI) / 180)) /
    2 ** safeZoom;

  const areaSquareMeters = pixelArea * (metersPerPixel ** 2);
  const areaSquareFeet = areaSquareMeters * SQFT_PER_SQM;

  return Number(areaSquareFeet.toFixed(1));
}

/*
Example usage:

const points = [
  { x: 286, y: 310 },
  { x: 698, y: 332 },
  { x: 760, y: 598 },
  { x: 575, y: 742 },
  { x: 312, y: 686 },
  { x: 258, y: 478 },
];

const roofAreaSqFt = calculateRoofAreaSqFt({
  points,
  centerLat: 49.2515122,
  zoom: 20,
});
*/
