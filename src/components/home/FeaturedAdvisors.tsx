import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import advisor1 from "@/assets/advisor-1.jpg";
import advisor2 from "@/assets/advisor-2.jpg";
import advisor3 from "@/assets/advisor-3.jpg";
import advisor4 from "@/assets/advisor-4.jpg";

const advisors = [{
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
  badge: "gold"
}, {
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
  badge: "silver"
}, {
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
  badge: "bronze"
}, {
  id: 4,
  name: "Sophia Lin",
  specialty: "Minimalist & Modern",
  rating: 4.9,
  reviews: 92,
  price: 140,
  image: advisor4,
  virtual: true,
  inPerson: true,
  location: "San Francisco",
  badge: "gold"
}];

const badgeColors = {
  gold: "bg-gold text-accent-foreground",
  silver: "bg-silver text-foreground",
  bronze: "bg-bronze text-primary-foreground"
};
const FeaturedAdvisors = () => {
  return <section className="py-24 bg-card overflow-hidden">
      <div className="container mx-auto px-6 lg:px-8">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6
      }} className="text-center mb-16">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-2 lg:px-6">
          {advisors.map((advisor, index) => <motion.article key={advisor.id} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6,
          delay: index * 0.1
        }} className="group bg-background border border-border overflow-hidden hover-lift">
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={advisor.image} alt={advisor.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                
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
                <p className="font-sans text-sm text-muted-foreground mb-4">
                  {advisor.specialty}
                </p>

                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground font-sans">
                  {advisor.virtual && <span className="flex items-center gap-1">
                      <Video className="w-4 h-4" /> Virtual
                    </span>}
                  {advisor.inPerson && <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {advisor.location}
                    </span>}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="font-sans">
                    <span className="text-lg font-medium">${advisor.price}</span>
                    <span className="text-sm text-muted-foreground">/session</span>
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/advisors/${advisor.id}`}>Book Now</Link>
                  </Button>
                </div>
              </div>
            </motion.article>)}
        </div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6
      }} className="text-center mt-12">
          <Button variant="heroOutline" size="lg" asChild>
            <Link to="/advisors">View All Advisors</Link>
          </Button>
        </motion.div>
      </div>
    </section>;
};
export default FeaturedAdvisors;