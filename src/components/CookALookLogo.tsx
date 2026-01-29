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
    sm: { iconSize: "h-6 w-6", text: "text-base", spacing: "gap-2" },
    md: { iconSize: "h-8 w-8", text: "text-lg lg:text-xl", spacing: "gap-2.5" },
    lg: { iconSize: "h-10 w-10", text: "text-xl lg:text-2xl", spacing: "gap-3" },
    xl: { iconSize: "h-12 w-12", text: "text-2xl lg:text-3xl", spacing: "gap-3.5" },
  };

  const textColorClass = variant === "light" ? "text-white" : "text-foreground";
  const filterClass = variant === "light" ? "invert brightness-0" : "";

  // Icon only version
  if (type === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <img 
          src="/images/cook-a-look-logo-icon.png" 
          alt="Cook a Look" 
          className={cn(sizeConfig[size].iconSize, "object-contain", filterClass)}
        />
      </div>
    );
  }

  // Text only version
  if (type === "text") {
    return (
      <div className={cn("flex items-center", className)}>
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

  // Full wordmark: icon + text
  return (
    <div className={cn("flex items-center", sizeConfig[size].spacing, className)}>
      <img 
        src="/images/cook-a-look-logo-icon.png" 
        alt="" 
        className={cn(sizeConfig[size].iconSize, "object-contain", filterClass)}
        aria-hidden="true"
      />
      <span className={cn(
        "font-serif font-semibold tracking-[0.2em] uppercase",
        textColorClass,
        sizeConfig[size].text
      )}>
        Cook a Look
      </span>
    </div>
  );
};

export default CookALookLogo;
