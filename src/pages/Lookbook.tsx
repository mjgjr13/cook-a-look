import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";

const categories = ["All", "Business", "Casual", "Evening", "Streetwear"];

const lookbookItems = [
  {
    id: 1,
    title: "Modern Power Suit",
    category: "Business",
    description: "Tailored perfection for the boardroom",
  },
  {
    id: 2,
    title: "Weekend Elegance",
    category: "Casual",
    description: "Effortlessly chic weekend look",
  },
  {
    id: 3,
    title: "Gala Night",
    category: "Evening",
    description: "Red carpet ready",
  },
  {
    id: 4,
    title: "Urban Edge",
    category: "Streetwear",
    description: "Contemporary street style",
  },
  {
    id: 5,
    title: "Executive Casual",
    category: "Business",
    description: "Smart casual redefined",
  },
  {
    id: 6,
    title: "Summer Minimalist",
    category: "Casual",
    description: "Clean lines, warm weather",
  },
  {
    id: 7,
    title: "Cocktail Hour",
    category: "Evening",
    description: "After-five sophistication",
  },
  {
    id: 8,
    title: "Street Luxe",
    category: "Streetwear",
    description: "High fashion meets the streets",
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
            <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4">
              Lookbook
            </h1>
            <p className="font-sans text-muted-foreground max-w-xl mx-auto">
              Curated outfit inspiration from our style advisors.
            </p>
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2 font-sans text-sm transition-all duration-200 ${
                  activeCategory === category
                    ? "bg-foreground text-background"
                    : "bg-transparent text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group"
              >
                {/* Placeholder */}
                <div className="aspect-[3/4] bg-secondary mb-4 flex items-center justify-center">
                  <span className="font-serif text-4xl text-muted-foreground/30">
                    {item.title.charAt(0)}
                  </span>
                </div>

                <div>
                  <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {item.category}
                  </p>
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
                No looks found in this category.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Lookbook;
