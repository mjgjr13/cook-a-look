import { publicSupabase } from "@/integrations/supabase/publicClient";

/**
 * "Top advisor" ordering used for Recommended sort and the homepage's four
 * Featured advisors: real advisors before sample profiles, then by popularity
 * rank from the database (get_advisor_popularity_ranks: recent bookings,
 * completed sessions and reviews, weighted by a smoothed rating). If the rank
 * isn't available, falls back to rating, then number of reviews.
 */
export interface RankableAdvisor {
  isSample?: boolean;
  rating?: number | null;
  review_count?: number | null;
  popularityRank?: number | null;
}

export const compareTopAdvisors = (a: RankableAdvisor, b: RankableAdvisor): number => {
  if (!!a.isSample !== !!b.isSample) return a.isSample ? 1 : -1;
  const aRank = a.popularityRank ?? null;
  const bRank = b.popularityRank ?? null;
  if (aRank !== null && bRank !== null && aRank !== bRank) return aRank - bRank;
  if ((aRank !== null) !== (bRank !== null)) return aRank !== null ? -1 : 1;
  const aReviews = a.review_count || 0;
  const bReviews = b.review_count || 0;
  if ((aReviews > 0) !== (bReviews > 0)) return aReviews > 0 ? -1 : 1;
  const byRating = (b.rating || 0) - (a.rating || 0);
  if (byRating !== 0) return byRating;
  return bReviews - aReviews;
};

type PopularityRpc = (fn: "get_advisor_popularity_ranks") => PromiseLike<{
  data: { advisor_id: string; popularity_rank: number }[] | null;
  error: unknown;
}>;

/** advisor id -> popularity rank (1 = most popular). Empty map if unavailable. */
export const fetchPopularityRanks = async (): Promise<Map<string, number>> => {
  try {
    const { data, error } = await (publicSupabase.rpc as unknown as PopularityRpc)("get_advisor_popularity_ranks");
    if (error || !data) return new Map();
    return new Map(data.map((r) => [r.advisor_id, r.popularity_rank]));
  } catch {
    return new Map();
  }
};

type AcceptingRpc = (fn: "get_advisors_accepting_bookings") => PromiseLike<{
  data: { advisor_id: string }[] | null;
  error: unknown;
}>;

/**
 * Advisors whose Stripe payout setup is finished, so they can take paid
 * bookings. null if unknown (then nothing is blocked here; create-checkout
 * still enforces it).
 */
export const fetchAdvisorsAcceptingBookings = async (): Promise<Set<string> | null> => {
  try {
    const { data, error } = await (publicSupabase.rpc as unknown as AcceptingRpc)("get_advisors_accepting_bookings");
    if (error || !data) return null;
    return new Set(data.map((r) => r.advisor_id));
  } catch {
    return null;
  }
};
