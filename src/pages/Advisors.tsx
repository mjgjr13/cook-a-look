import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import advisor1 from "@/assets/advisor-1.jpg";
import advisor2 from "@/assets/advisor-2.jpg";
import advisor3 from "@/assets/advisor-3.jpg";

// Style tags for filtering
const styleOptions = [
  "Minimalist",
  "Streetwear",
  "Business",
  "Formal",
  "Casual",
  "Bohemian",
  "Classic",
  "Contemporary",
];

// Target demographics for filtering
const demographicOptions = [
  "Men",
  "Women",
  "Non-Binary",
  "Young Professionals",
  "Executives",
  "Students",
  "Plus Size",
];

const allAdvisors = [
  {
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
    styleTags: ["Business", "Formal", "Classic"],
    demographics: ["Men", "Executives", "Young Professionals"],
  },
  {
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
    styleTags: ["Formal", "Contemporary", "Classic"],
    demographics: ["Women", "Executives"],
  },
  {
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
    styleTags: ["Streetwear", "Contemporary", "Casual"],
    demographics: ["Men", "Women", "Non-Binary", "Young Professionals"],
  },
  {
    id: 4,
    name: "Sophie Laurent",
    specialty: "Minimalist Wardrobe",
    rating: 4.7,
    reviews: 52,
    price: 100,
    image: advisor2,
    virtual: true,
    inPerson: false,
    location: "San Francisco",
    badge: null,
    bio: "Capsule wardrobe expert focused on sustainable and timeless pieces.",
    styleTags: ["Minimalist", "Classic", "Casual"],
    demographics: ["Women", "Young Professionals", "Students"],
  },
  {
    id: 5,
    name: "James Park",
    specialty: "Business Casual",
    rating: 4.9,
    reviews: 93,
    price: 140,
    image: advisor1,
    virtual: true,
    inPerson: true,
    location: "Chicago",
    badge: null,
    bio: "Helping professionals navigate the modern workplace dress code with confidence.",
    styleTags: ["Business", "Casual", "Classic"],
    demographics: ["Men", "Women", "Young Professionals", "Executives"],
  },
  {
    id: 6,
    name: "Nina Okonkwo",
    specialty: "Color Analysis",
    rating: 4.8,
    reviews: 71,
    price: 130,
    image: advisor3,
    virtual: true,
    inPerson: true,
    location: "Atlanta",
    badge: null,
    bio: "Certified color consultant. Find your perfect palette and transform your wardrobe.",
    styleTags: ["Contemporary", "Bohemian", "Casual"],
    demographics: ["Women", "Plus Size", "Young Professionals"],
  },
];

const badgeColors = {
  gold: "bg-gold text-accent-foreground",
  silver: "bg-silver text-foreground",
  bronze: "bg-bronze text-primary-foreground",
};

const Advisors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [consultationType, setConsultationType] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [selectedDemographic, setSelectedDemographic] = useState("all");
  const navigate = useNavigate();

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

    const matchesStyle =
      selectedStyle === "all" || advisor.styleTags.includes(selectedStyle);

    const matchesDemographic =
      selectedDemographic === "all" || advisor.demographics.includes(selectedDemographic);

    return matchesSearch && matchesType && matchesPrice && matchesStyle && matchesDemographic;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setConsultationType("all");
    setPriceRange("all");
    setSelectedStyle("all");
    setSelectedDemographic("all");
  };

  const hasActiveFilters = 
    searchTerm !== "" || 
    consultationType !== "all" || 
    priceRange !== "all" || 
    selectedStyle !== "all" || 
    selectedDemographic !== "all";

  const handleCardClick = (advisorId: number) => {
    navigate(`/advisors/${advisorId}`);
  };

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

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-12 p-6 bg-background border border-border"
          >
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
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
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="virtual">Virtual Only</SelectItem>
                  <SelectItem value="in-person">In-Person</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under-100">Under $100</SelectItem>
                  <SelectItem value="100-150">$100 - $150</SelectItem>
                  <SelectItem value="over-150">Over $150</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Styles</SelectItem>
                  {styleOptions.map((style) => (
                    <SelectItem key={style} value={style}>{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDemographic} onValueChange={setSelectedDemographic}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="For" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Demographics</SelectItem>
                  {demographicOptions.map((demo) => (
                    <SelectItem key={demo} value={demo}>{demo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Filter className="w-4 h-4" />
                  Clear filters
                </Button>
              )}
            </div>
          </motion.div>

          {/* Advisors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredAdvisors.map((advisor, index) => (
              <motion.article
                key={advisor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group bg-background border border-border overflow-hidden hover-lift cursor-pointer"
                onClick={() => handleCardClick(advisor.id)}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={advisor.image}
                    alt={advisor.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 fill-gold text-gold" />
                    <span className="font-sans text-sm font-medium">
                      {advisor.rating}
                    </span>
                    <span className="font-sans text-sm text-muted-foreground">
                      ({advisor.reviews} reviews)
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-medium mb-1">
                    {advisor.name}
                  </h3>
                  <p className="font-sans text-sm text-gold mb-2">
                    {advisor.specialty}
                  </p>
                  <p className="font-sans text-sm text-muted-foreground mb-4 line-clamp-2">
                    {advisor.bio}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {advisor.styleTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground font-sans">
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

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className="font-sans">
                      <span className="text-lg font-medium">${advisor.price}</span>
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
            ))}
          </div>

          {filteredAdvisors.length === 0 && (
            <div className="text-center py-16">
              <p className="font-sans text-muted-foreground">
                No advisors found matching your criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Advisors;
