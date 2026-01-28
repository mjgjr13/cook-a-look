import { useState, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLookbookItems, LookbookItem } from "@/hooks/useLookbookItems";
import AdvisorChatbot from "@/components/chat/AdvisorChatbot";

// Fallback static data for when database is empty
import lookbookBusiness1 from "@/assets/lookbook-business-1.jpg";
import lookbookBusiness2 from "@/assets/lookbook-business-2.jpg";
import lookbookCasual1 from "@/assets/lookbook-casual-1.jpg";
import lookbookCasual2 from "@/assets/lookbook-casual-2.jpg";
import lookbookEvening1 from "@/assets/lookbook-evening-1.jpg";
import lookbookEvening2 from "@/assets/lookbook-evening-2.jpg";
import lookbookStreet2 from "@/assets/lookbook-street-2.jpg";

const fallbackItems: LookbookItem[] = [
  {
    id: "1",
    title: "Modern Power Suit",
    category: "Business",
    description: "Tailored perfection for the boardroom",
    aspect_ratio: "tall",
    image_url: lookbookBusiness1,
    sort_order: 0,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "2",
    title: "Weekend Elegance",
    category: "Casual",
    description: "Effortlessly chic weekend look",
    aspect_ratio: "square",
    image_url: lookbookCasual1,
    sort_order: 1,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "3",
    title: "Gala Night",
    category: "Evening",
    description: "Red carpet ready",
    aspect_ratio: "wide",
    image_url: lookbookEvening1,
    sort_order: 2,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "4",
    title: "Street Luxe",
    category: "Streetwear",
    description: "High fashion meets the streets",
    aspect_ratio: "tall",
    image_url: lookbookStreet2,
    sort_order: 3,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "5",
    title: "Executive Casual",
    category: "Business",
    description: "Smart casual redefined",
    aspect_ratio: "square",
    image_url: lookbookBusiness2,
    sort_order: 4,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "6",
    title: "Summer Minimalist",
    category: "Casual",
    description: "Clean lines, warm weather",
    aspect_ratio: "wide",
    image_url: lookbookCasual2,
    sort_order: 5,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "7",
    title: "Cocktail Hour",
    category: "Evening",
    description: "After-five sophistication",
    aspect_ratio: "square",
    image_url: lookbookEvening2,
    sort_order: 6,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
];

const Lookbook = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: dbItems, isLoading } = useLookbookItems();

  // Use database items if available, otherwise use fallback
  const lookbookItems = dbItems && dbItems.length > 0 ? dbItems : fallbackItems;

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = new Set(lookbookItems.map((item) => item.category));
    return ["All", ...Array.from(cats)];
  }, [lookbookItems]);

  const filteredItems =
    activeCategory === "All"
      ? lookbookItems
      : lookbookItems.filter((item) => item.category === activeCategory);

  if (isLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6 lg:px-8">
            <div className="text-center mb-12">
              <Skeleton className="h-12 w-48 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="break-inside-avoid">
                  <Skeleton className="aspect-square w-full" />
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
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
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
                    item.aspect_ratio === "tall"
                      ? "aspect-[3/4]"
                      : item.aspect_ratio === "wide"
                      ? "aspect-[4/3]"
                      : "aspect-square"
                  } overflow-hidden`}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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
      <AdvisorChatbot />
    </Layout>
  );
};

export default Lookbook;
