import { supabase } from "@/integrations/supabase/client";

export interface CorporateInfo {
  corporate_services: string[];
  corporate_industries: string | null;
  /** Offers a 3-hour virtual corporate session. */
  offers_virtual: boolean;
  /** Offers a full on-site corporate day. */
  offers_on_site: boolean;
}

/**
 * B2B details for approved advisors who opted in and set at least one
 * corporate rate, keyed by profile id. Never includes prices (those are only
 * shown at checkout). Returns an empty map on any error so pages keep working.
 */
export const fetchCorporateAdvisors = async (): Promise<Map<string, CorporateInfo>> => {
  try {
    const { data, error } = await supabase.rpc("get_public_corporate_advisors");
    if (error || !data) return new Map();
    return new Map(
      data.map((row) => [
        row.id,
        {
          corporate_services: row.corporate_services ?? [],
          corporate_industries: row.corporate_industries ?? null,
          offers_virtual: !!row.offers_virtual,
          offers_on_site: !!row.offers_on_site,
        },
      ]),
    );
  } catch {
    return new Map();
  }
};

/** Booking-time corporate engagement formats. */
export const CORPORATE_VIRTUAL_HOURS = 3;
