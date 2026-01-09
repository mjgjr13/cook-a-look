import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const allAdvisors = [
  {
    id: 1,
    name: "Marcus Chen",
    specialty: "Menswear & Suiting",
    rating: 4.9,
    reviews: 127,
    price: 150,
    initials: "MC",
    virtual: true,
    inPerson: true,
    location: "New York",
    badge: "gold",
    bio: "Expert in classic tailoring with a modern twist. 10+ years of experience styling executives and professionals.",
  },
  {
    id: 2,
    name: "Isabella Romano",
    specialty: "Occasion Styling",
    rating: 4.8,
    reviews: 89,
    price: 125,
    initials: "IR",
    virtual: true,
    inPerson: true,
    location: "Los Angeles",
    badge: "silver",
    bio: "Specializing in red carpet looks and special occasion styling. Former stylist for Vogue Italia.",
  },
  {
    id: 3,
    name: "Amara Johnson",
    specialty: "Streetwear & Contemporary",
    rating: 5.0,
    reviews: 64,
    price: 175,
    initials: "AJ",
    virtual: true,
    inPerson: false,
    location: "Miami",
    badge: "bronze",
    bio: "Blending high fashion with streetwear aesthetics. Featured in Complex and Hypebeast.",
  },
  {
    id: 4,
    name: "Sophie Laurent",
    specialty: "Minimalist Wardrobe",
    rating: 4.7,
    reviews: 52,
    price: 100,
    initials: "SL",
    virtual: true,
    inPerson: false,
    location: "San Francisco",
    badge: null,
    bio: "Capsule wardrobe expert focused on sustainable and timeless pieces.",
  },
  {
    id: 5,
    name: "James Park",
    specialty: "Business Casual",
    rating: 4.9,
    reviews: 93,
    price: 140,
    initials: "JP",
    virtual: true,
    inPerson: true,
    location: "Chicago",
    badge: null,
    bio: "Helping professionals navigate the modern workplace dress code with confidence.",
  },
  {
    id: 6,
    name: "Nina Okonkwo",
    specialty: "Color Analysis",
    rating: 4.8,
    reviews: 71,
    price: 130,
    initials: "NO",
    virtual: true,
    inPerson: true,
    location: "Atlanta",
    badge: null,
    bio: "Certified color consultant. Find your perfect palette and transform your wardrobe.",
  },
];

const badgeLabels = {
  gold: "Top Rated",
  silver: "Rising Star",
  bronze: "New",
};

const Advisors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [consultationType, setConsultationType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  const filteredAdvisors = allAdvisors.filter((advisor) => {
    const matchesSearch =
      advisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advisor.specialty.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      consultationType === "all" ||
      (consultationType === "virtual" && advisor.virtual) ||
      (consultationType === "in-person" && advisor.inPerson);

    const matchesPrice =
      priceRange === "all" ||
      (priceRange === "under-100" && advisor.price < 100) ||
      (priceRange === "100-150" && advisor.price >= 100 && advisor.price <= 150) ||
      (priceRange === "over-150" && advisor.price > 150);

    return matchesSearch && matchesType && matchesPrice;
  });

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4">
              Style Advisors
            </h1>
            <p className="font-sans text-muted-foreground max-w-xl mx-auto">
              Find the perfect advisor to help you achieve your style goals.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-12 p-6 bg-card border border-border"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={consultationType} onValueChange={setConsultationType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Consultation Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="virtual">Virtual Only</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under-100">Under $100</SelectItem>
                <SelectItem value="100-150">$100 - $150</SelectItem>
                <SelectItem value="over-150">Over $150</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Advisors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAdvisors.map((advisor, index) => (
              <motion.article
                key={advisor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group bg-card border border-border p-8 hover:border-foreground/20 transition-colors duration-300"
              >
                {/* Avatar Placeholder */}
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                  <span className="font-serif text-2xl text-muted-foreground">
                    {advisor.initials}
                  </span>
                </div>

                {/* Badge */}
                {advisor.badge && (
                  <div className="text-center mb-4">
                    <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">
                      {badgeLabels[advisor.badge as keyof typeof badgeLabels]}
                    </span>
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Star className="w-4 h-4 fill-foreground text-foreground" />
                  <span className="font-sans text-sm">
                    {advisor.rating} ({advisor.reviews})
                  </span>
                </div>

                {/* Name & Specialty */}
                <h3 className="font-serif text-xl font-medium text-center mb-1">
                  {advisor.name}
                </h3>
                <p className="font-sans text-sm text-muted-foreground text-center mb-2">
                  {advisor.specialty}
                </p>
                <p className="font-sans text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                  {advisor.bio}
                </p>

                {/* Consultation Types */}
                <div className="flex items-center justify-center gap-4 mb-6 text-sm text-muted-foreground font-sans">
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

                {/* Price & CTA */}
                <div className="text-center pt-6 border-t border-border">
                  <p className="font-sans mb-4">
                    <span className="text-lg font-medium">${advisor.price}</span>
                    <span className="text-sm text-muted-foreground">/session</span>
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to={`/advisors/${advisor.id}`}>Book Now</Link>
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredAdvisors.length === 0 && (
            <div className="text-center py-16">
              <p className="font-sans text-muted-foreground">
                No advisors found matching your criteria.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Advisors;
