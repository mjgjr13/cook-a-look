import { useState, useEffect } from "react";
import { Percent, CheckCircle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface AdvisorFeeProgressCardProps {
  advisorProfileId: string;
}

interface MonthlyStats {
  completed_bookings: number;
  reduced_fee_unlocked: boolean;
  bookings_until_reduced: number;
}

const AdvisorFeeProgressCard = ({ advisorProfileId }: AdvisorFeeProgressCardProps) => {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const threshold = 9; // Bookings needed before reduced fee kicks in

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_advisor_monthly_stats", {
        advisor_profile_id: advisorProfileId,
      });

      if (error) {
        console.error("Error fetching advisor stats:", error);
      } else if (data && data.length > 0) {
        setStats(data[0] as MonthlyStats);
      }
      setIsLoading(false);
    };

    if (advisorProfileId) {
      fetchStats();
    }
  }, [advisorProfileId]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-muted/50 border border-border rounded-lg p-4"
      >
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-5 h-5 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </motion.div>
    );
  }

  const completedBookings = stats?.completed_bookings ?? 0;
  const reducedFeeUnlocked = stats?.reduced_fee_unlocked ?? false;
  const bookingsUntilReduced = stats?.bookings_until_reduced ?? threshold;
  const progressPercentage = Math.min((completedBookings / threshold) * 100, 100);

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

  if (reducedFeeUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-primary">10% Platform Fee Unlocked!</p>
                <TrendingDown className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {completedBookings} bookings completed in {currentMonth} — every additional booking this month is charged 10% instead of 15%
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">10%</p>
            <p className="text-xs text-muted-foreground">Platform fee</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-gold/10 to-transparent border border-gold/30 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/20 rounded-lg">
            <Percent className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="font-medium">
              Platform Fee: <span className="text-gold">15%</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {completedBookings} / {threshold} bookings in {currentMonth}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gold">{bookingsUntilReduced} to go</p>
          <p className="text-xs text-muted-foreground">for 10% fee</p>
        </div>
      </div>

      <Progress value={progressPercentage} className="h-2 mb-2" />
      
      <p className="text-xs text-muted-foreground">
        Complete {bookingsUntilReduced} more booking{bookingsUntilReduced !== 1 ? "s" : ""} this month — after that, every additional booking is charged a reduced <span className="font-medium text-primary">10% platform fee</span> instead of 15%.
      </p>
    </motion.div>
  );
};

export default AdvisorFeeProgressCard;
