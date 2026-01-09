import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const advisors = [
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
  },
];

const badgeLabels = {
  gold: "Top Rated",
  silver: "Rising Star",
  bronze: "New",
};

const FeaturedAdvisors = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
            Featured Advisors
          </h2>
          <p className="font-sans text-muted-foreground max-w-xl mx-auto">
            Work with experienced professionals who understand your style goals.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {advisors.map((advisor, index) => (
            <motion.article
              key={advisor.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group bg-card border border-border p-8 hover:border-foreground/20 transition-colors duration-300"
            >
              {/* Avatar Placeholder */}
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <span className="font-serif text-2xl text-muted-foreground">
                  {advisor.initials}
                </span>
              </div>

              {/* Badge */}
              <div className="text-center mb-4">
                <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">
                  {badgeLabels[advisor.badge as keyof typeof badgeLabels]}
                </span>
              </div>

              {/* Name & Specialty */}
              <h3 className="font-serif text-xl font-medium text-center mb-1">
                {advisor.name}
              </h3>
              <p className="font-sans text-sm text-muted-foreground text-center mb-4">
                {advisor.specialty}
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="w-4 h-4 fill-foreground text-foreground" />
                <span className="font-sans text-sm">
                  {advisor.rating} ({advisor.reviews})
                </span>
              </div>

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
                  <Link to={`/advisors/${advisor.id}`}>View Profile</Link>
                </Button>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-12"
        >
          <Button variant="outline" size="lg" asChild>
            <Link to="/advisors">View All Advisors</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedAdvisors;
