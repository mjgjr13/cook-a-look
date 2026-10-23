/*
 * LAWYER REVIEW NEEDED BEFORE LAUNCH.
 * Plain-language draft written from what the code actually does (October 2026).
 * Search this file for "[TODO: Marcel to decide]" for open business decisions.
 *
 * Quebec (Law 25), not yet covered:
 *   - Name a person in charge of protecting personal information and publish
 *     their title and contact details on this page.
 *   - Do a privacy impact assessment before sending data outside Quebec
 *     (Supabase, Stripe, Daily.co, Resend, Anthropic are all outside Canada).
 *   - The AI Concierge's saved style note may count as profiling; Law 25 may
 *     require telling people before it's switched on and letting them opt in.
 *   - Confidentiality incident register and breach-notification process.
 *   - French-language version of this page for Quebec users.
 *
 * Clients outside Canada, not yet covered:
 *   - US states (California CCPA/CPRA, etc.): the earlier draft had a section
 *     on these rights; decide with counsel whether to bring it back.
 *   - EU/UK users would need GDPR wording (legal basis for each use, data
 *     transfer safeguards, possibly an EU/UK representative).
 *   - Illinois BIPA-style wording for advisor ID photos is kept below.
 *
 * Keep the #biometric-data anchor: the advisor consent screen links to it.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";

const CONTACT_EMAIL = "admin@cookalook.com";

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold hover:underline">
    {CONTACT_EMAIL}
  </a>
);

const Todo = ({ children }: { children: ReactNode }) => (
  <span className="text-destructive font-medium">[TODO: Marcel to decide: {children}]</span>
);

const Section = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <h2 className="font-serif text-2xl font-normal mb-4">{title}</h2>
    <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicy = () => {
  const lastUpdated = "October 23, 2026";

  return (
    <Layout>
      <Seo
        title="Privacy Policy | Cook A Look"
        description="What personal information Cook A Look collects, why, who we share it with, how long we keep it, and how to delete it."
        path="/privacy"
      />
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6 lg:px-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-gold font-sans text-sm tracking-[0.18em] uppercase mb-4 text-center">
              Legal
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-normal mb-8 text-center">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-center mb-12">
              Last updated: {lastUpdated}
            </p>

            <div className="max-w-none space-y-10">
              <section className="bg-secondary/50 border border-border p-6">
                <h2 className="font-serif text-2xl font-normal mb-3">The short version</h2>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground leading-relaxed">
                  <li>We collect what we need to run bookings, payments and video sessions.</li>
                  <li>We never see or store your card number. Stripe handles payments.</li>
                  <li>Virtual sessions are recorded, and we ask for your consent before every call.</li>
                  <li>We don't sell your information, and we don't use advertising or analytics trackers.</li>
                  <li>You can clear your AI preferences or delete your account at any time in Account settings.</li>
                </ul>
              </section>

              <Section title="1. Who we are">
                <p>
                  Cook A Look ("we", "us") is a marketplace that connects clients with independent style
                  advisors for video and in-person sessions. We're based in Ontario, Canada, and we follow
                  Canada's privacy law (PIPEDA). This policy works alongside our{" "}
                  <Link to="/terms" className="text-gold hover:underline">Terms of Use</Link>.
                </p>
              </Section>

              <Section title="2. What we collect">
                <p><strong className="text-foreground">Your account.</strong> Your name, email address and
                  password. If you sign in with Google, Google shares your name and email with us. We
                  never see your Google password.</p>
                <p><strong className="text-foreground">Your profile.</strong> A profile photo and phone number
                  if you add them. Advisors also give us a bio, Instagram and portfolio links, portfolio
                  photos, their date of birth (to confirm they're 18 or older), and the places they're
                  willing to meet in person.</p>
                <p><strong className="text-foreground">Bookings.</strong> Session dates and times, the type of
                  session, the meeting place for in-person sessions, what you paid, reviews you leave, and
                  any dispute or refund request.</p>
                <p><strong className="text-foreground">Messages.</strong> Messages you send to your advisor or
                  client about a booking.</p>
                <p><strong className="text-foreground">Video session recordings.</strong> Virtual sessions
                  are recorded (video, audio and any shared screen). Recording starts automatically when
                  someone joins, after everyone has agreed on the consent screen.</p>
                <p><strong className="text-foreground">AI Concierge.</strong> What you type to the Concierge.
                  If you're signed in, it also keeps a short note of style preferences you share (like
                  budget, fit or what you dress for). See section 6.</p>
                <p><strong className="text-foreground">Advisor ID check.</strong> Advisor applicants take a
                  live selfie and a photo of a government ID. See section 7.</p>
                <p><strong className="text-foreground">Waitlists.</strong> If you join a waitlist, your email
                  and the optional name and note you give.</p>
                <p><strong className="text-foreground">Payments.</strong> Stripe collects your card details
                  on its own secure page. We only receive confirmation of the payment and the amount.
                  Advisors give their bank and identity details
                  directly to Stripe to get paid.</p>
              </Section>

              <Section title="3. Why we use it">
                <ul className="list-disc pl-5 space-y-2">
                  <li>To create your account and keep you signed in.</li>
                  <li>To book, run and pay for sessions, and to pay advisors.</li>
                  <li>To send booking confirmations, reminders and review requests by email.</li>
                  <li>To let clients and advisors message each other about a booking.</li>
                  <li>To check that advisors are who they say they are.</li>
                  <li>To keep sessions safe and to resolve disputes (this is what recordings are for).</li>
                  <li>To answer your questions in the AI Concierge and improve its answers.</li>
                </ul>
                <p>We don't sell your information and we don't use it for advertising.</p>
              </Section>

              <Section title="4. Who we share it with">
                <p>
                  We use a small number of service providers. Each one gets only what it needs to do its
                  job:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-foreground">Supabase</strong>: stores our database, files and
                    logins.</li>
                  <li><strong className="text-foreground">Cloudflare</strong>: delivers the website.</li>
                  <li><strong className="text-foreground">Stripe</strong>: takes payments (we send it your
                    email) and pays advisors.</li>
                  <li><strong className="text-foreground">Daily.co</strong>: runs video sessions and stores
                    the recordings. If Daily is unavailable, the call moves to a backup video service
                    (Jitsi, run by Freifunk München in Germany), which doesn't record.</li>
                  <li><strong className="text-foreground">Resend</strong>: sends our emails (your email
                    address, name and booking details).</li>
                  <li><strong className="text-foreground">Anthropic</strong>: the company behind Claude, the
                    AI model that powers the Concierge. See section 6 for exactly what it receives.</li>
                  <li><strong className="text-foreground">Google</strong>: Google sign-in, if you use it, and
                    address search when choosing an in-person meeting place.</li>
                </ul>
                <p>
                  <strong className="text-foreground">Other users.</strong> Your advisor or client sees your
                  name, your messages and the booking details. Advisor profiles and reviews are public.
                </p>
                <p>
                  <strong className="text-foreground">The law.</strong> We may share information if the law
                  requires it, or to protect someone's safety.
                </p>
                <p>
                  These providers store and process information outside Canada, mainly in the United States{" "}
                  <Todo>confirm the region of our Supabase project</Todo>. While it's there, it's subject
                  to local laws, which may let authorities access it.
                </p>
              </Section>

              <Section title="5. How long we keep it">
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-foreground">AI Concierge questions and feedback</strong>: kept
                    for 90 days, then deleted automatically. They're stored without your name or account,
                    and with email addresses and phone numbers removed.</li>
                  <li><strong className="text-foreground">AI preferences</strong> (the Concierge's style
                    note): until you clear them or delete your account.</li>
                  <li><strong className="text-foreground">Advisor ID photos</strong>: deleted automatically
                    within 1 year, within 30 days if an application is turned down, or straight away if the
                    account is deleted.</li>
                  <li><strong className="text-foreground">Video recordings</strong>:{" "}
                    <Todo>how long to keep recordings (for example 90 days, longer during an open
                    dispute); automatic deletion isn't set up yet</Todo>.</li>
                  <li><strong className="text-foreground">Bookings, payments and booking messages</strong>:
                    kept for our records after your account is deleted, with your name and contact details
                    removed. <Todo>how many years to keep these (tax and accounting rules may set a
                    minimum)</Todo>.</li>
                  <li><strong className="text-foreground">Your account and profile</strong>: until you delete
                    your account.</li>
                </ul>
              </Section>

              <Section id="ai-concierge" title="6. The AI Concierge">
                <p>
                  The Concierge is an AI assistant, not a human stylist. When you use it, we send Anthropic
                  your conversation (up to your last 30 messages), your saved style note if you're signed
                  in, and the public profiles of our advisors. We don't send your name or email, unless you
                  type them into the chat. Please don't share sensitive details like health information or
                  addresses. We don't use your chats to train AI models.
                </p>
                <p>
                  If you're signed in, the Concierge keeps a short note of style preferences you share, so
                  it doesn't have to ask again. Only you can see it. You can clear it at any time in{" "}
                  <Link to="/settings#concierge-memory" className="text-gold hover:underline">
                    Account settings → Security → AI preferences
                  </Link>
                  , and it's deleted when you delete your account.
                </p>
                <p>
                  To improve the Concierge, we keep the questions people ask and any thumbs up or down
                  feedback for 90 days, without linking them to anyone's account.
                </p>
              </Section>

              <section
                id="biometric-data"
                className="bg-gold/10 border border-gold/30 p-6 scroll-mt-24"
              >
                <h2 className="font-serif text-2xl font-normal mb-4">7. Advisor ID photos</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    This applies only to people applying to be advisors. Before you take the photos, we ask
                    for your consent on a separate screen.
                  </p>
                  <p>
                    <strong className="text-foreground">What we collect.</strong> A live photo of your face
                    and a photo of a government-issued ID. A person on our team compares them by eye. We
                    don't use facial-recognition software. If that ever changes, we'll update this policy
                    and ask for your consent again first.
                  </p>
                  <p>
                    <strong className="text-foreground">Why.</strong> Only to confirm your identity before
                    approving your application, and to prevent impersonation and fraud.
                  </p>
                  <p>
                    <strong className="text-foreground">How long.</strong> Deleted automatically within 1
                    year of your application, within 30 days if it's turned down, or straight away if you
                    delete your account, whichever comes first. This selfie is separate from your public
                    profile photo.
                  </p>
                  <p>
                    <strong className="text-foreground">Sharing.</strong> We never sell or trade these
                    photos. They're stored by our hosting provider (Supabase) and shared with no one else,
                    unless the law requires it.
                  </p>
                  <p>
                    To see your verification photos, or to have them deleted early, email <Mail />. Deleting
                    them before approval means we can't finish verifying you.
                  </p>
                </div>
              </section>

              <Section id="your-choices" title="8. Deleting your data">
                <p>
                  <strong className="text-foreground">Clear AI preferences.</strong> In{" "}
                  <Link to="/settings#concierge-memory" className="text-gold hover:underline">
                    Account settings → Security
                  </Link>
                  , choose "Clear AI preferences". The Concierge forgets everything it saved about you.
                  Your account and bookings aren't affected.
                </p>
                <p>
                  <strong className="text-foreground">Delete your account.</strong> In Account settings →
                  Security, choose "Delete Account". You'll need to cancel any upcoming sessions first. We
                  then:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>delete your photos, portfolio and ID photos;</li>
                  <li>delete your AI preferences, advisor application and waitlist entries;</li>
                  <li>remove your name, email, bio, links and location from your profile;</li>
                  <li>switch off your login.</li>
                </ul>
                <p>
                  Booking, payment and message records stay for our accounts, with your personal details
                  removed (see section 5).
                </p>
              </Section>

              <Section title="9. Your rights">
                <p>
                  You can ask what personal information we hold about you, ask for a copy, and ask us to
                  correct it. You can also withdraw your consent to optional uses at any time. Most details
                  can be changed in Account settings. For anything else, email <Mail /> and we'll reply
                  within 30 days. We may need to confirm your identity first.
                </p>
                <p>
                  If you're not happy with our answer, you can complain to the Office of the Privacy
                  Commissioner of Canada at{" "}
                  <a href="https://www.priv.gc.ca" className="text-gold hover:underline" target="_blank" rel="noreferrer">
                    priv.gc.ca
                  </a>
                  .
                </p>
              </Section>

              <Section title="10. Cookies and browser storage">
                <p>
                  We don't use advertising or analytics trackers. We only use your browser's storage for
                  what the site needs: keeping you signed in, remembering your settings, and keeping your
                  current Concierge conversation. Clearing it signs you out.
                </p>
              </Section>

              <Section title="11. Security">
                <p>
                  Your information is sent over encrypted connections. Access is limited, so only you can
                  see your own AI preferences, and only our admins can see ID photos. Clients can watch their
                  own session recordings, and our admins can view recordings to resolve disputes. No system
                  is perfectly secure, but if a breach puts you at risk, we'll tell you.
                </p>
              </Section>

              <Section title="12. Age">
                <p>
                  Cook A Look is only for people 18 and older. If we learn that someone under 18 has given
                  us personal information, we'll delete it.
                </p>
              </Section>

              <Section title="13. Changes">
                <p>
                  If we change this policy, we'll post the new version here and update the date at the top.{" "}
                  <Todo>whether to email users about important changes</Todo>
                </p>
              </Section>

              <Section title="14. Contact">
                <p>
                  Questions about your privacy, or a request about your data: email <Mail />.{" "}
                  <Todo>name the person responsible for privacy at Cook A Look</Todo>
                </p>
              </Section>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default PrivacyPolicy;
