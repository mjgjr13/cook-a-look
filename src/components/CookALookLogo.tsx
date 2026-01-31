import { cn } from "@/lib/utils";
import logoFull from "@/assets/cook-a-look-logo-full.png";

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
    sm: { height: "h-5", imgHeight: 20 },
    md: { height: "h-6", imgHeight: 24 },
    lg: { height: "h-8", imgHeight: 32 },
    xl: { height: "h-10", imgHeight: 40 },
  };

  // For light variant, we'll invert the image using CSS filter
  const filterClass = variant === "light" ? "invert brightness-0 invert" : "";

  // Full wordmark using the new logo image
  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={logoFull} 
        alt="Cook a Look" 
        className={cn(
          sizeConfig[size].height,
          "w-auto object-contain",
          filterClass
        )}
        style={{ height: sizeConfig[size].imgHeight }}
      />
    </div>
  );
};

export default CookALookLogo;
