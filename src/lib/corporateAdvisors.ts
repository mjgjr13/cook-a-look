import { supabase } from "@/integrations/supabase/client";

export interface CorporateInfo {
  corporate_services: string[];
  corporate_industries: string | null;
  corporate_starting_price: number | null;
}

/**
 * B2B details for approved advisors who opted in, keyed by profile id.
 * Returns an empty map on any error (e.g. before the migration is applied),
 * so the directory and profile pages keep working without B2B data.
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
          corporate_starting_price: row.corporate_starting_price ?? null,
        },
      ]),
    );
  } catch {
    return new Map();
  }
};
