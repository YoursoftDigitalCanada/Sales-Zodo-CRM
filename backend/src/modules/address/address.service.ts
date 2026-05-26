import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../common/utils/logger';

const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export type AddressSuggestion = {
  description: string;
  placeId: string;
};

export type PlaceDetailsResult = {
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
};

type GooglePrediction = {
  description?: string;
  place_id?: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GooglePlaceDetails = {
  place_id?: string;
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: { lat?: number; lng?: number };
    location_type?: string;
    viewport?: {
      northeast?: { lat?: number; lng?: number };
      southwest?: { lat?: number; lng?: number };
    };
  };
  types?: string[];
  url?: string;
};

type NominatimResult = {
  display_name?: string;
  place_id?: number | string;
};

export class AddressService {
  private readonly placesApiKey = config.integrations.google.placesApiKey || '';

  async autocomplete(input: string): Promise<AddressSuggestion[]> {
    const normalizedInput = input.trim();
    if (normalizedInput.length < 3) return [];

    const googleResults = await this.autocompleteWithGoogle(normalizedInput);
    if (googleResults.length > 0) {
      return googleResults;
    }

    return this.autocompleteWithNominatim(normalizedInput);
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
    if (!placeId || placeId.startsWith('nominatim:')) {
      return null;
    }

    if (!this.placesApiKey) {
      return null;
    }

    try {
      const response = await axios.get(GOOGLE_PLACE_DETAILS_URL, {
        timeout: 8000,
        params: {
          place_id: placeId,
          key: this.placesApiKey,
          fields: 'place_id,formatted_address,address_components,geometry,types,url',
          language: 'en',
        },
      });

      if (response.data?.status !== 'OK' || !response.data?.result) {
        logger.warn('Address place details lookup returned non-OK status', {
          placeId,
          status: response.data?.status,
          errorMessage: response.data?.error_message,
        });
        return null;
      }

      return this.mapGooglePlaceDetails(response.data.result);
    } catch (error) {
      logger.warn('Address place details lookup failed', {
        placeId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async autocompleteWithGoogle(input: string): Promise<AddressSuggestion[]> {
    if (!this.placesApiKey) {
      return [];
    }

    const countryOrder = ['ca', 'us'];
    const results: AddressSuggestion[] = [];

    for (const country of countryOrder) {
      try {
        const response = await axios.get(GOOGLE_PLACES_AUTOCOMPLETE_URL, {
          timeout: 8000,
          params: {
            input,
            key: this.placesApiKey,
            types: 'address',
            components: `country:${country}`,
            language: 'en',
          },
        });

        if (response.data?.status !== 'OK' && response.data?.status !== 'ZERO_RESULTS') {
          logger.warn('Address autocomplete returned non-OK status', {
            country,
            status: response.data?.status,
            errorMessage: response.data?.error_message,
          });
        }

        const predictions = Array.isArray(response.data?.predictions)
          ? response.data.predictions as GooglePrediction[]
          : [];

        predictions.forEach((prediction) => {
          if (!prediction.description || !prediction.place_id) return;
          results.push({
            description: prediction.description,
            placeId: prediction.place_id,
          });
        });
      } catch (error) {
        logger.warn('Address autocomplete country lookup failed', {
          country,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.dedupeSuggestions(results).slice(0, 8);
  }

  private async autocompleteWithNominatim(input: string): Promise<AddressSuggestion[]> {
    try {
      const response = await axios.get(NOMINATIM_SEARCH_URL, {
        timeout: 8000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Yoursoft-Sales-CRM/1.0 address-autocomplete',
        },
        params: {
          q: input,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '8',
          countrycodes: 'ca,us',
        },
      });

      const results = Array.isArray(response.data) ? response.data as NominatimResult[] : [];

      return results
        .filter((result) => result.display_name)
        .map((result, index) => ({
          description: result.display_name || '',
          placeId: `nominatim:${result.place_id || index}`,
        }));
    } catch (error) {
      logger.warn('Address autocomplete fallback failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private dedupeSuggestions(suggestions: AddressSuggestion[]): AddressSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter((suggestion) => {
      const key = `${suggestion.placeId}:${suggestion.description}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mapGooglePlaceDetails(result: GooglePlaceDetails): PlaceDetailsResult {
    const component = (type: string): string => {
      const match = (result.address_components || []).find((entry) => entry.types.includes(type));
      return match?.long_name || match?.short_name || '';
    };

    const street = [component('street_number'), component('route')].filter(Boolean).join(' ');
    const city = component('locality') || component('postal_town') || component('administrative_area_level_3');
    const state = component('administrative_area_level_1');
    const postalCode = component('postal_code');
    const country = component('country');
    const location = result.geometry?.location || {};
    const viewport = result.geometry?.viewport;

    return {
      placeId: result.place_id || '',
      formattedAddress: result.formatted_address || '',
      lat: Number(location.lat || 0),
      lng: Number(location.lng || 0),
      addressLine1: street || result.formatted_address || '',
      city,
      state,
      postalCode,
      country,
      locationType: result.geometry?.location_type || 'APPROXIMATE',
      types: result.types || [],
      url: result.url || null,
      viewport: viewport?.northeast && viewport?.southwest
        ? {
          northeast: {
            lat: Number(viewport.northeast.lat || 0),
            lng: Number(viewport.northeast.lng || 0),
          },
          southwest: {
            lat: Number(viewport.southwest.lat || 0),
            lng: Number(viewport.southwest.lng || 0),
          },
        }
        : null,
    };
  }
}

export const addressService = new AddressService();
