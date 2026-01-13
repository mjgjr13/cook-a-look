import { useState, useEffect } from "react";
import { Star, Gift, Trophy, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface RewardsData {
  total_points: number;
  lifetime_points: number;
  current_tier: string;
  points_to_next_tier: number;
}

interface RewardsCardProps {
  userId: string;
}

const tierConfig = {
  bronze: {
    icon: Star,
    label: "Bronze",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    nextTier: "Silver",
    discount: "5%",
    pointsNeeded: 1000,
  },
  silver: {
    icon: Gift,
    label: "Silver",
    color: "text-slate-400",
    bgColor: "bg-slate-50",
    nextTier: "Gold",
    discount: "10%",
    pointsNeeded: 2500,
  },
  gold: {
    icon: Trophy,
    label: "Gold",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    nextTier: "Platinum",
    discount: "15%",
    pointsNeeded: 5000,
  },
  platinum: {
    icon: Crown,
    label: "Platinum",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    nextTier: null,
    discount: "20%",
    pointsNeeded: null,
  },
};

const RewardsCard = ({ userId }: RewardsCardProps) => {
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data, error } = await supabase
        .from("user_rewards")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching rewards:", error);
      }

      setRewards(data);
      setIsLoading(false);
    };

    if (userId) {
      fetchRewards();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-background border border-border p-6"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </motion.div>
    );
  }

  // Default values for users without rewards yet
  const currentPoints = rewards?.total_points ?? 0;
  const lifetimePoints = rewards?.lifetime_points ?? 0;
  const currentTier = (rewards?.current_tier ?? "bronze") as keyof typeof tierConfig;
  const pointsToNext = rewards?.points_to_next_tier ?? 1000;

  const tier = tierConfig[currentTier];
  const TierIcon = tier.icon;

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (currentTier === "platinum") return 100;
    const tierThresholds = { bronze: 0, silver: 1000, gold: 2500, platinum: 5000 };
    const currentThreshold = tierThresholds[currentTier];
    const nextThreshold = tier.pointsNeeded ?? 5000;
    const progressInTier = lifetimePoints - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;
    return Math.min((progressInTier / tierRange) * 100, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`${tier.bgColor} border border-border p-6 relative overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <TierIcon className="w-full h-full" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${tier.bgColor} border border-current/10`}>
            <TierIcon className={`w-6 h-6 ${tier.color}`} />
          </div>
          <span className={`text-sm font-medium uppercase tracking-wider ${tier.color}`}>
            {tier.label} Member
          </span>
        </div>

        <p className="text-3xl font-serif font-medium mb-1">
          {currentPoints.toLocaleString()}
        </p>
        <p className="text-muted-foreground text-sm mb-4">Reward Points</p>

        {tier.nextTier ? (
          <>
            <Progress value={getProgressPercentage()} className="h-2 mb-3" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {pointsToNext.toLocaleString()} points
              </span>{" "}
              away from <span className={tier.color}>{tier.discount} off</span> your next session
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-purple-600">
            🎉 You've unlocked {tier.discount} off all sessions!
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default RewardsCard;
