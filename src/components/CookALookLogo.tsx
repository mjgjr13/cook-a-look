import { cn } from "@/lib/utils";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CookALookLogo = ({ className, size = "md" }: CookALookLogoProps) => {
  const sizeConfig = {
    sm: { icon: "h-5", text: "text-lg" },
    md: { icon: "h-6 lg:h-7", text: "text-xl lg:text-2xl" },
    lg: { icon: "h-8 lg:h-9", text: "text-2xl lg:text-3xl" },
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Ray-Ban Wayfarer Style Sunglasses - Slight Angle */}
      <svg
        viewBox="0 0 72 28"
        className={cn(sizeConfig[size].icon, "w-auto")}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ transform: "rotate(-5deg)" }}
      >
        {/* Left lens - classic wayfarer trapezoid shape */}
        <path d="M4 8 L6 20 Q7 24 12 24 L24 23 Q28 22 29 18 L30 10 Q30 6 26 5 L10 4 Q5 4 4 8 Z" />
        {/* Right lens - classic wayfarer trapezoid shape */}
        <path d="M42 6 L43 18 Q44 22 49 23 L61 24 Q66 24 67 20 L69 8 Q69 4 64 4 L48 5 Q43 5 42 6 Z" />
        {/* Bridge - curved nose bridge */}
        <path d="M30 12 Q36 8 42 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Left temple arm hint */}
        <path d="M4 10 L1 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Right temple arm hint */}
        <path d="M69 10 L72 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-medium tracking-wide uppercase", sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
