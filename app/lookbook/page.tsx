"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useLookbookItems, LookbookItem } from "@/hooks/use-lookbook-items"
import { AdvisorChatbot } from "@/components/chat/advisor-chatbot"

const fallbackItems: LookbookItem[] = [
  {
    id: "1",
    title: "Modern Power Suit",
    category: "Business",
    description: "Tailored perfection for the boardroom",
    aspect_ratio: "tall",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
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
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80",
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
    image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
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
    image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80",
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
    image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
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
    image_url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80",
    sort_order: 5,
    is_published: true,
    created_at: "",
    updated_at: "",
  },
]

export default function LookbookPage() {
  const [activeCategory, setActiveCategory] = useState("All")
  const { data: dbItems, isLoading } = useLookbookItems()

  const lookbookItems = dbItems && dbItems.length > 0 ? dbItems : fallbackItems

  const categories = useMemo(() => {
    const cats = new Set(lookbookItems.map((item) => item.category))
    return ["All", ...Array.from(cats)]
  }, [lookbookItems])

  const filteredItems =
    activeCategory === "All"
      ? lookbookItems
      : lookbookItems.filter((item) => item.category === activeCategory)

  if (isLoading) {
    return (
      <LayoutWrapper>
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
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
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
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
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
    </LayoutWrapper>
  )
}
