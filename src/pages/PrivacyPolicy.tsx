import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";

const PrivacyPolicy = () => {
  return (
    <Layout>
      <Seo
        title="Privacy Policy | Cook A Look"
        description="How Cook A Look collects, stores, and protects your personal information across our styling marketplace."
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
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cook A Look ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                  explains how we collect, use, disclose, and safeguard your information when you use our platform.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">2. Information We Collect</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">Personal Information:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Name and email address</li>
                    <li>Phone number (optional)</li>
                    <li>Profile photos and verification documents (for advisors)</li>
                    <li>Social media handles and portfolio links (for advisors)</li>
                    <li>Payment information (processed securely by Stripe)</li>
                  </ul>
                  <p><strong className="text-foreground">Usage Information:</strong></p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Booking history and consultation preferences</li>
                    <li>Device and browser information</li>
                    <li>IP address and location data</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">3. How We Use Your Information</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>To provide and maintain our services</li>
                  <li>To process bookings and payments</li>
                  <li>To verify advisor identities and qualifications</li>
                  <li>To communicate with you about your account and bookings</li>
                  <li>To improve our platform and user experience</li>
                  <li>To resolve disputes and enforce our terms</li>
                </ul>
              </section>

              <section className="bg-gold/10 border border-gold/30 p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">4. Session Recordings</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">Virtual Session Recording:</strong> All virtual consultations 
                    are automatically recorded for quality assurance and dispute resolution purposes.
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
                <h2 className="font-serif text-2xl font-medium mb-4">5. Information Sharing</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Service Providers:</strong> Payment processors (Stripe), video call providers, and hosting services</li>
                  <li><strong>Other Users:</strong> Your public profile information is visible to other platform users</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">6. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures to protect your information, including encryption 
                  in transit and at rest, secure authentication, and regular security audits. However, no method of 
                  transmission over the Internet is 100% secure.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">7. Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Object to processing of your personal information</li>
                  <li>Request data portability</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">8. Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to improve your experience, analyze usage patterns, 
                  and personalize content. You can control cookie preferences through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">9. Children's Privacy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not directed to individuals under the age of 18. We do not knowingly collect 
                  personal information from children. If you become aware that a child has provided us with 
                  personal information, please contact us.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">10. Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes 
                  by posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">11. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@cookalook.com" className="text-gold hover:underline">
                    privacy@cookalook.com
                  </a>
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
