import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, CheckCircle, Info } from "lucide-react";

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
            max="100000"
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
            <span>Earnings breakdown</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client pays:</span>
              <span className="font-medium">${numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (15%):</span>
              <span className="text-muted-foreground">-${platformFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="font-medium">Your earnings:</span>
              </div>
              <span className="font-bold text-lg text-primary">${yourPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground italic">
            Payouts are released 48 hours after successful sessions. Complete 10+ bookings monthly to unlock reduced 5% fee!
          </p>
        </div>
      )}
    </div>
  );
};

export default PricingInput;
