import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Text as KonvaText } from "react-konva";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PolygonPoint = { x: number; y: number };

export interface HeatPlane {
  plane_id: number;
  polygon: number[][];
  area_pixels: number;
  centroid: number[];
  num_vertices: number;
}

export interface RoofPolygonEditorProps {
  imageUrl: string;
  initialPolygon: PolygonPoint[];
  width?: number;
  height?: number;
  onChange?: (points: PolygonPoint[]) => void;
  readOnly?: boolean;
  centerLat?: number;
  mapZoom?: number;
  showEdgeLengths?: boolean;
  /** Parcel boundary as pixel coords [[x,y], ...] in image space. Vertices are snapped to boundary if dragged outside. */
  parcelBoundaryPixels?: PolygonPoint[];
  /** HEAT-detected roof plane polygons (in image-pixel space, 256×256) */
  heatPlanes?: HeatPlane[] | null;
  /** Original HEAT image size (model input resolution, typically 256) */
  heatImageSize?: number;
}

type PanStart = {
  pointerX: number;
  pointerY: number;
  panX: number;
  panY: number;
};

const MIN_POINTS = 3;
const MAX_HISTORY = 80;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const EDGE_INSERT_DISTANCE_STAGE_PX = 16;
const FEET_PER_METER = 3.28084;
const MIN_VIEWPORT_HEIGHT = 420;
const MAX_VIEWPORT_HEIGHT = 980;

/** Distinct colors for HEAT plane overlays */
const HEAT_PLANE_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.30)', stroke: '#3b82f6' },   // blue
  { fill: 'rgba(16, 185, 129, 0.30)', stroke: '#10b981' },   // emerald
  { fill: 'rgba(245, 158, 11, 0.30)', stroke: '#f59e0b' },   // amber
  { fill: 'rgba(168, 85, 247, 0.30)', stroke: '#a855f7' },    // purple
  { fill: 'rgba(236, 72, 153, 0.30)', stroke: '#ec4899' },    // pink
  { fill: 'rgba(6, 182, 212, 0.30)', stroke: '#06b6d4' },     // cyan
  { fill: 'rgba(249, 115, 22, 0.30)', stroke: '#f97316' },    // orange
  { fill: 'rgba(34, 197, 94, 0.30)', stroke: '#22c55e' },     // green
];
const MAX_FIT_SCALE = 1.35;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const clonePoints = (points: PolygonPoint[]): PolygonPoint[] =>
  points.map((point) => ({ x: point.x, y: point.y }));

const clampPointToImage = (point: PolygonPoint, imageWidth: number, imageHeight: number): PolygonPoint => ({
  x: clamp(point.x, 0, imageWidth),
  y: clamp(point.y, 0, imageHeight),
});

const polygonSignature = (points: PolygonPoint[]): string =>
  points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(";");

function sanitizePolygonInput(points: PolygonPoint[], imageWidth: number, imageHeight: number): PolygonPoint[] {
  if (!Array.isArray(points) || points.length < MIN_POINTS) {
    return [
      { x: imageWidth * 0.28, y: imageHeight * 0.28 },
      { x: imageWidth * 0.72, y: imageHeight * 0.32 },
      { x: imageWidth * 0.7, y: imageHeight * 0.74 },
      { x: imageWidth * 0.3, y: imageHeight * 0.7 },
    ];
  }

  const looksNormalized = points.every(
    (point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1,
  );

  const normalizedToImage = looksNormalized
    ? points.map((point) => ({ x: point.x * imageWidth, y: point.y * imageHeight }))
    : points;

  return normalizedToImage.map((point) => clampPointToImage(point, imageWidth, imageHeight));
}

function distanceToSegment(point: PolygonPoint, start: PolygonPoint, end: PolygonPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1,
  );

  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

function findClosestEdge(points: PolygonPoint[], target: PolygonPoint): { edgeStartIndex: number; distance: number } {
  if (points.length < MIN_POINTS) {
    return { edgeStartIndex: -1, distance: Number.POSITIVE_INFINITY };
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const distance = distanceToSegment(target, start, end);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return { edgeStartIndex: bestIndex, distance: bestDistance };
}

export function normalizePolygonPoints(
  points: PolygonPoint[],
  imageWidth: number,
  imageHeight: number,
): PolygonPoint[] {
  return points.map((point) => ({
    x: Number((point.x / imageWidth).toFixed(6)),
    y: Number((point.y / imageHeight).toFixed(6)),
  }));
}

// ── Parcel boundary constraint helpers ────────────────────────────────────

/** Ray-casting point-in-polygon test */
function isPointInPolygon(point: PolygonPoint, polygon: PolygonPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Find the nearest point on a polygon boundary to the given point */
function nearestPointOnPolygonBoundary(point: PolygonPoint, polygon: PolygonPoint[]): PolygonPoint {
  let best: PolygonPoint = polygon[0] || point;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;

    let t = 0;
    if (len2 > 0) {
      t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len2, 0, 1);
    }

    const proj: PolygonPoint = { x: a.x + t * dx, y: a.y + t * dy };
    const d = Math.hypot(point.x - proj.x, point.y - proj.y);
    if (d < bestDist) {
      bestDist = d;
      best = proj;
    }
  }
  return best;
}

/** Constrain a point to be inside the parcel boundary */
function constrainToParcel(point: PolygonPoint, parcel: PolygonPoint[] | undefined): PolygonPoint {
  if (!parcel || parcel.length < 3) return point;
  if (isPointInPolygon(point, parcel)) return point;
  return nearestPointOnPolygonBoundary(point, parcel);
}

export default function RoofPolygonEditor({
  imageUrl,
  initialPolygon,
  width = 1024,
  height = 1024,
  onChange,
  readOnly = false,
  centerLat,
  mapZoom,
  showEdgeLengths = true,
  parcelBoundaryPixels,
  heatPlanes,
  heatImageSize = 256,
}: RoofPolygonEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const historyRef = useRef<PolygonPoint[][]>([]);
  const panStartRef = useRef<PanStart | null>(null);
  const pointsRef = useRef<PolygonPoint[]>([]);
  const lastEmittedSignatureRef = useRef<string>("");
  const baselineRef = useRef<PolygonPoint[]>(sanitizePolygonInput(initialPolygon, width, height));

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isImageReady, setIsImageReady] = useState(false);
  const [selected, setSelected] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [addVertexMode, setAddVertexMode] = useState(false);
  const [viewport, setViewport] = useState({
    width,
    height: clamp(
      Math.round((width * height) / Math.max(width, 1)),
      MIN_VIEWPORT_HEIGHT,
      MAX_VIEWPORT_HEIGHT,
    ),
  });
  const [points, setPoints] = useState<PolygonPoint[]>(() => sanitizePolygonInput(initialPolygon, width, height));
  const [showHeatPlanes, setShowHeatPlanes] = useState(true);

  const initialPolygonKey = useMemo(() => polygonSignature(initialPolygon), [initialPolygon]);

  useEffect(() => {
    pointsRef.current = points;

    const signature = polygonSignature(points);
    if (signature === lastEmittedSignatureRef.current) return;

    lastEmittedSignatureRef.current = signature;
    onChange?.(clonePoints(points));
  }, [points, onChange]);

  useEffect(() => {
    const baseline = sanitizePolygonInput(initialPolygon, width, height);
    baselineRef.current = baseline;
    historyRef.current = [];
    lastEmittedSignatureRef.current = "";
    setPoints(baseline);
    setSelected(true);
  }, [initialPolygonKey, width, height]);

  useEffect(() => {
    let mounted = true;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!mounted) return;
      setImageElement(image);
      setIsImageReady(true);
    };
    image.onerror = () => {
      if (!mounted) return;
      setImageElement(null);
      setIsImageReady(false);
    };
    setIsImageReady(false);
    image.src = imageUrl;

    return () => {
      mounted = false;
    };
  }, [imageUrl]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width > 0) {
        const nextWidth = Math.round(bounds.width);
        // Keep stage height derived from width + source aspect ratio to avoid
        // observer feedback loops where canvas height inflates container height.
        const nextHeight = clamp(
          Math.round((nextWidth * height) / Math.max(width, 1)),
          MIN_VIEWPORT_HEIGHT,
          MAX_VIEWPORT_HEIGHT,
        );

        setViewport((previous) => {
          if (previous.width === nextWidth && previous.height === nextHeight) {
            return previous;
          }

          return { width: nextWidth, height: nextHeight };
        });
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [height, width]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        setAddVertexMode(false);
        setPanMode(false);
        return;
      }

      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      setSpacePressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setSpacePressed(false);
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!readOnly) return;
    setAddVertexMode(false);
    setPanMode(false);
  }, [readOnly]);

  const fitScale = useMemo(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return 1;
    return Math.min(MAX_FIT_SCALE, viewport.width / width, viewport.height / height);
  }, [viewport.width, viewport.height, width, height]);

  const imageScale = fitScale * zoom;

  const imageOffset = useMemo(
    () => ({
      x: (viewport.width - width * imageScale) / 2 + pan.x,
      y: (viewport.height - height * imageScale) / 2 + pan.y,
    }),
    [viewport.width, viewport.height, width, height, imageScale, pan.x, pan.y],
  );

  const polygonStagePoints = useMemo(
    () =>
      points.flatMap((point) => [
        imageOffset.x + point.x * imageScale,
        imageOffset.y + point.y * imageScale,
      ]),
    [points, imageOffset.x, imageOffset.y, imageScale],
  );

  const anchorRadius = useMemo(() => clamp(4.2 * zoom, 2.8, 7), [zoom]);

  const feetPerPixel = useMemo(() => {
    if (!Number.isFinite(centerLat) || !Number.isFinite(mapZoom)) {
      return 0;
    }

    const safeLatitude = clamp(Number(centerLat), -85, 85);
    const safeZoom = clamp(Number(mapZoom), 1, 23);
    const metersPerPixel =
      (156543.03392 * Math.cos((safeLatitude * Math.PI) / 180)) /
      2 ** safeZoom;

    return metersPerPixel * FEET_PER_METER;
  }, [centerLat, mapZoom]);

  const edgeLengthLabels = useMemo(() => {
    if (!showEdgeLengths || points.length < 2 || feetPerPixel <= 0) {
      return [] as Array<{ id: string; x: number; y: number; text: string }>;
    }

    return points.map((point, index) => {
      const nextPoint = points[(index + 1) % points.length];
      const edgePixelLength = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
      const edgeFeet = edgePixelLength * feetPerPixel;
      const midpointX = (point.x + nextPoint.x) / 2;
      const midpointY = (point.y + nextPoint.y) / 2;
      const stageX = imageOffset.x + midpointX * imageScale;
      const stageY = imageOffset.y + midpointY * imageScale;

      return {
        id: `edge-${index}`,
        x: clamp(stageX, 34, Math.max(34, viewport.width - 34)),
        y: clamp(stageY, 14, Math.max(14, viewport.height - 14)),
        text: `${edgeFeet.toFixed(1)} ft`,
      };
    });
  }, [
    feetPerPixel,
    imageOffset.x,
    imageOffset.y,
    imageScale,
    points,
    showEdgeLengths,
    viewport.height,
    viewport.width,
  ]);

  const commitHistory = useCallback((snapshot: PolygonPoint[]) => {
    historyRef.current.push(clonePoints(snapshot));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
  }, []);

  const stageToImagePoint = useCallback(
    (stageX: number, stageY: number): PolygonPoint =>
      clampPointToImage(
        {
          x: (stageX - imageOffset.x) / imageScale,
          y: (stageY - imageOffset.y) / imageScale,
        },
        width,
        height,
      ),
    [imageOffset.x, imageOffset.y, imageScale, width, height],
  );

  const imageToStagePoint = useCallback(
    (point: PolygonPoint): PolygonPoint => ({
      x: imageOffset.x + point.x * imageScale,
      y: imageOffset.y + point.y * imageScale,
    }),
    [imageOffset.x, imageOffset.y, imageScale],
  );

  const setStageCursor = useCallback((cursor: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.container().style.cursor = cursor;
  }, []);

  useEffect(() => {
    if (readOnly) {
      setStageCursor("default");
      return;
    }

    if (isPanning) {
      setStageCursor("grabbing");
      return;
    }

    if (spacePressed || panMode) {
      setStageCursor("grab");
      return;
    }

    if (addVertexMode) {
      setStageCursor("copy");
      return;
    }

    setStageCursor(selected ? "crosshair" : "default");
  }, [addVertexMode, isPanning, panMode, readOnly, selected, setStageCursor, spacePressed]);

  const tryInsertVertexAtPointer = useCallback(
    (
      pointerX: number,
      pointerY: number,
      options?: { force?: boolean },
    ): boolean => {
      if (readOnly) return false;

      const targetImagePoint = stageToImagePoint(pointerX, pointerY);
      const currentPoints = pointsRef.current;
      const { edgeStartIndex, distance } = findClosestEdge(currentPoints, targetImagePoint);

      if (edgeStartIndex < 0) return false;

      const forceInsert = Boolean(options?.force);
      if (!forceInsert) {
        const distanceThresholdInImage = EDGE_INSERT_DISTANCE_STAGE_PX / imageScale;
        if (distance > distanceThresholdInImage) return false;
      }

      commitHistory(currentPoints);
      setPoints((previous) => {
        const next = clonePoints(previous);
        next.splice(edgeStartIndex + 1, 0, targetImagePoint);
        return next;
      });
      return true;
    },
    [commitHistory, imageScale, readOnly, stageToImagePoint],
  );

  const handleUndo = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    setPoints(previous);
  }, []);

  const handleResetToAI = useCallback(() => {
    if (readOnly) return;
    commitHistory(pointsRef.current);
    setPoints(clonePoints(baselineRef.current));
    setSelected(true);
  }, [commitHistory, readOnly]);

  const handleWheelZoom = useCallback(
    (event: KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Smooth wheel zoom to avoid runaway scaling from high-resolution trackpads.
      const normalizedDelta = clamp(event.evt.deltaY, -120, 120);
      const zoomFactor = Math.exp(-normalizedDelta * 0.0015);
      const nextZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
      const nextScale = fitScale * nextZoom;

      const imagePointUnderCursor = {
        x: (pointer.x - imageOffset.x) / imageScale,
        y: (pointer.y - imageOffset.y) / imageScale,
      };

      const nextCenteredOffsetX = (viewport.width - width * nextScale) / 2;
      const nextCenteredOffsetY = (viewport.height - height * nextScale) / 2;

      const nextPanX = pointer.x - imagePointUnderCursor.x * nextScale - nextCenteredOffsetX;
      const nextPanY = pointer.y - imagePointUnderCursor.y * nextScale - nextCenteredOffsetY;

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    },
    [fitScale, imageOffset.x, imageOffset.y, imageScale, viewport.width, viewport.height, width, height, zoom],
  );

  const handleStageMouseDown = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const targetName = event.target.name();
      const isAnchorDrag = targetName === "vertex-anchor";
      if (isAnchorDrag) return;

      if ((spacePressed || panMode) && !readOnly && event.evt.button === 0) {
        event.evt.preventDefault();
        panStartRef.current = {
          pointerX: pointer.x,
          pointerY: pointer.y,
          panX: pan.x,
          panY: pan.y,
        };
        setIsPanning(true);
      }
    },
    [pan.x, pan.y, panMode, readOnly, spacePressed],
  );

  const handleStageMouseMove = useCallback(() => {
    if (!isPanning) return;

    const stage = stageRef.current;
    const panStart = panStartRef.current;
    if (!stage || !panStart) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const nextPanX = panStart.panX + (pointer.x - panStart.pointerX);
    const nextPanY = panStart.panY + (pointer.y - panStart.pointerY);
    setPan({ x: nextPanX, y: nextPanY });
  }, [isPanning]);

  const handleStageMouseUp = useCallback(() => {
    if (!isPanning) return;
    setIsPanning(false);
    panStartRef.current = null;
  }, [isPanning]);

  const handleStageClick = useCallback((event: KonvaEventObject<MouseEvent>) => {
    const targetName = event.target.name();
    const clickedStage = event.target === event.target.getStage();
    const clickedBackground = targetName === "canvas-background" || targetName === "image-hit-area";

    if (clickedStage || clickedBackground) {
      setSelected(false);
    }
  }, []);

  const handlePolygonClick = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
      setSelected(true);

      if (panMode || isPanning) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const shouldForceInsert = addVertexMode || event.evt.shiftKey;
      tryInsertVertexAtPointer(pointer.x, pointer.y, { force: shouldForceInsert });
    },
    [addVertexMode, isPanning, panMode, tryInsertVertexAtPointer],
  );

  const handlePolygonDoubleClick = useCallback((event: KonvaEventObject<MouseEvent>) => {
    event.cancelBubble = true;
    setSelected(true);
  }, []);

  const handleVertexDragStart = useCallback(() => {
    if (readOnly) return;
    commitHistory(pointsRef.current);
    setSelected(true);
  }, [commitHistory, readOnly]);

  const handleVertexDragMove = useCallback(
    (vertexIndex: number, event: KonvaEventObject<DragEvent>) => {
      if (readOnly) return;
      let updatedPoint = stageToImagePoint(event.target.x(), event.target.y());
      // Constrain to parcel boundary if available
      updatedPoint = constrainToParcel(updatedPoint, parcelBoundaryPixels);

      setPoints((previous) =>
        previous.map((point, index) => (index === vertexIndex ? updatedPoint : point)),
      );
    },
    [readOnly, stageToImagePoint, parcelBoundaryPixels],
  );

  const handleVertexContextMenu = useCallback(
    (vertexIndex: number, event: KonvaEventObject<PointerEvent>) => {
      event.evt.preventDefault();
      event.cancelBubble = true;

      if (readOnly) return;
      if (pointsRef.current.length <= MIN_POINTS) return;

      commitHistory(pointsRef.current);
      setPoints((previous) => previous.filter((_, index) => index !== vertexIndex));
    },
    [commitHistory, readOnly],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((previous) => clamp(previous * 1.15, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((previous) => clamp(previous / 1.15, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handleFitView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleTogglePanMode = useCallback(() => {
    setAddVertexMode(false);
    setPanMode((previous) => !previous);
  }, []);

  return (
    <div className="flex min-h-[620px] w-full flex-col rounded-xl border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/80 px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={historyRef.current.length === 0 || readOnly}>
          Undo
        </Button>
        <Button
          type="button"
          variant={addVertexMode ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setAddVertexMode((previous) => {
              const next = !previous;
              if (next) setPanMode(false);
              return next;
            })
          }
          disabled={readOnly}
        >
          {addVertexMode ? "Add Dot: ON" : "Add Dot"}
        </Button>
        <Button type="button" variant={panMode ? "default" : "outline"} size="sm" onClick={handleTogglePanMode} disabled={readOnly}>
          {panMode ? "Pan: ON" : "Pan"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleResetToAI} disabled={readOnly}>
          Reset AI Polygon
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleZoomOut}>
          Zoom -
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleZoomIn}>
          Zoom +
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleFitView}>
          Fit
        </Button>

        {heatPlanes && heatPlanes.length > 0 && (
          <Button
            type="button"
            variant={showHeatPlanes ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatPlanes((p) => !p)}
            className={showHeatPlanes ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {showHeatPlanes ? `Planes: ${heatPlanes.length}` : "Show Planes"}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
          <span className="rounded bg-slate-100 px-2 py-1">Vertices: {points.length}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span className="hidden rounded bg-slate-100 px-2 py-1 md:inline">Space + drag to pan</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-b-xl bg-slate-900/90"
        style={{ height: `${viewport.height}px` }}
      >
        <Stage
          ref={stageRef}
          width={Math.max(1, viewport.width)}
          height={Math.max(1, viewport.height)}
          onWheel={handleWheelZoom}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
          onClick={handleStageClick}
        >
          <Layer>
            <Rect
              name="canvas-background"
              x={0}
              y={0}
              width={Math.max(1, viewport.width)}
              height={Math.max(1, viewport.height)}
              fill="#0f172a"
            />

            {isImageReady && imageElement ? (
              <>
                <KonvaImage
                  x={imageOffset.x}
                  y={imageOffset.y}
                  width={width * imageScale}
                  height={height * imageScale}
                  image={imageElement}
                  listening={false}
                />

                <Rect
                  name="image-hit-area"
                  x={imageOffset.x}
                  y={imageOffset.y}
                  width={width * imageScale}
                  height={height * imageScale}
                  fill="rgba(0,0,0,0)"
                />
              </>
            ) : (
              <Rect
                name="image-hit-area"
                x={imageOffset.x}
                y={imageOffset.y}
                width={width * imageScale}
                height={height * imageScale}
                fill="#1e293b"
              />
            )}

            {/* HEAT roof plane overlays — rendered BEHIND the editable polygon */}
            {showHeatPlanes && heatPlanes && heatPlanes.length > 0 && heatPlanes.map((plane, idx) => {
              const scaleX = width / heatImageSize;
              const scaleY = height / heatImageSize;
              const stagePoints = plane.polygon.flatMap((coord) => [
                imageOffset.x + coord[0] * scaleX * imageScale,
                imageOffset.y + coord[1] * scaleY * imageScale,
              ]);
              const color = HEAT_PLANE_COLORS[idx % HEAT_PLANE_COLORS.length];
              const centroidStageX = imageOffset.x + plane.centroid[0] * scaleX * imageScale;
              const centroidStageY = imageOffset.y + plane.centroid[1] * scaleY * imageScale;
              return (
                <React.Fragment key={`heat-plane-${plane.plane_id}`}>
                  <Line
                    points={stagePoints}
                    closed
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={1.8}
                    lineJoin="round"
                    lineCap="round"
                    perfectDrawEnabled={false}
                    listening={false}
                    dash={[6, 3]}
                  />
                  <KonvaText
                    x={centroidStageX - 10}
                    y={centroidStageY - 7}
                    text={`P${plane.plane_id}`}
                    fontSize={11}
                    fontStyle="bold"
                    fill="white"
                    listening={false}
                  />
                </React.Fragment>
              );
            })}

            <Line
              points={polygonStagePoints}
              closed
              fill="rgba(220, 38, 38, 0.25)"
              stroke={selected ? "#ef4444" : "#f87171"}
              strokeWidth={selected ? 2.4 : 1.8}
              lineJoin="round"
              lineCap="round"
              perfectDrawEnabled={false}
              onClick={handlePolygonClick}
              onTap={handlePolygonClick}
              onDblClick={handlePolygonDoubleClick}
            />

            {edgeLengthLabels.map((label) => {
              const labelWidth = Math.max(58, label.text.length * 7 + 12);
              return (
                <React.Fragment key={label.id}>
                  <Rect
                    x={label.x - labelWidth / 2}
                    y={label.y - 10}
                    width={labelWidth}
                    height={20}
                    fill="rgba(15, 23, 42, 0.8)"
                    cornerRadius={6}
                    listening={false}
                  />
                  <KonvaText
                    x={label.x - labelWidth / 2}
                    y={label.y - 3}
                    width={labelWidth}
                    text={label.text}
                    align="center"
                    fontSize={11}
                    fontStyle="bold"
                    fill="#e2e8f0"
                    listening={false}
                  />
                </React.Fragment>
              );
            })}

            {points.map((point, index) => {
              const stagePoint = imageToStagePoint(point);
              return (
                <Circle
                  key={`vertex-${index}`}
                  name="vertex-anchor"
                  x={stagePoint.x}
                  y={stagePoint.y}
                  radius={anchorRadius}
                  fill={readOnly ? "#64748b" : "#2563eb"}
                  stroke="white"
                  strokeWidth={1.4}
                  draggable={!readOnly}
                  onDragStart={handleVertexDragStart}
                  onDragMove={(event) => handleVertexDragMove(index, event)}
                  onContextMenu={(event) => handleVertexContextMenu(index, event)}
                  onClick={(event) => {
                    event.cancelBubble = true;
                    setSelected(true);
                  }}
                  onDblClick={(event) => {
                    event.cancelBubble = true;
                    setSelected(true);
                  }}
                  onMouseEnter={() => {
                    if (readOnly) return;
                    setStageCursor("pointer");
                  }}
                  onMouseLeave={() => {
                    if (readOnly) return;
                    if (spacePressed || panMode) {
                      setStageCursor("grab");
                      return;
                    }
                    setStageCursor(addVertexMode ? "copy" : "crosshair");
                  }}
                />
              );
            })}
          </Layer>
        </Stage>

        {!isImageReady && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-200">
            Loading satellite image...
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-2 text-xs text-slate-100">
          <p className="font-medium">Controls</p>
          <p>Drag blue points to correct the roof outline.</p>
          <p>Enable Add Dot mode to place more points quickly. Shift + click also inserts.</p>
          <p>Use Pan mode (or hold Space) and drag to move image up/down/sideways.</p>
          <p>Each edge length is shown in feet and updates live while dragging points.</p>
          <p>Right-click a point to delete it.</p>
        </div>
      </div>

      <div
        className={cn(
          "border-t px-4 py-2 text-xs",
          readOnly ? "bg-slate-50 text-slate-500" : "bg-white text-slate-600",
        )}
      >
        Coordinates are maintained in source image pixel space for accurate backend area conversion.
      </div>
    </div>
  );
}
