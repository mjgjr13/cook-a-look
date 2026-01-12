import { cn } from "@/lib/utils";
import cookALookLogo from "@/assets/cook-a-look-logo-full.png";

interface CookALookLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon-only" | "text-only";
}

const CookALookLogo = ({ className, size = "md", variant = "full" }: CookALookLogoProps) => {
  const sizeConfig = {
    sm: { height: "h-6" },
    md: { height: "h-8 lg:h-10" },
    lg: { height: "h-10 lg:h-12" },
  };

  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={cookALookLogo}
        alt="Cook a Look"
        className={cn(sizeConfig[size].height, "w-auto")}
      />
    </div>
  );
};

export default CookALookLogo;
