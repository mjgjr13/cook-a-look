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

const Arrow = () => (
  <svg viewBox="0 0 24 40" className="h-7 w-5 text-foreground/70" aria-hidden="true">
    <path d="M 12 2 L 12 36 M 4 28 L 12 37 L 20 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STEPS = [
  { Art: ScreenWithAdvisors, caption: "Find an advisor who fits your style" },
  { Art: Meeting, caption: "Meet by video or in person" },
  { Art: FeelingGreat, caption: "Leave confident, with a plan" },
];

const HowItWorksIllustration = () => (
  <ol className="mx-auto flex w-full max-w-[13rem] sm:max-w-[14rem] flex-col items-center text-foreground" aria-label="How Cook A Look works">
    {STEPS.map(({ Art, caption }, i) => (
      <li key={caption} className="flex w-full flex-col items-center">
        <div className="w-full border border-border bg-card px-4 pt-3 pb-2.5">
          <Art />
          <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
            <span className="text-foreground">{i + 1}.</span> {caption}
          </p>
        </div>
        {i < STEPS.length - 1 && <Arrow />}
      </li>
    ))}
  </ol>
);

export default HowItWorksIllustration;
