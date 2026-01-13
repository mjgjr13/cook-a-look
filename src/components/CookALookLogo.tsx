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
    <div className={cn("flex items-center gap-3", className)}>
      {/* Wayfarer Sunglasses - Angled left */}
      <svg
        viewBox="0 0 80 24"
        className={cn(sizeConfig[size].icon, "w-auto", iconColorClass)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens */}
        <path d="M2 6 L3 17 Q4 21 9 21 L26 21 Q31 20 32 15 L33 7 Q33 3 28 3 L7 3 Q2 3 2 6 Z" />
        {/* Right lens */}
        <path d="M47 6 L48 17 Q49 21 54 21 L71 21 Q76 20 77 15 L78 7 Q78 3 73 3 L52 3 Q47 3 47 6 Z" />
        {/* Bridge */}
        <path d="M33 10 Q40 6 47 10" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Left temple arm */}
        <path d="M2 8 L-4 5" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right temple arm */}
        <path d="M78 8 L84 5" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-semibold tracking-widest uppercase", textColorClass, sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
