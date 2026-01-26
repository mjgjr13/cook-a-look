import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";

const TermsOfUse = () => {
  return (
    <Layout>
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
              Terms of Use
            </h1>
            <p className="text-muted-foreground text-center mb-12">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using Cook a Look ("the Platform"), you agree to be bound by these Terms of Use. 
                  If you do not agree to these terms, please do not use our services. The Platform connects clients 
                  with independent style advisors for virtual and in-person consultations.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">2. Platform Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cook a Look provides a marketplace platform that enables users to discover, book, and engage with 
                  independent style advisors. We facilitate connections but do not employ advisors directly. All 
                  advisors on our platform are independent contractors responsible for their own services.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">3. User Accounts</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To use certain features of the Platform, you must create an account. You are responsible for 
                  maintaining the confidentiality of your account credentials and for all activities that occur 
                  under your account. You must provide accurate and complete information during registration.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">4. Booking and Payments</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All payments are processed securely through our payment provider, Stripe. Prices displayed include 
                  the advisor's consultation fee. Applicable taxes are calculated dynamically at checkout based on 
                  your location. Payments are held in escrow and released to advisors 48 hours after the session 
                  concludes, unless a dispute is raised within that period.
                </p>
              </section>

              <section className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4 text-destructive">
                  5. Liability Disclaimer and Assumption of Risk
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">IMPORTANT - PLEASE READ CAREFULLY:</strong>
                  </p>
                  <p>
                    <strong>Independent Contractors:</strong> Style advisors on Cook a Look are independent 
                    contractors, not employees or agents of the Platform. Cook a Look does not control, supervise, 
                    or direct the manner in which advisors provide their services.
                  </p>
                  <p>
                    <strong>In-Person Meetings:</strong> If you choose to meet an advisor in person, you do so 
                    entirely at your own risk. Cook a Look is NOT responsible for any injury, harm, damage, loss, 
                    or any other negative outcome that may result from in-person meetings.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Physical injury or bodily harm</li>
                    <li>Property damage or theft</li>
                    <li>Emotional distress or psychological harm</li>
                    <li>Any criminal activity or misconduct</li>
                    <li>Allergic reactions to products or materials used during consultations</li>
                    <li>Any consequences arising from advice given during sessions</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">6. Safety Recommendations</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For in-person consultations, we strongly recommend:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Meeting in public places for initial consultations</li>
                  <li>Informing a friend or family member of your meeting location and time</li>
                  <li>Trusting your instincts - if something feels wrong, leave immediately</li>
                  <li>Verifying the advisor's profile and reviews before meeting</li>
                </ul>
              </section>

              {/* NEW SECTION: Advisor Expectations */}
              <section className="bg-primary/5 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  7. Advisor Professional Expectations
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    All advisors on the Cook a Look platform agree to maintain the highest standards of 
                    professionalism. By becoming an advisor, you commit to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Professional Conduct:</strong> Maintaining respectful, courteous, and professional behavior during all sessions</li>
                    <li><strong>Punctuality:</strong> Being on time for all scheduled consultations</li>
                    <li><strong>Preparedness:</strong> Arriving ready to provide quality styling advice</li>
                    <li><strong>No Harassment:</strong> Zero tolerance for harassment, discrimination, or inappropriate behavior</li>
                    <li><strong>Recording Compliance:</strong> Acknowledging and complying with virtual session recording policies</li>
                  </ul>
                  <p className="mt-4">
                    <strong className="text-foreground">Consequences:</strong> Violations of these expectations 
                    may result in warnings, suspension, or permanent removal from the platform at Cook a Look's 
                    sole discretion.
                  </p>
                </div>
              </section>

              {/* NEW SECTION: Customer Expectations */}
              <section className="bg-primary/5 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  8. Customer Expectations
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Customers using Cook a Look agree to treat all advisors with respect and professionalism:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Respectful Communication:</strong> Treating advisors with courtesy and respect</li>
                    <li><strong>No Harassment:</strong> Zero tolerance for harassment, abuse, or inappropriate conduct toward advisors</li>
                    <li><strong>Dispute Window:</strong> Understanding that disputes must be raised within 48 hours of the session start time</li>
                    <li><strong>Good Faith:</strong> Engaging in consultations in good faith and providing honest feedback</li>
                  </ul>
                  <p className="mt-4">
                    Customers who violate these expectations may have their accounts suspended or terminated.
                  </p>
                </div>
              </section>

              {/* NEW SECTION: Virtual Session Recording */}
              <section className="bg-gold/10 border border-gold/30 p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  9. Virtual Session Recording Policy
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">IMPORTANT NOTICE:</strong> All virtual consultations 
                    conducted through the Cook a Look platform are automatically recorded.
                  </p>
                  <p>
                    <strong>Purpose of Recordings:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Dispute resolution and investigation</li>
                    <li>Quality assurance and platform improvement</li>
                    <li>Protection of both advisors and clients</li>
                  </ul>
                  <p>
                    <strong>Access to Recordings:</strong> Session recordings are only accessible by Cook a Look 
                    administrators for the purposes stated above. Recordings are never shared publicly or with 
                    third parties except as required by law.
                  </p>
                  <p>
                    <strong>Retention:</strong> Recordings are retained for a period of 90 days following the 
                    session, after which they are permanently deleted unless a dispute is active.
                  </p>
                  <p>
                    <strong>Consent:</strong> By participating in virtual sessions, both advisors and clients 
                    consent to the recording of the session as outlined in this policy.
                  </p>
                </div>
              </section>

              {/* NEW SECTION: Escrow and Disputes */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">10. Escrow and Dispute Resolution</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Escrow Period:</strong> All payments are held in escrow for 48 hours following the 
                    scheduled session start time. After this period, funds are automatically released to the advisor.
                  </p>
                  <p>
                    <strong>Raising a Dispute:</strong> Clients may raise a dispute within the 48-hour window 
                    following the session. Disputes must include a clear description of the issue.
                  </p>
                  <p>
                    <strong>Dispute Investigation:</strong> When a dispute is raised, funds remain in escrow 
                    until Cook a Look administrators review the case. This may include reviewing session recordings 
                    for virtual consultations.
                  </p>
                  <p>
                    <strong>Resolution:</strong> Cook a Look will make a determination based on available evidence 
                    and may issue a full or partial refund to the client, or release funds to the advisor.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">11. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content on the Platform, including but not limited to text, graphics, logos, and software, 
                  is the property of Cook a Look or its licensors and is protected by intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">12. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, COOK A LOOK SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF 
                  PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM OR ANY SERVICES OBTAINED 
                  THROUGH THE PLATFORM.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">13. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold harmless Cook a Look and its affiliates from any claims, 
                  damages, losses, and expenses arising from your use of the Platform, your violation of these 
                  Terms, or your violation of any rights of another party.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">14. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                  in which Cook a Look operates, without regard to its conflict of law provisions.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">15. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will notify users of significant 
                  changes via email or through the Platform. Your continued use of the Platform after such 
                  modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">16. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms of Use, please contact us at{" "}
                  <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                    legal@cookalook.com
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

export default TermsOfUse;
