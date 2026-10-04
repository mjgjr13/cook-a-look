import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { withSampleContent } from "@/lib/sampleAdvisors";

interface FeaturedAdvisor {
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
}

const useFeaturedAdvisors = () => {
  return useQuery({
    queryKey: ['featured-advisors'],
    queryFn: async () => {
      const { data: advisorsData, error } = await supabase
        .rpc('get_public_advisor_profiles');
      
      if (error) throw error;
      if (!advisorsData || advisorsData.length === 0) return [];

      // Real advisors first (by review count), then sample profiles; take top 4
      return (advisorsData as FeaturedAdvisor[])
        .map(withSampleContent)
        .sort((a, b) =>
          a.isSample !== b.isSample ? (a.isSample ? 1 : -1) : (b.review_count || 0) - (a.review_count || 0)
        )
        .slice(0, 4);
    }
  });
};
const FeaturedAdvisors = () => {
  const { data: advisors, isLoading } = useFeaturedAdvisors();
  const navigate = useNavigate();

  const handleCardClick = (advisorId: string) => {
    navigate(`/advisors/${advisorId}`);
  };

  return (
    <section className="py-20 lg:py-28 bg-card overflow-hidden">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl">Meet the advisors</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Book a one-on-one session by video or in person, at a time that suits you.
            </p>
          </div>
          <Link to="/advisors" className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-gold">
            See all advisors
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : advisors && advisors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advisors.map((advisor, index) => (
              <article
                key={advisor.id}
                className="group bg-background border border-border overflow-hidden transition-colors hover:border-foreground cursor-pointer"
                onClick={() => handleCardClick(advisor.id)}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={optimizedImageUrl(advisor.avatar_url, 560, 700) || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.full_name || 'Advisor')}&background=C9A961&color=1A1A1A&size=400&bold=true`}
                    onError={fallbackToOriginal(advisor.avatar_url)}
                    alt={`${advisor.full_name || 'Style Advisor'}, style advisor`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  {advisor.isSample && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider flex items-center gap-1 bg-background/90 text-foreground border border-border">
                      <Sparkles className="w-3 h-3 text-gold" aria-hidden="true" />
                      Sample profile
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {advisor.isSample ? (
                    <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground mb-2">Sample profile</p>
                  ) : advisor.review_count && advisor.review_count > 0 ? (
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 fill-gold text-gold" aria-hidden="true" />
                      <span className="font-sans text-sm font-medium">
                        {(advisor.rating ?? 0).toFixed(1)}
                      </span>
                      <span className="font-sans text-sm text-muted-foreground">
                        ({advisor.review_count} {advisor.review_count === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  ) : (
                    <p className="font-sans text-xs uppercase tracking-wider text-gold mb-2">New advisor</p>
                  )}

                  <h3 className="font-serif text-xl font-medium mb-1">
                    {advisor.full_name}
                  </h3>
                  <p className="font-sans text-sm text-gold mb-4">
                    {advisor.target_demographics && advisor.target_demographics.length > 0 
                      ? advisor.target_demographics.slice(0, 3).join(" · ") 
                      : "Style Consultant"}
                  </p>

                  <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground font-sans">
                    <div className="flex flex-col gap-0.5 min-w-fit">
                      {advisor.virtual_available && (
                        <span className="flex items-center gap-1.5">
                          <Video className="w-4 h-4 flex-shrink-0" /> Virtual
                        </span>
                      )}
                      {advisor.in_person_available && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 flex-shrink-0" /> In-Person
                        </span>
                      )}
                    </div>
                    {advisor.location && (
                      <span className="text-right text-xs whitespace-nowrap">{advisor.location}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="font-sans">
                      <span className="text-lg font-medium">
                        ${advisor.price_per_session || 0}
                      </span>
                      <span className="text-sm text-muted-foreground">/hour</span>
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => e.stopPropagation()}
                      asChild
                    >
                      <Link to={`/advisors/${advisor.id}`}>View Profile</Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">
            No featured advisors available at this time.
          </p>
        )}

      </div>
    </section>
  );
};

export default FeaturedAdvisors;