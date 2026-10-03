# Legal/Compliance Drafting Notes — July 2026

**This is not legal advice.** Everything below and in the four deliverables
(biometric consent screen, Terms of Use, Privacy Policy, AI chat disclosure)
is a drafting starting point, researched against public sources as of
July 2026 and written to be directionally correct — not reviewed or
approved by a licensed attorney. Have counsel licensed in your operating
jurisdiction(s) review all of it, especially the arbitration clause and the
BIPA-adjacent language, before relying on it in production. Statutory
citations and case names below are provided so that review can start from
verified sources rather than from scratch.

## Read this first: two findings outside the original ask

**1. The "liveness detection" in the advisor signup flow doesn't detect anything.**
`src/components/LivenessCamera.tsx` shows "Please blink your eyes slowly"
and "Turn your head slightly left, then right," then tells the user
"Liveness verified!" — but the blink/turn/capture sequence is driven by
hardcoded `setTimeout` delays (2.5s, 2.5s, 3s countdown), not real
computer-vision analysis. No facial landmark detection, no motion analysis,
nothing — it just waits, then takes a photo. `BecomeAdvisor.tsx` shows a
toast reading "Liveness verified!" based on this simulated result. This is
a materially false claim to users and advisors about what was actually
verified, independent of any biometric-privacy-law question — it's the
kind of claim the FTC has pursued as deceptive under Section 5 of the FTC
Act. Recommend either implementing real liveness detection or removing the
"liveness verified" language and just calling it what it is: a live photo
capture with a brief instructional sequence, no different than the
"MVP: Skip verification" comment that appears elsewhere in the same file.
**I did not fix this — flagging it since it changes how confidently the
consent screen and privacy policy can describe what's collected.**

**2. The consent screen and Privacy Policy promise a retention/deletion
schedule that no code currently enforces.** `BecomeAdvisor.tsx` creates a
1-year *signed URL* (`createSignedUrl(path, 60*60*24*365)`) for admin
review — that's a URL expiry, not a deletion job. Nothing in
`supabase/functions/` deletes verification photos from storage after a
year, after account deletion, or after an application is denied. BIPA
15(a) requires a *written* retention/destruction policy — which I've now
written into `/privacy#biometric-data` — but the statute's evident intent
is that the schedule is actually followed. Recommend a scheduled job
(Supabase cron / edge function) that deletes `verifications` bucket
objects and clears `selfie_url`/`id_document_url` once the promised window
elapses. Until that exists, the privacy policy is stating a commitment the
system doesn't keep.

## Sources for specific claims made in the drafts

### Biometric consent screen (`src/components/advisor/BiometricConsentScreen.tsx`) and Privacy Policy §3

- **Illinois BIPA, 740 ILCS 14/15(b)**: written notice + written release
  required *before* collecting a biometric identifier, disclosing that
  it's being collected, and the specific purpose and length of term of
  collection/use. — [Justia, 740 ILCS 14](https://law.justia.com/codes/illinois/chapter-740/act-740-ilcs-14/)
- **740 ILCS 14/15(a)**: requires a *written, publicly available* policy
  establishing a retention schedule and destruction guidelines — deletion
  within 3 years of the individual's last interaction, or when the
  purpose is satisfied, whichever is first. This is why I put the
  retention schedule in the public Privacy Policy, not only in the modal.
- **740 ILCS 14/15(c)**: prohibits selling, leasing, trading, or otherwise
  profiting from biometric data — source of the "we will never sell it"
  section.
- **SB 2979 / Public Act 103-0769** (signed Aug. 2, 2024, effective
  immediately): added "electronic signature" to the definition of
  "written release," and capped damages to one recovery per person per
  violation type (not per-scan). Confirmed applied retroactively by the
  Seventh Circuit. — [King & Spalding](https://www.kslaw.com/news-and-insights/illinois-bipa-reform-takes-effect), [Sidley, Apr. 2026](https://datamatters.sidley.com/2026/04/08/seventh-circuit-limits-potential-damages-under-bipa-holds-2024-amendment-applies-retroactively/), [ABA Business Law Today, May 2026](https://www.americanbar.org/groups/business_law/resources/business-law-today/2026-may/7th-circuit-holds-bipa-damages-remedy-applies-retroactively/)
- **740 ILCS 14/20 damages**: $1,000/violation (negligent) or $5,000/violation
  (intentional/reckless) or actual damages if greater, plus attorneys' fees
  and costs, plus injunctive relief. — [Recording Law summary](https://www.recordinglaw.com/us-laws/data-privacy-laws/bipa/)
- **"Photograph" vs. "scan of face geometry"**: BIPA's definition of
  "biometric identifier" *excludes* photographs, and "biometric
  information" excludes information derived from photographs — unless a
  "scan of face geometry" (algorithmic extraction of a numerical
  representation of facial geometry) actually occurs. `Monroy v.
  Shutterfly` (N.D. Ill.) and `Sosa v. Onfido` (N.D. Ill.) both address
  this line; case law requires the defendant's technology to actually
  locate facial landmarks and extract geometry, not just store a photo. —
  [Biometric Update summary](https://www.biometricupdate.com/202407/scope-and-contours-of-bipa-biometric-identifiers-and-information)
  **This is the basis for describing collection as "a photo, human
  reviewed" rather than claiming biometric scanning — have counsel confirm
  this reading before relying on it, since case law is still evolving and
  at least one court (in dicta) suggested the geometry requirement could
  become moot.**
- **Other states with biometric-specific obligations**: Texas CUBI (AG-only
  enforcement, up to $25k/violation, no private right of action), Washington
  RCW 19.375 (notice + consent, AG enforcement) plus the My Health My Data
  Act (private right of action if biometric data is health-linked), and
  Colorado's amended Privacy Act (effective July 2025 — written policy +
  retention schedule + security controls, broader than BIPA in some
  respects). — [Husch Blackwell 2025 tracker](https://www.huschblackwell.com/2025-state-biometric-privacy-law-tracker), [deepidv summary](https://www.deepidv.com/media/articles/us-state-biometric-privacy-laws-2026-compliance-patchwork)
  The consent screen and privacy policy were written to be consistent with
  all of these (written policy, retention schedule, no-sale commitment),
  but I did not build state-specific variants.

### Terms of Use — arbitration/class-action clause (already existed; verified, not rewritten)

- **Federal Arbitration Act + AT&T Mobility LLC v. Concepcion**: arbitration
  clauses with class-action waivers are generally enforceable and preempt
  contrary state law, provided the agreement is validly formed.
- **Conspicuousness requirement**: `Noble v. Samsung Electronics America,
  Inc.` (3d Cir.) — an inconspicuous online arbitration clause has little
  chance of enforcement; current best practice is bold/capitalized headers
  calling out the arbitration and jury-trial waiver "at the time of
  entering the agreement," which the existing §20 already does (bold intro
  line, its own bordered section, opt-out window). I did not find a
  defect here on the conspicuousness point but did not have this reviewed
  by counsel — recommend that before relying on it in litigation. —
  [Bloomberg Law, "Compelling Arbitration in Consumer Class Actions"](https://news.bloomberglaw.com/us-law-week/compelling-arbitration-in-consumer-class-actions-best-practices-for-creating-reasonable-notice-1)

### Terms of Use — UGC / reviews / chat / Section 230 (new, expanded §12)

- **47 U.S.C. § 230**: platforms are generally not the "publisher or
  speaker" of information provided by another user (reviews, chat, profile
  content) — standard basis for the new Section 230 paragraph. This is a
  federal statute with well-established case law; the language added is
  intentionally general rather than citing a specific circuit's test,
  since the platform hasn't been sued yet and there's no live dispute to
  calibrate against.

### Privacy Policy — CCPA/CPRA

- **Notice at Collection is a separate requirement from the Privacy
  Policy itself** — regulators have said pointing to the privacy policy
  isn't sufficient; a notice must appear at or before each collection
  point (e.g., the signup form, the advisor application). **I did not
  implement point-of-collection notices in the signup/application forms
  themselves — the Privacy Policy alone does not satisfy this.** —
  [Cal. Code Regs. tit. 11, § 7012](https://www.law.cornell.edu/regulations/california/11-CCR-7012)
- **Biometric information is "sensitive personal information"** under
  CPRA, giving consumers the right to limit its use — cited generally in
  Privacy Policy §8; exact subsection (commonly cited as Cal. Civ. Code
  § 1798.140(ae)) should be verified against the current codified text
  before citing it publicly.
- **Global Privacy Control (GPC)**: businesses must honor GPC opt-out
  signals as a valid "Do Not Sell/Share" request where technically
  feasible — the Privacy Policy now states we honor it; **no code
  currently detects or processes a GPC signal, so this is another
  policy-promises-what-code-doesn't-do gap** to close before this goes
  live, or the sentence should be removed. — [OneTrust](https://www.onetrust.com/blog/navigating-the-cpras-do-not-sell-or-share-requirement/)

### AI chat disclosure

- **FTC March 2025 staff guidance**: AI used to generate advertising
  content should be disclosed; broader FTC "Operation AI Comply"
  enforcement priorities: don't let a bot present as human, don't
  overstate AI capabilities, ensure outputs aren't misleading
  (hallucination risk = deception risk), don't use rapport with a chatbot
  to collect data beyond what users consented to. — [Fenwick, "FTC Outlines Five Don'ts for AI Chatbots"](https://www.fenwick.com/insights/publications/ftc-outlines-five-donts-for-ai-chatbots)
- **California SB 1001 ("B.O.T. law")**: requires disclosure that a bot
  isn't human when used to incentivize a sale, but by its terms applies
  only to public-facing platforms with 10 million+ monthly US visitors —
  **Cook A Look almost certainly doesn't meet that threshold today, so
  this law likely doesn't apply yet.** The disclosure was added anyway as
  a low-cost, forward-looking best practice, not because the statute
  currently requires it — have counsel confirm visitor-count applicability
  if this becomes a larger platform.
- **New York's AI content-disclosure law** (signed Jan. 2026, effective
  June 2026) is specific to advertising content and is a New York state
  law — noted here as a trend indicator, not incorporated as a compliance
  requirement, since Cook A Look isn't a NY-specific advertiser and the
  "Style Concierge" is a shopping assistant, not an ad.
- **Confirmed via code review**: `supabase/functions/advisor-chat/index.ts`
  calls `ai.gateway.lovable.dev` with model `google/gemini-3-flash-preview`
  — this is genuinely AI-generated content, not a canned/rule-based bot,
  so disclosure is warranted regardless of the SB 1001 threshold question.
  `src/components/booking/BookingChat.tsx` (client↔advisor messaging) has
  no AI/LLM involvement — confirmed by grep, no disclosure needed there.

### Not addressed / explicitly out of scope this pass

- **COPPA** (FTC's amended rule, effective June 23, 2025, compliance
  deadline April 22, 2026, expanding "personal information" to include
  biometric and government-ID identifiers) — not directly relevant since
  the Terms already restrict the platform to users 18+; Privacy Policy §11
  was tightened to reference that age gate consistently rather than
  building out COPPA-specific parental-consent machinery, since the
  platform shouldn't have any users COPPA covers if the age gate holds. —
  [Federal Register, Apr. 22, 2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- **Fee typo fix**: while reading the existing Terms of Use to draft this
  work, found §4 stated the reduced advisor fee as "five percent (5%)"
  after 9 bookings/month — the actual implemented and documented rule
  (`.lovable/memory/features/payments/platform-fee-structure.md`, which
  explicitly says "never '5%'") is 10%. Fixed to 10% in both the Terms of
  Use and the already-existing `BecomeAdvisor.tsx` benefits copy. This
  wasn't part of the request but was a factual misstatement in a legal
  document about advisor earnings, found in the course of this work.

## Before this goes live, in priority order

1. Have a licensed attorney review all four documents, especially the
   arbitration clause and BIPA-adjacent language.
2. Decide whether to fix the fake liveness detection or remove the
   "verified" language — the current state makes a claim to users that
   isn't true.
3. Build the actual deletion job for verification photos, or soften the
   retention-schedule language until one exists.
4. Either implement GPC signal handling or remove the sentence claiming
   we honor it.
5. Add point-of-collection notices (not just the general Privacy Policy)
   at the signup and advisor-application forms per CPRA.
6. Verify the AI Gateway/Google's actual data-retention and model-training
   practices for chat content before relying on the "not persisted, not
   used to train" claim in Privacy Policy §9 — that claim was written
   based on how our own edge function is written (it streams through
   without storing chat history server-side), not on Lovable's or
   Google's own data-handling terms, which I did not have access to
   verify.
