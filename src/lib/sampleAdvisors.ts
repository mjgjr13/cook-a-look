/**
 * Sample ("demo") advisor profiles.
 *
 * These profiles exist to show visitors what a great Cook A Look profile looks
 * like while the first real advisors are onboarded. They must never mislead
 * customers, so anywhere an advisor is shown:
 *   - a "Sample profile" label is displayed,
 *   - no rating, review count, or "verified" badge is shown,
 *   - booking opens the waitlist form instead of checkout.
 *
 * A profile is a sample if the DB flag `profiles.is_demo` is true OR its id is
 * listed below. The id list is a fallback until migration
 * 20261003000000 (which sets is_demo and the polished copy in the DB) has been
 * applied via Lovable; after that it is harmless and can be removed.
 *
 * Prices are intentionally NOT overridden - rates always come from the DB.
 */

export interface SampleAdvisorContent {
  full_name: string;
  specialty: string;
  bio: string;
  personal_philosophy: string;
  experience_years: number;
  style_tags: string[];
  target_demographics: string[];
}

export const SAMPLE_ADVISOR_CONTENT: Record<string, SampleAdvisorContent> = {
  // Previously "Johnny Test"
  "d5717c49-9c09-49d5-b2ee-34b138f6be04": {
    full_name: "James Whitaker",
    specialty: "Menswear & Tailoring",
    bio: "Menswear stylist focused on tailoring, fit, and building a wardrobe that works from the office to the weekend.",
    personal_philosophy:
      "Great style starts with fit. In our session I'll look at what you already own, show you what to keep, what to tailor, and what to add - so getting dressed takes five minutes and you look sharp every time. I specialize in suiting, smart-casual for modern offices, and event dressing for weddings and black-tie.",
    experience_years: 8,
    style_tags: ["Tailoring", "Business", "Smart Casual", "Formal Events"],
    target_demographics: ["Men", "Professionals"],
  },
  // Previously "Jane Test"
  "efab14d9-20c3-4b5e-bb7b-38c8c9a3d548": {
    full_name: "Maya Ellison",
    specialty: "Womenswear & Menswear",
    bio: "New York stylist helping clients define a signature look with pieces they'll actually wear.",
    personal_philosophy:
      "I believe your wardrobe should feel like you on your best day. Together we'll pin down your style words, sort what's working in your closet, and put together a short, realistic shopping list. I love mixing classic staples with one or two statement pieces, and I work with every budget.",
    experience_years: 5,
    style_tags: ["Everyday Style", "Wardrobe Edit", "Smart Casual", "Date Night"],
    target_demographics: ["Women", "Men"],
  },
  // Previously "Alice Test"
  "e7087720-24b1-4a9d-a750-67da5dbeaceb": {
    full_name: "Diane Holloway",
    specialty: "Executive & Workwear",
    bio: "Executive image consultant helping leaders dress with confidence for boardrooms, conferences, and on-camera moments.",
    personal_philosophy:
      "What you wear speaks before you do. I help professionals build polished, comfortable workwear that fits their role and their personality - from a capsule for a new position to a look for a keynote or video interview. Expect practical advice, honest feedback, and a plan you can follow.",
    experience_years: 15,
    style_tags: ["Workwear", "Executive Presence", "Capsule Wardrobe", "On-Camera"],
    target_demographics: ["Women", "Professionals"],
  },
  // Previously "Chris Test"
  "50ed9a7f-d7f0-447c-9ec6-b55ec9b6d10f": {
    full_name: "Marcus Reed",
    specialty: "Business Attire",
    bio: "Tokyo-based stylist specializing in modern business attire and travel-ready wardrobes for busy professionals.",
    personal_philosophy:
      "Your clothes should work as hard as you do. I focus on versatile, well-fitted pieces that mix and match, pack easily, and look right in any city. In our session we'll build outfits around your schedule and make a plan for the few pieces that will make the biggest difference.",
    experience_years: 10,
    style_tags: ["Business", "Travel Wardrobe", "Tailoring", "Minimalist"],
    target_demographics: ["Men", "Professionals"],
  },
};

export const SAMPLE_ADVISOR_IDS = Object.keys(SAMPLE_ADVISOR_CONTENT);

export const isSampleAdvisor = (advisor: { id?: string | null; is_demo?: boolean | null } | null | undefined): boolean =>
  !!advisor && (advisor.is_demo === true || (!!advisor.id && SAMPLE_ADVISOR_IDS.includes(advisor.id)));

/**
 * Returns the advisor with polished sample copy applied (if it's one of the
 * known sample profiles) and with rating/review/verified data removed for any
 * sample, so it can never be displayed as real social proof.
 */
export function withSampleContent<
  T extends {
    id: string;
    is_demo?: boolean | null;
    rating?: number | null;
    review_count?: number | null;
    verified?: boolean | null;
    instagram_url?: string | null;
    portfolio_url?: string | null;
  },
>(advisor: T): T & { isSample: boolean } {
  if (!isSampleAdvisor(advisor)) return { ...advisor, isSample: false };
  const content = SAMPLE_ADVISOR_CONTENT[advisor.id];
  return {
    ...advisor,
    ...(content ?? {}),
    rating: null,
    review_count: 0,
    verified: false,
    instagram_url: null,
    portfolio_url: null,
    isSample: true,
  };
}

/**
 * Sample advisors that can be booked end to end for testing, while Stripe is in
 * TEST mode only (create-checkout enforces the test-mode check server-side).
 * Must match TEST_BOOKABLE_SAMPLE_ADVISOR_IDS in supabase/functions/create-checkout.
 */
export const TEST_BOOKABLE_SAMPLE_ADVISOR_IDS = ["d5717c49-9c09-49d5-b2ee-34b138f6be04"]; // James Whitaker

const TEST_BOOKING_KEY = "cal_test_booking";

/**
 * Test booking mode: visit any page with ?test-booking=1 to turn it on for this
 * browser tab (?test-booking=0 turns it off). Public visitors never see it.
 */
export const syncTestBookingMode = (searchParams: URLSearchParams): boolean => {
  try {
    const param = searchParams.get("test-booking");
    if (param === "1") sessionStorage.setItem(TEST_BOOKING_KEY, "1");
    if (param === "0") sessionStorage.removeItem(TEST_BOOKING_KEY);
    return sessionStorage.getItem(TEST_BOOKING_KEY) === "1";
  } catch {
    return searchParams.get("test-booking") === "1";
  }
};
