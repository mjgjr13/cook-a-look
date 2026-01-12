import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Calendar, Instagram, Globe, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import advisor1 from "@/assets/advisor-1.jpg";
import advisor2 from "@/assets/advisor-2.jpg";
import advisor3 from "@/assets/advisor-3.jpg";
import inspiration1 from "@/assets/inspiration-1.jpg";
import inspiration2 from "@/assets/inspiration-2.jpg";
import inspiration3 from "@/assets/inspiration-3.jpg";
import inspiration4 from "@/assets/inspiration-4.jpg";
import BookingCalendar from "@/components/BookingCalendar";

const advisorData: Record<string, {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  virtual: boolean;
  inPerson: boolean;
  location: string;
  badge: string | null;
  bio: string;
  fullBio: string;
  experience: string;
  languages: string[];
  specialties: string[];
  instagram: string;
  website?: string;
  inspirationImages: string[];
}> = {
  "1": {
    id: 1,
    name: "Marcus Chen",
    specialty: "Menswear & Suiting",
    rating: 4.9,
    reviews: 127,
    price: 150,
    image: advisor1,
    virtual: true,
    inPerson: true,
    location: "New York",
    badge: "gold",
    bio: "Expert in classic tailoring with a modern twist. 10+ years of experience styling executives and professionals.",
    fullBio: "With over a decade of experience in the fashion industry, I've helped hundreds of professionals refine their personal style. My approach combines classic tailoring principles with contemporary trends, ensuring my clients look both timeless and current. I believe that great style should be an extension of who you are—confident, capable, and authentic.",
    experience: "10+ years",
    languages: ["English", "Mandarin"],
    specialties: ["Executive Styling", "Wedding Attire", "Capsule Wardrobes", "Color Coordination"],
    instagram: "@marcuschenestyle",
    website: "marcuschenstyle.com",
    inspirationImages: [inspiration1, inspiration2, inspiration3, inspiration4],
  },
  "2": {
    id: 2,
    name: "Isabella Romano",
    specialty: "Occasion Styling",
    rating: 4.8,
    reviews: 89,
    price: 125,
    image: advisor2,
    virtual: true,
    inPerson: true,
    location: "Los Angeles",
    badge: "silver",
    bio: "Specializing in red carpet looks and special occasion styling. Former stylist for Vogue Italia.",
    fullBio: "My journey in fashion began on the streets of Milan, where I developed an eye for elegance and sophistication. Having worked with Vogue Italia and styled for numerous high-profile events, I bring a touch of European glamour to every consultation. Whether you're preparing for a gala, a wedding, or simply want to elevate your everyday style, I'm here to help you shine.",
    experience: "8 years",
    languages: ["English", "Italian", "Spanish"],
    specialties: ["Red Carpet Styling", "Evening Wear", "Bridal Styling", "Fashion Week Prep"],
    instagram: "@isabellaromano_style",
    inspirationImages: [inspiration2, inspiration3, inspiration4, inspiration1],
  },
  "3": {
    id: 3,
    name: "Amara Johnson",
    specialty: "Streetwear & Contemporary",
    rating: 5.0,
    reviews: 64,
    price: 175,
    image: advisor3,
    virtual: true,
    inPerson: false,
    location: "Miami",
    badge: "bronze",
    bio: "Blending high fashion with streetwear aesthetics. Featured in Complex and Hypebeast.",
    fullBio: "I'm passionate about the intersection of high fashion and street culture. My styling philosophy is all about bold self-expression and breaking conventional fashion rules. Having been featured in publications like Complex and Hypebeast, I understand what it takes to create looks that are both Instagram-worthy and authentically you. Let's create something unique together.",
    experience: "6 years",
    languages: ["English"],
    specialties: ["Streetwear Curation", "Sneaker Styling", "Brand Collaborations", "Festival Looks"],
    instagram: "@amarajohnson",
    website: "amarajohnson.style",
    inspirationImages: [inspiration4, inspiration1, inspiration2, inspiration3],
  },
};

const badgeColors = {
  gold: "bg-gold text-accent-foreground",
  silver: "bg-silver text-foreground",
  bronze: "bg-bronze text-primary-foreground",
};

const AdvisorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const advisor = id ? advisorData[id] : null;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"availability" | "booking">("availability");

  const handleCheckAvailability = () => {
    setCalendarMode("availability");
    setCalendarOpen(true);
  };

  const handleBookConsultation = () => {
    setCalendarMode("booking");
    setCalendarOpen(true);
  };

  if (!advisor) {
    return (
      <Layout>
        <div className="container mx-auto px-6 lg:px-8 py-24 text-center">
          <h1 className="font-serif text-3xl mb-4">Advisor Not Found</h1>
          <p className="text-muted-foreground mb-8">The advisor you're looking for doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link to="/advisors">View All Advisors</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8 bg-card">
        <div className="container mx-auto px-6 lg:px-8">
          <Link 
            to="/advisors" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Advisors
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Photo & Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden mb-6">
                <img
                  src={advisor.image}
                  alt={advisor.name}
                  className="w-full h-full object-cover"
                />
                {advisor.badge && (
                  <div
                    className={`absolute top-4 left-4 px-3 py-1 text-xs font-sans uppercase tracking-wider ${
                      badgeColors[advisor.badge as keyof typeof badgeColors]
                    }`}
                  >
                    {advisor.badge} Advisor
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans">
                  {advisor.virtual && (
                    <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" /> Virtual
                    </span>
                  )}
                  {advisor.inPerson && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {advisor.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {advisor.instagram && (
                    <a 
                      href={`https://instagram.com/${advisor.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      {advisor.instagram}
                    </a>
                  )}
                </div>

                {advisor.website && (
                  <a 
                    href={`https://${advisor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {advisor.website}
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
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 fill-gold text-gold" />
                <span className="font-sans font-medium">{advisor.rating}</span>
                <span className="font-sans text-muted-foreground">
                  ({advisor.reviews} reviews)
                </span>
              </div>

              <h1 className="font-serif text-4xl md:text-5xl font-medium mb-2">
                {advisor.name}
              </h1>
              <p className="font-sans text-lg text-gold mb-6">
                {advisor.specialty}
              </p>

              <div className="prose prose-lg max-w-none mb-8">
                <p className="font-sans text-muted-foreground leading-relaxed">
                  {advisor.fullBio}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-background p-6 border border-border">
                  <h3 className="font-serif text-lg font-medium mb-3">Experience</h3>
                  <p className="font-sans text-muted-foreground">{advisor.experience}</p>
                </div>
                <div className="bg-background p-6 border border-border">
                  <h3 className="font-serif text-lg font-medium mb-3">Languages</h3>
                  <p className="font-sans text-muted-foreground">{advisor.languages.join(", ")}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-serif text-lg font-medium mb-4">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {advisor.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-4 py-2 bg-secondary text-sm font-sans"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-background border border-border">
                <div>
                  <span className="font-sans text-2xl font-medium">${advisor.price}</span>
                  <span className="font-sans text-muted-foreground">/session</span>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" size="lg" onClick={handleCheckAvailability}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Check Availability
                  </Button>
                  <Button variant="hero" size="lg" onClick={handleBookConsultation}>
                    Book Consultation
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Inspiration Gallery */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
              Style Inspiration
            </h2>
            <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
              A glimpse into the looks and styling work by {advisor.name.split(' ')[0]}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {advisor.inspirationImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative aspect-[3/4] overflow-hidden group cursor-pointer"
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

      {/* Booking Calendar Dialog */}
      <BookingCalendar
        advisorId={id || ""}
        advisorName={advisor.name}
        price={advisor.price}
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        mode={calendarMode}
      />
    </Layout>
  );
};

export default AdvisorProfile;
