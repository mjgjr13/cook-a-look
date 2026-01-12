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
      {/* Wayfarer Sunglasses Icon */}
      <svg
        viewBox="0 0 64 24"
        className={cn(sizeConfig[size].icon, "w-auto")}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens - wayfarer shape */}
        <path d="M2 6 L2 18 Q2 22 6 22 L22 22 Q26 22 27 18 L28 12 L27 6 Q26 2 22 2 L6 2 Q2 2 2 6 Z" />
        {/* Right lens - wayfarer shape */}
        <path d="M36 6 L36 18 Q36 22 40 22 L56 22 Q60 22 61 18 L62 12 L61 6 Q60 2 56 2 L40 2 Q36 2 36 6 Z" />
        {/* Bridge */}
        <path d="M28 10 Q32 7 36 10" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* Text Logo */}
      <span className={cn("font-serif font-medium tracking-wide uppercase", sizeConfig[size].text)}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
