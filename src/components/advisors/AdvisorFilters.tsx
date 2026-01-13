import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, ArrowUpDown, X, Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Style categories for filtering
const styleCategories = [
  "Casual",
  "Athletic",
  "Wedding",
  "Business",
  "Formal",
  "Streetwear",
  "Vintage",
];

// Client focus options
const clientFocusOptions = [
  "Men",
  "Women",
  "Plus Size",
];

// Sort options
const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
];

export interface FilterState {
  searchTerm: string;
  styles: string[];
  clientFocus: string[];
  sessionTypes: ("virtual" | "in-person")[];
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

interface AdvisorFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  resultCount: number;
}

const AdvisorFilters = ({ filters, onFiltersChange, resultCount }: AdvisorFiltersProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends keyof FilterState>(
    key: K,
    value: string
  ) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    updateFilter(key, newArray as FilterState[K]);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      styles: [],
      clientFocus: [],
      sessionTypes: [],
      minPrice: "",
      maxPrice: "",
      sortBy: "featured",
    });
  };

  const activeFilterCount =
    filters.styles.length +
    filters.clientFocus.length +
    filters.sessionTypes.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  const hasActiveFilters =
    filters.searchTerm !== "" ||
    activeFilterCount > 0 ||
    filters.sortBy !== "featured";

  return (
    <div className="mb-12 p-6 bg-background border border-border space-y-4">
      {/* Top Row: Search, Filters, Sort */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialty..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter("searchTerm", e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Dropdown */}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-background" align="end">
            <div className="space-y-6">
              {/* Style Categories */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Style</Label>
                <div className="flex flex-wrap gap-2">
                  {styleCategories.map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleArrayFilter("styles", style)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-sans border transition-colors",
                        filters.styles.includes(style)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Focus */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Client Focus</Label>
                <div className="space-y-2">
                  {clientFocusOptions.map((focus) => (
                    <div key={focus} className="flex items-center gap-2">
                      <Checkbox
                        id={`focus-${focus}`}
                        checked={filters.clientFocus.includes(focus)}
                        onCheckedChange={() => toggleArrayFilter("clientFocus", focus)}
                      />
                      <Label htmlFor={`focus-${focus}`} className="text-sm font-normal cursor-pointer">
                        {focus}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Price Range</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => updateFilter("minPrice", e.target.value)}
                      className="pl-7"
                      min="0"
                    />
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => updateFilter("maxPrice", e.target.value)}
                      className="pl-7"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Apply/Clear buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearFilters();
                    setFiltersOpen(false);
                  }}
                  className="flex-1"
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Dropdown */}
        <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
          <SelectTrigger className="w-full lg:w-48 gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-background">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Second Row: Session Type Boxes */}
      <div className="flex gap-2">
        <button
          onClick={() => toggleArrayFilter("sessionTypes", "virtual")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border text-sm font-sans transition-colors",
            filters.sessionTypes.includes("virtual")
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50"
          )}
        >
          <Video className="w-4 h-4" />
          Virtual
        </button>
        <button
          onClick={() => toggleArrayFilter("sessionTypes", "in-person")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 border text-sm font-sans transition-colors",
            filters.sessionTypes.includes("in-person")
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50"
          )}
        >
          <MapPin className="w-4 h-4" />
          In-Person
        </button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground font-sans">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
          
          {filters.styles.map((style) => (
            <Badge key={style} variant="secondary" className="gap-1 pr-1">
              {style}
              <button
                onClick={() => toggleArrayFilter("styles", style)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          
          {filters.clientFocus.map((focus) => (
            <Badge key={focus} variant="secondary" className="gap-1 pr-1">
              {focus}
              <button
                onClick={() => toggleArrayFilter("clientFocus", focus)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {(filters.minPrice || filters.maxPrice) && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {filters.minPrice && filters.maxPrice
                ? `$${filters.minPrice} - $${filters.maxPrice}`
                : filters.minPrice
                ? `$${filters.minPrice}+`
                : `Up to $${filters.maxPrice}`}
              <button
                onClick={() => {
                  updateFilter("minPrice", "");
                  updateFilter("maxPrice", "");
                }}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground h-7"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdvisorFilters;
