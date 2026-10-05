import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/components/home/FAQSection";

const FAQ = () => (
  <Layout>
    <Seo
      title="FAQ | Cook A Look"
      description="Answers about booking a style advisor on Cook A Look: pricing, video and in-person sessions, cancellations, payment security, and how advisors are reviewed."
      path="/faq"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }}
    />
    <section className="bg-background">
      <div className="container mx-auto max-w-3xl px-5 sm:px-6 py-12 sm:py-16">
        <h1 className="font-serif text-4xl sm:text-5xl">Frequently asked questions</h1>
        <p className="mt-3 text-muted-foreground">
          Can't find what you need? Email{" "}
          <a href="mailto:info@cookalook.com" className="text-foreground underline underline-offset-4">info@cookalook.com</a>{" "}
          or ask the <Link to="/ai-concierge" className="text-foreground underline underline-offset-4">AI Concierge</Link>.
        </p>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ_ITEMS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left font-sans text-base font-semibold tracking-normal hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  </Layout>
);

export default FAQ;
