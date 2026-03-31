import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  autocompleteAddress,
  getPlaceDetails,
  type PlaceDetailsResult,
} from "@/features/roof-estimator/services/roof-estimator-service";

type AddressSuggestion = {
  description: string;
  placeId: string;
};

function createFallbackDetails(suggestion: AddressSuggestion): PlaceDetailsResult {
  return {
    placeId: suggestion.placeId,
    formattedAddress: suggestion.description,
    lat: 0,
    lng: 0,
    addressLine1: suggestion.description,
    city: "",
    state: "",
    postalCode: "",
    country: "",
    locationType: "",
    types: [],
    url: null,
    viewport: null,
  };
}

type AddressAutocompleteInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  onSelectAddress?: (details: PlaceDetailsResult) => void | Promise<void>;
  containerClassName?: string;
  suggestionListClassName?: string;
  iconClassName?: string;
  minChars?: number;
};

export default function AddressAutocompleteInput({
  value,
  onValueChange,
  onSelectAddress,
  containerClassName,
  suggestionListClassName,
  iconClassName,
  className,
  minChars = 3,
  disabled,
  autoComplete,
  ...inputProps
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = useCallback((nextValue: string) => {
    onValueChange(nextValue);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (disabled || nextValue.trim().length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await autocompleteAddress(nextValue.trim());
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [disabled, minChars, onValueChange]);

  const handleSelectSuggestion = useCallback(async (suggestion: AddressSuggestion) => {
    onValueChange(suggestion.description);
    setSuggestions([]);
    setIsOpen(false);

    if (!onSelectAddress) return;

    try {
      const details = await getPlaceDetails(suggestion.placeId);
      await onSelectAddress(details || createFallbackDetails(suggestion));
    } catch {
      await onSelectAddress(createFallbackDetails(suggestion));
    }
  }, [onSelectAddress, onValueChange]);

  return (
    <div className={cn("relative", containerClassName)} ref={containerRef}>
      <MapPin className={cn("absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#475569]", iconClassName)} />
      <Input
        {...inputProps}
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        autoComplete={autoComplete || "off"}
        disabled={disabled}
        className={cn("pl-10", className)}
      />

      {isOpen && suggestions.length > 0 ? (
        <div
          className={cn(
            "absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg",
            suggestionListClassName,
          )}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#f8fafc] last:border-b-0"
              onClick={() => void handleSelectSuggestion(suggestion)}
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#0891B2]" />
              <span className="truncate">{suggestion.description}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isSearching ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
