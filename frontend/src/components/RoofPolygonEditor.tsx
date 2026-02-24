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
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PolygonPoint = { x: number; y: number };

export interface RoofPolygonEditorProps {
  imageUrl: string;
  initialPolygon: PolygonPoint[];
  width?: number;
  height?: number;
  onChange?: (points: PolygonPoint[]) => void;
  readOnly?: boolean;
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
const MAX_ZOOM = 8;
const EDGE_INSERT_DISTANCE_STAGE_PX = 16;

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

export default function RoofPolygonEditor({
  imageUrl,
  initialPolygon,
  width = 1024,
  height = 1024,
  onChange,
  readOnly = false,
}: RoofPolygonEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const historyRef = useRef<PolygonPoint[][]>([]);
  const panStartRef = useRef<PanStart | null>(null);
  const pointsRef = useRef<PolygonPoint[]>([]);
  const baselineRef = useRef<PolygonPoint[]>(sanitizePolygonInput(initialPolygon, width, height));

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isImageReady, setIsImageReady] = useState(false);
  const [selected, setSelected] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState({ width, height: Math.max(420, Math.min(height, 720)) });
  const [points, setPoints] = useState<PolygonPoint[]>(() => sanitizePolygonInput(initialPolygon, width, height));

  const initialPolygonKey = useMemo(() => polygonSignature(initialPolygon), [initialPolygon]);

  useEffect(() => {
    pointsRef.current = points;
    onChange?.(clonePoints(points));
  }, [points, onChange]);

  useEffect(() => {
    const baseline = sanitizePolygonInput(initialPolygon, width, height);
    baselineRef.current = baseline;
    historyRef.current = [];
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
      if (bounds.width > 0 && bounds.height > 0) {
        setViewport({ width: bounds.width, height: bounds.height });
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
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

  const fitScale = useMemo(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return 1;
    return Math.min(viewport.width / width, viewport.height / height);
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

  const anchorRadius = useMemo(() => clamp(6 * zoom, 4, 11), [zoom]);

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

    if (spacePressed) {
      setStageCursor("grab");
      return;
    }

    setStageCursor(selected ? "crosshair" : "default");
  }, [isPanning, readOnly, selected, setStageCursor, spacePressed]);

  const tryInsertVertexAtPointer = useCallback(
    (pointerX: number, pointerY: number) => {
      if (readOnly) return;

      const targetImagePoint = stageToImagePoint(pointerX, pointerY);
      const currentPoints = pointsRef.current;
      const { edgeStartIndex, distance } = findClosestEdge(currentPoints, targetImagePoint);

      if (edgeStartIndex < 0) return;

      const distanceThresholdInImage = EDGE_INSERT_DISTANCE_STAGE_PX / imageScale;
      if (distance > distanceThresholdInImage) return;

      commitHistory(currentPoints);
      setPoints((previous) => {
        const next = clonePoints(previous);
        next.splice(edgeStartIndex + 1, 0, targetImagePoint);
        return next;
      });
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

      const zoomDirection = event.evt.deltaY > 0 ? -1 : 1;
      const zoomFactor = zoomDirection > 0 ? 1.1 : 1 / 1.1;

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

      if (spacePressed && !readOnly && event.evt.button === 0) {
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
    [pan.x, pan.y, readOnly, spacePressed],
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

      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      tryInsertVertexAtPointer(pointer.x, pointer.y);
    },
    [tryInsertVertexAtPointer],
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
      const updatedPoint = stageToImagePoint(event.target.x(), event.target.y());

      setPoints((previous) =>
        previous.map((point, index) => (index === vertexIndex ? updatedPoint : point)),
      );
    },
    [readOnly, stageToImagePoint],
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

  return (
    <div className="flex h-full min-h-[620px] w-full flex-col rounded-xl border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/80 px-4 py-3">
        <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={historyRef.current.length === 0 || readOnly}>
          Undo
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

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-600">
          <span className="rounded bg-slate-100 px-2 py-1">Vertices: {points.length}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span className="hidden rounded bg-slate-100 px-2 py-1 md:inline">Space + drag to pan</span>
        </div>
      </div>

      <div ref={containerRef} className="relative h-full min-h-[560px] w-full overflow-hidden rounded-b-xl bg-slate-900/90">
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

            {points.map((point, index) => {
              const stagePoint = imageToStagePoint(point);
              return (
                <Circle
                  key={`vertex-${index}`}
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
                    setStageCursor(spacePressed ? "grab" : "crosshair");
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
          <p>Click polygon edge to add a vertex. Right-click a point to delete.</p>
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
