import * as React from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import type { Value } from "react-phone-number-input";
import { cn } from "@/lib/utils";
import "react-phone-number-input/style.css";

export interface InternationalPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  defaultCountry?: "US" | "GB" | "CN" | "DE" | "FR" | "JP" | "IN" | "AU" | "CA" | "BR";
  className?: string;
}

const InternationalPhoneInput = React.forwardRef<
  HTMLInputElement,
  InternationalPhoneInputProps
>(
  (
    {
      value,
      onChange,
      error,
      placeholder = "Enter phone number",
      disabled = false,
      defaultCountry = "US",
      className,
    },
    ref
  ) => {
    const handleChange = (newValue: Value | undefined) => {
      onChange(newValue || "");
    };

    return (
      <div className={cn("space-y-1", className)}>
        <PhoneInputWithCountry
          international
          countryCallingCodeEditable={false}
          defaultCountry={defaultCountry}
          value={value as Value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "international-phone-input",
            error && "has-error"
          )}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

InternationalPhoneInput.displayName = "InternationalPhoneInput";

export { InternationalPhoneInput };
