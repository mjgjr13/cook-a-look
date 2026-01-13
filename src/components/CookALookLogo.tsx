import { cn } from "@/lib/utils";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

const CookALookLogo = ({ className, size = "md", variant = "dark" }: CookALookLogoProps) => {
  const sizeConfig = {
    sm: { icon: "h-5", text: "text-lg" },
    md: { icon: "h-6 lg:h-7", text: "text-xl lg:text-2xl" },
    lg: { icon: "h-8 lg:h-9", text: "text-2xl lg:text-3xl" },
  };

  const textColorClass = variant === "light" ? "text-white" : "text-foreground";

  const iconColorClass = variant === "light" ? "fill-white" : "fill-black";
  const strokeColor = variant === "light" ? "white" : "black";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Wayfarer Sunglasses - Rounder, smaller, thicker bridge */}
      <svg
        viewBox="0 0 68 20"
        className={cn(sizeConfig[size].icon, "w-auto", iconColorClass)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens - rounder shape */}
        <path d="M3 8 Q3 3 8 3 L22 3 Q27 3 27 8 L27 12 Q27 17 22 17 L8 17 Q3 17 3 12 Z" />
        {/* Right lens - rounder shape */}
        <path d="M41 8 Q41 3 46 3 L60 3 Q65 3 65 8 L65 12 Q65 17 60 17 L46 17 Q41 17 41 12 Z" />
        {/* Bridge - thicker */}
        <path d="M27 9 Q34 5 41 9" fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinecap="round" />
        {/* Left temple arm */}
        <path d="M3 7 L-2 4" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right temple arm */}
        <path d="M65 7 L70 4" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-semibold tracking-widest uppercase", textColorClass, sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
