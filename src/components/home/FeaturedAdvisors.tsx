import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Loader2 } from "lucide-react";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import { useHomepageAdvisors } from "@/hooks/useHomepageAdvisors";

const FeaturedAdvisors = () => {
  const { featured: advisors, isLoading, isError, refetch, isFetching } = useHomepageAdvisors();
  const navigate = useNavigate();

  // Everyone is already pictured in the hero; the section returns when there are more advisors.
  if (!isLoading && !isError && advisors.length === 0) return null;

  const handleCardClick = (advisorId: string) => {
    navigate(`/advisors/${advisorId}`);
  };

  return (
    <section className="section-y bg-card overflow-hidden">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl">Featured advisors</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Book a one-on-one session by video or in person, at a time that suits you.
            </p>
          </div>
          <Link to="/advisors" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-foreground underline underline-offset-4 hover:text-gold">
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
                className="group flex flex-col bg-background border border-border overflow-hidden transition-colors duration-200 can-hover:hover:border-foreground cursor-pointer"
                onClick={() => handleCardClick(advisor.id)}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {advisor.avatar_url ? (
                    <img
                      src={optimizedImageUrl(advisor.avatar_url, 560, 700)}
                      onError={fallbackToOriginal(advisor.avatar_url)}
                      alt={`${advisor.full_name || 'Style Advisor'}, style advisor`}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out-strong can-hover:group-hover:scale-[1.03] motion-reduce:transition-none"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-6xl text-muted-foreground" aria-hidden="true">
                      {(advisor.full_name || "A").charAt(0)}
                    </div>
                  )}
                  {advisor.isSample && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 text-xs font-sans uppercase tracking-wider flex items-center gap-1 bg-background/90 text-foreground border border-border">
                      Sample profile
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  {advisor.isSample ? (
                    <div className="mb-2 h-[1.125rem]" aria-hidden="true" />
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

                  <h3 className="font-serif text-xl font-normal mb-1">
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

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                    {advisor.price_per_session ? (
                      <span className="font-sans">
                        <span className="text-lg font-medium">
                          ${advisor.price_per_session.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/hour</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => e.stopPropagation()}
                      asChild
                    >
                      <Link to={`/advisors/${advisor.id}`}>View profile</Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {isError ? "We couldn't load our advisors just now." : "No featured advisors available at this time."}
            </p>
            {isError && (
              <Button variant="outline" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Trying again…" : "Try again"}
              </Button>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default FeaturedAdvisors;