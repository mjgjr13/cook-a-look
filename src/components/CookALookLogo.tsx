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
        viewBox="0 0 72 24"
        className={cn(sizeConfig[size].icon, "w-auto", iconColorClass)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens - larger, closer (angled perspective) */}
        <path d="M1 6 L3 18 Q4 22 10 22 L28 21 Q34 20 35 14 L36 7 Q36 2 30 2 L6 3 Q1 3 1 6 Z" />
        {/* Right lens - smaller, further (angled perspective) */}
        <path d="M42 7 L43 16 Q44 19 48 19 L62 18 Q67 17 67 13 L68 8 Q68 5 63 5 L46 6 Q42 6 42 7 Z" />
        {/* Bridge */}
        <path d="M36 10 Q39 7 42 9" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        {/* Left temple arm */}
        <path d="M1 8 L-5 4" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Right temple arm hint */}
        <path d="M68 9 L72 7" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-semibold tracking-widest uppercase", textColorClass, sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
