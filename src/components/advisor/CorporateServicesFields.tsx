import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import CategorySelect from "@/components/advisor/CategorySelect";

// Must match the profiles_corporate_services_allowed check constraint.
export const CORPORATE_SERVICE_OPTIONS = [
  "Group workshops",
  "One-on-one executive styling",
  "Dress code consulting",
  "Other",
] as const;

export const CORPORATE_INDUSTRIES_MAX = 200;

// Suggested industries; anything else goes in the "Other" text box.
export const INDUSTRY_OPTIONS = [
  "Finance & banking",
  "Law",
  "Consulting",
  "Technology",
  "Healthcare",
  "Real estate",
  "Hospitality",
  "Retail",
  "Government",
  "Education",
  "Media & entertainment",
  "Other",
] as const;

/** Stored industries text ("Law, Consulting, Aviation") → chips + "Other" text. */
const splitIndustries = (text: string | null | undefined) => {
  const parts = (text ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const known = parts.filter((x) => (INDUSTRY_OPTIONS as readonly string[]).includes(x) && x !== "Other");
  const other = parts.filter((x) => !(INDUSTRY_OPTIONS as readonly string[]).includes(x)).join(", ");
  return { selected: other ? [...known, "Other"] : known, other };
};

const joinIndustries = (selected: string[], other: string) =>
  [...selected.filter((x) => x !== "Other"), ...(selected.includes("Other") && other.trim() ? [other.trim()] : [])]
    .join(", ")
    .slice(0, CORPORATE_INDUSTRIES_MAX);

export interface CorporateServicesValue {
  offersCorporate: boolean;
  services: string[];
  /** Selected industry chips (may include "Other"). */
  industries: string[];
  /** Free text used when "Other" is selected. */
  industriesOther: string;
  /** Whole dollars as typed; empty string means "not offered". */
  virtualRate: string;
  inPersonRate: string;
}

export const EMPTY_CORPORATE: CorporateServicesValue = {
  offersCorporate: false,
  services: [],
  industries: [],
  industriesOther: "",
  virtualRate: "",
  inPersonRate: "",
};

/** Profile-row fields → form value. */
export const corporateFromProfile = (p: {
  offers_corporate?: boolean | null;
  corporate_services?: string[] | null;
  corporate_industries?: string | null;
  corporate_virtual_rate?: number | null;
  corporate_in_person_rate?: number | null;
}): CorporateServicesValue => {
  const { selected, other } = splitIndustries(p.corporate_industries);
  return {
  offersCorporate: !!p.offers_corporate,
  services: p.corporate_services ?? [],
  industries: selected,
  industriesOther: other,
  virtualRate: p.corporate_virtual_rate != null ? String(p.corporate_virtual_rate) : "",
  inPersonRate: p.corporate_in_person_rate != null ? String(p.corporate_in_person_rate) : "",
  };
};

const toRate = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Form value → profile-row fields. Rates are flat per engagement, in whole dollars. */
export const corporateToProfile = (v: CorporateServicesValue) => ({
  offers_corporate: v.offersCorporate,
  corporate_services: v.services.filter((s) => (CORPORATE_SERVICE_OPTIONS as readonly string[]).includes(s)),
  corporate_industries: joinIndustries(v.industries, v.industriesOther) || null,
  corporate_virtual_rate: toRate(v.virtualRate),
  corporate_in_person_rate: toRate(v.inPersonRate),
});

/** Rates validation message, or null when the rates can be saved. */
export const corporateError = (v: CorporateServicesValue): string | null =>
  v.offersCorporate && toRate(v.virtualRate) == null && toRate(v.inPersonRate) == null
    ? "Set a rate for virtual sessions, on-site days, or both, so companies can book you."
    : null;

/** Free text typed by the advisor (for the profanity check). */
export const corporateFreeText = (v: CorporateServicesValue) => (v.industries.includes("Other") ? v.industriesOther : "");

interface CorporateServicesFieldsProps {
  value: CorporateServicesValue;
  onChange: (value: CorporateServicesValue) => void;
  error?: string | null;
  /** Sign-up asks for rates later, with the rest of the pricing. */
  showRates?: boolean;
}

const RateInput = ({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        placeholder="Leave blank if not offered"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        className="pl-7"
      />
    </div>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

/** Corporate rates only (used on the sign-up pricing step). */
export const CorporateRatesFields = ({
  value,
  onChange,
  error,
}: {
  value: CorporateServicesValue;
  onChange: (value: CorporateServicesValue) => void;
  error?: string | null;
}) => (
  <div>
    <p className="text-sm font-medium">Corporate rates</p>
    <p className="text-xs text-muted-foreground mt-1 mb-3">
      Flat price per booking. Only shown to a company when they're about to check out.
    </p>
    <div className="grid gap-4 sm:grid-cols-2">
      <RateInput
        id="corporate-virtual-rate"
        label="Virtual session (3 hours)"
        hint="Blocks 3 hours on your calendar."
        value={value.virtualRate}
        onChange={(virtualRate) => onChange({ ...value, virtualRate })}
      />
      <RateInput
        id="corporate-in-person-rate"
        label="On-site day (in person)"
        hint="Blocks your whole available day."
        value={value.inPersonRate}
        onChange={(inPersonRate) => onChange({ ...value, inPersonRate })}
      />
    </div>
    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
  </div>
);

const CorporateServicesFields = ({ value, onChange, error, showRates = true }: CorporateServicesFieldsProps) => {
  const set = (patch: Partial<CorporateServicesValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 border border-border bg-background p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={value.offersCorporate}
          onCheckedChange={(checked) => set({ offersCorporate: checked === true })}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium">I offer corporate / B2B image consulting</span>
          <span className="block text-xs text-muted-foreground mt-1">
            For example, teaching a company's employees how to dress for work. Optional.
          </span>
        </span>
      </label>

      {value.offersCorporate && (
        <div className="space-y-4 border-t border-border pt-4">
          <CategorySelect
            label="Corporate services offered"
            description="Select all that apply (Optional)"
            options={CORPORATE_SERVICE_OPTIONS}
            selected={value.services}
            onChange={(services) => set({ services })}
          />

          <div className="space-y-3">
            <CategorySelect
              label="Industries served"
              description="Select all that apply (Optional)"
              options={INDUSTRY_OPTIONS}
              selected={value.industries}
              onChange={(industries) => set({ industries })}
            />
            {value.industries.includes("Other") && (
              <Input
                id="corporate-industries-other"
                aria-label="Other industries"
                placeholder="Other industries, e.g. aviation, non-profit"
                maxLength={120}
                value={value.industriesOther}
                onChange={(e) => set({ industriesOther: e.target.value })}
              />
            )}
          </div>

          {showRates ? (
            <CorporateRatesFields value={value} onChange={onChange} error={error} />
          ) : (
            <p className="text-xs text-muted-foreground">You'll set your corporate rates on the last step, with your pricing.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CorporateServicesFields;
