import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Extended city list for autocomplete suggestions - US cities + major international cities
const COMMON_CITIES = [
  // Top 100 US Cities by population
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "San Francisco, CA",
  "Indianapolis, IN",
  "Seattle, WA",
  "Denver, CO",
  "Washington, DC",
  "Boston, MA",
  "El Paso, TX",
  "Nashville, TN",
  "Detroit, MI",
  "Oklahoma City, OK",
  "Portland, OR",
  "Las Vegas, NV",
  "Memphis, TN",
  "Louisville, KY",
  "Baltimore, MD",
  "Milwaukee, WI",
  "Albuquerque, NM",
  "Tucson, AZ",
  "Fresno, CA",
  "Sacramento, CA",
  "Mesa, AZ",
  "Kansas City, MO",
  "Atlanta, GA",
  "Long Beach, CA",
  "Omaha, NE",
  "Raleigh, NC",
  "Colorado Springs, CO",
  "Miami, FL",
  "Virginia Beach, VA",
  "Oakland, CA",
  "Minneapolis, MN",
  "Tulsa, OK",
  "Arlington, TX",
  "Tampa, FL",
  "New Orleans, LA",
  "Wichita, KS",
  "Cleveland, OH",
  "Bakersfield, CA",
  "Aurora, CO",
  "Anaheim, CA",
  "Honolulu, HI",
  "Santa Ana, CA",
  "Riverside, CA",
  "Corpus Christi, TX",
  "Lexington, KY",
  "Stockton, CA",
  "Henderson, NV",
  "Saint Paul, MN",
  "St. Louis, MO",
  "Cincinnati, OH",
  "Pittsburgh, PA",
  "Greensboro, NC",
  "Anchorage, AK",
  "Plano, TX",
  "Lincoln, NE",
  "Orlando, FL",
  "Irvine, CA",
  "Newark, NJ",
  "Toledo, OH",
  "Durham, NC",
  "Chula Vista, CA",
  "Fort Wayne, IN",
  "Jersey City, NJ",
  "St. Petersburg, FL",
  "Laredo, TX",
  "Madison, WI",
  "Chandler, AZ",
  "Buffalo, NY",
  "Lubbock, TX",
  "Scottsdale, AZ",
  "Reno, NV",
  "Glendale, AZ",
  "Gilbert, AZ",
  "Winston-Salem, NC",
  "North Las Vegas, NV",
  "Norfolk, VA",
  "Chesapeake, VA",
  "Garland, TX",
  "Irving, TX",
  "Hialeah, FL",
  "Fremont, CA",
  "Boise, ID",
  "Richmond, VA",
  "Baton Rouge, LA",
  "Spokane, WA",
  // California cities
  "Beverly Hills, CA",
  "Santa Monica, CA",
  "Pasadena, CA",
  "Burbank, CA",
  "Glendale, CA",
  "Huntington Beach, CA",
  "Modesto, CA",
  "San Bernardino, CA",
  "Fontana, CA",
  "Moreno Valley, CA",
  "Rancho Cucamonga, CA",
  "Ontario, CA",
  "Oceanside, CA",
  "Garden Grove, CA",
  "Elk Grove, CA",
  "Corona, CA",
  "Lancaster, CA",
  "Palmdale, CA",
  "Salinas, CA",
  "Pomona, CA",
  "Escondido, CA",
  "Torrance, CA",
  "Sunnyvale, CA",
  "Roseville, CA",
  "Hayward, CA",
  "Visalia, CA",
  "Concord, CA",
  "Santa Clara, CA",
  "Victorville, CA",
  "Simi Valley, CA",
  "Thousand Oaks, CA",
  "Vallejo, CA",
  "Berkeley, CA",
  "El Monte, CA",
  "Downey, CA",
  "Costa Mesa, CA",
  "Inglewood, CA",
  "Carlsbad, CA",
  "San Buenaventura (Ventura), CA",
  "Fairfield, CA",
  "West Covina, CA",
  "Murrieta, CA",
  "Richmond, CA",
  "Norwalk, CA",
  "Antioch, CA",
  "Temecula, CA",
  "Burlingame, CA",
  "Daly City, CA",
  "El Cajon, CA",
  "Menifee, CA",
  "Chico, CA",
  "Newport Beach, CA",
  "Napa, CA",
  "Palo Alto, CA",
  "Mountain View, CA",
  "Redwood City, CA",
  "San Mateo, CA",
  "Santa Barbara, CA",
  "San Luis Obispo, CA",
  "Monterey, CA",
  "Carmel, CA",
  "Malibu, CA",
  "La Jolla, CA",
  // Texas cities
  "Brownsville, TX",
  "McAllen, TX",
  "Killeen, TX",
  "Midland, TX",
  "McKinney, TX",
  "Frisco, TX",
  "Pasadena, TX",
  "Mesquite, TX",
  "Denton, TX",
  "Waco, TX",
  "Carrollton, TX",
  "Round Rock, TX",
  "The Woodlands, TX",
  "Sugar Land, TX",
  "Pearland, TX",
  "Lewisville, TX",
  "College Station, TX",
  "Abilene, TX",
  "Beaumont, TX",
  "Richardson, TX",
  // Florida cities
  "Fort Lauderdale, FL",
  "Hollywood, FL",
  "Clearwater, FL",
  "Pompano Beach, FL",
  "West Palm Beach, FL",
  "Coral Springs, FL",
  "Lakeland, FL",
  "Gainesville, FL",
  "Tallahassee, FL",
  "Palm Bay, FL",
  "Port St. Lucie, FL",
  "Cape Coral, FL",
  "Pembroke Pines, FL",
  "Miramar, FL",
  "Daytona Beach, FL",
  "Fort Myers, FL",
  "Sarasota, FL",
  "Naples, FL",
  "Boca Raton, FL",
  "Key West, FL",
  // New York state cities
  "Brooklyn, NY",
  "Queens, NY",
  "Manhattan, NY",
  "The Bronx, NY",
  "Staten Island, NY",
  "Yonkers, NY",
  "Syracuse, NY",
  "Albany, NY",
  "Rochester, NY",
  "White Plains, NY",
  "New Rochelle, NY",
  "Schenectady, NY",
  "Utica, NY",
  "Mount Vernon, NY",
  "Long Island, NY",
  "Ithaca, NY",
  "Niagara Falls, NY",
  // Major International Cities - Canada
  "Toronto, Canada",
  "Montreal, Canada",
  "Vancouver, Canada",
  "Calgary, Canada",
  "Edmonton, Canada",
  "Ottawa, Canada",
  "Winnipeg, Canada",
  "Quebec City, Canada",
  "Hamilton, Canada",
  "Victoria, Canada",
  // Major International Cities - UK & Ireland
  "London, UK",
  "Manchester, UK",
  "Birmingham, UK",
  "Liverpool, UK",
  "Edinburgh, UK",
  "Glasgow, UK",
  "Bristol, UK",
  "Leeds, UK",
  "Oxford, UK",
  "Cambridge, UK",
  "Dublin, Ireland",
  // Major International Cities - Europe
  "Paris, France",
  "Nice, France",
  "Lyon, France",
  "Marseille, France",
  "Berlin, Germany",
  "Munich, Germany",
  "Frankfurt, Germany",
  "Hamburg, Germany",
  "Cologne, Germany",
  "Düsseldorf, Germany",
  "Amsterdam, Netherlands",
  "Rotterdam, Netherlands",
  "The Hague, Netherlands",
  "Barcelona, Spain",
  "Madrid, Spain",
  "Valencia, Spain",
  "Seville, Spain",
  "Rome, Italy",
  "Milan, Italy",
  "Florence, Italy",
  "Venice, Italy",
  "Naples, Italy",
  "Vienna, Austria",
  "Zurich, Switzerland",
  "Geneva, Switzerland",
  "Brussels, Belgium",
  "Lisbon, Portugal",
  "Porto, Portugal",
  "Stockholm, Sweden",
  "Copenhagen, Denmark",
  "Oslo, Norway",
  "Helsinki, Finland",
  "Warsaw, Poland",
  "Krakow, Poland",
  "Prague, Czech Republic",
  "Budapest, Hungary",
  "Athens, Greece",
  // Major International Cities - Asia Pacific
  "Tokyo, Japan",
  "Osaka, Japan",
  "Kyoto, Japan",
  "Seoul, South Korea",
  "Busan, South Korea",
  "Beijing, China",
  "Shanghai, China",
  "Hong Kong",
  "Shenzhen, China",
  "Guangzhou, China",
  "Singapore",
  "Bangkok, Thailand",
  "Kuala Lumpur, Malaysia",
  "Jakarta, Indonesia",
  "Manila, Philippines",
  "Ho Chi Minh City, Vietnam",
  "Hanoi, Vietnam",
  "Mumbai, India",
  "Delhi, India",
  "Bangalore, India",
  "Chennai, India",
  "Hyderabad, India",
  "Kolkata, India",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Brisbane, Australia",
  "Perth, Australia",
  "Adelaide, Australia",
  "Auckland, New Zealand",
  "Wellington, New Zealand",
  // Major International Cities - Middle East & Africa
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Doha, Qatar",
  "Riyadh, Saudi Arabia",
  "Jeddah, Saudi Arabia",
  "Tel Aviv, Israel",
  "Jerusalem, Israel",
  "Cairo, Egypt",
  "Cape Town, South Africa",
  "Johannesburg, South Africa",
  "Nairobi, Kenya",
  "Lagos, Nigeria",
  "Casablanca, Morocco",
  "Marrakech, Morocco",
  // Major International Cities - Latin America
  "Mexico City, Mexico",
  "Guadalajara, Mexico",
  "Monterrey, Mexico",
  "Cancun, Mexico",
  "Tijuana, Mexico",
  "Buenos Aires, Argentina",
  "São Paulo, Brazil",
  "Rio de Janeiro, Brazil",
  "Bogotá, Colombia",
  "Medellín, Colombia",
  "Lima, Peru",
  "Santiago, Chile",
  "Panama City, Panama",
  "San Juan, Puerto Rico",
];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Enter your city",
  className,
  error,
  disabled,
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const filtered = COMMON_CITIES.filter((city) =>
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      onChange(suggestions[highlightedIndex]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (city: string) => {
    onChange(city);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pl-10", error && "border-destructive", className)}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((city, index) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSelect(city)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2",
                highlightedIndex === index && "bg-accent"
              )}
            >
              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span>{city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
