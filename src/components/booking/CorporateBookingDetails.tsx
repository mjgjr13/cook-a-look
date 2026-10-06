import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CorporateDetails {
  format?: "virtual" | "on_site";
  group_size?: number;
  company?: string;
  location?: string | null;
  about?: string;
}

// Shown in Session Details when a booking is a corporate engagement.
// Reads the booking row (same access rules as the booking: participants + admin).
const CorporateBookingDetails = ({ bookingId }: { bookingId: string }) => {
  const [details, setDetails] = useState<CorporateDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("bookings")
      .select("is_corporate, corporate_details")
      .eq("id", bookingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data?.is_corporate) return;
        setDetails((data.corporate_details as CorporateDetails) ?? {});
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!details) return null;

  return (
    <div className="border border-border p-4 space-y-2 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Briefcase className="w-4 h-4" aria-hidden="true" />
        Corporate booking · {details.format === "on_site" ? "On-site" : "Virtual"}
      </p>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
        {details.company && (<><dt className="text-muted-foreground">Company</dt><dd>{details.company}</dd></>)}
        {details.group_size != null && (<><dt className="text-muted-foreground">Group size</dt><dd>{details.group_size}</dd></>)}
        {details.location && (
          <><dt className="text-muted-foreground">{details.format === "on_site" ? "Address" : "Based in"}</dt><dd className="break-words">{details.location}</dd></>
        )}
      </dl>
      {details.about && (
        <div>
          <p className="text-muted-foreground">About the booking</p>
          <p className="whitespace-pre-line break-words">{details.about}</p>
        </div>
      )}
    </div>
  );
};

export default CorporateBookingDetails;
