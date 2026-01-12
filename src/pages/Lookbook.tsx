import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const categories = ["All", "Business", "Casual", "Evening", "Streetwear"];

const lookbookItems = [
  {
    id: 1,
    title: "Modern Power Suit",
    category: "Business",
    description: "Tailored perfection for the boardroom",
    aspectRatio: "tall",
  },
  {
    id: 2,
    title: "Weekend Elegance",
    category: "Casual",
    description: "Effortlessly chic weekend look",
    aspectRatio: "square",
  },
  {
    id: 3,
    title: "Gala Night",
    category: "Evening",
    description: "Red carpet ready",
    aspectRatio: "wide",
  },
  {
    id: 4,
    title: "Urban Edge",
    category: "Streetwear",
    description: "Contemporary street style",
    aspectRatio: "tall",
  },
  {
    id: 5,
    title: "Executive Casual",
    category: "Business",
    description: "Smart casual redefined",
    aspectRatio: "square",
  },
  {
    id: 6,
    title: "Summer Minimalist",
    category: "Casual",
    description: "Clean lines, warm weather",
    aspectRatio: "wide",
  },
  {
    id: 7,
    title: "Cocktail Hour",
    category: "Evening",
    description: "After-five sophistication",
    aspectRatio: "square",
  },
  {
    id: 8,
    title: "Street Luxe",
    category: "Streetwear",
    description: "High fashion meets the streets",
    aspectRatio: "tall",
  },
];

const Lookbook = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems =
    activeCategory === "All"
      ? lookbookItems
      : lookbookItems.filter((item) => item.category === activeCategory);

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
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">
              Style Inspiration
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
              Lookbook
            </h1>
            <p className="font-sans text-muted-foreground max-w-2xl mx-auto">
              Curated outfit inspiration from our top style advisors
            </p>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 font-sans text-sm tracking-wide transition-all duration-200 ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary border border-border"
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Masonry-style Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredItems.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="break-inside-avoid group relative overflow-hidden bg-card border border-border"
              >
                <div
                  className={`relative ${
                    item.aspectRatio === "tall"
                      ? "aspect-[3/4]"
                      : item.aspectRatio === "wide"
                      ? "aspect-[4/3]"
                      : "aspect-square"
                  } bg-gradient-to-br from-secondary to-muted overflow-hidden`}
                >
                  {/* Placeholder gradient since we don't have actual lookbook images */}
                  <div className="absolute inset-0 bg-gradient-to-br from-charcoal/5 to-gold/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-serif text-6xl text-muted-foreground/20 italic">
                      {item.title.charAt(0)}
                    </span>
                  </div>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-center text-primary-foreground p-6">
                      <h3 className="font-serif text-xl mb-2">{item.title}</h3>
                      <p className="font-sans text-sm text-primary-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <Badge variant="secondary" className="mb-2 font-sans text-xs">
                    {item.category}
                  </Badge>
                  <h3 className="font-serif text-lg font-medium">{item.title}</h3>
                  <p className="font-sans text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <p className="font-sans text-muted-foreground">
                No looks found in this category yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Lookbook;
