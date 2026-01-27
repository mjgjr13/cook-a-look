import { motion } from "framer-motion";
import { Percent, TrendingUp } from "lucide-react";

interface PlatformFeeStatusProps {
  feePercent: number;
  bookingsThisMonth: number;
}

/**
 * Read-only platform fee status display for advisors.
 * Shows current fee tier and progress toward reduced fee.
 * This is NOT a gamified rewards system - it's purely informational.
 */
const PlatformFeeStatus = ({ feePercent, bookingsThisMonth }: PlatformFeeStatusProps) => {
  const isReducedFee = feePercent <= 10;
  const bookingsRemaining = Math.max(0, 10 - bookingsThisMonth);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/30 border border-border rounded-lg p-4"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-gold/10">
          <Percent className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-1">Platform Fee Status</h3>
          <p className="text-muted-foreground text-sm mb-2">
            Current platform fee: <span className="font-medium text-foreground">{isReducedFee ? "Reduced" : "Standard"}</span>
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Bookings this month: <span className="font-medium text-foreground">{bookingsThisMonth}</span> / 10
            </span>
          </div>

          {/* Status message */}
          <p className="text-xs text-muted-foreground mt-2">
            {isReducedFee ? (
              <span className="text-primary">
                🎉 You've unlocked a reduced platform fee this month!
              </span>
            ) : bookingsRemaining > 0 ? (
              `Complete ${bookingsRemaining} more booking${bookingsRemaining === 1 ? '' : 's'} in ${new Date().toLocaleString('default', { month: 'long' })} to unlock a reduced platform fee.`
            ) : null}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default PlatformFeeStatus;
