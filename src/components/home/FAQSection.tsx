import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Every answer here must match how the product actually works (Terms of Use,
// booking/cancellation code). Update both together.
const faqs = [
  {
    q: "How much does a session cost?",
    a: "Each advisor sets their own hourly rate, shown on their profile. You choose one, two, or three hours and see the full price, including any in-person fee, before you pay. Any applicable sales tax is shown at checkout.",
  },
  {
    q: "What happens in a session?",
    a: "You and your advisor talk through your goals, whether that is an event, a work wardrobe, or a closet that isn't working, and they give you specific advice on outfits, fit, and what to buy. You can message your advisor from your dashboard beforehand to share details.",
  },
  {
    q: "How do video sessions work?",
    a: "Join from your dashboard at your session time. There's no app to download. The room opens 15 minutes before your start time. Video sessions are recorded for quality and dispute protection, as described in our Terms.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, from your dashboard. Your refund depends on how far ahead you cancel, and you'll see the exact amount before you confirm. If your advisor doesn't show up, you get a refund.",
  },
  {
    q: "Is my payment secure?",
    a: "Payments are processed by Stripe, so Cook A Look never sees your card details. Your payment is held until 48 hours after your session, and you can open a dispute in that window if something goes wrong.",
  },
  {
    q: "Who are the advisors?",
    a: "Independent stylists who apply to Cook A Look and are reviewed by our team, including an identity check, before they can take bookings.",
  },
];

const FAQSection = () => (
  <section className="bg-card py-20 lg:py-28 border-t border-border">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h2 className="font-serif text-4xl md:text-5xl">Questions, answered</h2>
        <p className="mt-4 text-muted-foreground">
          Something else? Email{" "}
          <a href="mailto:info@cookalook.com" className="text-foreground underline underline-offset-4">
            info@cookalook.com
          </a>
          .
        </p>
      </div>
      <Accordion type="single" collapsible className="lg:col-span-8">
        {faqs.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-left font-sans text-base font-semibold tracking-normal hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export const FAQ_ITEMS = faqs;
export default FAQSection;
