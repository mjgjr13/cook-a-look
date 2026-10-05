import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X, Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { CLIENT_FOCUS_OPTIONS, STYLE_CATEGORY_OPTIONS } from "@/components/advisor/CategorySelect";

const sortOptions = [
  { value: "featured", label: "Recommended" },
  { value: "price-low", label: "Price: low to high" },
  { value: "price-high", label: "Price: high to low" },
];

// Friendlier labels for the stored client-focus values.
const clientFocusLabel = (value: string) =>
  ({ "Plus Size": "Plus size", Budget: "Budget-friendly", Luxury: "Luxury" } as Record<string, string>)[value] ?? value;

export interface FilterState {
  searchTerm: string;
  styles: string[];
  clientFocus: string[];
  useCases: string[];
  sessionTypes: ("virtual" | "in-person")[];
  minPrice: string;
  maxPrice: string;
  sortBy: string;
}

export const EMPTY_FILTERS: FilterState = {
  searchTerm: "",
  styles: [],
  clientFocus: [],
  useCases: [],
  sessionTypes: [],
  minPrice: "",
  maxPrice: "",
  sortBy: "featured",
};

interface AdvisorFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  resultCount: number;
}

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "min-h-9 px-3 py-1.5 text-sm border transition-colors",
      active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:border-foreground",
    )}
  >
    {children}
  </button>
);

const AdvisorFilters = ({ filters, onFiltersChange, resultCount }: AdvisorFiltersProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => onFiltersChange({ ...filters, [key]: value });
  const toggle = (key: "styles" | "clientFocus" | "sessionTypes", value: string) => {
    const current = filters[key] as string[];
    update(key, (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]) as never);
  };

  const activeFilterCount =
    filters.styles.length + filters.clientFocus.length + filters.sessionTypes.length + (filters.minPrice || filters.maxPrice ? 1 : 0);

  const panel = (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Who is it for?</h3>
        <div className="flex flex-wrap gap-2">
          {CLIENT_FOCUS_OPTIONS.map((f) => (
            <Chip key={f} active={filters.clientFocus.includes(f)} onClick={() => toggle("clientFocus", f)}>
              {clientFocusLabel(f)}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">What's the occasion?</h3>
        <div className="flex flex-wrap gap-2">
          {STYLE_CATEGORY_OPTIONS.map((s) => (
            <Chip key={s} active={filters.styles.includes(s)} onClick={() => toggle("styles", s)}>
              {s}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">How do you want to meet?</h3>
        <div className="flex flex-wrap gap-2">
          <Chip active={filters.sessionTypes.includes("virtual")} onClick={() => toggle("sessionTypes", "virtual")}>
            <span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4" aria-hidden="true" /> Video call</span>
          </Chip>
          <Chip active={filters.sessionTypes.includes("in-person")} onClick={() => toggle("sessionTypes", "in-person")}>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" /> In person</span>
          </Chip>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Budget per hour</h3>
        <div className="flex items-center gap-2">
          {(["minPrice", "maxPrice"] as const).map((key, idx) => (
            <div key={key} className="contents">
              {idx === 1 && <span className="text-muted-foreground">to</span>}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder={key === "minPrice" ? "Min" : "Max"}
                  aria-label={key === "minPrice" ? "Minimum price per hour" : "Maximum price per hour"}
                  value={filters[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex gap-2 border-t border-border pt-4">
        <Button variant="ghost" className="flex-1" onClick={() => onFiltersChange({ ...EMPTY_FILTERS, searchTerm: filters.searchTerm, sortBy: filters.sortBy })}>
          Clear filters
        </Button>
        <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
          Show {resultCount} advisor{resultCount === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );

  const filtersButton = (
    <Button variant="outline" className="gap-2 shrink-0">
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      Filters
      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1 text-xs">{activeFilterCount}</Badge>
      )}
    </Button>
  );

  const chips = [
    ...filters.clientFocus.map((v) => ({ label: clientFocusLabel(v), clear: () => toggle("clientFocus", v) })),
    ...filters.styles.map((v) => ({ label: v, clear: () => toggle("styles", v) })),
    ...filters.sessionTypes.map((v) => ({ label: v === "virtual" ? "Video call" : "In person", clear: () => toggle("sessionTypes", v) })),
    ...(filters.minPrice || filters.maxPrice
      ? [{
          label: filters.minPrice && filters.maxPrice ? `$${filters.minPrice}–$${filters.maxPrice}` : filters.minPrice ? `$${filters.minPrice}+` : `Up to $${filters.maxPrice}`,
          clear: () => onFiltersChange({ ...filters, minPrice: "", maxPrice: "" }) }]
      : []),
  ];

  return (
    <div className="mb-10 border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search by name"
            aria-label="Search advisors by name"
            value={filters.searchTerm}
            onChange={(e) => update("searchTerm", e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Select value={filters.sortBy} onValueChange={(v) => update("sortBy", v)}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Sort advisors">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isMobile ? (
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>{filtersButton}</SheetTrigger>
              <SheetContent side="right" className="w-[88vw] overflow-y-auto bg-background">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <div className="mt-6">{panel}</div>
              </SheetContent>
            </Sheet>
          ) : (
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>{filtersButton}</PopoverTrigger>
              <PopoverContent className="w-[26rem] bg-background p-5" align="end">
                <div className="max-h-[70vh] overflow-y-auto pr-1">{panel}</div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
          {chips.map((c) => (
            <Badge key={c.label} variant="secondary" className="gap-1 pr-1">
              {c.label}
              <button onClick={c.clear} className="ml-1 rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${c.label}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-muted-foreground"
            onClick={() => onFiltersChange({ ...EMPTY_FILTERS, searchTerm: filters.searchTerm, sortBy: filters.sortBy })}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdvisorFilters;
