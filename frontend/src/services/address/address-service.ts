import api from "@/lib/axios";

export interface PlaceDetailsResult {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  locationType: string;
  types: string[];
  url: string | null;
  viewport: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  } | null;
}

export type AddressSuggestion = {
  description: string;
  placeId: string;
};

type NominatimResult = {
  display_name?: string;
  place_id?: number | string;
  lat?: string;
  lon?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
    postcode?: string;
    country?: string;
  };
};

const NOMINATIM_PLACE_PREFIX = "nominatim:";
const nominatimDetailsCache = new Map<string, PlaceDetailsResult>();

function getNominatimPlaceId(result: NominatimResult, index = 0): string {
  return `${NOMINATIM_PLACE_PREFIX}${result.place_id || index}`;
}

function toNominatimDetails(result: NominatimResult, index = 0): PlaceDetailsResult | null {
  if (!result.display_name) return null;

  const address = result.address || {};
  const street = [address.house_number, address.road || address.pedestrian]
    .filter(Boolean)
    .join(" ");

  return {
    placeId: getNominatimPlaceId(result, index),
    formattedAddress: result.display_name,
    lat: Number(result.lat || 0),
    lng: Number(result.lon || 0),
    addressLine1: street || result.display_name,
    city: address.city || address.town || address.village || address.municipality || address.suburb || "",
    state: address.state || address.province || "",
    postalCode: address.postcode || "",
    country: address.country || "",
    locationType: "APPROXIMATE",
    types: [],
    url: null,
    viewport: null,
  };
}

async function searchNominatim(input: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: input,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    countrycodes: "ca,us",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return [];
  return response.json();
}

export async function autocompleteAddress(input: string): Promise<AddressSuggestion[]> {
  try {
    const response = await api.get("/address/autocomplete", { params: { input } });
    const apiResults = response.data?.data || [];
    if (apiResults.length > 0) return apiResults;
  } catch {
    // Fall through to the browser-side fallback below so address entry still works.
  }

  const fallbackResults = await searchNominatim(input);
  return fallbackResults
    .filter((result) => result.display_name)
    .map((result, index) => {
      const details = toNominatimDetails(result, index);
      const placeId = details?.placeId || getNominatimPlaceId(result, index);

      if (details) {
        nominatimDetailsCache.set(placeId, details);
      }

      return {
        description: result.display_name || "",
        placeId,
      };
    });
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  if (placeId.startsWith(NOMINATIM_PLACE_PREFIX)) {
    return nominatimDetailsCache.get(placeId) || null;
  }

  const response = await api.post("/address/place-details", { placeId });
  return response.data?.data || null;
}
