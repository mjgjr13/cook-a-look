import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Info } from "lucide-react";

interface PricingInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee

const PricingInput = ({ value, onChange, error }: PricingInputProps) => {
  const numericValue = parseFloat(value) || 0;
  const platformFee = numericValue * PLATFORM_FEE_PERCENTAGE;
  const yourPayout = numericValue - platformFee;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="price">Your Session Rate *</Label>
        <p className="text-sm text-muted-foreground">
          Set the total price clients will pay per session. You can adjust this anytime.
        </p>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="price"
            type="number"
            min="25"
            max="1000"
            step="5"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="100"
            className={`pl-10 ${error ? "border-destructive" : ""}`}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {numericValue > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>Pricing breakdown</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client pays:</span>
              <span className="font-medium">${numericValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (15%):</span>
              <span className="text-destructive">-${platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-medium">Your payout:</span>
              <span className="font-semibold text-gold">${yourPayout.toFixed(2)}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground italic">
            Payouts are released 48 hours after successful sessions.
          </p>
        </div>
      )}
    </div>
  );
};

export default PricingInput;
