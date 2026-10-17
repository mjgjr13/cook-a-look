import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { CalendarClock, CreditCard, Flag, KeyRound, Mail, Sparkles, Wallet } from "lucide-react";

export const SUPPORT_EMAIL = "support@cookalook.com";

// Public support page (also the support URL in Stripe). Points people to the
// self-serve fix first, with email for everything else.
const topics = [
  {
    Icon: Flag,
    title: "Something went wrong in a session",
    body: "Report a problem from your dashboard, under Past Sessions, until 48 hours after the session ends. We hold the payment while we review it.",
    link: { to: "/dashboard", label: "Go to my sessions" },
  },
  {
    Icon: CalendarClock,
    title: "Cancel or change a booking",
    body: "Cancel from your dashboard for a full refund any time before your session (a 10% fee applies within 1 hour of a video session or 2 hours of an in-person one). To change the time, cancel and rebook.",
    link: { to: "/dashboard", label: "Manage bookings" },
  },
  {
    Icon: CreditCard,
    title: "Payments, receipts and refunds",
    body: "Payments are processed securely by Stripe, and your receipt is emailed to you. Refunds go back to the card you paid with, usually within 5 to 10 business days.",
    link: { to: "/faq", label: "Read the FAQ" },
  },
  {
    Icon: KeyRound,
    title: "Signing in",
    body: "Forgot your password? We'll email you a link to set a new one.",
    link: { to: "/forgot-password", label: "Reset my password" },
  },
  {
    Icon: Wallet,
    title: "Advisors: payouts",
    body: "See your earnings and payout status on your Earnings page. Use Manage payouts to update your bank details in Stripe.",
    link: { to: "/advisor/earnings", label: "Open Earnings" },
  },
  {
    Icon: Sparkles,
    title: "Style questions",
    body: "Not sure what you need yet? The AI Concierge can help you work out what to ask an advisor.",
    link: { to: "/ai-concierge", label: "Ask the AI Concierge" },
  },
];

const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Cook A Look support")}`;

const Support = () => (
  <Layout>
    <Seo
      title="Support | Cook A Look"
      description="Get help with Cook A Look bookings, cancellations, payments, refunds, sign-in and advisor payouts, or email our support team."
      path="/support"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Cook A Look Support",
        url: "https://cookalook.com/support",
        mainEntity: {
          "@type": "Organization",
          name: "Cook A Look",
          url: "https://cookalook.com",
          contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SUPPORT_EMAIL },
        },
      }}
    />
    <section className="bg-background">
      <div className="container mx-auto max-w-4xl px-5 sm:px-6 py-12 sm:py-16">
        <h1 className="font-serif text-4xl sm:text-5xl">How can we help?</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Most things can be sorted in a couple of clicks below. For anything else, email us and a real person will
          get back to you.
        </p>

        <div className="mt-8 flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-serif text-xl">Email support</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Include the email on your account and, for a booking, the advisor's name and session date.
            </p>
          </div>
          <Button asChild variant="hero" size="lg" className="shrink-0">
            <a href={mailto}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {topics.map(({ Icon, title, body, link }) => (
            <div key={title} className="border border-border bg-background p-5">
              <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
              <h2 className="mt-3 font-sans text-base font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              <Link to={link.to} className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                {link.label}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          See also our <Link to="/terms" className="underline underline-offset-4">Terms of Use</Link> and{" "}
          <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  </Layout>
);

export default Support;
