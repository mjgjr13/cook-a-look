import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";

const TermsOfUse = () => {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Layout>
      <Seo
        title="Terms of Use | Cook A Look"
        description="Binding terms and conditions for using the Cook A Look styling marketplace, including bookings, payments, escrow, disputes, recording, indemnification, and arbitration."
        path="/terms"
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
              Terms of Use
            </h1>
            <p className="text-muted-foreground text-center mb-4">
              Last updated: {lastUpdated}
            </p>
            <p className="text-muted-foreground text-center text-sm mb-12 max-w-2xl mx-auto">
              These Terms of Use form a binding legal agreement between you and Cook A Look.
              Please read them carefully. By creating an account, booking a session, or
              otherwise using the Platform, you accept these Terms in full.
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              {/* 1. Agreement */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">1. Agreement to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms of Use (the "<strong>Terms</strong>") are a legally binding
                  contract between you ("<strong>you</strong>", "<strong>your</strong>", "<strong>User</strong>",
                  "<strong>Client</strong>", or "<strong>Advisor</strong>") and Cook A Look
                  ("<strong>Cook A Look</strong>", "<strong>we</strong>", "<strong>us</strong>",
                  or "<strong>our</strong>") governing your access to and use of the Cook A Look
                  website, mobile experience, applications, and related services (collectively, the
                  "<strong>Platform</strong>"). By accessing, browsing, registering for, or using
                  the Platform, you represent that (a) you are at least 18 years old or the age of
                  majority in your jurisdiction, (b) you have full legal capacity to enter into
                  this agreement, and (c) you agree to be bound by these Terms, our
                  <a href="/privacy" className="text-gold hover:underline"> Privacy Policy</a>,
                  and all policies referenced herein. If you do not agree, you must not use the
                  Platform.
                </p>
              </section>

              {/* 2. Platform Role */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">2. Nature of the Platform</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cook A Look operates a technology marketplace that enables Clients to discover,
                  communicate with, and book independent style advisors ("<strong>Advisors</strong>")
                  for virtual or in-person consultations. Cook A Look is{" "}
                  <strong className="text-foreground">not</strong> a styling firm, talent agency,
                  employer, joint venturer, partner, or fiduciary of any Advisor or Client. We do
                  not employ Advisors, do not direct or control the manner, means, time, place,
                  content, or quality of services provided by Advisors, and make no representation
                  or warranty regarding any Advisor's qualifications, credentials, background,
                  identity, conduct, or the suitability, safety, legality, or quality of any
                  services rendered. Any contract for services formed through the Platform is
                  exclusively between the Client and the Advisor.
                </p>
              </section>

              {/* 3. Eligibility & Accounts */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">3. Eligibility &amp; Accounts</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You must register for an account to access most features. You agree to: (a)
                  provide true, accurate, current, and complete information; (b) maintain and
                  promptly update your information; (c) safeguard your credentials and not share
                  them with any third party; and (d) accept full responsibility for all activity
                  occurring under your account. You must notify us immediately of any unauthorized
                  use or suspected breach of security. We may refuse, suspend, or terminate any
                  account at our sole discretion and without notice if we believe these Terms or
                  any law has been violated.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Advisors must additionally complete onboarding, acknowledge platform policies,
                  and may be required to provide identity verification. Cook A Look does not
                  guarantee that any verification is conclusive and disclaims all liability arising
                  from reliance on verification status.
                </p>
              </section>

              {/* 4. Booking, Pricing, Payments, Escrow */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">4. Bookings, Pricing, Payments &amp; Escrow</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Payment Processing.</strong> All payments are processed by third-party
                    payment processors (currently Stripe). By transacting on the Platform, you
                    agree to the processor's terms and authorize the charge of all amounts due,
                    including any applicable surcharges (e.g., in-person travel/location
                    surcharges) and taxes where applicable.
                  </p>
                  <p>
                    <strong>Platform Fees.</strong> Cook A Look charges Advisors a service fee of
                    fifteen percent (15%) per completed booking, reduced to five percent (5%) for
                    each additional booking in a calendar month after the Advisor's ninth (9th)
                    completed booking in that month. Fees may change with notice posted to the
                    Platform; continued use after a change constitutes acceptance.
                  </p>
                  <p>
                    <strong>Escrow.</strong> Client payments are held in escrow for forty-eight
                    (48) hours following the scheduled session start time. Funds are released to
                    the Advisor's available balance after the escrow period if no dispute is
                    timely raised. Cook A Look may withhold or reverse funds where required by
                    law, fraud, chargeback, dispute, or violation of these Terms.
                  </p>
                  <p>
                    <strong>Withdrawals.</strong> Advisors may request payout once available
                    balance meets the minimum withdrawal threshold. Cook A Look is not a bank and
                    does not pay interest on held funds.
                  </p>
                  <p>
                    <strong>Refunds &amp; Cancellations.</strong> Refunds, cancellations, and
                    rescheduling are governed by the cancellation policy in effect at the time of
                    booking. Except where required by law or where Cook A Look determines a refund
                    is warranted following a dispute, all sales are final.
                  </p>
                  <p>
                    <strong>Taxes.</strong> Each party is solely responsible for the determination,
                    collection, reporting, and remittance of all taxes applicable to such party's
                    activities. Advisors acknowledge that they are responsible for self-employment,
                    income, and any other applicable taxes on their earnings.
                  </p>
                </div>
              </section>

              {/* 5. Liability Disclaimer */}
              <section className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4 text-destructive">
                  5. Assumption of Risk &amp; Release (In-Person and Virtual)
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">PLEASE READ CAREFULLY. THIS SECTION
                    LIMITS COOK A LOOK'S LIABILITY AND CONTAINS A RELEASE OF CLAIMS.</strong>
                  </p>
                  <p>
                    You acknowledge that interactions with Advisors and Clients—whether online,
                    by phone, by message, or in person—carry inherent risks, including but not
                    limited to physical injury, harassment, theft, property loss, illness,
                    allergic reaction, emotional distress, fraud, and criminal acts of third
                    parties. You assume all such risks voluntarily and knowingly.
                  </p>
                  <p>
                    <strong>In-Person Meetings.</strong> If you choose to meet in person, you do
                    so entirely at your own risk. Cook A Look does not screen, supervise, or
                    chaperone in-person meetings and disclaims all responsibility for what occurs
                    before, during, or after them.
                  </p>
                  <p>
                    To the fullest extent permitted by law, you hereby{" "}
                    <strong className="text-foreground">release, waive, discharge, and covenant
                    not to sue</strong> Cook A Look and its officers, directors, employees,
                    contractors, agents, affiliates, licensors, and successors from any and all
                    claims, demands, damages, losses, liabilities, costs, or expenses (including
                    attorneys' fees) of every kind and nature, known or unknown, arising out of
                    or in any way connected with your use of the Platform or any interaction
                    with another user, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Physical injury, bodily harm, or death;</li>
                    <li>Property damage, loss, or theft;</li>
                    <li>Emotional distress or psychological harm;</li>
                    <li>Criminal acts, harassment, or misconduct of any user or third party;</li>
                    <li>Allergic reactions to products, fabrics, cosmetics, or materials;</li>
                    <li>Reliance on styling advice, recommendations, or opinions; and</li>
                    <li>Acts or omissions of Advisors, who are independent contractors.</li>
                  </ul>
                  <p>
                    If you are a California resident, you expressly waive California Civil Code
                    § 1542, which provides: "A general release does not extend to claims that
                    the creditor or releasing party does not know or suspect to exist in his or
                    her favor at the time of executing the release, and that, if known by him or
                    her, would have materially affected his or her settlement with the debtor or
                    released party."
                  </p>
                </div>
              </section>

              {/* 6. Safety */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">6. Safety Recommendations</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  For in-person consultations, we strongly recommend you:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Meet in well-lit, public places for any first meeting;</li>
                  <li>Inform a trusted contact of your meeting location and time;</li>
                  <li>Trust your instincts—if something feels wrong, leave immediately;</li>
                  <li>Verify the Advisor's profile, reviews, and communications in advance;</li>
                  <li>Never share financial credentials, government IDs, or sensitive personal data outside the Platform.</li>
                </ul>
              </section>

              {/* 7. Advisor Expectations */}
              <section className="bg-primary/5 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  7. Advisor Professional Expectations
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Advisors operate as independent contractors and represent and warrant that
                    they will: (a) maintain professional, respectful, lawful, and courteous
                    conduct in all interactions; (b) be punctual and adequately prepared; (c)
                    refrain from harassment, discrimination, retaliation, or inappropriate
                    behavior of any kind; (d) comply with all applicable laws, regulations, and
                    licensing requirements; (e) honor scheduling, recording, and payout policies;
                    and (f) not solicit Clients to transact off-Platform to evade fees.
                  </p>
                  <p>
                    <strong className="text-foreground">Consequences.</strong> Violations may
                    result in warnings, withheld payouts, suspension, deplatforming, refund to
                    Clients, and referral to law enforcement, in Cook A Look's sole discretion.
                  </p>
                </div>
              </section>

              {/* 8. Customer Expectations */}
              <section className="bg-primary/5 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">8. Client Expectations</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>Clients agree to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Treat all Advisors with respect, courtesy, and professionalism;</li>
                    <li>Refrain from harassment, abuse, threats, or inappropriate conduct;</li>
                    <li>Raise any dispute within the 48-hour escrow window;</li>
                    <li>Engage in good faith, provide accurate information, and pay all amounts when due.</li>
                  </ul>
                  <p>
                    Clients who violate these expectations may have their accounts suspended or
                    terminated and forfeit any pending refunds.
                  </p>
                </div>
              </section>

              {/* 9. Recording */}
              <section className="bg-gold/10 border border-gold/30 p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  9. Virtual Session Recording &amp; Consent
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">EXPRESS CONSENT TO RECORDING.</strong>{" "}
                    By participating in any virtual consultation conducted through the Platform,
                    each participant (Advisor and Client) expressly consents to the audio and
                    video recording of the session for the purposes described below. If you do
                    not consent, you must not join virtual sessions.
                  </p>
                  <p>
                    <strong>Purpose.</strong> Recordings are used for quality assurance, safety,
                    dispute resolution, fraud prevention, compliance, and improvement of the
                    Platform.
                  </p>
                  <p>
                    <strong>Access.</strong> Recordings are accessible only to authorized
                    Cook A Look personnel and are not shared publicly. Recordings may be disclosed
                    to comply with law, valid legal process, or to protect the rights, property,
                    or safety of Cook A Look, our users, or the public.
                  </p>
                  <p>
                    <strong>Retention.</strong> Recordings are retained for up to ninety (90)
                    days, after which they are deleted unless preserved in connection with an
                    active dispute, investigation, or legal obligation.
                  </p>
                  <p>
                    <strong>Two-Party Consent Jurisdictions.</strong> You acknowledge that some
                    jurisdictions require all parties' consent to recording. By joining a virtual
                    session you provide such consent and represent that any other person in your
                    physical presence during the call has also consented.
                  </p>
                </div>
              </section>

              {/* 10. Disputes (escrow) */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">10. Escrow Disputes</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Window.</strong> Clients must raise any dispute within forty-eight
                    (48) hours of the scheduled session start time. Disputes raised outside this
                    window are waived.
                  </p>
                  <p>
                    <strong>Process.</strong> Funds remain in escrow during review. Cook A Look
                    may, in its sole discretion, review messages, recordings, transaction logs,
                    and other evidence and determine the appropriate resolution, including a full
                    or partial refund to the Client or release of funds to the Advisor.
                  </p>
                  <p>
                    <strong>Final Determination.</strong> Cook A Look's determination of escrow
                    disputes is final and binding for purposes of fund release; it does not
                    constitute legal adjudication of any underlying claim between the parties.
                  </p>
                </div>
              </section>

              {/* 11. Acceptable Use */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">11. Acceptable Use; Prohibited Conduct</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You agree not to, and not to permit any third party to: (a) use the Platform for
                  any unlawful, fraudulent, harmful, infringing, defamatory, obscene, or
                  discriminatory purpose; (b) harass, threaten, stalk, dox, or impersonate any
                  person; (c) circumvent fees or solicit off-Platform transactions; (d) scrape,
                  crawl, copy, or systematically download Platform content except as expressly
                  permitted; (e) reverse engineer, decompile, or attempt to derive source code;
                  (f) introduce malware, viruses, or any code designed to disrupt or compromise
                  the Platform; (g) interfere with security or access controls; (h) upload content
                  that infringes intellectual property, privacy, or publicity rights; (i) use
                  bots, scripted accounts, or fake reviews; or (j) violate any applicable law.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We may investigate, remove content, suspend accounts, and cooperate with law
                  enforcement at our discretion. We reserve all rights and remedies.
                </p>
              </section>

              {/* 12. User Content */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">12. User Content &amp; License</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  You retain ownership of content you submit ("<strong>User Content</strong>"),
                  including profile copy, photos, portfolio items, reviews, and messages. You
                  grant Cook A Look a worldwide, non-exclusive, royalty-free, fully paid,
                  sublicensable, and transferable license to host, store, reproduce, modify
                  (e.g., for formatting), create derivative works of, display, perform, and
                  distribute your User Content for the purposes of operating, promoting, and
                  improving the Platform. You represent and warrant that you own or have all
                  necessary rights to your User Content and that it does not violate any law or
                  third-party right.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We may remove any User Content for any reason without notice. Feedback you
                  submit is non-confidential and may be used by us without restriction or
                  compensation.
                </p>
              </section>

              {/* 13. Intellectual Property */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">13. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform, including all software, design, text, graphics, logos, and
                  trademarks (including "Cook A Look"), is owned by or licensed to Cook A Look
                  and protected by intellectual property and other laws. Subject to your
                  compliance with these Terms, we grant you a limited, revocable, non-exclusive,
                  non-transferable license to access and use the Platform for its intended
                  purpose. All rights not expressly granted are reserved.
                </p>
              </section>

              {/* 14. DMCA */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">14. Copyright Complaints (DMCA)</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe content on the Platform infringes your copyright, send a notice
                  to{" "}
                  <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                    legal@cookalook.com
                  </a>{" "}
                  containing: (a) your physical or electronic signature; (b) identification of the
                  copyrighted work; (c) identification of the allegedly infringing material and
                  its location; (d) your contact information; (e) a statement of good-faith
                  belief that the use is unauthorized; and (f) a statement, under penalty of
                  perjury, that your notice is accurate and you are the owner or authorized to
                  act. We may remove allegedly infringing content and terminate repeat infringers.
                </p>
              </section>

              {/* 15. Third Parties */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">15. Third-Party Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform integrates third-party services (e.g., Stripe for payments,
                  Daily.co and Google Meet for video, mapping providers, analytics, and email).
                  Your use of those services is governed by their respective terms and privacy
                  policies. Cook A Look is not responsible for third-party services, content, or
                  outages.
                </p>
              </section>

              {/* 16. Disclaimers */}
              <section className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">16. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide">
                  The platform and all content, services, advisor listings, and materials are
                  provided "as is" and "as available" without warranty of any kind, whether
                  express, implied, statutory, or otherwise. To the maximum extent permitted by
                  law, cook a look disclaims all warranties, including merchantability, fitness
                  for a particular purpose, title, non-infringement, accuracy, uninterrupted or
                  error-free operation, and any warranty arising from course of dealing or trade
                  usage. Cook a look does not warrant the conduct, identity, or qualifications of
                  any user, advisor, or third party, or that any consultation will produce any
                  particular result.
                </p>
              </section>

              {/* 17. Limitation of Liability */}
              <section className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">17. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide mb-4">
                  To the maximum extent permitted by law, in no event shall cook a look or its
                  officers, directors, employees, contractors, agents, affiliates, licensors, or
                  suppliers be liable for any indirect, incidental, special, consequential,
                  exemplary, or punitive damages, or for any loss of profits, revenue, data,
                  goodwill, business opportunity, or substitute services, arising out of or
                  related to these terms or your use of (or inability to use) the platform,
                  whether in contract, tort (including negligence), strict liability, or any
                  other theory, and even if cook a look has been advised of the possibility of
                  such damages.
                </p>
                <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide">
                  In no event shall cook a look's aggregate liability arising out of or related
                  to these terms or the platform exceed the greater of (a) the total fees
                  retained by cook a look from your transactions during the six (6) months
                  immediately preceding the event giving rise to the claim, or (b) one hundred
                  u.s. dollars (us $100). The foregoing limitations apply regardless of any
                  failure of essential purpose of any limited remedy.
                </p>
              </section>

              {/* 18. Indemnification */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">18. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to defend, indemnify, and hold harmless Cook A Look and its officers,
                  directors, employees, contractors, agents, affiliates, and licensors from and
                  against any and all claims, damages, obligations, losses, liabilities, costs,
                  and expenses (including reasonable attorneys' fees) arising out of or related
                  to: (a) your access to or use of the Platform; (b) your User Content; (c) your
                  violation of these Terms or any law; (d) your violation of any third-party
                  right; (e) any consultation, transaction, or in-person meeting you participate
                  in; or (f) any dispute between you and another user. Cook A Look may, at its
                  option, assume the exclusive defense and control of any matter subject to
                  indemnification, in which case you agree to cooperate.
                </p>
              </section>

              {/* 19. Termination */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">19. Suspension &amp; Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may suspend, restrict, or terminate your access to the Platform at any time,
                  with or without notice or cause, including for suspected violation of these
                  Terms, risk to users or the Platform, or as required by law. You may stop
                  using the Platform at any time and request account deletion. Sections that by
                  their nature should survive (including payment obligations, releases,
                  disclaimers, limitations of liability, indemnification, dispute resolution,
                  and intellectual property terms) survive termination.
                </p>
              </section>

              {/* 20. Dispute Resolution / Arbitration */}
              <section className="bg-secondary/50 border border-border p-6 rounded-none">
                <h2 className="font-serif text-2xl font-medium mb-4">
                  20. Governing Law; Binding Arbitration; Class Action Waiver
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">PLEASE READ CAREFULLY—THIS SECTION
                    AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT
                    AND TO HAVE A JURY TRIAL.</strong>
                  </p>
                  <p>
                    <strong>Governing Law.</strong> These Terms are governed by the laws of the
                    State of Delaware, United States, without regard to its conflict-of-law
                    rules. The United Nations Convention on Contracts for the International Sale
                    of Goods does not apply.
                  </p>
                  <p>
                    <strong>Informal Resolution.</strong> Before initiating arbitration, you
                    agree to first contact us at{" "}
                    <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                      legal@cookalook.com
                    </a>{" "}
                    and attempt to resolve the dispute informally for at least sixty (60) days.
                  </p>
                  <p>
                    <strong>Binding Arbitration.</strong> Any dispute, claim, or controversy
                    arising out of or relating to these Terms or the Platform that is not
                    resolved informally shall be resolved exclusively by final and binding
                    individual arbitration administered by JAMS under its applicable rules, in
                    the English language, seated in Wilmington, Delaware (or, at your election
                    if you are a consumer, the U.S. county of your residence). Judgment on the
                    award may be entered in any court of competent jurisdiction.
                  </p>
                  <p>
                    <strong>Class Action Waiver.</strong> You and Cook A Look agree that claims
                    may only be brought on an individual basis and not as a plaintiff or class
                    member in any purported class, collective, consolidated, or representative
                    action. The arbitrator may not consolidate claims and may award relief only
                    to the individual party seeking relief.
                  </p>
                  <p>
                    <strong>Jury Trial Waiver.</strong> To the extent any claim proceeds in
                    court (e.g., small-claims actions or to enforce arbitration), each party
                    waives any right to a jury trial.
                  </p>
                  <p>
                    <strong>Exceptions.</strong> Either party may bring an individual action in
                    small-claims court or seek injunctive or equitable relief in a court of
                    competent jurisdiction to protect intellectual property rights.
                  </p>
                  <p>
                    <strong>Opt-Out.</strong> You may opt out of this arbitration agreement by
                    sending written notice to{" "}
                    <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                      legal@cookalook.com
                    </a>{" "}
                    within thirty (30) days of first accepting these Terms.
                  </p>
                  <p>
                    <strong>Time Limit.</strong> Any claim must be filed within one (1) year
                    after it arises, or it is permanently barred, except where prohibited by law.
                  </p>
                </div>
              </section>

              {/* 21. Changes */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">21. Changes to the Terms or Platform</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may modify these Terms at any time. Material changes will be communicated by
                  posting an updated version with a new "Last updated" date and, where
                  appropriate, additional notice (e.g., email or in-app). Changes take effect
                  upon posting unless otherwise stated. Your continued use of the Platform after
                  the effective date constitutes acceptance. We may also modify, suspend, or
                  discontinue any feature of the Platform at any time without liability.
                </p>
              </section>

              {/* 22. International */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">22. International Use &amp; Export</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Platform is controlled and operated from the United States. We make no
                  representation that the Platform is appropriate or available for use in other
                  locations. You are responsible for compliance with all local laws and with
                  applicable U.S. export controls and sanctions, including restrictions on
                  transactions with embargoed jurisdictions and prohibited parties.
                </p>
              </section>

              {/* 23. Misc */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">23. General Provisions</h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Entire Agreement.</strong> These Terms, the Privacy Policy, and any
                    posted policies constitute the entire agreement between you and Cook A Look
                    regarding the Platform and supersede all prior agreements.
                  </p>
                  <p>
                    <strong>Severability.</strong> If any provision is held unenforceable, the
                    remaining provisions remain in full force and effect, and the unenforceable
                    provision shall be modified to the minimum extent necessary to make it
                    enforceable.
                  </p>
                  <p>
                    <strong>No Waiver.</strong> Failure to enforce any provision is not a waiver
                    of that or any other provision.
                  </p>
                  <p>
                    <strong>Assignment.</strong> You may not assign these Terms without our prior
                    written consent. We may assign these Terms freely, including in connection
                    with a merger, acquisition, or sale of assets.
                  </p>
                  <p>
                    <strong>Force Majeure.</strong> We are not liable for any delay or failure
                    caused by events beyond our reasonable control, including acts of God, war,
                    terrorism, civil unrest, labor disputes, internet or utility outages,
                    pandemics, or governmental action.
                  </p>
                  <p>
                    <strong>Relationship.</strong> No agency, partnership, joint venture, or
                    employment relationship is created by these Terms.
                  </p>
                  <p>
                    <strong>Notices.</strong> Legal notices to Cook A Look must be sent to{" "}
                    <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                      legal@cookalook.com
                    </a>
                    . We may provide notices to you via the email associated with your account
                    or by posting to the Platform.
                  </p>
                  <p>
                    <strong>Headings.</strong> Section headings are for convenience only and have
                    no legal effect.
                  </p>
                </div>
              </section>

              {/* 24. Contact */}
              <section>
                <h2 className="font-serif text-2xl font-medium mb-4">24. Contact</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Questions about these Terms? Contact us at{" "}
                  <a href="mailto:legal@cookalook.com" className="text-gold hover:underline">
                    legal@cookalook.com
                  </a>
                  .
                </p>
              </section>

              {/* Disclaimer footer */}
              <section className="border-t border-border pt-6 mt-8">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  This document is provided for informational purposes and does not constitute
                  legal advice. Cook A Look recommends users consult qualified legal counsel in
                  their jurisdiction regarding their specific rights and obligations.
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
