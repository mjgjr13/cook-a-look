import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Video, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdvisorFilters, { FilterState } from "@/components/advisors/AdvisorFilters";

interface AdvisorData {
  id: string;
  user_id?: string;
  full_name: string | null;
  specialty: string | null;
  bio: string | null;
  rating: number | null;
  review_count: number | null;
  price?: number | null;
  price_per_session?: number | null;
  avatar_url: string | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
  portfolio_images: string[] | null;
  style_tags?: string[] | null;
  verified: boolean | null;
}

const badgeColors = {
  verified: "bg-gold text-accent-foreground",
};

const Advisors = () => {
  const [advisors, setAdvisors] = useState<AdvisorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    styles: [],
    clientFocus: [],
    sessionTypes: [],
    minPrice: "",
    maxPrice: "",
    sortBy: "featured",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        // Use the RPC function that only returns active + published advisors
        // This ensures ONLY advisors with status='active' AND is_published=true appear
        const { data, error } = await supabase.rpc('get_active_published_advisors');
        
        if (error) {
          console.error('Error fetching advisors:', error);
          setAdvisors([]);
        } else {
          // Filter out any advisor without real data (no fake/placeholder advisors)
          const realAdvisors = (data || []).filter((advisor: AdvisorData) => 
            advisor.full_name && advisor.full_name.trim() !== ''
          );
          setAdvisors(realAdvisors as AdvisorData[]);
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
      const specialty = advisor.specialty || "";
      const price = advisor.price || advisor.price_per_session || 0;

      // Search filter
      const matchesSearch =
        filters.searchTerm === "" ||
        name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        specialty.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Session type filter
      const matchesSessionType =
        filters.sessionTypes.length === 0 ||
        (filters.sessionTypes.includes("virtual") && advisor.virtual_available) ||
        (filters.sessionTypes.includes("in-person") && advisor.in_person_available);

      // Price range filter
      const minPrice = filters.minPrice ? parseFloat(filters.minPrice) : 0;
      const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
      const matchesPrice = price >= minPrice && price <= maxPrice;

      return matchesSearch && matchesSessionType && matchesPrice;
    });

    // Sort results
    switch (filters.sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => 
          (a.price || a.price_per_session || 0) - (b.price || b.price_per_session || 0)
        );
        break;
      case "price-high":
        result = [...result].sort((a, b) => 
          (b.price || b.price_per_session || 0) - (a.price || a.price_per_session || 0)
        );
        break;
      case "featured":
      default:
        result = [...result].sort((a, b) => {
          const aScore = (a.rating || 0) * 10 + (a.review_count || 0);
          const bScore = (b.rating || 0) * 10 + (b.review_count || 0);
          return bScore - aScore;
        });
        break;
    }

    return result;
  }, [advisors, filters]);

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
              Expert Guidance
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
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
          {filteredAndSortedAdvisors.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {filteredAndSortedAdvisors.map((advisor, index) => {
                const displayName = advisor.full_name || "Style Advisor";
                const displayPrice = advisor.price || advisor.price_per_session || 100;
                const displayRating = advisor.rating || 0;
                const displayReviews = advisor.review_count || 0;

                return (
                  <motion.article
                    key={advisor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.03 }}
                    className="group bg-background border border-border overflow-hidden hover-lift cursor-pointer"
                    onClick={() => handleCardClick(advisor.id)}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                      {advisor.avatar_url ? (
                        <img
                          src={advisor.avatar_url}
                          alt={displayName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                          <span className="text-4xl font-serif">{displayName.charAt(0)}</span>
                        </div>
                      )}
                      {advisor.verified && (
                        <div className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider ${badgeColors.verified}`}>
                          Verified
                        </div>
                      )}
                    </div>

                    <div className="p-3 lg:p-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-3 h-3 fill-gold text-gold" />
                        <span className="font-sans text-xs font-medium">
                          {displayRating.toFixed(1)}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground">
                          ({displayReviews})
                        </span>
                      </div>

                      <h3 className="font-serif text-sm lg:text-base font-medium mb-0.5 line-clamp-1">
                        {displayName}
                      </h3>
                      <p className="font-sans text-xs text-gold mb-1 line-clamp-1">
                        {advisor.specialty || "Style Consultant"}
                      </p>

                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-sans">
                        {advisor.virtual_available && (
                          <span className="flex items-center gap-0.5">
                            <Video className="w-3 h-3" /> Virtual
                          </span>
                        )}
                        {advisor.in_person_available && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" /> In-Person
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="font-sans">
                          <span className="text-sm font-medium">${displayPrice}</span>
                          <span className="text-xs text-muted-foreground">/hr</span>
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/advisors/${advisor.id}`);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-xl font-medium mb-2">No Advisors Available Yet</h3>
              <p className="font-sans text-muted-foreground max-w-md mx-auto">
                {advisors.length === 0 
                  ? "Our advisors are currently being onboarded. Check back soon to book a session!"
                  : "No advisors found matching your criteria. Try adjusting your filters."}
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Advisors;
