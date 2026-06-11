import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Video, MapPin, Calendar, Instagram, Globe, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import BookingCalendar from "@/components/BookingCalendar";
import AdvisorReviews from "@/components/reviews/AdvisorReviews";
import Seo from "@/components/Seo";

// Fallback images for when no portfolio images exist
import inspiration1 from "@/assets/inspiration-1.jpg";
import inspiration2 from "@/assets/inspiration-2.jpg";
import inspiration3 from "@/assets/inspiration-3.jpg";
import inspiration4 from "@/assets/inspiration-4.jpg";

const fallbackImages = [inspiration1, inspiration2, inspiration3, inspiration4];

interface AdvisorData {
  id: string;
  full_name: string | null;
  bio: string | null;
  personal_philosophy: string | null;
  rating: number | null;
  review_count: number | null;
  price_per_session: number | null;
  avatar_url: string | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  location: string | null;
  experience_years: number | null;
  languages: string[] | null;
  style_tags: string[] | null;
  target_demographics: string[] | null;
  portfolio_images: string[] | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  verified: boolean | null;
  in_person_surcharge: number | null;
}

const AdvisorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [advisor, setAdvisor] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Auto-open calendar with preserved booking state after sign-in redirect
  const initialBookingDate = searchParams.get("bookingDate");
  const initialBookingSlot = searchParams.get("bookingSlot");

  useEffect(() => {
    const fetchAdvisor = async () => {
      if (!id) {
        setError("Invalid advisor ID");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .rpc('get_advisor_public_profile', { advisor_profile_id: id });

        if (fetchError) {
          console.error('Error fetching advisor:', fetchError);
          setError("Failed to load advisor profile");
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          setAdvisor(data[0] as AdvisorData);
        } else {
          setError("Advisor not found");
        }
      } catch (err) {
        console.error('Error:', err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisor();
  }, [id]);

  // Auto-open booking calendar if redirected back from sign-in with booking state
  useEffect(() => {
    if (!loading && advisor && initialBookingDate) {
      setCalendarOpen(true);
      // Clean up URL params
      setSearchParams({}, { replace: true });
    }
  }, [loading, advisor, initialBookingDate]);

  const handleBookConsultation = () => {
    setCalendarOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <section className="py-8 bg-card">
          <div className="container mx-auto px-6 lg:px-8">
            <Skeleton className="h-6 w-32 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1">
                <Skeleton className="aspect-[4/5] w-full mb-6" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="lg:col-span-2">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-12 w-64 mb-2" />
                <Skeleton className="h-6 w-48 mb-6" />
                <Skeleton className="h-32 w-full mb-8" />
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (error || !advisor) {
    return (
      <Layout>
        <div className="container mx-auto px-6 lg:px-8 py-24 text-center">
          <h1 className="font-serif text-3xl mb-4">Advisor Not Found</h1>
          <p className="text-muted-foreground mb-8">
            {error || "The advisor you're looking for doesn't exist."}
          </p>
          <Button variant="outline" asChild>
            <Link to="/advisors">View All Advisors</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const displayName = advisor.full_name || "Style Advisor";
  const displayPrice = advisor.price_per_session || 100;
  const displayRating = advisor.rating || 0;
  const displayReviews = advisor.review_count || 0;
  const displayExperience = advisor.experience_years ? `${advisor.experience_years}+ years` : "N/A";
  const displayLanguages = advisor.languages?.length ? advisor.languages : ["English"];
  const displaySpecialties = advisor.style_tags?.length ? advisor.style_tags : [];
  const displayImages = advisor.portfolio_images?.length ? advisor.portfolio_images : fallbackImages;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    description: advisor.bio || `Professional style advisor on Cook A Look.`,
    image: advisor.avatar_url || undefined,
    url: `https://www.cookalook.com/advisors/${advisor.id}`,
    jobTitle: "Style Advisor",
    knowsLanguage: displayLanguages,
    makesOffer: {
      "@type": "Offer",
      price: displayPrice,
      priceCurrency: "USD",
      itemOffered: {
        "@type": "Service",
        name: "Personal Styling Consultation",
      },
    },
    ...(displayReviews > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: displayRating,
        reviewCount: displayReviews,
      },
    }),
  };

  return (
    <Layout>
      <Seo
        title={`${displayName} — Style Advisor | Cook A Look`}
        description={(advisor.bio || `Book a personal styling consultation with ${displayName} on Cook A Look.`).slice(0, 158)}
        path={`/advisors/${advisor.id}`}
        ogImage={advisor.avatar_url || undefined}
        ogType="profile"
        jsonLd={personJsonLd}
      />
      <section className="py-5 pb-28 lg:py-8 lg:pb-8 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            to="/advisors" 
            className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors mb-5 lg:mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Advisors
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
            {/* Left Column - Photo & Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="relative mx-auto aspect-[5/6] max-h-[410px] w-full overflow-hidden mb-4 lg:mx-0 lg:aspect-[4/5] lg:max-h-none lg:mb-6 bg-muted">
                {advisor.avatar_url ? (
                  <img
                    src={advisor.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-6xl font-serif">{displayName.charAt(0)}</span>
                  </div>
                )}
                {advisor.verified && (
                  <div className="absolute top-4 left-4 px-3 py-1 text-xs font-sans uppercase tracking-wider bg-gold text-accent-foreground">
                    Verified Advisor
                  </div>
                )}
              </div>

               <div className="space-y-2.5 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-x-4 text-sm text-muted-foreground font-sans">
                  {advisor.virtual_available && (
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" /> Virtual
                    </span>
                  )}
                  {advisor.in_person_available && (
                    <span className="flex min-w-0 items-center gap-1 break-words">
                      <MapPin className="w-4 h-4" /> In-Person{advisor.location && ` · ${advisor.location}`}
                      {advisor.in_person_surcharge && advisor.in_person_surcharge > 0 ? ` (+$${advisor.in_person_surcharge})` : ""}
                    </span>
                  )}
                </div>

                {advisor.instagram_url && (
                  <a 
                    href={advisor.instagram_url.startsWith('http') ? advisor.instagram_url : `https://instagram.com/${advisor.instagram_url.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    {advisor.instagram_url.includes('instagram.com') 
                      ? advisor.instagram_url.split('/').pop() 
                      : advisor.instagram_url}
                  </a>
                )}

                {advisor.portfolio_url && (
                  <a 
                    href={advisor.portfolio_url.startsWith('http') ? advisor.portfolio_url : `https://${advisor.portfolio_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {advisor.portfolio_url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </motion.div>

            {/* Right Column - Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center gap-2 mb-2 text-sm sm:text-base">
                <Star className="w-5 h-5 fill-gold text-gold" />
                <span className="font-sans font-medium">{displayRating.toFixed(1)}</span>
                <span className="font-sans text-muted-foreground">
                  ({displayReviews} reviews)
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-tight mb-2">
                {displayName}
              </h1>
              <p className="font-sans text-base sm:text-lg text-gold mb-5 lg:mb-6">
                {advisor.target_demographics && advisor.target_demographics.length > 0 
                  ? advisor.target_demographics.slice(0, 3).join(" · ") 
                  : "Style Consultant"}
              </p>

              <div className="prose prose-sm sm:prose-lg max-w-none mb-6 lg:mb-8">
                <p className="font-sans text-muted-foreground leading-relaxed">
                  {advisor.personal_philosophy || advisor.bio || "Passionate about helping clients discover their unique style."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
                <div className="bg-background p-5 lg:p-6 border border-border">
                  <h3 className="font-serif text-lg font-medium mb-3">Experience</h3>
                  <p className="font-sans text-muted-foreground">{displayExperience}</p>
                </div>
                <div className="bg-background p-5 lg:p-6 border border-border">
                  <h3 className="font-serif text-lg font-medium mb-3">Languages</h3>
                  <p className="font-sans text-muted-foreground">{displayLanguages.join(", ")}</p>
                </div>
              </div>

              {displaySpecialties.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-serif text-lg font-medium mb-4">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {displaySpecialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary text-xs sm:text-sm font-sans"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 lg:p-6 bg-background border border-border">
                <div>
                  <span className="font-sans text-2xl font-medium">${displayPrice}</span>
                  <span className="font-sans text-muted-foreground">/hour</span>
                </div>
                <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={handleBookConsultation}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Consultation
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Hourly Rate</p>
              <p className="font-sans text-lg font-medium leading-tight">${displayPrice}<span className="text-sm font-normal text-muted-foreground">/hour</span></p>
            </div>
            <Button variant="hero" size="lg" className="shrink-0" onClick={handleBookConsultation}>
              <Calendar className="w-4 h-4 mr-2" />
              Book
            </Button>
          </div>
        </div>
      </section>

      {/* Inspiration Gallery */}
      <section className="py-10 lg:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 lg:mb-12"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-3 lg:mb-4">
              Style Inspiration
            </h2>
            <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
              A glimpse into the looks and styling work by {displayName.split(' ')[0]}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            {displayImages.slice(0, 4).map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative aspect-[3/4] overflow-hidden group cursor-pointer bg-muted"
              >
                <img
                  src={image}
                  alt={`Inspiration ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-10 lg:py-16 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 lg:mb-12"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-3 lg:mb-4">
              Client Reviews
            </h2>
            <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
              What clients say about working with {displayName.split(' ')[0]}
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <AdvisorReviews advisorId={id || ""} />
          </div>
        </div>
      </section>

      {/* Booking Calendar Dialog */}
      <BookingCalendar
        advisorId={id || ""}
        advisorName={displayName}
        price={displayPrice}
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        initialDate={initialBookingDate}
        initialSlot={initialBookingSlot}
        virtualAvailable={advisor.virtual_available ?? true}
        inPersonAvailable={advisor.in_person_available ?? false}
        inPersonSurcharge={advisor.in_person_surcharge ?? 0}
      />
    </Layout>
  );
};

export default AdvisorProfile;