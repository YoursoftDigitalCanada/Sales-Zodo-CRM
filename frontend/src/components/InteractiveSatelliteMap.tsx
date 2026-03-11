import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface ParcelCoordinate {
  lat: number;
  lng: number;
}

interface InteractiveSatelliteMapProps {
  latitude: number;
  longitude: number;
  apiKey: string;
  parcelPolygon?: number[][] | null;
  zoom?: number;
  className?: string;
}

/**
 * Interactive Google Maps satellite view with optional parcel boundary overlay.
 * Uses Google Maps JS SDK for actual satellite tiles (not static images).
 */
export default function InteractiveSatelliteMap({
  latitude,
  longitude,
  apiKey,
  parcelPolygon,
  zoom = 20,
  className = "",
}: InteractiveSatelliteMapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Google Maps JS SDK script
  const loadGoogleMapsScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Already loaded
      if (window.google?.maps) {
        resolve();
        return;
      }

      // Already loading
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com/maps/api/js"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () =>
          reject(new Error("Google Maps script failed to load"))
        );
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps JS SDK"));
      document.head.appendChild(script);
    });
  }, [apiKey]);

  // Initialize or update map
  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) {
      setLoadError("Google Maps API key not available");
      return;
    }

    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapContainerRef.current) return;

        // Create or update map
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: { lat: latitude, lng: longitude },
            zoom,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            tilt: 0,
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: true,
            gestureHandling: "cooperative",
          });
        } else {
          mapRef.current.setCenter({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(zoom);
        }

        // Add/update center marker
        if (markerRef.current) {
          markerRef.current.setMap(null);
        }
        markerRef.current = new google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapRef.current,
          title: "Property Location",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          },
        });

        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || "Failed to load map");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude, zoom, loadGoogleMapsScript]);

  // Draw parcel polygon overlay
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear previous polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    if (!parcelPolygon || parcelPolygon.length < 3) return;

    // Convert [lat, lng] pairs to Google Maps LatLng
    const paths: ParcelCoordinate[] = parcelPolygon.map((coord) => ({
      lat: coord[0],
      lng: coord[1],
    }));

    polygonRef.current = new google.maps.Polygon({
      paths,
      strokeColor: "#3B82F6",
      strokeOpacity: 0.9,
      strokeWeight: 2.5,
      fillColor: "#3B82F6",
      fillOpacity: 0.12,
      map: mapRef.current,
    });

    // Fit map to parcel bounds
    const bounds = new google.maps.LatLngBounds();
    paths.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 40);
  }, [parcelPolygon, mapLoaded]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed bg-slate-50 text-sm text-slate-500 ${className}`}
        style={{ minHeight: 300 }}
      >
        <div className="text-center">
          <p className="font-medium text-slate-600">Map unavailable</p>
          <p className="mt-1 text-xs text-slate-400">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border ${className}`}>
      {!mapLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-600">Loading satellite map...</span>
        </div>
      )}
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: 350 }}
      />
      {mapLoaded && (
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur">
          Google Maps Satellite • Zoom {zoom}
          {parcelPolygon && parcelPolygon.length >= 3 && " • Parcel boundary shown"}
        </div>
      )}
    </div>
  );
}
