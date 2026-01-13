import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Video, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import AdvisorFilters, { FilterState } from "@/components/advisors/AdvisorFilters";

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
  verified: boolean | null;
  is_demo?: boolean | null;
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
        const { data, error } = await supabase.rpc('get_public_advisor_profiles');
        
        if (error) {
          console.error('Error fetching advisors:', error);
          setAdvisors([]);
        } else {
          setAdvisors((data || []) as AdvisorData[]);
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
      const styleTags = advisor.style_tags || [];
      const demographics = advisor.target_demographics || [];
      const price = advisor.price_per_session || 0;

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

      // Style filter - match any selected style
      const matchesStyle =
        filters.styles.length === 0 ||
        filters.styles.some((style) => 
          styleTags.some((tag) => tag.toLowerCase().includes(style.toLowerCase()))
        );

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
        // Featured sorting: prioritize by rating and review count
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-background border border-border overflow-hidden">
                  <Skeleton className="aspect-[4/5] w-full" />
                  <div className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-40 mb-4" />
                    <Skeleton className="h-16 w-full" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAndSortedAdvisors.map((advisor, index) => {
              const displayName = advisor.full_name || "Style Advisor";
              const displayPrice = advisor.price_per_session || 100;
              const displayRating = advisor.rating || 0;
              const displayReviews = advisor.review_count || 0;
              const styleTags = advisor.style_tags || [];

              return (
                <motion.article
                  key={advisor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className="group bg-background border border-border overflow-hidden hover-lift cursor-pointer"
                  onClick={() => handleCardClick(advisor.id)}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    {advisor.avatar_url ? (
                      <img
                        src={advisor.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                        <span className="text-6xl font-serif">{displayName.charAt(0)}</span>
                      </div>
                    )}
                    {advisor.verified && (
                      <div className={`absolute top-4 left-4 px-3 py-1 text-xs font-sans uppercase tracking-wider ${badgeColors.verified}`}>
                        Verified Advisor
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 fill-gold text-gold" />
                      <span className="font-sans text-sm font-medium">
                        {displayRating.toFixed(1)}
                      </span>
                      <span className="font-sans text-sm text-muted-foreground">
                        ({displayReviews} reviews)
                      </span>
                    </div>

                    <h3 className="font-serif text-xl font-medium mb-1">
                      {displayName}
                    </h3>
                    <p className="font-sans text-sm text-gold mb-2">
                      {advisor.specialty || "Style Consultant"}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground mb-4 line-clamp-2">
                      {advisor.bio || "Passionate about helping clients discover their unique style."}
                    </p>

                    {styleTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {styleTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground font-sans">
                      {advisor.virtual_available && (
                        <span className="flex items-center gap-1">
                          <Video className="w-4 h-4" /> Virtual
                        </span>
                      )}
                      {advisor.in_person_available && advisor.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {advisor.location}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="font-sans">
                        <span className="text-lg font-medium">${displayPrice}</span>
                        <span className="text-sm text-muted-foreground">/session</span>
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/advisors/${advisor.id}`);
                        }}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {filteredAndSortedAdvisors.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="font-sans text-muted-foreground">
                {advisors.length === 0 
                  ? "No advisors available at this time. Check back soon!"
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
