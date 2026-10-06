import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";

const nutritionLabelRows: {
  category: string;
  collected: string;
  purpose: string;
  sharedWith: string;
  retention: string;
}[] = [
  {
    category: "Contact info (name, email, phone)",
    collected: "Yes",
    purpose: "Account creation, booking, communication",
    sharedWith: "Service providers only",
    retention: "Duration of account + 3 years",
  },
  {
    category: "Payment info",
    collected: "Card data: no (Stripe-hosted)",
    purpose: "Processing bookings and payouts",
    sharedWith: "Stripe (processor)",
    retention: "Per Stripe's records-retention policy",
  },
  {
    category: "Biometric data (selfie, ID photo)",
    collected: "Advisors only, at application",
    purpose: "Identity verification for advisor applicants",
    sharedWith: "Not shared outside Cook A Look",
    retention: "Up to 1 year after last verification interaction",
  },
  {
    category: "Booking & session data",
    collected: "Yes",
    purpose: "Scheduling, escrow, disputes",
    sharedWith: "The other party to your booking",
    retention: "Duration of account + 3 years",
  },
  {
    category: "Session recordings (virtual)",
    collected: "Yes, for virtual sessions",
    purpose: "Quality assurance, dispute resolution, fraud prevention",
    sharedWith: "Not shared outside Cook A Look",
    retention: "90 days, longer if under active dispute",
  },
  {
    category: "Chat messages",
    collected: "Yes",
    purpose: "Booking coordination between client & advisor",
    sharedWith: "The other party to your booking",
    retention: "Duration of account",
  },
  {
    category: "AI concierge chat content",
    collected: "Yes, if you use it",
    purpose: "Advisor recommendations (sent to our AI provider)",
    sharedWith: "AI infrastructure provider",
    retention: "Not persisted after your session ends",
  },
  {
    category: "Device & usage data",
    collected: "Yes",
    purpose: "Security, analytics, service improvement",
    sharedWith: "Analytics/hosting providers",
    retention: "Up to 2 years",
  },
];

const PrivacyPolicy = () => {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Layout>
      <Seo
        title="Privacy Policy | Cook A Look"
        description="How Cook A Look collects, stores, and protects your personal information, including biometric data, across our styling marketplace."
        path="/privacy"
      />
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4 text-center">
              Legal
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-medium mb-8 text-center">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-center mb-12">
              Last updated: {lastUpdated}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              {/* Nutrition label */}
              <section id="privacy-summary" className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-2">Privacy at a Glance</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  A short summary of what we collect and why, styled after app-store "privacy
                  nutrition labels." This summary doesn't replace the full policy below — if the
                  two ever conflict, the full policy controls.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border text-left text-foreground">
                        <th className="py-2 pr-3 font-medium">Category</th>
                        <th className="py-2 pr-3 font-medium">Collected?</th>
                        <th className="py-2 pr-3 font-medium">Purpose</th>
                        <th className="py-2 pr-3 font-medium">Shared With</th>
                        <th className="py-2 font-medium">Retention</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      {nutritionLabelRows.map((row) => (
                        <tr key={row.category} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-3 text-foreground font-medium whitespace-nowrap">
                            {row.category}
                          </td>
                          <td className="py-2 pr-3">{row.collected}</td>
                          <td className="py-2 pr-3">{row.purpose}</td>
                          <td className="py-2 pr-3">{row.sharedWith}</td>
                          <td className="py-2">{row.retention}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cook A Look ("we", "our", or "us") is committed to protecting your privacy. This
                  Privacy Policy explains how we collect, use, disclose, and safeguard your
                  information when you use our platform (the "Platform"), and describes the
                  rights available to you depending on where you live. It should be read together
                  with our{" "}
                  <a href="/terms" className="text-gold hover:underline">
                    Terms of Use
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">2. Information We Collect</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">Personal Information:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Name and email address</li>
                    <li>Phone number</li>
                    <li>Profile photos and, for advisors, verification documents (see "Biometric Data" below)</li>
                    <li>Social media handles and portfolio links (for advisors)</li>
                    <li>Payment card details are collected and stored directly by Stripe, our payment processor — we never receive or store your full card number</li>
                  </ul>
                  <p><strong className="text-foreground">Usage Information:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Booking history, chat messages, and consultation preferences</li>
                    <li>Device and browser information</li>
                    <li>IP address and approximate location data</li>
                  </ul>
                </div>
              </section>

              {/* Biometric Data - BIPA-aligned section */}
              <section
                id="biometric-data"
                className="bg-gold/10 border border-gold/30 p-6 rounded-none scroll-mt-24"
              >
                <h2 className="font-serif text-2xl font-medium mb-4">3. Biometric Data</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    This section is our publicly available biometric data policy. It applies to
                    the live selfie and government ID photo advisor applicants provide during
                    identity verification, and is presented to every applicant for explicit,
                    written (electronic) consent before those photos are captured — see the
                    consent screen shown before that step.
                  </p>
                  <p>
                    <strong className="text-foreground">What is collected.</strong> A live photo
                    of your face taken through your device camera, and a photo of a
                    government-issued ID. We do not currently run facial-recognition or
                    face-geometry matching software against these photos — a human reviewer
                    compares them manually. If that ever changes, we will update this policy and
                    obtain fresh consent before doing so.
                  </p>
                  <p>
                    <strong className="text-foreground">Why we collect it.</strong> Solely to
                    verify advisor identity before approving an application and to reduce
                    impersonation and fraud on the Platform.
                  </p>
                  <p>
                    <strong className="text-foreground">Retention &amp; destruction schedule.</strong>{" "}
                    Both the selfie and ID photo are retained only as long as needed to complete
                    verification and resolve any related dispute. They are automatically and
                    permanently deleted no later than one (1) year after the application was
                    submitted, within thirty (30) days if the application is denied, or
                    immediately if the underlying account is deleted — whichever comes first.
                    This selfie is separate from, and does not replace, the public profile photo
                    an advisor uploads elsewhere in onboarding.
                  </p>
                  <p>
                    <strong className="text-foreground">We do not sell it.</strong> We do not
                    sell, lease, trade, or otherwise profit from biometric identifiers or
                    biometric information, and we do not disclose them to any third party except
                    service providers who store data on our behalf under confidentiality
                    obligations, or as required by a valid legal process.
                  </p>
                  <p>
                    <strong className="text-foreground">Your rights.</strong> You may request
                    access to, or early deletion of, your verification photos by contacting{" "}
                    <a href="mailto:privacy@cookalook.com" className="text-gold hover:underline">
                      privacy@cookalook.com
                    </a>
                    . Deleting these photos before your application is approved will prevent us
                    from completing verification.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">4. How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>To provide and maintain our services</li>
                  <li>To process bookings and payments</li>
                  <li>To verify advisor identities</li>
                  <li>To communicate with you about your account and bookings</li>
                  <li>To power the AI Concierge chat feature you choose to use (see Section 9)</li>
                  <li>To improve our platform and user experience</li>
                  <li>To resolve disputes and enforce our Terms of Use</li>
                </ul>
              </section>

              <section className="bg-gold/10 border border-gold/30 p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">5. Session Recordings</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Virtual Session Recording:</strong> All
                    virtual consultations are automatically recorded for quality assurance and
                    dispute resolution purposes.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Recordings are stored securely and encrypted</li>
                    <li>Access is limited to authorized administrators only</li>
                    <li>Recordings are retained for 90 days unless a dispute is active</li>
                    <li>By participating in sessions, you consent to recording</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">6. Information Sharing</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We do not sell or share (as those terms are defined under California law) your
                  personal information for cross-context behavioral advertising. We may share your
                  information with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Service Providers:</strong> payment processors (Stripe), video call providers (Daily.co, Google Meet), email delivery (Resend), hosting and infrastructure, and our AI infrastructure provider for the concierge chat feature</li>
                  <li><strong>Other Users:</strong> your public profile information, reviews, and (for bookings) chat messages are visible to the relevant counterparty or the public as applicable</li>
                  <li><strong>Legal Requirements:</strong> when required by law, valid legal process, or to protect the rights, property, or safety of Cook A Look, our users, or the public</li>
                  <li><strong>Business Transfers:</strong> in connection with a merger, acquisition, financing, or sale of assets, subject to standard confidentiality protections</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">7. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures to protect your information,
                  including encryption in transit and at rest, access controls limiting who can
                  view verification photos and recordings, and regular review of our systems.
                  However, no method of transmission over the Internet or electronic storage is
                  100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">
                  8. Your Privacy Rights (California &amp; Other States)
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    If you are a California resident, the California Consumer Privacy Act, as
                    amended by the California Privacy Rights Act (CCPA/CPRA), gives you the right
                    to: (a) know the categories and specific pieces of personal information we
                    collect, use, and disclose; (b) request deletion; (c) request correction of
                    inaccurate information; (d) request a portable copy of your data; (e) limit
                    the use of "sensitive personal information" (which includes your biometric
                    data collected under Section 3 above); and (f) not be discriminated against
                    for exercising these rights. We do not sell personal information and honor
                    Global Privacy Control (GPC) opt-out signals where technically feasible.
                  </p>
                  <p>
                    Residents of Colorado, Connecticut, Virginia, Oregon, Texas, and other states
                    with comprehensive privacy laws have similar rights to access, correct, delete,
                    and port their data, and to opt out of the sale of personal data and targeted
                    advertising (which, again, we do not engage in). To exercise any of these
                    rights, contact{" "}
                    <a href="mailto:privacy@cookalook.com" className="text-gold hover:underline">
                      privacy@cookalook.com
                    </a>
                    . We will verify your identity before fulfilling a request and will respond
                    within the time required by applicable law.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">9. AI Concierge</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The "AI Concierge" chat feature is an automated system powered by a
                  third-party AI model, not a human advisor. Messages you send it, along with
                  publicly listed advisor information, are sent to our AI infrastructure provider
                  to generate a response. We do not use your chat content to train AI models.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To improve the Concierge, we keep the questions you send it, with email addresses
                  and phone numbers removed and without linking them to your account, and any
                  feedback you choose to give (thumbs up or down, an optional comment, and the
                  answer it refers to). Our team reviews these to fix gaps in the Concierge's
                  instructions. They are deleted automatically after 90 days. If you are signed in,
                  the Concierge also keeps a short note of style preferences you share (for example
                  budget, fit, or what you dress for) so it doesn't have to ask again. Only you can
                  see that note, and you can clear it at any time under Account settings → Security.
                  Please don't share sensitive personal information in the chat.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  See our{" "}
                  <a href="/terms" className="text-gold hover:underline">
                    Terms of Use
                  </a>{" "}
                  for the disclosure that AI Concierge is AI-generated and not professional
                  styling advice.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">10. Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to keep you signed in, remember
                  preferences, analyze usage patterns, and improve the Platform. You can control
                  cookie preferences through your browser settings; blocking some cookies may
                  affect Platform functionality.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">11. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform is restricted to individuals who are at least 18 years old, as
                  stated in our{" "}
                  <a href="/terms" className="text-gold hover:underline">
                    Terms of Use
                  </a>
                  . We do not knowingly collect personal information from anyone under 18. If we
                  learn that we have collected personal information from someone under 18, we
                  will delete it promptly. Parents or guardians who believe a child has provided
                  us information should contact{" "}
                  <a href="mailto:privacy@cookalook.com" className="text-gold hover:underline">
                    privacy@cookalook.com
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">12. International Users</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform is operated from, and your information is generally stored and
                  processed in, the United States. If you access the Platform from outside the
                  United States, you understand your information will be transferred to, and
                  processed in, the United States, which may not offer the same level of data
                  protection as your home jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">13. Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any
                  material changes by posting the new policy on this page and updating the "Last
                  updated" date. Material changes affecting the Biometric Data section will not
                  apply retroactively to previously collected photos without obtaining fresh
                  consent.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">14. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy or want to exercise a
                  privacy right, contact us at{" "}
                  <a href="mailto:privacy@cookalook.com" className="text-gold hover:underline">
                    privacy@cookalook.com
                  </a>
                  .
                </p>
              </section>

              {/* Disclaimer footer */}
              <section className="border-t border-border pt-6 mt-8">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  This document is provided for informational purposes and does not constitute
                  legal advice. Cook A Look recommends consulting qualified legal counsel,
                  licensed in the relevant jurisdiction(s), before relying on this policy.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
