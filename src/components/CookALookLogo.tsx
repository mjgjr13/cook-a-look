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

  const colorClass = variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className={cn("flex items-center gap-2.5", colorClass, className)}>
      {/* Ray-Ban Wayfarer Style Sunglasses - Angled Left Perspective */}
      <svg
        viewBox="0 0 80 26"
        className={cn(sizeConfig[size].icon, "w-auto")}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens - larger, closer (perspective looking left) */}
        <path d="M2 7 L4 19 Q5 23 10 23 L26 22 Q31 21 32 16 L33 9 Q33 5 28 4 L8 5 Q3 5 2 7 Z" />
        {/* Right lens - smaller, further away (perspective) */}
        <path d="M40 8 L41 17 Q42 20 46 20 L58 19 Q62 18 62 14 L63 9 Q63 6 59 6 L44 7 Q40 7 40 8 Z" />
        {/* Bridge - curved nose bridge */}
        <path d="M33 12 Q37 9 40 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Left temple arm - extending left */}
        <path d="M2 9 L-4 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {/* Right temple arm hint */}
        <path d="M63 10 L68 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-medium tracking-wide uppercase", sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
