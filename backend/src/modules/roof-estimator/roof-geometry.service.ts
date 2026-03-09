/**
 * Roof Geometry Service
 *
 * Core geometry engine for the upgraded AI estimator. Handles:
 *
 * 1.  Mask Processing — cleans binary segmentation masks
 * 2.  Contour Extraction — finds roof boundary contours
 * 3.  Polygon Generation — Douglas-Peucker simplification → GeoJSON
 * 4.  Edge Detection — Canny edges + polygon vertex snapping
 * 5.  Roof Plane Detection — splits polygon into facets using Solar segments
 * 6.  Ridge / Valley / Hip Detection — classifies shared edges
 * 7.  Eave / Rake Detection — identifies perimeter edges
 * 8.  Pixel → Real World Conversion — meters-per-pixel at given lat/zoom
 * 9.  Pitch Correction — plan area → true surface area
 * 10. Confidence Scoring — composite weighted score
 *
 * All lengths are returned in feet. All areas are returned in square feet.
 * Coordinates follow GeoJSON [lng, lat] convention.
 */

import { logger } from '../../common/utils/logger';

// ── Constants ─────────────────────────────────────────────────────────────
const SQ_METERS_TO_SQ_FEET = 10.7639;
const METERS_TO_FEET = 3.28084;

// ── Types ─────────────────────────────────────────────────────────────────

/** Raw pixel-space contour point */
export interface PixelPoint {
    x: number;
    y: number;
}

/** GeoJSON-style coordinate [lng, lat] */
export type GeoCoord = [number, number];

/** A simplified polygon (array of rings; first ring = exterior) */
export interface RoofPolygon {
    type: 'Polygon';
    coordinates: GeoCoord[][];
}

/** A single detected roof plane / facet */
export interface RoofPlane {
    id: string;
    vertices: GeoCoord[];
    areaSqft: number;
    pitchDegrees: number;
    azimuthDegrees: number;
    centroid: GeoCoord;
}

/** Classified edge between planes or along perimeter */
export interface RoofEdge {
    type: 'ridge' | 'valley' | 'hip' | 'eave' | 'rake';
    start: GeoCoord;
    end: GeoCoord;
    lengthFt: number;
    planeIds: string[];
}

/** Complete set of roof measurements */
export interface RoofMeasurements {
    roofAreaSqft: number;           // plan-view polygon area
    trueSurfaceAreaSqft: number;    // pitch-adjusted
    roofSquares: number;            // area / 100
    ridgeLengthFt: number;
    valleyLengthFt: number;
    hipLengthFt: number;
    eaveLengthFt: number;
    rakeLengthFt: number;
    perimeterFt: number;
    polygon: RoofPolygon;
    planes: RoofPlane[];
    edges: RoofEdge[];
    confidenceScore: number;
    flaggedForReview: boolean;
}

/** Detected line from Python AI service (Hough Transform) */
export interface DetectedLine {
    start: [number, number];
    end: [number, number];
    length_px: number;
    angle_degrees: number;
}

/** Image quality assessment from Python AI service */
export interface ImageQuality {
    quality_score: number;
    shadow_coverage: number;
    blur_score: number;
    vegetation_coverage: number;
    is_acceptable: boolean;
}

/** Small feature (dormer/chimney/skylight) from Python AI service */
export interface SmallFeature {
    type: 'dormer' | 'chimney' | 'skylight';
    bbox: [number, number, number, number];
    area_pixels: number;
    confidence: number;
}

/** Input from the AI microservice (segmentation response) */
export interface SegmentationResult {
    mask?: number[][];              // H×W binary mask (1=roof, 0=bg)
    contours?: PixelPoint[][];      // pre-extracted contours from Python
    roof_area_sqft: number;
    confidence: number;
    processing_time_seconds: number;
    model: string;
    edges?: PixelPoint[][];         // Canny edge pixels from Python
    detected_lines?: DetectedLine[];// Hough lines (U4: for plane splitting)
    image_width?: number;
    image_height?: number;
    image_quality?: ImageQuality;   // U10a: image quality scoring
    small_features?: SmallFeature[];// U8: dormers/chimneys/skylights
}

/** Solar segment data for plane verification */
export interface SolarSegment {
    pitchDegrees: number;
    azimuthDegrees: number;
    areaSqft: number;
    areaMeters2: number;
    centerLat: number;
    centerLng: number;
}

/** U9: Geometry sanity validation result */
export interface SanityValidation {
    passed: boolean;
    warnings: string[];
}

// ── Utility Functions ─────────────────────────────────────────────────────

/**
 * Calculate meters-per-pixel at a given latitude and zoom level.
 *
 * Formula: metersPerPixel = 156543.03392 × cos(lat × π/180) / 2^zoom
 *
 * At zoom 20: ~0.15 m/px at equator, ~0.11 m/px at 45° latitude.
 */
function metersPerPixel(latitude: number, zoom: number): number {
    return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom);
}

/**
 * Convert a pixel coordinate to geo coordinate given image center and scale.
 */
function pixelToGeo(
    px: PixelPoint,
    centerLat: number,
    centerLng: number,
    mPerPx: number,
    imageWidth: number,
    imageHeight: number,
): GeoCoord {
    const dxMeters = (px.x - imageWidth / 2) * mPerPx;
    const dyMeters = (imageHeight / 2 - px.y) * mPerPx; // y is inverted

    const dLat = dyMeters / 111319.9;
    const dLng = dxMeters / (111319.9 * Math.cos((centerLat * Math.PI) / 180));

    return [centerLng + dLng, centerLat + dLat];
}

/**
 * Calculate pixel distance between two points.
 */
function pixelDistance(a: PixelPoint, b: PixelPoint): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Calculate geodesic distance between two geo coordinates (Haversine, meters).
 */
function haversineMeters(a: GeoCoord, b: GeoCoord): number {
    const R = 6371000;
    const dLat = ((b[1] - a[1]) * Math.PI) / 180;
    const dLng = ((b[0] - a[0]) * Math.PI) / 180;
    const halfDLat = Math.sin(dLat / 2);
    const halfDLng = Math.sin(dLng / 2);
    const x =
        halfDLat * halfDLat +
        Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) *
        halfDLng * halfDLng;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Calculate edge length in feet between two geo coordinates.
 */
function edgeLengthFt(a: GeoCoord, b: GeoCoord): number {
    return haversineMeters(a, b) * METERS_TO_FEET;
}

/**
 * Calculate polygon area in square meters using the Shoelace formula
 * (projected approximation suitable for small polygons < ~1km²).
 */
function polygonAreaSqMeters(ring: GeoCoord[]): number {
    if (ring.length < 3) return 0;

    const n = ring.length;
    // Convert to local meters from centroid
    const centLat = ring.reduce((s, c) => s + c[1], 0) / n;
    const centLng = ring.reduce((s, c) => s + c[0], 0) / n;

    const cosLat = Math.cos((centLat * Math.PI) / 180);
    const points = ring.map((c) => ({
        x: (c[0] - centLng) * 111319.9 * cosLat,
        y: (c[1] - centLat) * 111319.9,
    }));

    // Shoelace
    let area = 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

/**
 * Calculate polygon perimeter in meters.
 */
function polygonPerimeterMeters(ring: GeoCoord[]): number {
    let perimeter = 0;
    for (let i = 0; i < ring.length; i++) {
        const j = (i + 1) % ring.length;
        perimeter += haversineMeters(ring[i], ring[j]);
    }
    return perimeter;
}

/**
 * Douglas-Peucker polygon simplification (pixel space).
 */
function douglasPeucker(points: PixelPoint[], tolerance: number): PixelPoint[] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let maxIdx = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const dist = perpendicularDistance(points[i], start, end);
        if (dist > maxDist) {
            maxDist = dist;
            maxIdx = i;
        }
    }

    if (maxDist > tolerance) {
        const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
        const right = douglasPeucker(points.slice(maxIdx), tolerance);
        return [...left.slice(0, -1), ...right];
    }

    return [start, end];
}

function perpendicularDistance(point: PixelPoint, lineStart: PixelPoint, lineEnd: PixelPoint): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return pixelDistance(point, lineStart);
    const num = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
    return num / Math.sqrt(lenSq);
}

/**
 * Calculate centroid of a geo-coordinate ring.
 */
function centroid(ring: GeoCoord[]): GeoCoord {
    const n = ring.length;
    const lng = ring.reduce((s, c) => s + c[0], 0) / n;
    const lat = ring.reduce((s, c) => s + c[1], 0) / n;
    return [lng, lat];
}

/**
 * Angle of a vector from point a to point b (degrees, 0=North, CW).
 */
function bearing(a: GeoCoord, b: GeoCoord): number {
    const dLng = ((b[0] - a[0]) * Math.PI) / 180;
    const lat1 = (a[1] * Math.PI) / 180;
    const lat2 = (b[1] * Math.PI) / 180;
    const x = Math.sin(dLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    const brng = (Math.atan2(x, y) * 180) / Math.PI;
    return (brng + 360) % 360;
}

// ── Service ───────────────────────────────────────────────────────────────

class RoofGeometryService {

    // ─────────────────────────────────────────────────────────────────────
    // 1. MASK → CONTOUR → POLYGON
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Process a binary mask into a GeoJSON polygon.
     *
     * Steps:
     * 1. Extract contour from mask (march around 1-pixels)
     * 2. Simplify contour (Douglas-Peucker, tolerance 1.5px)
     * 3. Convert pixel coords → geo coords
     * 4. Close polygon ring
     */
    processMask(
        mask: number[][],
        centerLat: number,
        centerLng: number,
        zoom: number,
        imageWidth: number,
        imageHeight: number,
    ): RoofPolygon {
        // Extract the largest contour from mask
        const contour = this.extractContour(mask);

        if (contour.length < 3) {
            throw new Error('No valid roof contour found in segmentation mask');
        }

        // Simplify
        const simplified = douglasPeucker(contour, 1.5);

        // Convert to geo coordinates
        const mpp = metersPerPixel(centerLat, zoom);
        const geoRing: GeoCoord[] = simplified.map((px) =>
            pixelToGeo(px, centerLat, centerLng, mpp, imageWidth, imageHeight),
        );

        // Close ring (GeoJSON requires first == last)
        if (
            geoRing.length > 0 &&
            (geoRing[0][0] !== geoRing[geoRing.length - 1][0] ||
                geoRing[0][1] !== geoRing[geoRing.length - 1][1])
        ) {
            geoRing.push([...geoRing[0]] as GeoCoord);
        }

        return {
            type: 'Polygon',
            coordinates: [geoRing],
        };
    }

    /**
     * Process pre-extracted contours from Python AI service.
     */
    processContours(
        contours: PixelPoint[][],
        centerLat: number,
        centerLng: number,
        zoom: number,
        imageWidth: number,
        imageHeight: number,
    ): RoofPolygon {
        // Use the largest contour
        const largest = contours.reduce(
            (best, c) => (c.length > best.length ? c : best),
            contours[0] || [],
        );

        if (largest.length < 3) {
            throw new Error('No valid roof contour found');
        }

        const simplified = douglasPeucker(largest, 1.5);
        const mpp = metersPerPixel(centerLat, zoom);
        const geoRing: GeoCoord[] = simplified.map((px) =>
            pixelToGeo(px, centerLat, centerLng, mpp, imageWidth, imageHeight),
        );

        if (
            geoRing.length > 0 &&
            (geoRing[0][0] !== geoRing[geoRing.length - 1][0] ||
                geoRing[0][1] !== geoRing[geoRing.length - 1][1])
        ) {
            geoRing.push([...geoRing[0]] as GeoCoord);
        }

        return { type: 'Polygon', coordinates: [geoRing] };
    }

    /**
     * Extract border contour from binary mask using simple boundary tracing.
     * (For production, the Python service should send pre-extracted contours via OpenCV.)
     */
    private extractContour(mask: number[][]): PixelPoint[] {
        const height = mask.length;
        const width = mask[0]?.length || 0;
        const contour: PixelPoint[] = [];

        // Simple approach: collect all boundary pixels (roof pixel adjacent to background)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mask[y][x] !== 1) continue;
                // Check 4-connected neighbors
                const isEdge =
                    x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
                    mask[y - 1]?.[x] !== 1 || mask[y + 1]?.[x] !== 1 ||
                    mask[y]?.[x - 1] !== 1 || mask[y]?.[x + 1] !== 1;
                if (isEdge) {
                    contour.push({ x, y });
                }
            }
        }

        // Sort contour points by angle from centroid (polar sweep)
        if (contour.length === 0) return [];

        const cx = contour.reduce((s, p) => s + p.x, 0) / contour.length;
        const cy = contour.reduce((s, p) => s + p.y, 0) / contour.length;
        contour.sort((a, b) => {
            const angleA = Math.atan2(a.y - cy, a.x - cx);
            const angleB = Math.atan2(b.y - cy, b.x - cx);
            return angleA - angleB;
        });

        return contour;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. EDGE SNAPPING
    // ─────────────────────────────────────────────────────────────────────

    /**
     * U5: Snap polygon vertices to nearby detected edge pixels.
     * Improvements:
     * - Snap radius limited to 5-8 pixels
     * - Ignore edges outside roof mask boundary
     * - Post-snap Laplacian smoothing to prevent sharp artifacts
     */
    snapToEdges(
        polygon: RoofPolygon,
        detectedEdges: PixelPoint[],
        centerLat: number,
        centerLng: number,
        zoom: number,
        imageWidth: number,
        imageHeight: number,
        snapRadiusPx: number = 6,
        roofMaskPixels?: PixelPoint[],
    ): RoofPolygon {
        if (!detectedEdges || detectedEdges.length === 0) return polygon;

        const mpp = metersPerPixel(centerLat, zoom);
        const ring = polygon.coordinates[0];

        // Build edge set for O(1) boundary lookup (if mask pixels provided)
        const maskSet = new Set<string>();
        if (roofMaskPixels) {
            for (const p of roofMaskPixels) {
                maskSet.add(`${p.x},${p.y}`);
            }
        }

        const snappedRing: GeoCoord[] = ring.map((coord) => {
            const cosLat = Math.cos((centerLat * Math.PI) / 180);
            const px: PixelPoint = {
                x: Math.round(imageWidth / 2 + ((coord[0] - centerLng) * 111319.9 * cosLat) / mpp),
                y: Math.round(imageHeight / 2 - ((coord[1] - centerLat) * 111319.9) / mpp),
            };

            let nearest: PixelPoint | null = null;
            let minDist = snapRadiusPx;

            for (const edge of detectedEdges) {
                // U5: Ignore edges outside image bounds
                if (edge.x < 0 || edge.x >= imageWidth || edge.y < 0 || edge.y >= imageHeight) continue;

                const d = pixelDistance(px, edge);
                if (d < minDist) {
                    minDist = d;
                    nearest = edge;
                }
            }

            if (nearest) {
                return pixelToGeo(nearest, centerLat, centerLng, mpp, imageWidth, imageHeight);
            }
            return coord;
        });

        // U5: Post-snap Laplacian smoothing (average with neighbors to prevent artifacts)
        const smoothed = this.smoothPolygonRing(snappedRing, 0.3);

        return { type: 'Polygon', coordinates: [smoothed] };
    }

    /**
     * U5: Laplacian smoothing of polygon ring.
     * Each vertex moves toward the average of its neighbors by `factor` (0-1).
     */
    private smoothPolygonRing(ring: GeoCoord[], factor: number = 0.3): GeoCoord[] {
        if (ring.length < 4) return ring;

        const isClosed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
        const core = isClosed ? ring.slice(0, -1) : ring;
        const n = core.length;

        const result: GeoCoord[] = core.map((coord, i) => {
            const prev = core[(i - 1 + n) % n];
            const next = core[(i + 1) % n];
            const avgLng = (prev[0] + next[0]) / 2;
            const avgLat = (prev[1] + next[1]) / 2;
            return [
                coord[0] + factor * (avgLng - coord[0]),
                coord[1] + factor * (avgLat - coord[1]),
            ] as GeoCoord;
        });

        if (isClosed) result.push([...result[0]] as GeoCoord);
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. ROOF PLANE DETECTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Detect roof planes from polygon + Solar API segment data.
     *
     * Strategy:
     * - When Solar API segments are available, use them as ground truth
     *   and map them onto the polygon's area
     * - When no Solar data, use geometric heuristics (edge orientation)
     *   to split the polygon into likely planes
     */
    /**
     * U4: Detect roof planes using (in priority order):
     * 1. Solar API segments (ground truth)
     * 2. Detected lines intersection graph (U4 upgrade)
     * 3. Geometric heuristics (fallback)
     */
    detectRoofPlanes(
        polygon: RoofPolygon,
        solarSegments?: SolarSegment[],
        estimatedRoofType?: string,
        detectedLines?: DetectedLine[],
    ): RoofPlane[] {
        // Priority 1: Solar API segments
        if (solarSegments && solarSegments.length > 0) {
            return this.planesFromSolarSegments(polygon, solarSegments);
        }

        // Priority 2: U4 — Line-intersection graph
        if (detectedLines && detectedLines.length >= 2) {
            const linePlanes = this.planesFromLineGraph(polygon, detectedLines);
            if (linePlanes.length > 0) return linePlanes;
        }

        // Priority 3: Geometric heuristics
        return this.planesFromGeometry(polygon, estimatedRoofType);
    }

    /**
     * U4: Detect roof planes from Hough line intersections.
     * Steps:
     * 1. Find dominant line orientations
     * 2. Group lines by orientation cluster
     * 3. Find intersections between orientation groups → graph vertices
     * 4. Form polygon partitions → roof facets
     */
    private planesFromLineGraph(
        polygon: RoofPolygon,
        detectedLines: DetectedLine[],
    ): RoofPlane[] {
        const ring = polygon.coordinates[0];
        const totalArea = polygonAreaSqMeters(ring) * SQ_METERS_TO_SQ_FEET;
        const center = centroid(ring);

        // Find dominant orientations (cluster by angle, 15° buckets)
        const angleBuckets: Map<number, DetectedLine[]> = new Map();
        for (const line of detectedLines) {
            const bucket = Math.round(line.angle_degrees / 15) * 15;
            if (!angleBuckets.has(bucket)) angleBuckets.set(bucket, []);
            angleBuckets.get(bucket)!.push(line);
        }

        // Keep top 2-4 dominant orientations
        const sortedBuckets = [...angleBuckets.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 4);

        if (sortedBuckets.length < 2) {
            // Not enough orientation diversity for line-based detection
            return [];
        }

        // Estimate number of planes from orientation groups
        // Each dominant orientation pair suggests a plane boundary
        const numPlanes = Math.min(sortedBuckets.length, 6);

        // Assign azimuth based on line orientation (perpendicular to line = slope direction)
        const planes: RoofPlane[] = sortedBuckets.slice(0, numPlanes).map((bucket, i) => {
            const lines = bucket[1];
            const avgAngle = lines.reduce((s, l) => s + l.angle_degrees, 0) / lines.length;
            // Slope direction is perpendicular to the structural line
            const azimuth = (avgAngle + 90) % 360;
            // Estimate pitch from line density (more lines = steeper roof)
            const lineWeight = lines.reduce((s, l) => s + l.length_px, 0);
            const pitch = Math.min(45, 15 + lineWeight / 50);

            return {
                id: `plane-${i}`,
                vertices: ring,
                areaSqft: totalArea / numPlanes,
                pitchDegrees: Math.round(pitch),
                azimuthDegrees: Math.round(azimuth),
                centroid: center,
            };
        });

        return planes;
    }

    /**
     * Map Solar API segments onto our polygon.
     * Each Solar segment gets treated as a plane with its pitch/azimuth.
     */
    private planesFromSolarSegments(
        polygon: RoofPolygon,
        segments: SolarSegment[],
    ): RoofPlane[] {
        const ring = polygon.coordinates[0];
        const totalArea = polygonAreaSqMeters(ring) * SQ_METERS_TO_SQ_FEET;

        if (segments.length === 1) {
            // Single plane roof
            return [{
                id: 'plane-0',
                vertices: ring,
                areaSqft: segments[0].areaSqft || totalArea,
                pitchDegrees: segments[0].pitchDegrees,
                azimuthDegrees: segments[0].azimuthDegrees,
                centroid: centroid(ring),
            }];
        }

        // Multiple segments: assign proportional area based on Solar data
        const totalSolarArea = segments.reduce((s, seg) => s + seg.areaSqft, 0);

        return segments.map((seg, i) => {
            const proportion = totalSolarArea > 0 ? seg.areaSqft / totalSolarArea : 1 / segments.length;
            return {
                id: `plane-${i}`,
                vertices: ring, // simplified — full plane boundary splitting requires computational geometry
                areaSqft: totalArea * proportion,
                pitchDegrees: seg.pitchDegrees,
                azimuthDegrees: seg.azimuthDegrees,
                centroid: [seg.centerLng, seg.centerLat] as GeoCoord,
            };
        });
    }

    /**
     * Heuristic plane detection based on roof type and polygon geometry.
     */
    private planesFromGeometry(
        polygon: RoofPolygon,
        roofType?: string,
    ): RoofPlane[] {
        const ring = polygon.coordinates[0];
        const areaSqft = polygonAreaSqMeters(ring) * SQ_METERS_TO_SQ_FEET;
        const center = centroid(ring);
        const type = (roofType || 'gable').toLowerCase();

        // Default pitch by roof type
        const defaultPitch: Record<string, number> = {
            flat: 2, shed: 15, gable: 25, hip: 22, mansard: 60, gambrel: 45,
        };
        const pitch = defaultPitch[type] || 25;

        switch (type) {
            case 'gable':
                // 2 planes, split along ridge (longest axis)
                return [
                    {
                        id: 'plane-0', vertices: ring,
                        areaSqft: areaSqft / 2, pitchDegrees: pitch,
                        azimuthDegrees: 0, centroid: center,
                    },
                    {
                        id: 'plane-1', vertices: ring,
                        areaSqft: areaSqft / 2, pitchDegrees: pitch,
                        azimuthDegrees: 180, centroid: center,
                    },
                ];
            case 'hip':
                // 4 planes
                return [0, 90, 180, 270].map((az, i) => ({
                    id: `plane-${i}`, vertices: ring,
                    areaSqft: areaSqft / 4, pitchDegrees: pitch,
                    azimuthDegrees: az, centroid: center,
                }));
            case 'flat':
                return [{
                    id: 'plane-0', vertices: ring,
                    areaSqft, pitchDegrees: pitch,
                    azimuthDegrees: 0, centroid: center,
                }];
            case 'shed':
                return [{
                    id: 'plane-0', vertices: ring,
                    areaSqft, pitchDegrees: pitch,
                    azimuthDegrees: 180, centroid: center,
                }];
            default:
                // Default: 2 planes
                return [
                    {
                        id: 'plane-0', vertices: ring,
                        areaSqft: areaSqft / 2, pitchDegrees: pitch,
                        azimuthDegrees: 0, centroid: center,
                    },
                    {
                        id: 'plane-1', vertices: ring,
                        areaSqft: areaSqft / 2, pitchDegrees: pitch,
                        azimuthDegrees: 180, centroid: center,
                    },
                ];
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. RIDGE / VALLEY / HIP / EAVE / RAKE DETECTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Detect ridge lines: shared edges where two planes slope AWAY from each other.
     * Ridge = highest internal edge.
     */
    detectRidgeLines(planes: RoofPlane[]): RoofEdge[] {
        const edges: RoofEdge[] = [];
        if (planes.length < 2) return edges;

        // Find pairs of planes with opposing azimuth directions (slopes face away)
        for (let i = 0; i < planes.length; i++) {
            for (let j = i + 1; j < planes.length; j++) {
                const azDiff = Math.abs(planes[i].azimuthDegrees - planes[j].azimuthDegrees);
                const normalized = azDiff > 180 ? 360 - azDiff : azDiff;

                // Ridge: planes face AWAY (azimuth diff ~180°, tolerance ±45°)
                if (normalized >= 135 && normalized <= 225) {
                    // Estimate ridge line between centroids (perpendicular to slope direction)
                    const midLng = (planes[i].centroid[0] + planes[j].centroid[0]) / 2;
                    const midLat = (planes[i].centroid[1] + planes[j].centroid[1]) / 2;

                    // Ridge runs perpendicular to the facing direction
                    const ridgeAz = ((planes[i].azimuthDegrees + 90) % 360) * Math.PI / 180;
                    const ridgeHalfLen = Math.sqrt(planes[i].areaSqft + planes[j].areaSqft) / (2 * METERS_TO_FEET) * 0.5;

                    const start: GeoCoord = [
                        midLng + (Math.sin(ridgeAz) * ridgeHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                        midLat + (Math.cos(ridgeAz) * ridgeHalfLen) / 111319.9,
                    ];
                    const end: GeoCoord = [
                        midLng - (Math.sin(ridgeAz) * ridgeHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                        midLat - (Math.cos(ridgeAz) * ridgeHalfLen) / 111319.9,
                    ];

                    edges.push({
                        type: 'ridge',
                        start, end,
                        lengthFt: edgeLengthFt(start, end),
                        planeIds: [planes[i].id, planes[j].id],
                    });
                }
            }
        }

        return edges;
    }

    /**
     * Detect valley lines: shared edges where two planes slope TOWARD each other.
     * Valley = lowest internal edge.
     */
    detectValleyLines(planes: RoofPlane[]): RoofEdge[] {
        const edges: RoofEdge[] = [];
        if (planes.length < 2) return edges;

        for (let i = 0; i < planes.length; i++) {
            for (let j = i + 1; j < planes.length; j++) {
                const azDiff = Math.abs(planes[i].azimuthDegrees - planes[j].azimuthDegrees);
                const normalized = azDiff > 180 ? 360 - azDiff : azDiff;

                // Valley: planes face TOWARD each other but are not opposite
                // (azimuth diff ~60-120° with converging slopes)
                if (normalized >= 60 && normalized <= 120) {
                    const midLng = (planes[i].centroid[0] + planes[j].centroid[0]) / 2;
                    const midLat = (planes[i].centroid[1] + planes[j].centroid[1]) / 2;

                    const valleyAz = ((planes[i].azimuthDegrees + planes[j].azimuthDegrees) / 2) * Math.PI / 180;
                    const valleyHalfLen = Math.sqrt(Math.min(planes[i].areaSqft, planes[j].areaSqft)) / (2 * METERS_TO_FEET) * 0.4;

                    const start: GeoCoord = [
                        midLng + (Math.sin(valleyAz) * valleyHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                        midLat + (Math.cos(valleyAz) * valleyHalfLen) / 111319.9,
                    ];
                    const end: GeoCoord = [
                        midLng - (Math.sin(valleyAz) * valleyHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                        midLat - (Math.cos(valleyAz) * valleyHalfLen) / 111319.9,
                    ];

                    edges.push({
                        type: 'valley',
                        start, end,
                        lengthFt: edgeLengthFt(start, end),
                        planeIds: [planes[i].id, planes[j].id],
                    });
                }
            }
        }

        return edges;
    }

    /**
     * Detect hip lines: external convex edges where slopes descend away from vertex.
     * Typical of hip roofs and complex intersections.
     */
    detectHipLines(planes: RoofPlane[]): RoofEdge[] {
        const edges: RoofEdge[] = [];
        if (planes.length < 2) return edges;

        for (let i = 0; i < planes.length; i++) {
            for (let j = i + 1; j < planes.length; j++) {
                const azDiff = Math.abs(planes[i].azimuthDegrees - planes[j].azimuthDegrees);
                const normalized = azDiff > 180 ? 360 - azDiff : azDiff;

                // Hip: adjacent planes with ~90° azimuth difference (perpendicular slopes)
                if (normalized >= 70 && normalized <= 110) {
                    // Check if both slopes descend outward (convex vertex)
                    const avgPitch = (planes[i].pitchDegrees + planes[j].pitchDegrees) / 2;
                    if (avgPitch > 10) { // not flat
                        const midLng = (planes[i].centroid[0] + planes[j].centroid[0]) / 2;
                        const midLat = (planes[i].centroid[1] + planes[j].centroid[1]) / 2;

                        const hipAz = ((planes[i].azimuthDegrees + planes[j].azimuthDegrees) / 2 + 45) * Math.PI / 180;
                        const hipHalfLen = Math.sqrt(Math.min(planes[i].areaSqft, planes[j].areaSqft)) / (2 * METERS_TO_FEET) * 0.35;

                        const start: GeoCoord = [
                            midLng + (Math.sin(hipAz) * hipHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                            midLat + (Math.cos(hipAz) * hipHalfLen) / 111319.9,
                        ];
                        const end: GeoCoord = [
                            midLng - (Math.sin(hipAz) * hipHalfLen) / (111319.9 * Math.cos(midLat * Math.PI / 180)),
                            midLat - (Math.cos(hipAz) * hipHalfLen) / 111319.9,
                        ];

                        edges.push({
                            type: 'hip',
                            start, end,
                            lengthFt: edgeLengthFt(start, end),
                            planeIds: [planes[i].id, planes[j].id],
                        });
                    }
                }
            }
        }

        return edges;
    }

    /**
     * Detect eave and rake lines from the polygon perimeter.
     *
     * Eave = horizontal edge (water drains here)
     * Rake = sloped edge on gable end
     *
     * Classification based on edge orientation vs. roof plane azimuth.
     */
    detectPerimeterEdges(
        polygon: RoofPolygon,
        planes: RoofPlane[],
        roofType?: string,
    ): { eaves: RoofEdge[]; rakes: RoofEdge[] } {
        const ring = polygon.coordinates[0];
        const eaves: RoofEdge[] = [];
        const rakes: RoofEdge[] = [];
        const type = (roofType || 'gable').toLowerCase();

        if (ring.length < 3) return { eaves, rakes };

        // Primary slope direction (from first plane)
        const primaryAz = planes.length > 0 ? planes[0].azimuthDegrees : 0;

        for (let i = 0; i < ring.length - 1; i++) {
            const start = ring[i];
            const end = ring[i + 1];
            const edgeBearing = bearing(start, end);
            const length = edgeLengthFt(start, end);

            if (length < 1) continue; // skip tiny edges

            // Calculate angle between edge and primary slope direction
            const angleDiff = Math.abs(edgeBearing - primaryAz);
            const normalized = angleDiff > 180 ? 360 - angleDiff : angleDiff;

            // Eave: edge runs perpendicular to slope (±35°)
            // Rake: edge runs parallel to slope (±35°)
            if (normalized >= 55 && normalized <= 125) {
                eaves.push({
                    type: 'eave',
                    start, end,
                    lengthFt: length,
                    planeIds: planes.length > 0 ? [planes[0].id] : [],
                });
            } else if (normalized <= 35 || normalized >= 145) {
                // Only gable/gambrel roofs have rakes; hip roofs don't
                if (type !== 'hip' && type !== 'flat') {
                    rakes.push({
                        type: 'rake',
                        start, end,
                        lengthFt: length,
                        planeIds: planes.length > 0 ? [planes[0].id] : [],
                    });
                }
            }
        }

        return { eaves, rakes };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. PITCH CORRECTION
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Convert plan-view area to true surface area using pitch.
     * Formula: true_area = plan_area / cos(pitch_radians)
     */
    pitchCorrectedArea(planAreaSqft: number, pitchDegrees: number): number {
        if (!pitchDegrees || pitchDegrees <= 0) return planAreaSqft;
        const pitchRad = (pitchDegrees * Math.PI) / 180;
        return planAreaSqft / Math.cos(pitchRad);
    }

    /**
     * Compute weighted-average pitch across all planes.
     */
    weightedAveragePitch(planes: RoofPlane[]): number {
        if (planes.length === 0) return 0;
        const totalArea = planes.reduce((s, p) => s + p.areaSqft, 0);
        if (totalArea <= 0) return planes[0].pitchDegrees;
        return planes.reduce((s, p) => s + p.pitchDegrees * (p.areaSqft / totalArea), 0);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. CONFIDENCE SCORING
    // ─────────────────────────────────────────────────────────────────────

    /**
     * U10b: Updated confidence scoring with image quality.
     *
     * Weights:
     * - 30% — AI segmentation model confidence
     * - 25% — Solar API area agreement (1 - error%)
     * - 20% — Polygon quality (smoothness)
     * - 15% — Roof complexity penalty
     * - 10% — Image quality (shadow, blur, occlusion)
     */
    computeConfidence(params: {
        segmentationConfidence: number;
        solarAgreement?: number;
        polygonVertexCount: number;
        planeCount: number;
        imageQuality?: number;         // 0-1 from Python image quality scorer
    }): number {
        const { segmentationConfidence, solarAgreement, polygonVertexCount, planeCount, imageQuality } = params;

        const segScore = Math.min(1, Math.max(0, segmentationConfidence));

        const solarScore = solarAgreement !== undefined
            ? Math.min(1, Math.max(0, solarAgreement))
            : 0.7;

        let smoothScore = 1.0;
        if (polygonVertexCount < 4) smoothScore = 0.5;
        else if (polygonVertexCount > 30) smoothScore = Math.max(0.4, 1 - (polygonVertexCount - 30) * 0.02);
        else if (polygonVertexCount > 15) smoothScore = Math.max(0.7, 1 - (polygonVertexCount - 15) * 0.02);

        let complexityScore = 1.0;
        if (planeCount > 6) complexityScore = 0.6;
        else if (planeCount > 4) complexityScore = 0.75;
        else if (planeCount > 2) complexityScore = 0.9;

        // U10b: Image quality (default 0.7 if not provided)
        const imgScore = imageQuality !== undefined
            ? Math.min(1, Math.max(0, imageQuality))
            : 0.7;

        const composite =
            0.30 * segScore +
            0.25 * solarScore +
            0.20 * smoothScore +
            0.15 * complexityScore +
            0.10 * imgScore;

        return Math.round(composite * 1000) / 1000;
    }

    /**
     * U9: Geometry sanity validation.
     * Checks measurements against physical constraints before final output.
     */
    validateGeometrySanity(
        measurements: Partial<RoofMeasurements>,
        planes: RoofPlane[],
    ): SanityValidation {
        const warnings: string[] = [];

        // Rule 1: Ridge length must be less than roof perimeter
        if (measurements.ridgeLengthFt && measurements.perimeterFt &&
            measurements.ridgeLengthFt >= measurements.perimeterFt) {
            warnings.push('Ridge length exceeds roof perimeter — likely detection error');
        }

        // Rule 2: Each plane area must be above minimum threshold (10 sqft)
        for (const plane of planes) {
            if (plane.areaSqft < 10) {
                warnings.push(`Plane ${plane.id} has area < 10 sqft — may be noise`);
            }
        }

        // Rule 3: Max reasonable number of planes (residential: ≤ 12)
        if (planes.length > 12) {
            warnings.push(`${planes.length} planes detected — exceeds typical residential maximum`);
        }

        // Rule 4: Pitch variance across planes should be reasonable
        if (planes.length >= 2) {
            const pitches = planes.map(p => p.pitchDegrees);
            const maxPitch = Math.max(...pitches);
            const minPitch = Math.min(...pitches);
            if (maxPitch - minPitch > 40) {
                warnings.push(`Pitch variance ${maxPitch - minPitch}° exceeds 40° — inconsistent planes`);
            }
        }

        // Rule 5: Total plane area should roughly match polygon area
        if (measurements.roofAreaSqft && planes.length > 0) {
            const totalPlaneArea = planes.reduce((s, p) => s + p.areaSqft, 0);
            const ratio = totalPlaneArea / measurements.roofAreaSqft;
            if (ratio < 0.5 || ratio > 2.0) {
                warnings.push(`Plane area sum / polygon area ratio ${ratio.toFixed(2)} — should be ~1.0`);
            }
        }

        // Rule 6: Roof area must be reasonable (100 - 50000 sqft for residential)
        if (measurements.roofAreaSqft) {
            if (measurements.roofAreaSqft < 100) {
                warnings.push('Roof area < 100 sqft — unusually small');
            }
            if (measurements.roofAreaSqft > 50000) {
                warnings.push('Roof area > 50,000 sqft — unusually large for residential');
            }
        }

        return {
            passed: warnings.length === 0,
            warnings,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. FULL MEASUREMENT PIPELINE
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Orchestrate the full geometry pipeline from segmentation result to
     * complete roof measurements.
     */
    computeAllMeasurements(params: {
        segmentation: SegmentationResult;
        centerLat: number;
        centerLng: number;
        zoom: number;
        imageWidth?: number;
        imageHeight?: number;
        solarSegments?: SolarSegment[];
        solarAreaSqft?: number;
        roofType?: string;
    }): RoofMeasurements {
        const {
            segmentation, centerLat, centerLng, zoom,
            imageWidth = 1024, imageHeight = 1024,
            solarSegments, solarAreaSqft, roofType,
        } = params;

        // ── Step 1: Generate polygon from mask or contours ─────────
        let polygon: RoofPolygon;

        if (segmentation.contours && segmentation.contours.length > 0) {
            polygon = this.processContours(
                segmentation.contours, centerLat, centerLng,
                zoom, imageWidth, imageHeight,
            );
        } else if (segmentation.mask) {
            polygon = this.processMask(
                segmentation.mask, centerLat, centerLng,
                zoom, imageWidth, imageHeight,
            );
        } else {
            throw new Error('Segmentation result must include mask or contours');
        }

        // ── Step 2: U5 — Edge snapping with stability ─────────────
        if (segmentation.edges && segmentation.edges.length > 0) {
            const flatEdges = segmentation.edges.flat();
            polygon = this.snapToEdges(
                polygon, flatEdges, centerLat, centerLng,
                zoom, imageWidth, imageHeight,
                6, // snap radius
            );
        }

        // ── U6: Recalculate using polygon centroid for geo accuracy ─
        const ring = polygon.coordinates[0];
        const polyCenter = centroid(ring);
        // Use polygon centroid instead of image center for more accurate geo conversion
        const effectiveLat = polyCenter[1] || centerLat;

        // ── Step 3: Calculate plan-view area ───────────────────────
        let planAreaSqft = polygonAreaSqMeters(ring) * SQ_METERS_TO_SQ_FEET;

        // ── Step 4: Solar API validation + correction ──────────────
        let correctionApplied = false;
        if (solarAreaSqft && solarAreaSqft > 0) {
            const error = Math.abs(planAreaSqft - solarAreaSqft) / solarAreaSqft;
            if (error >= 0.10 && error < 0.20) {
                planAreaSqft = solarAreaSqft * 0.6 + planAreaSqft * 0.4;
                correctionApplied = true;
            } else if (error >= 0.20) {
                planAreaSqft = solarAreaSqft;
                correctionApplied = true;
            }
        }

        // ── Step 5: U4 — Detect roof planes (with line graph) ──────
        const planes = this.detectRoofPlanes(
            polygon, solarSegments, roofType,
            segmentation.detected_lines,
        );

        // ── Step 6: Pitch correction ───────────────────────────────
        const avgPitch = this.weightedAveragePitch(planes);
        const trueSurfaceAreaSqft = this.pitchCorrectedArea(planAreaSqft, avgPitch);

        // ── Step 7: Detect all edge types ──────────────────────────
        const ridges = this.detectRidgeLines(planes);
        const valleys = this.detectValleyLines(planes);
        const hips = this.detectHipLines(planes);
        const { eaves, rakes } = this.detectPerimeterEdges(polygon, planes, roofType);

        const allEdges: RoofEdge[] = [...ridges, ...valleys, ...hips, ...eaves, ...rakes];

        // ── Step 8: Sum linear measurements ────────────────────────
        const ridgeLengthFt = ridges.reduce((s, e) => s + e.lengthFt, 0);
        const valleyLengthFt = valleys.reduce((s, e) => s + e.lengthFt, 0);
        const hipLengthFt = hips.reduce((s, e) => s + e.lengthFt, 0);
        const eaveLengthFt = eaves.reduce((s, e) => s + e.lengthFt, 0);
        const rakeLengthFt = rakes.reduce((s, e) => s + e.lengthFt, 0);
        const perimeterFt = polygonPerimeterMeters(ring) * METERS_TO_FEET;

        // ── Step 9: U10b — Confidence scoring with image quality ───
        const solarAgreement = solarAreaSqft && solarAreaSqft > 0
            ? 1 - Math.abs(planAreaSqft - solarAreaSqft) / solarAreaSqft
            : undefined;

        const confidenceScore = this.computeConfidence({
            segmentationConfidence: segmentation.confidence,
            solarAgreement,
            polygonVertexCount: ring.length,
            planeCount: planes.length,
            imageQuality: segmentation.image_quality?.quality_score,
        });

        // ── U9: Geometry sanity validation ─────────────────────────
        const partialMeasurements = {
            roofAreaSqft: planAreaSqft,
            ridgeLengthFt,
            perimeterFt,
        };
        const sanity = this.validateGeometrySanity(partialMeasurements, planes);
        const flaggedForReview = confidenceScore < 0.75 || !sanity.passed;

        logger.info('[RoofGeometryService] Measurements computed', {
            planAreaSqft: Math.round(planAreaSqft),
            trueSurfaceAreaSqft: Math.round(trueSurfaceAreaSqft),
            ridgeFt: Math.round(ridgeLengthFt),
            valleyFt: Math.round(valleyLengthFt),
            hipFt: Math.round(hipLengthFt),
            eaveFt: Math.round(eaveLengthFt),
            rakeFt: Math.round(rakeLengthFt),
            planes: planes.length,
            confidence: confidenceScore,
            correctionApplied,
            flaggedForReview,
            sanityPassed: sanity.passed,
            sanityWarnings: sanity.warnings,
        });

        return {
            roofAreaSqft: Math.round(planAreaSqft * 100) / 100,
            trueSurfaceAreaSqft: Math.round(trueSurfaceAreaSqft * 100) / 100,
            roofSquares: Math.round((trueSurfaceAreaSqft / 100) * 100) / 100,
            ridgeLengthFt: Math.round(ridgeLengthFt * 10) / 10,
            valleyLengthFt: Math.round(valleyLengthFt * 10) / 10,
            hipLengthFt: Math.round(hipLengthFt * 10) / 10,
            eaveLengthFt: Math.round(eaveLengthFt * 10) / 10,
            rakeLengthFt: Math.round(rakeLengthFt * 10) / 10,
            perimeterFt: Math.round(perimeterFt * 10) / 10,
            polygon,
            planes,
            edges: allEdges,
            confidenceScore,
            flaggedForReview,
        };
    }
}

export const roofGeometryService = new RoofGeometryService();
