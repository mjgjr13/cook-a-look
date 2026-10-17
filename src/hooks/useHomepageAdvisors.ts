import { useQuery } from "@tanstack/react-query";
import { publicSupabase } from "@/integrations/supabase/publicClient";
import { withSampleContent } from "@/lib/sampleAdvisors";
import { compareTopAdvisors, fetchPopularityRanks } from "@/lib/advisorRanking";

export interface HomepageAdvisor {
  id: string;
  full_name: string | null;
  rating: number | null;
  review_count: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
  target_demographics: string[] | null;
  is_demo?: boolean | null;
  isSample: boolean;
  popularityRank: number | null;
}

/** Portraits shown in the homepage hero. Set to 0 once the hero uses its own photo. */
export const HERO_PORTRAIT_COUNT = 4;
const FEATURED_COUNT = 4;

/**
 * Most popular advisors first (see lib/advisorRanking). The hero takes the top
 * advisors with a photo; Featured advisors shows the next ones, so the homepage
 * never shows the same portrait twice.
 */
export const useHomepageAdvisors = () => {
  const query = useQuery({
    queryKey: ["homepage-advisors"],
    queryFn: async () => {
      const [{ data: advisorsData, error }, ranks] = await Promise.all([
        publicSupabase.rpc("get_public_advisor_profiles"),
        fetchPopularityRanks(),
      ]);

      if (error) throw error;
      if (!advisorsData || advisorsData.length === 0) return [];

      return (advisorsData as Omit<HomepageAdvisor, "isSample" | "popularityRank">[])
        .map((a) => ({ ...withSampleContent(a), popularityRank: ranks.get(a.id) ?? null }))
        .sort(compareTopAdvisors)
        .slice(0, HERO_PORTRAIT_COUNT + FEATURED_COUNT);
    },
  });

  const all = query.data ?? [];
  const hero = all.filter((a) => a.avatar_url).slice(0, HERO_PORTRAIT_COUNT);
  const heroIds = new Set(hero.map((a) => a.id));
  const featured = all.filter((a) => !heroIds.has(a.id)).slice(0, FEATURED_COUNT);

  return { ...query, hero, featured };
};
