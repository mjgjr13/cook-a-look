import { Link } from "react-router-dom";
// Minimal black-and-white line illustrations of the Cook A Look process,
// shown in the homepage hero: choose an advisor → meet → leave feeling better.
// Pure SVG (no image files), so it stays crisp and loads instantly.

const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

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
    {[48, 126].map((x) => (
      <g key={x}>
        <rect x={x} y="26" width="66" height="80" rx="5" {...stroke} strokeWidth={1.5} />
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
    <path d="M 108 22 h 44 a 8 8 0 0 1 8 8 v 14 a 8 8 0 0 1 -8 8 h -26 l -8 8 v -8 h -10 a 8 8 0 0 1 -8 -8 v -14 a 8 8 0 0 1 8 -8 z" {...stroke} strokeWidth={1.5} />
    <circle cx="120" cy="37" r="2" fill="currentColor" />
    <circle cx="130" cy="37" r="2" fill="currentColor" />
    <circle cx="140" cy="37" r="2" fill="currentColor" />
  </svg>
);

const FeelingGreat = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="A happy, confident client">
    <circle cx="120" cy="56" r="22" {...stroke} />
    {/* smile and eyes */}
    <path d="M 110 60 Q 120 70 130 60" {...stroke} />
    <circle cx="112" cy="50" r="1.8" fill="currentColor" />
    <circle cx="128" cy="50" r="1.8" fill="currentColor" />
    {/* shoulders with a jacket lapel */}
    <path d="M 82 132 C 82 78, 158 78, 158 132" {...stroke} />
    <path d="M 120 94 L 111 112 L 120 130 L 129 112 Z" {...stroke} strokeWidth={1.5} />
    {/* sparkles */}
    {[[64, 40], [178, 36], [186, 92]].map(([x, y]) => (
      <path key={`${x}-${y}`} d={`M ${x} ${y - 9} L ${x} ${y + 9} M ${x - 9} ${y} L ${x + 9} ${y}`} {...stroke} strokeWidth={1.5} />
    ))}
  </svg>
);

// Step 1: a chat with the AI Concierge (a hanger in the visitor's message).
const TellUsYourStyle = () => (
  <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="Telling the AI Concierge about your style">
    <rect x="50" y="10" width="140" height="128" rx="10" {...stroke} />
    {/* visitor message with a hanger */}
    <path d="M 92 30 h 80 a 6 6 0 0 1 6 6 v 30 a 6 6 0 0 1 -6 6 h -80 a 6 6 0 0 1 -6 -6 v -30 a 6 6 0 0 1 6 -6 z" {...stroke} strokeWidth={1.5} />
    <path d="M 132 40 a 4 4 0 1 1 4 4 v 4 L 152 60 L 116 60 L 132 48" {...stroke} strokeWidth={1.5} />
    {/* reply */}
    <path d="M 68 84 h 64 a 6 6 0 0 1 6 6 v 20 a 6 6 0 0 1 -6 6 h -64 a 6 6 0 0 1 -6 -6 v -20 a 6 6 0 0 1 6 -6 z" {...stroke} strokeWidth={1.5} />
    <path d="M 74 96 L 122 96 M 74 105 L 108 105" {...stroke} strokeWidth={1.5} />
  </svg>
);

// Points down by default; rotate for right (-90) and left (90).
const Arrow = ({ rotate = 0 }: { rotate?: number }) => (
  <svg viewBox="0 0 24 40" className="h-7 w-5 text-foreground/70" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
    <path d="M 12 2 L 12 36 M 4 28 L 12 37 L 20 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STEPS = [
  { Art: TellUsYourStyle, caption: "Tell us your style", to: "/ai-concierge" },
  { Art: ScreenWithAdvisors, caption: "Find an advisor who fits" },
  { Art: Meeting, caption: "Meet by video or in person" },
  { Art: FeelingGreat, caption: "Leave confident, with a plan" },
];

const Step = ({ i }: { i: number }) => {
  const { Art, caption, to } = STEPS[i];
  const body = (
    <>
      <Art />
      <p className="mt-1.5 text-center text-[11px] sm:text-xs font-medium text-muted-foreground">
        <span className="text-foreground">{i + 1}.</span> {caption}
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

// Clockwise square: 1 → 2 ↓ 3 ← 4
const HowItWorksIllustration = () => (
  <div
    className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-center gap-y-1 text-foreground"
    role="list"
    aria-label="How Cook A Look works"
  >
    <div role="listitem"><Step i={0} /></div>
    <Arrow rotate={-90} />
    <div role="listitem"><Step i={1} /></div>
    <div />
    <div />
    <div className="flex justify-center"><Arrow /></div>
    <div role="listitem"><Step i={3} /></div>
    <Arrow rotate={90} />
    <div role="listitem"><Step i={2} /></div>
  </div>
);

export default HowItWorksIllustration;
