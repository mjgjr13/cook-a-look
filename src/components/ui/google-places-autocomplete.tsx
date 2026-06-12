import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Google Places (New) autocomplete input.
 *
 * Uses Places API New via the Maps JS loader. The Lovable-managed browser key
 * (VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY) only works on *.lovable.app
 * domains — on custom domains the user must connect their own Google Maps key.
 */
export interface SelectedPlace {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: SelectedPlace) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

// Minimal globals from Google Places (New)
type AutocompleteSuggestion = {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
    toPlace: () => {
      fetchFields: (opts: { fields: string[] }) => Promise<void>;
      id: string;
      displayName?: string;
      formattedAddress?: string;
      location?: { lat: () => number; lng: () => number };
    };
  };
};

type PlacesLib = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken: unknown;
    }) => Promise<{ suggestions: AutocompleteSuggestion[] }>;
  };
  AutocompleteSessionToken: new () => unknown;
};

let loaderPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  // already loaded
  // @ts-expect-error google global
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  const key = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined) ?? "";
  const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ?? "";
  if (!key) return Promise.reject(new Error("Google Maps browser key missing"));

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
      return;
    }
    const s = document.createElement("script");
    s.id = "google-maps-js";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key,
    )}&libraries=places&v=weekly&loading=async${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
};

const GooglePlacesAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a place or address",
  className,
  error,
  disabled,
}: Props) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sessionRef = useRef<unknown>(null);
  const placesRef = useRef<PlacesLib | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async () => {
        if (cancelled) return;
        // @ts-expect-error google global
        const lib = (await window.google.maps.importLibrary("places")) as PlacesLib;
        placesRef.current = lib;
        sessionRef.current = new lib.AutocompleteSessionToken();
        setReady(true);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setLoadError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const lib = placesRef.current;
      if (!lib || !sessionRef.current || input.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const { suggestions: out } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
        });
        setSuggestions(out.slice(0, 6));
        setOpen(out.length > 0);
      } catch (e) {
        console.error("Places autocomplete error:", e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleSelect = async (s: AutocompleteSuggestion) => {
    const pred = s.placePrediction;
    if (!pred) return;
    setOpen(false);
    try {
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
      const formatted = place.formattedAddress || pred.text.text;
      const name = place.displayName || pred.structuredFormat?.mainText?.text || formatted;
      onChange(formatted);
      onSelect({
        placeId: place.id,
        name,
        formattedAddress: formatted,
        lat: place.location?.lat?.(),
        lng: place.location?.lng?.(),
      });
      // refresh session token after a selection (Google best practice)
      if (placesRef.current) {
        sessionRef.current = new placesRef.current.AutocompleteSessionToken();
      }
    } catch (e) {
      console.error("Place details error:", e);
      onChange(pred.text.text);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            fetchSuggestions(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn("pl-10", error && "border-destructive", className)}
          disabled={disabled || !!loadError}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {!ready && !loadError && (
        <p className="text-xs text-muted-foreground mt-1">Loading place suggestions…</p>
      )}
      {loadError && (
        <p className="text-xs text-destructive mt-1">
          Suggestions unavailable — type the address manually.
        </p>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s) => {
            const pred = s.placePrediction;
            if (!pred) return null;
            const main = pred.structuredFormat?.mainText?.text || pred.text.text;
            const secondary = pred.structuredFormat?.secondaryText?.text;
            return (
              <button
                key={pred.placeId}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1">
                  <span className="block font-medium">{main}</span>
                  {secondary && (
                    <span className="block text-xs text-muted-foreground">{secondary}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
