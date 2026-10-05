import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Video, MapPin, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { optimizedImageUrl, fallbackToOriginal } from "@/lib/imageUrl";
import AdvisorFilters, { EMPTY_FILTERS, FilterState } from "@/components/advisors/AdvisorFilters";
import { compareTopAdvisors } from "@/lib/advisorRanking";

const ADVISORS_PER_PAGE = 21;
import Seo from "@/components/Seo";
import { withSampleContent } from "@/lib/sampleAdvisors";
interface AdvisorData {
  id: string;
  full_name: string | null;
  specialty: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
  style_tags: string[] | null;
  target_demographics: string[] | null;
  use_cases?: string[] | null;
  verified: boolean | null;
  advisor_approved: boolean | null;
  is_demo?: boolean | null;
}

const badgeColors = {
  verified: "bg-gold text-white",
};

const Advisors = () => {
  const [advisors, setAdvisors] = useState<(AdvisorData & { isSample: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    styles: [],
    clientFocus: [],
    useCases: [],
    sessionTypes: [],
    minPrice: "",
    maxPrice: "",
    sortBy: "featured",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_advisor_profiles');
        
        if (error) {
          console.error('Error fetching advisors:', error);
          setAdvisors([]);
        } else {
          setAdvisors(((data || []) as AdvisorData[]).map(withSampleContent));
        }
      } catch (err) {
        console.error('Error:', err);
        setAdvisors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisors();
  }, []);

  const filteredAndSortedAdvisors = useMemo(() => {
    let result = advisors.filter((advisor) => {
      const name = advisor.full_name || "";
      const styleTags = advisor.style_tags || [];
      const demographics = advisor.target_demographics || [];
      const useCases = advisor.use_cases || [];
      const price = advisor.price_per_session || 0;

      // Search by name only
      const matchesSearch = filters.searchTerm.trim() === "" || name.toLowerCase().includes(filters.searchTerm.trim().toLowerCase());

      // Session type filter
      const matchesSessionType =
        filters.sessionTypes.length === 0 ||
        (filters.sessionTypes.includes("virtual") && advisor.virtual_available) ||
        (filters.sessionTypes.includes("in-person") && advisor.in_person_available);

      // Style & Occasion filter - match against BOTH style_tags and use_cases (merged taxonomy)
      const matchesStyle =
        filters.styles.length === 0 ||
        filters.styles.some((style) => {
          const needle = style.toLowerCase();
          return (
            styleTags.some((tag) => tag.toLowerCase().includes(needle)) ||
            useCases.some((uc: string) => uc.toLowerCase().includes(needle))
          );
        });

      // Client focus filter - match any selected demographic
      const matchesClientFocus =
        filters.clientFocus.length === 0 ||
        filters.clientFocus.some((focus) => 
          demographics.some((demo) => demo.toLowerCase().includes(focus.toLowerCase()))
        );

      // Price range filter
      const minPrice = filters.minPrice ? parseFloat(filters.minPrice) : 0;
      const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
      const matchesPrice = price >= minPrice && price <= maxPrice;

      return matchesSearch && matchesSessionType && matchesStyle && matchesClientFocus && matchesPrice;
    });

    // Sort results
    switch (filters.sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => 
          (a.price_per_session || 0) - (b.price_per_session || 0)
        );
        break;
      case "price-high":
        result = [...result].sort((a, b) => 
          (b.price_per_session || 0) - (a.price_per_session || 0)
        );
        break;
      case "featured":
      default:
        // Recommended: top advisors first (see lib/advisorRanking)
        result = [...result].sort(compareTopAdvisors);
        break;
    }

    return result;
  }, [advisors, filters]);

  // Pagination: at most ADVISORS_PER_PAGE cards per page (7 rows of 3 on desktop).
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filteredAndSortedAdvisors.length / ADVISORS_PER_PAGE));
  useEffect(() => setPage(1), [filters]);
  const currentPage = Math.min(page, pageCount);
  const pageAdvisors = filteredAndSortedAdvisors.slice((currentPage - 1) * ADVISORS_PER_PAGE, currentPage * ADVISORS_PER_PAGE);
  const goToPage = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCardClick = (advisorId: string) => {
    navigate(`/advisors/${advisorId}`);
  };

  if (loading) {
    return (
      <Layout>
        <section className="py-16 bg-card">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <Skeleton className="h-4 w-32 mx-auto mb-4" />
              <Skeleton className="h-12 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <Skeleton className="h-32 w-full mb-12" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-background border border-border overflow-hidden">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-4">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-3 w-24 mb-3" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo
        title="Style Advisors | Cook A Look"
        description="Browse our curated selection of professional style advisors. Filter by specialty, client focus, price, and session type to find your perfect match."
        path="/advisors"
      />
      <section className="py-10 lg:py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 lg:mb-12"
          >
            <p className="text-gold font-sans text-xs sm:text-sm tracking-[0.24em] sm:tracking-[0.3em] uppercase mb-3 lg:mb-4">
              Expert Guidance
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-3 lg:mb-4">
              Style Advisors
            </h1>
            <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
              Browse our curated selection of professional style consultants
            </p>
          </motion.div>

          {/* Enhanced Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <AdvisorFilters
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredAndSortedAdvisors.length}
            />
          </motion.div>

          {/* Advisors Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {pageAdvisors.map((advisor, index) => {
              const displayName = advisor.full_name || "Style Advisor";
              const displayPrice = advisor.price_per_session || 100;
              const displayRating = advisor.rating || 0;
              const displayReviews = advisor.review_count || 0;
              const styleTags = advisor.style_tags || [];
              const clientFocus = advisor.target_demographics || [];

              return (
                <motion.article
                  key={advisor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.03 }}
                   className="group min-w-0 bg-background border border-border overflow-hidden hover-lift cursor-pointer"
                  onClick={() => handleCardClick(advisor.id)}
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    {advisor.avatar_url ? (
                      <img
                        src={optimizedImageUrl(advisor.avatar_url, 480, 640)}
                        onError={fallbackToOriginal(advisor.avatar_url)}
                        alt={`${displayName}, style advisor`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                        <span className="text-4xl font-serif">{displayName.charAt(0)}</span>
                      </div>
                    )}
                    {advisor.isSample ? (
                      <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider flex items-center gap-1 bg-background/90 text-foreground border border-border">
                        <Sparkles className="w-3 h-3 text-gold" aria-hidden="true" />
                        Sample profile
                      </div>
                    ) : (advisor.verified || advisor.advisor_approved) && (
                      <div className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider flex items-center gap-1 ${badgeColors.verified}`}>
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 sm:p-3 lg:p-4 min-w-0">
                    {advisor.isSample ? (
                      <p className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Sample</p>
                    ) : displayReviews > 0 ? (
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3 h-3 fill-gold text-gold" aria-hidden="true" />
                        <span className="font-sans text-xs font-medium">
                          {displayRating.toFixed(1)}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground">
                          ({displayReviews})
                        </span>
                      </div>
                    ) : (
                      <p className="font-sans text-[11px] uppercase tracking-wider text-gold mb-1">New advisor</p>
                    )}

                    <h2 className="font-serif text-sm lg:text-base font-medium mb-0.5 line-clamp-1 leading-snug">
                      {displayName}
                    </h2>
                    <p className="font-sans text-xs text-gold mb-1 line-clamp-1">
                      {clientFocus.length > 0 ? clientFocus.slice(0, 3).join(" · ") : "Style Consultant"}
                    </p>


                    <div className="flex items-start justify-between gap-2 mb-2 text-xs text-muted-foreground font-sans">
                      <div className="flex flex-row sm:flex-col gap-1.5 sm:gap-0.5 shrink-0">
                        {advisor.virtual_available && (
                          <span className="flex items-center gap-0.5" aria-label="Virtual" title="Virtual">
                            <Video className="w-3 h-3" />
                            <span className="hidden sm:inline">Virtual</span>
                          </span>
                        )}
                        {advisor.in_person_available && (
                          <span className="flex items-center gap-0.5" aria-label="In-Person" title="In-Person">
                            <MapPin className="w-3 h-3" />
                            <span className="hidden sm:inline">In-Person</span>
                          </span>
                        )}
                      </div>
                      {advisor.location && (
                        <span className="text-right text-xs truncate min-w-0 max-w-[7rem] sm:max-w-[6rem]">{advisor.location}</span>
                      )}
                    </div>


                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <span className="font-sans min-w-0">
                        <span className="text-sm font-medium">${displayPrice.toLocaleString()}</span>
                        <span className="text-[11px] sm:text-xs text-muted-foreground">/hour</span>
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-8 shrink-0 px-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/advisors/${advisor.id}`);
                        }}
                      >
                        {advisor.isSample ? "View" : "Book"}
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {pageCount > 1 && (
            <nav aria-label="Advisor pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={n === currentPage ? "default" : "outline"}
                  size="sm"
                  aria-current={n === currentPage ? "page" : undefined}
                  onClick={() => goToPage(n)}
                >
                  {n}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => goToPage(currentPage + 1)}>
                Next
              </Button>
            </nav>
          )}

          {filteredAndSortedAdvisors.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="font-sans text-muted-foreground">
                {advisors.length === 0 
                  ? "We're onboarding our first advisors. Check back soon!"
                  : "No advisors match those filters yet. Try removing a filter or widening the price range."}
              </p>
              {advisors.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    setFilters(EMPTY_FILTERS)
                  }
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Advisors;
