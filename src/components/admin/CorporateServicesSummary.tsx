import { Briefcase } from "lucide-react";

interface CorporateServicesSummaryProps {
  offersCorporate?: boolean | null;
  services?: string[] | null;
  industries?: string | null;
  startingPrice?: number | null;
}

// Admin-only read-out of an advisor's corporate / B2B opt-in, for review.
const CorporateServicesSummary = ({ offersCorporate, services, industries, startingPrice }: CorporateServicesSummaryProps) => (
  <div className="border border-border p-3">
    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
      Corporate / B2B
    </p>
    {offersCorporate ? (
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Services</dt>
          <dd>{services && services.length > 0 ? services.join(", ") : "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Industries</dt>
          <dd className="break-words">{industries || "Not specified"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Starting from</dt>
          <dd>{startingPrice != null ? `$${startingPrice.toLocaleString()}` : "Not specified"}</dd>
        </div>
      </dl>
    ) : (
      <p className="mt-1 text-sm">Not offered</p>
    )}
  </div>
);

export default CorporateServicesSummary;
