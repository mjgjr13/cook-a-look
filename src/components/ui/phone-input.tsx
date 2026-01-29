import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/phone-utils";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showIcon?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, error, showIcon = true, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      onChange(formatted);
    };

    const isValid = !value || isValidPhoneNumber(value);

    return (
      <div className="relative">
        {showIcon && (
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={handleChange}
          placeholder="(555) 555-5555"
          className={cn(
            showIcon && "pl-10",
            error || (!isValid && value) ? "border-destructive" : "",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
