import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedAdvisor {
  id: string;
  full_name: string | null;
  specialty: string | null;
  rating: number | null;
  review_count: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
}

const useFeaturedAdvisors = () => {
  return useQuery({
    queryKey: ['featured-advisors'],
    queryFn: async () => {
      const { data: advisorsData, error } = await supabase
        .rpc('get_public_advisor_profiles');
      
      if (error) throw error;
      if (!advisorsData || advisorsData.length === 0) return [];

      // Sort by review count (highest first) and take top 4
      return (advisorsData as FeaturedAdvisor[])
        .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
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
    <section className="py-24 bg-card overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
            Top Rated
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-4">
            Featured Style Advisors
          </h2>
          <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
            Our most sought-after consultants, ready to elevate your style
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : advisors && advisors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2 lg:px-6">
            {advisors.map((advisor, index) => (
              <motion.article
                key={advisor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group bg-background border border-border overflow-hidden hover-lift cursor-pointer"
                onClick={() => handleCardClick(advisor.id)}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={advisor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.full_name || 'Advisor')}&background=C9A961&color=1A1A1A&size=400&bold=true`}
                    alt={advisor.full_name || 'Style Advisor'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="font-sans text-sm font-medium">
                      {advisor.rating?.toFixed(1) || '5.0'}
                    </span>
                    <span className="font-sans text-sm text-muted-foreground">
                      ({advisor.review_count || 0} reviews)
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-medium mb-1">
                    {advisor.full_name}
                  </h3>
                  <p className="font-sans text-sm text-muted-foreground mb-4">
                    {advisor.specialty}
                  </p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground font-sans">
                    {advisor.virtual_available && (
                      <span className="flex items-center gap-1">
                        <Video className="w-4 h-4" /> Virtual
                      </span>
                    )}
                    {advisor.in_person_available && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> In-Person{advisor.location && ` · ${advisor.location}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="font-sans">
                      <span className="text-lg font-medium">
                        ${advisor.price_per_session || 0}
                      </span>
                      <span className="text-sm text-muted-foreground">/session</span>
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => e.stopPropagation()}
                      asChild
                    >
                      <Link to={`/advisors/${advisor.id}`}>Book Now</Link>
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">
            No featured advisors available at this time.
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-12"
        >
          <Button variant="heroOutline" size="lg" asChild>
            <Link to="/advisors">View All Advisors</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedAdvisors;