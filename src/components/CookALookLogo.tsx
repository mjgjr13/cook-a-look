import { cn } from "@/lib/utils";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CookALookLogo = ({ className, size = "md" }: CookALookLogoProps) => {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8 lg:h-10",
    lg: "h-12 lg:h-14",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Sunglasses Icon */}
      <svg
        viewBox="0 0 54 24"
        className={cn(sizeClasses[size], "w-auto")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left lens */}
        <ellipse cx="12" cy="12" rx="10" ry="7" />
        {/* Right lens */}
        <ellipse cx="42" cy="12" rx="10" ry="7" />
        {/* Bridge */}
        <path d="M22 12 C25 8, 29 8, 32 12" />
        {/* Left temple */}
        <line x1="2" y1="8" x2="0" y2="4" />
        {/* Right temple */}
        <line x1="52" y1="8" x2="54" y2="4" />
      </svg>

      {/* Text Logo */}
      <span className="font-serif text-xl lg:text-2xl font-medium tracking-wide uppercase">
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
