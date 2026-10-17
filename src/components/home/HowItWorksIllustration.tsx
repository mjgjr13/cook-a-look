import { Link } from "react-router-dom";
import { REVIEWS_PAGE_PATH } from "@/lib/featureFlags";
// Minimal line illustrations of the Cook A Look process, shown in the
// homepage hero: tell us your style → find an advisor → meet → leave with a plan.
// Black line work with one burgundy accent per scene (the brand "gold" token).
// Pure SVG (no image files), so it stays crisp and loads instantly.

const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const ACCENT = "hsl(var(--gold))";
const ACCENT_TINT = "hsl(var(--gold) / 0.12)";
const accent = { ...stroke, stroke: ACCENT };

// Default "no photo" avatar: grey disc with a lighter head-and-shoulders silhouette.
const Avatar = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#d4d4d4" />
    <circle cx={cx} cy={cy - r * 0.22} r={r * 0.36} fill="#f2f2f2" />
    <path d={`M ${cx - r * 0.62} ${cy + r * 0.72} a ${r * 0.62} ${r * 0.5} 0 0 1 ${r * 1.24} 0 Z`} fill="#f2f2f2" />
  </g>
);

const ScreenWithAdvisors = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="A computer screen showing two advisor profiles">
    {/* monitor */}
    <rect x="30" y="10" width="180" height="112" rx="8" {...stroke} />
    <path d="M 104 122 L 98 138 M 136 122 L 142 138 M 86 140 L 154 140" {...stroke} />
    {/* two advisor cards */}
    {[48, 126].map((x, i) => (
      <g key={x}>
        <rect x={x} y="26" width="66" height="80" rx="5" {...(i === 0 ? accent : stroke)} strokeWidth={i === 0 ? 2 : 1.5} fill={i === 0 ? ACCENT_TINT : "none"} />
        <Avatar cx={x + 33} cy={54} r={18} />
        <path d={`M ${x + 14} 84 L ${x + 52} 84 M ${x + 20} 94 L ${x + 46} 94`} {...stroke} strokeWidth={1.5} />
      </g>
    ))}
  </svg>
);

const Meeting = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="A client and an advisor meeting">
    {/* client (left) */}
    <circle cx="70" cy="58" r="17" {...stroke} />
    <path d="M 40 118 C 40 72, 100 72, 100 118" {...stroke} />
    {/* advisor (right) */}
    <circle cx="170" cy="58" r="17" {...stroke} />
    <path d="M 140 118 C 140 72, 200 72, 200 118" {...stroke} />
    {/* table */}
    <path d="M 28 120 L 212 120" {...stroke} />
    {/* speech bubble from advisor */}
    <path d="M 104 12 h 32 a 8 8 0 0 1 8 8 v 12 a 8 8 0 0 1 -8 8 h -10 l -6 8 l -6 -8 h -10 a 8 8 0 0 1 -8 -8 v -12 a 8 8 0 0 1 8 -8 z" {...accent} strokeWidth={1.5} fill={ACCENT_TINT} />
    <circle cx="110" cy="26" r="2" fill={ACCENT} />
    <circle cx="120" cy="26" r="2" fill={ACCENT} />
    <circle cx="130" cy="26" r="2" fill={ACCENT} />
  </svg>
);

// Step 4: a full-length mirror showing a sharply dressed client, next to
// their styling plan with every item ticked.
const LeaveWithAPlan = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="A client in a new outfit in the mirror, next to a ticked-off style plan">
    {/* arched mirror on a stand */}
    <path d="M 62 136 L 62 50 A 36 36 0 0 1 134 50 L 134 136 Z" {...stroke} fill={ACCENT_TINT} />
    <path d="M 54 140 L 142 140" {...stroke} />
    {/* reflection: head, tailored jacket with lapels and a pocket square */}
    <circle cx="98" cy="50" r="10" {...stroke} />
    <path d="M 74 124 C 74 84, 122 84, 122 124" {...stroke} />
    <path d="M 89 87 L 98 106 L 107 87" {...stroke} strokeWidth={1.5} />
    <path d="M 98 106 L 98 124" {...stroke} strokeWidth={1.5} />
    <path d="M 107 100 L 115 100 L 111 106 Z" fill={ACCENT} />
    {/* the plan */}
    <rect x="152" y="46" width="62" height="76" rx="6" {...stroke} />
    {[64, 84, 104].map((y) => (
      <g key={y}>
        <path d={`M 161 ${y} L 165 ${y + 4} L 172 ${y - 4}`} {...accent} />
        <path d={`M 180 ${y} L 205 ${y}`} {...stroke} strokeWidth={1.5} />
      </g>
    ))}
    {/* a small sparkle */}
    <path d="M 46 28 L 46 44 M 38 36 L 54 36" {...accent} strokeWidth={1.5} />
  </svg>
);

// Step 1: a chat with the AI Concierge (a hanger in the visitor's message).
const TellUsYourStyle = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="Telling the AI Concierge about your style">
    <rect x="50" y="10" width="140" height="128" rx="10" {...stroke} />
    {/* visitor message with a hanger */}
    <path d="M 92 30 h 80 a 6 6 0 0 1 6 6 v 30 a 6 6 0 0 1 -6 6 h -80 a 6 6 0 0 1 -6 -6 v -30 a 6 6 0 0 1 6 -6 z" {...stroke} strokeWidth={1.5} fill={ACCENT_TINT} />
    <path d="M 132 40 a 4 4 0 1 1 4 4 v 4 L 152 60 L 116 60 L 132 48" {...accent} strokeWidth={1.75} />
    {/* reply */}
    <path d="M 68 84 h 64 a 6 6 0 0 1 6 6 v 20 a 6 6 0 0 1 -6 6 h -64 a 6 6 0 0 1 -6 -6 v -20 a 6 6 0 0 1 6 -6 z" {...stroke} strokeWidth={1.5} />
    <path d="M 74 96 L 122 96 M 74 105 L 108 105" {...stroke} strokeWidth={1.5} />
  </svg>
);

const STEPS: { Art: () => JSX.Element; caption: string; to?: string }[] = [
  { Art: TellUsYourStyle, caption: "Tell us your style", to: "/ai-concierge" },
  { Art: ScreenWithAdvisors, caption: "Find an advisor who fits", to: "/advisors" },
  { Art: Meeting, caption: "Meet by video or in person" },
  // Links to reviews/testimonials once that page exists (see featureFlags).
  { Art: LeaveWithAPlan, caption: "Leave confident, with a plan", to: REVIEWS_PAGE_PATH ?? undefined },
];

const Step = ({ i }: { i: number }) => {
  const { Art, caption, to } = STEPS[i];
  const body = (
    <>
      <Art />
      <p className="mt-1.5 text-center text-[11px] sm:text-xs font-medium text-muted-foreground">
        <span className="text-gold font-semibold">{i + 1}.</span> {caption}
        {to && <span className="text-foreground"> →</span>}
      </p>
    </>
  );
  const cls = "block h-full border border-border bg-card px-3 pt-2.5 pb-2";
  return to ? (
    <Link to={to} className={`${cls} transition-colors hover:border-foreground`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

// 2x2 grid in reading order: 1 2 / 3 4
const HowItWorksIllustration = () => (
  <ol className="mx-auto grid w-full max-w-md lg:max-w-xl grid-cols-2 gap-3 sm:gap-4 text-foreground" aria-label="How Cook A Look works">
    {STEPS.map((step, i) => (
      <li key={step.caption}>
        <Step i={i} />
      </li>
    ))}
  </ol>
);

export default HowItWorksIllustration;
