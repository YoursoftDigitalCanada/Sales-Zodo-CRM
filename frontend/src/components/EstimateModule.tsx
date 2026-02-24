import React, { useCallback, useMemo, useState } from "react";
import { Loader2, MapPin, Save, Satellite, Sparkles } from "lucide-react";

import RoofPolygonEditor, {
  normalizePolygonPoints,
  type PolygonPoint,
} from "@/components/RoofPolygonEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  detectRoof,
  fetchSatelliteImage,
  saveEstimate,
  type DetectionResult,
  type SatelliteResult,
  type SaveEstimatePayload,
} from "@/features/roof-estimator/services/roof-estimator-service";
import {
  calculatePolygonAreaPixels,
  calculateRoofAreaSqFt,
} from "@/features/roof-estimator/utils/area";

const SQM_PER_SQFT = 1 / 10.7639;
const DEFAULT_IMAGE_WIDTH = 1024;
const DEFAULT_IMAGE_HEIGHT = 1024;
const DEFAULT_ZOOM = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseStaticMapSize(url: string): { width: number; height: number } {
  try {
    const parsed = new URL(url);
    const size = parsed.searchParams.get("size");
    if (!size) return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };

    const [rawWidth, rawHeight] = size.split("x").map((value) => Number(value));
    if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight)) {
      return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
    }

    return {
      width: clamp(rawWidth, 256, 2048),
      height: clamp(rawHeight, 256, 2048),
    };
  } catch {
    return { width: DEFAULT_IMAGE_WIDTH, height: DEFAULT_IMAGE_HEIGHT };
  }
}

function parseStaticMapZoom(url: string): number {
  try {
    const parsed = new URL(url);
    const zoom = Number(parsed.searchParams.get("zoom"));
    if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
    return clamp(zoom, 1, 23);
  } catch {
    return DEFAULT_ZOOM;
  }
}

function createFallbackPolygon(width: number, height: number): PolygonPoint[] {
  return [
    { x: width * 0.28, y: height * 0.3 },
    { x: width * 0.72, y: height * 0.34 },
    { x: width * 0.76, y: height * 0.64 },
    { x: width * 0.58, y: height * 0.75 },
    { x: width * 0.3, y: height * 0.7 },
    { x: width * 0.24, y: height * 0.48 },
  ];
}

function createInitialAiPolygon(params: {
  aiAreaSqFt: number;
  centerLat: number;
  zoom: number;
  imageWidth: number;
  imageHeight: number;
}): PolygonPoint[] {
  const { aiAreaSqFt, centerLat, zoom, imageWidth, imageHeight } = params;

  if (aiAreaSqFt <= 0) {
    return createFallbackPolygon(imageWidth, imageHeight);
  }

  const metersPerPixel =
    (156543.03392 * Math.cos((clamp(centerLat, -85, 85) * Math.PI) / 180)) /
    2 ** clamp(zoom, 1, 23);

  const areaSquareMeters = aiAreaSqFt * SQM_PER_SQFT;
  const targetPixelArea = areaSquareMeters / (metersPerPixel ** 2);

  if (!Number.isFinite(targetPixelArea) || targetPixelArea <= 0) {
    return createFallbackPolygon(imageWidth, imageHeight);
  }

  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  const radius = clamp(
    Math.sqrt(targetPixelArea / Math.PI),
    imageWidth * 0.1,
    imageWidth * 0.38,
  );

  // Build a contractor-friendly irregular roof-like hexagon around center.
  const factors = [1.0, 0.9, 1.08, 0.95, 1.05, 0.88];
  const angleOffset = -Math.PI / 6;

  return factors.map((factor, index) => {
    const angle = angleOffset + (index * (Math.PI * 2)) / factors.length;
    return {
      x: clamp(cx + Math.cos(angle) * radius * factor, 0, imageWidth),
      y: clamp(cy + Math.sin(angle) * radius * factor, 0, imageHeight),
    };
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EstimateModule(): JSX.Element {
  const { toast } = useToast();

  const [address, setAddress] = useState("3837 Oak St, Vancouver, BC V6H 2M6, Canada");
  const [satellite, setSatellite] = useState<SatelliteResult | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [editorResetToken, setEditorResetToken] = useState(0);
  const [initialPolygon, setInitialPolygon] = useState<PolygonPoint[]>(
    createFallbackPolygon(DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT),
  );
  const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>(
    createFallbackPolygon(DEFAULT_IMAGE_WIDTH, DEFAULT_IMAGE_HEIGHT),
  );
  const [imageWidth, setImageWidth] = useState(DEFAULT_IMAGE_WIDTH);
  const [imageHeight, setImageHeight] = useState(DEFAULT_IMAGE_HEIGHT);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pricePerSqft, setPricePerSqft] = useState(5.5);
  const [notes, setNotes] = useState("");
  const [draftPayload, setDraftPayload] = useState<SaveEstimatePayload | null>(null);

  const [loadingSatellite, setLoadingSatellite] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const buildPayloadFromPolygon = useCallback(
    (polygon: PolygonPoint[], overrides?: { detection?: DetectionResult | null }) => {
      if (!satellite) {
        setDraftPayload(null);
        return;
      }

      const activeDetection = overrides?.detection ?? detection;
      const roofAreaSqFt = calculateRoofAreaSqFt({
        points: polygon,
        centerLat: satellite.latitude,
        zoom,
      });
      const totalEstimate = Number((roofAreaSqFt * pricePerSqft).toFixed(2));
      const normalized = normalizePolygonPoints(polygon, imageWidth, imageHeight);

      const polygonMeta = `polygon_normalized=${JSON.stringify(normalized)}`;
      const composedNotes = notes.trim()
        ? `${notes.trim()}\n${polygonMeta}`
        : polygonMeta;

      const payload: SaveEstimatePayload = {
        address: satellite.formattedAddress,
        latitude: satellite.latitude,
        longitude: satellite.longitude,
        satelliteImageUrl: satellite.satelliteImageUrl,
        roofAreaSqft: roofAreaSqFt,
        confidence: activeDetection?.confidence ?? 30,
        processingTimeSec: activeDetection?.processingTimeSec ?? 0,
        aiModel: activeDetection?.aiModel ?? "manual-polygon",
        pricePerSqft,
        manualAdjustment: 0,
        totalEstimate,
        snowMode: true,
        notes: composedNotes,
      };

      setDraftPayload(payload);
    },
    [detection, imageHeight, imageWidth, notes, pricePerSqft, satellite, zoom],
  );

  const handleLoadSatellite = useCallback(async () => {
    if (!address.trim()) {
      toast({
        title: "Address required",
        description: "Enter a valid property address first.",
        variant: "destructive",
      });
      return;
    }

    setLoadingSatellite(true);
    setDetection(null);
    setDraftPayload(null);

    try {
      const data = await fetchSatelliteImage(address.trim());
      const parsedSize = parseStaticMapSize(data.satelliteImageUrl);
      const parsedZoom = parseStaticMapZoom(data.satelliteImageUrl);

      setSatellite(data);
      setImageWidth(parsedSize.width);
      setImageHeight(parsedSize.height);
      setZoom(parsedZoom);

      const fallbackPolygon = createFallbackPolygon(parsedSize.width, parsedSize.height);
      setInitialPolygon(fallbackPolygon);
      setCurrentPolygon(fallbackPolygon);
      setEditorResetToken((previous) => previous + 1);
      buildPayloadFromPolygon(fallbackPolygon, { detection: null });

      toast({
        title: "Satellite image loaded",
        description: data.formattedAddress,
      });
    } catch (error: any) {
      toast({
        title: "Failed to load satellite",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoadingSatellite(false);
    }
  }, [address, buildPayloadFromPolygon, toast]);

  const handleDetectAndSeedPolygon = useCallback(async () => {
    if (!satellite) return;

    setDetecting(true);

    try {
      const aiDetection = await detectRoof({
        satelliteImageUrl: satellite.satelliteImageUrl,
        latitude: satellite.latitude,
        longitude: satellite.longitude,
      });

      const aiPolygon = createInitialAiPolygon({
        aiAreaSqFt: aiDetection.roofAreaSqft,
        centerLat: satellite.latitude,
        zoom,
        imageWidth,
        imageHeight,
      });

      setDetection(aiDetection);
      setInitialPolygon(aiPolygon);
      setCurrentPolygon(aiPolygon);
      setEditorResetToken((previous) => previous + 1);
      buildPayloadFromPolygon(aiPolygon, { detection: aiDetection });

      toast({
        title: "AI polygon seeded",
        description: `AI detected ${aiDetection.roofAreaSqft.toLocaleString()} sq ft. You can now adjust points manually.`,
      });
    } catch (error: any) {
      toast({
        title: "AI detect failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  }, [buildPayloadFromPolygon, imageHeight, imageWidth, satellite, toast, zoom]);

  const handlePolygonChange = useCallback(
    (points: PolygonPoint[]) => {
      setCurrentPolygon(points);
      buildPayloadFromPolygon(points);
    },
    [buildPayloadFromPolygon],
  );

  const handleSaveEstimate = useCallback(async () => {
    if (!draftPayload) {
      toast({
        title: "Nothing to save",
        description: "Load satellite and adjust polygon first.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await saveEstimate(draftPayload);
      toast({
        title: "Estimate saved",
        description: `${formatCurrency(draftPayload.totalEstimate)} estimate created from edited polygon.`,
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.response?.data?.message || error?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [draftPayload, toast]);

  const polygonAreaPixels = useMemo(
    () => calculatePolygonAreaPixels(currentPolygon),
    [currentPolygon],
  );

  const polygonAreaSqFt = useMemo(
    () =>
      satellite
        ? calculateRoofAreaSqFt({
            points: currentPolygon,
            centerLat: satellite.latitude,
            zoom,
          })
        : 0,
    [currentPolygon, satellite, zoom],
  );

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <header className="rounded-xl border bg-white p-4">
        <h2 className="text-xl font-semibold text-slate-900">Roof Polygon Editor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Edit the AI roof outline over satellite imagery. Every vertex change updates the live
          `saveEstimate` API payload.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <Label className="text-xs text-slate-500">Property Address</Label>
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="pl-9"
                    placeholder="3837 Oak St, Vancouver, BC"
                  />
                </div>
              </div>

              <Button type="button" variant="outline" className="mt-auto" onClick={handleLoadSatellite} disabled={loadingSatellite}>
                {loadingSatellite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Satellite className="mr-2 h-4 w-4" />}
                Load Satellite
              </Button>

              <Button type="button" className="mt-auto bg-[#0891B2] hover:bg-[#0891B2]/90" onClick={handleDetectAndSeedPolygon} disabled={!satellite || detecting}>
                {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Detect + Seed Polygon
              </Button>

              <Button type="button" className="mt-auto" onClick={handleSaveEstimate} disabled={!draftPayload || saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Estimate
              </Button>
            </div>
          </div>

          {satellite ? (
            <RoofPolygonEditor
              key={editorResetToken}
              imageUrl={satellite.satelliteImageUrl}
              width={imageWidth}
              height={imageHeight}
              initialPolygon={initialPolygon}
              onChange={handlePolygonChange}
            />
          ) : (
            <div className="flex min-h-[640px] items-center justify-center rounded-xl border border-dashed bg-white text-sm text-slate-500">
              Load a satellite image to start editing the roof polygon.
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Live Calculation</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Zoom</span>
                <span className="font-medium text-slate-800">{zoom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pixel Area</span>
                <span className="font-medium text-slate-800">{polygonAreaPixels.toFixed(1)} px2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roof Area</span>
                <span className="font-semibold text-slate-900">{polygonAreaSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Price / sq ft</span>
                <Input
                  value={pricePerSqft}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    const safeValue = Number.isFinite(next) ? Math.max(0, next) : 0;
                    setPricePerSqft(safeValue);
                    if (currentPolygon.length >= 3) {
                      buildPayloadFromPolygon(currentPolygon);
                    }
                  }}
                  className="h-8 w-24"
                  type="number"
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <Label className="text-xs text-slate-500">Estimate Notes</Label>
            <textarea
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                if (currentPolygon.length >= 3) {
                  buildPayloadFromPolygon(currentPolygon);
                }
              }}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-[#0891B2]/20 focus:ring"
              placeholder="Optional contractor notes..."
            />
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">API Payload Preview</h3>
            <p className="mt-1 text-xs text-slate-500">
              Updated directly from editor `onChange` and ready for `POST /roof-estimator`.
            </p>
            <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-slate-900 p-3 text-[11px] leading-4 text-slate-100">
              {JSON.stringify(draftPayload, null, 2)}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
