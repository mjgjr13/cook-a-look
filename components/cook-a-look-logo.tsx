"use client"

import { cn } from "@/lib/utils"

interface CookALookLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "dark" | "light"
  type?: "full" | "text" | "icon"
}

export function CookALookLogo({ 
  className, 
  size = "md", 
  variant = "dark",
  type = "full"
}: CookALookLogoProps) {
  const sizeConfig = {
    sm: { height: "h-4", text: "text-base", iconW: 28, iconH: 12, spacing: "gap-2" },
    md: { height: "h-5", text: "text-lg lg:text-xl", iconW: 36, iconH: 14, spacing: "gap-2.5" },
    lg: { height: "h-6", text: "text-xl lg:text-2xl", iconW: 48, iconH: 18, spacing: "gap-3" },
    xl: { height: "h-8", text: "text-2xl lg:text-3xl", iconW: 64, iconH: 24, spacing: "gap-3.5" },
  }

  const fillColor = variant === "light" ? "#ffffff" : "#000000"
  const textColorClass = variant === "light" ? "text-white" : "text-foreground"

  const SunglassesIcon = ({ width = 40, height = 16 }: { width?: number; height?: number }) => (
    <svg
      viewBox="0 0 40 16"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path
        d="M2 6.5 C2 3 4.5 1.5 8 1.5 L11 1.5 C14.5 1.5 17 3 17 6.5 L17 9.5 C17 13 14.5 14.5 11 14.5 L8 14.5 C4.5 14.5 2 13 2 9.5 Z"
        fill={fillColor}
        transform="rotate(-2 9.5 8)"
      />
      <path
        d="M23 6.5 C23 3 25.5 1.5 29 1.5 L32 1.5 C35.5 1.5 38 3 38 6.5 L38 9.5 C38 13 35.5 14.5 32 14.5 L29 14.5 C25.5 14.5 23 13 23 9.5 Z"
        fill={fillColor}
        transform="rotate(-2 30.5 8)"
      />
      <path
        d="M17 7 Q20 4 23 7"
        fill="none"
        stroke={fillColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M2 5 L-1 3"
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M38 5 L41 3"
        fill="none"
        stroke={fillColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )

  if (type === "icon") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <SunglassesIcon 
          width={sizeConfig[size].iconW} 
          height={sizeConfig[size].iconH} 
        />
      </div>
    )
  }

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
    )
  }

  return (
    <div className={cn("flex items-center", sizeConfig[size].spacing, className)}>
      <SunglassesIcon 
        width={sizeConfig[size].iconW} 
        height={sizeConfig[size].iconH} 
      />
      <span className={cn(
        "font-serif font-semibold tracking-[0.2em] uppercase",
        textColorClass,
        sizeConfig[size].text
      )}>
        Cook a Look
      </span>
    </div>
  )
}

export default CookALookLogo
