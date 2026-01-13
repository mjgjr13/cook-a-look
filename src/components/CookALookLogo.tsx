import { cn } from "@/lib/utils";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "dark" | "light";
  type?: "full" | "text" | "icon";
}

const CookALookLogo = ({ 
  className, 
  size = "md", 
  variant = "dark",
  type = "full"
}: CookALookLogoProps) => {
  const sizeConfig = {
    sm: { height: "h-5", text: "text-base", iconSize: 14, spacing: "gap-1.5" },
    md: { height: "h-6", text: "text-lg lg:text-xl", iconSize: 18, spacing: "gap-2" },
    lg: { height: "h-8", text: "text-xl lg:text-2xl", iconSize: 24, spacing: "gap-2.5" },
    xl: { height: "h-10", text: "text-2xl lg:text-3xl", iconSize: 32, spacing: "gap-3" },
  };

  const fillColor = variant === "light" ? "#ffffff" : "#000000";
  const textColorClass = variant === "light" ? "text-white" : "text-foreground";

  // Sunglasses SVG - refined Wayfarer style, slightly angled left
  const SunglassesIcon = ({ width = 40, height = 16 }: { width?: number; height?: number }) => (
    <svg
      viewBox="0 0 40 16"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="inline-block"
      style={{ verticalAlign: 'baseline', marginBottom: '-0.05em' }}
    >
      {/* Left lens - rounder Wayfarer shape, slightly angled */}
      <path
        d="M2 6.5 C2 3 4.5 1.5 8 1.5 L11 1.5 C14.5 1.5 17 3 17 6.5 L17 9.5 C17 13 14.5 14.5 11 14.5 L8 14.5 C4.5 14.5 2 13 2 9.5 Z"
        fill={fillColor}
        transform="rotate(-2 9.5 8)"
      />
      {/* Right lens - rounder Wayfarer shape, slightly angled */}
      <path
        d="M23 6.5 C23 3 25.5 1.5 29 1.5 L32 1.5 C35.5 1.5 38 3 38 6.5 L38 9.5 C38 13 35.5 14.5 32 14.5 L29 14.5 C25.5 14.5 23 13 23 9.5 Z"
        fill={fillColor}
        transform="rotate(-2 30.5 8)"
      />
      {/* Bridge - thick, curved */}
      <path
        d="M17 7 Q20 4 23 7"
        fill="none"
        stroke={fillColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Left temple hint */}
      <path
        d="M2 5 L-1 3"
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right temple hint */}
      <path
        d="M38 5 L41 3"
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  // Icon only version
  if (type === "icon") {
    const iconSizes = {
      sm: { w: 28, h: 12 },
      md: { w: 36, h: 14 },
      lg: { w: 48, h: 18 },
      xl: { w: 64, h: 24 },
    };
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <SunglassesIcon width={iconSizes[size].w} height={iconSizes[size].h} />
      </div>
    );
  }

  // Text only version
  if (type === "text") {
    return (
      <div className={cn("flex items-center", sizeConfig[size].spacing, className)}>
        <span className={cn(
          "font-serif font-semibold tracking-[0.2em] uppercase",
          textColorClass,
          sizeConfig[size].text
        )}>
          Cook a Look
        </span>
      </div>
    );
  }

  // Full wordmark with integrated sunglasses as "OO" in LOOK
  const glassesWidth = {
    sm: 22,
    md: 28,
    lg: 36,
    xl: 46,
  };
  
  const glassesHeight = {
    sm: 9,
    md: 11,
    lg: 14,
    xl: 18,
  };

  return (
    <div className={cn("flex items-center", sizeConfig[size].spacing, className)}>
      <span className={cn(
        "font-serif font-semibold tracking-[0.15em] uppercase whitespace-nowrap",
        textColorClass,
        sizeConfig[size].text
      )}>
        <span className="tracking-[0.2em]">Cook a L</span>
        <span className="inline-flex items-baseline" style={{ letterSpacing: '0.02em' }}>
          <SunglassesIcon 
            width={glassesWidth[size]} 
            height={glassesHeight[size]} 
          />
        </span>
        <span className="tracking-[0.2em]">k</span>
      </span>
    </div>
  );
};

export default CookALookLogo;
