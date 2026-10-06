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

export interface CorporateServicesValue {
  offersCorporate: boolean;
  services: string[];
  industries: string;
  /** Whole dollars as typed; empty string means not set. */
  startingPrice: string;
}

export const EMPTY_CORPORATE: CorporateServicesValue = {
  offersCorporate: false,
  services: [],
  industries: "",
  startingPrice: "",
};

/** Profile-row fields → form value. */
export const corporateFromProfile = (p: {
  offers_corporate?: boolean | null;
  corporate_services?: string[] | null;
  corporate_industries?: string | null;
  corporate_starting_price?: number | null;
}): CorporateServicesValue => ({
  offersCorporate: !!p.offers_corporate,
  services: p.corporate_services ?? [],
  industries: p.corporate_industries ?? "",
  startingPrice: p.corporate_starting_price != null ? String(p.corporate_starting_price) : "",
});

/** Form value → profile-row fields (display-only; not used for booking or payments). */
export const corporateToProfile = (v: CorporateServicesValue) => {
  const price = parseInt(v.startingPrice, 10);
  return {
    offers_corporate: v.offersCorporate,
    corporate_services: v.services.filter((s) => (CORPORATE_SERVICE_OPTIONS as readonly string[]).includes(s)),
    corporate_industries: v.industries.trim().slice(0, CORPORATE_INDUSTRIES_MAX) || null,
    corporate_starting_price: Number.isFinite(price) && price >= 0 ? price : null,
  };
};

interface CorporateServicesFieldsProps {
  value: CorporateServicesValue;
  onChange: (value: CorporateServicesValue) => void;
}

const CorporateServicesFields = ({ value, onChange }: CorporateServicesFieldsProps) => {
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

          <div className="space-y-2">
            <label htmlFor="corporate-industries" className="text-sm font-medium">Industries served</label>
            <Input
              id="corporate-industries"
              placeholder="e.g. finance, law"
              maxLength={CORPORATE_INDUSTRIES_MAX}
              value={value.industries}
              onChange={(e) => set({ industries: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="corporate-starting-price" className="text-sm font-medium">
              Corporate engagements starting from
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="corporate-starting-price"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 1500"
                value={value.startingPrice}
                onChange={(e) => set({ startingPrice: e.target.value.replace(/[^\d]/g, "") })}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Shown on your profile as a "starting from" price. Final pricing is agreed with each company.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporateServicesFields;
