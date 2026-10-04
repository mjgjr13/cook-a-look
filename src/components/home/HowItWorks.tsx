const steps = [
  {
    title: "Tell us what you need",
    description:
      "Browse advisors by specialty, price, and session type, or let the Style Concierge suggest a few who fit.",
  },
  {
    title: "Book a session",
    description:
      "Pick a time and a length of one to three hours, by video or in person. You see the full price before you pay.",
  },
  {
    title: "Leave with a plan",
    description:
      "Get specific advice on outfits, fit, and what to buy, from a stylist who has listened to what you actually need.",
  },
];

const HowItWorks = () => (
  <section className="bg-background py-20 lg:py-28">
    <div className="container mx-auto px-5 sm:px-6 lg:px-8">
      <h2 className="font-serif text-4xl md:text-5xl max-w-xl">How it works</h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-12">
        {steps.map((step, index) => (
          <li key={step.title} className="border-t border-foreground pt-6">
            <span className="text-sm font-semibold text-gold">0{index + 1}</span>
            <h3 className="mt-3 font-serif text-2xl">{step.title}</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
