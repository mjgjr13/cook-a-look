import { cn } from "@/lib/utils";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
  type?: "full" | "text" | "icon";
}

/**
 * Cook A Look wordmark.
 * The two O's in "LOOK" are rendered as a perfectly symmetric pair of
 * glasses (inline SVG, sized in em so it scales with the surrounding text).
 */
const CookALookLogo = ({
  className,
  size = "md",
  variant = "dark",
  type = "full",
}: CookALookLogoProps) => {
  const sizeConfig = {
    sm: { text: "text-base", icon: 18 },
    md: { text: "text-base sm:text-lg lg:text-xl", icon: 22 },
    lg: { text: "text-xl lg:text-2xl", icon: 28 },
    xl: { text: "text-2xl lg:text-3xl", icon: 36 },
  };

  const color = variant === "light" ? "#ffffff" : "currentColor";
  const textColorClass =
    variant === "light" ? "text-white" : "text-foreground";

  /**
   * Glasses mark — replaces the "oo" in LOOK.
   * Two mirrored circular lenses, centered bridge, mirrored temple tips.
   * widthEm controls horizontal size (≈ width of two O glyphs).
   */
  const GlassesOO = ({ widthEm = 1.45 }: { widthEm?: number }) => {
    // viewBox: 40 wide × 20 tall. Lenses mirrored around x=20.
    // Lens centers at x=8 and x=32, radius 6.5 → identical geometry.
    return (
      <svg
        viewBox="0 0 40 20"
        aria-hidden="true"
        style={{
          width: `${widthEm}em`,
          height: "auto",
          display: "inline-block",
          verticalAlign: "-0.18em",
          marginInline: "0.04em",
        }}
      >
        {/* Left lens */}
        <circle
          cx="8"
          cy="11"
          r="6.5"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Right lens — mirror of left around x=20 */}
        <circle
          cx="32"
          cy="11"
          r="6.5"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
        />
        {/* Bridge — centered on x=20 */}
        <path
          d="M14.5 10 Q20 6.5 25.5 10"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {/* Temple tips — mirrored */}
        <path
          d="M1.5 9 L-1 7"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M38.5 9 L41 7"
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  // Icon-only: just the glasses unit, sized by px.
  if (type === "icon") {
    const px = sizeConfig[size].icon;
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          textColorClass,
          className,
        )}
        aria-label="Cook A Look"
      >
        <svg
          viewBox="0 0 40 20"
          width={px * 2}
          height={px}
          aria-hidden="true"
        >
          <circle cx="8" cy="11" r="6.5" fill="none" stroke={color} strokeWidth="1.8" />
          <circle cx="32" cy="11" r="6.5" fill="none" stroke={color} strokeWidth="1.8" />
          <path d="M14.5 10 Q20 6.5 25.5 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M1.5 9 L-1 7" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M38.5 9 L41 7" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  // Full wordmark / text — both render the same: COOK A L[oo]K
  // where [oo] is the glasses mark.
  return (
    <span
      className={cn(
        "font-serif font-semibold tracking-[0.16em] sm:tracking-[0.2em] uppercase whitespace-nowrap inline-flex items-center",
        textColorClass,
        sizeConfig[size].text,
        className,
      )}
      aria-label="Cook A Look"
    >
      <span aria-hidden="true">Cook&nbsp;A&nbsp;L</span>
      <GlassesOO />
      <span aria-hidden="true">k</span>
    </span>
  );
};

export default CookALookLogo;
