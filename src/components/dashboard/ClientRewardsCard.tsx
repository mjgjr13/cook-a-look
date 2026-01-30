import { useState, useEffect } from "react";
import { Star, Gift, Crown, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface RewardsData {
  total_points: number;
  lifetime_points: number;
  current_tier: string;
  points_to_next_tier: number;
  site_credit_cents: number;
  credit_expires_at: string | null;
  next_tier: string | null;
  next_tier_credit_cents: number;
}

interface ClientRewardsCardProps {
  userId: string;
}

const tierConfig = {
  explorer: {
    icon: Star,
    label: "Explorer",
    color: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    borderColor: "border-slate-200 dark:border-slate-700",
  },
  insider: {
    icon: Gift,
    label: "Insider",
    color: "text-gold",
    bgColor: "bg-gold/5",
    borderColor: "border-gold/30",
  },
  vip: {
    icon: Crown,
    label: "VIP",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
};

const ClientRewardsCard = ({ userId }: ClientRewardsCardProps) => {
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      const { data, error } = await supabase.rpc("get_client_rewards_summary", {
        _user_id: userId,
      });

      if (error) {
        console.error("Error fetching rewards:", error);
      } else if (data && data.length > 0) {
        setRewards(data[0] as RewardsData);
      }
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
        className="bg-background border border-border p-6 col-span-full md:col-span-1"
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
  const currentTier = (rewards?.current_tier ?? "explorer") as keyof typeof tierConfig;
  const pointsToNext = rewards?.points_to_next_tier ?? 1000;
  const siteCredit = (rewards?.site_credit_cents ?? 0) / 100;
  const nextTier = rewards?.next_tier;
  const nextTierCredit = (rewards?.next_tier_credit_cents ?? 0) / 100;

  const tier = tierConfig[currentTier];
  const TierIcon = tier.icon;

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (currentTier === "vip") return 100;
    const tierThresholds = { explorer: 0, insider: 1000, vip: 5000 };
    const nextThresholds = { explorer: 1000, insider: 5000, vip: 5000 };
    const currentThreshold = tierThresholds[currentTier];
    const nextThreshold = nextThresholds[currentTier];
    const progressInTier = lifetimePoints - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;
    return Math.min((progressInTier / tierRange) * 100, 100);
  };

  // Format credit expiration
  const formatExpiry = () => {
    if (!rewards?.credit_expires_at) return null;
    const expiryDate = new Date(rewards.credit_expires_at);
    const now = new Date();
    if (expiryDate <= now) return "Expired";
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return `Expires in ${daysLeft} days`;
    return `Expires ${expiryDate.toLocaleDateString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`${tier.bgColor} border ${tier.borderColor} p-6 relative overflow-hidden col-span-full`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <TierIcon className="w-full h-full" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-background/80 border border-current/10`}>
              <TierIcon className={`w-6 h-6 ${tier.color}`} />
            </div>
            <div>
              <span className={`text-sm font-medium uppercase tracking-wider ${tier.color}`}>
                {tier.label} Member
              </span>
              <p className="text-2xl font-serif font-medium">
                {currentPoints.toLocaleString()} points
              </p>
            </div>
          </div>

          {/* Site Credit Badge */}
          {siteCredit > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Site Credit</p>
              <p className="text-xl font-bold text-primary">${siteCredit.toFixed(2)}</p>
              {formatExpiry() && (
                <p className="text-xs text-muted-foreground">{formatExpiry()}</p>
              )}
            </div>
          )}
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Progress to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
              </p>
              <p className="text-sm font-medium">
                {pointsToNext.toLocaleString()} points to go
              </p>
            </div>
            <Progress value={getProgressPercentage()} className="h-2 mb-3" />
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-muted-foreground">
                Reach {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} to unlock{" "}
                <span className="font-medium text-primary">${nextTierCredit.toFixed(0)} site credit</span>
              </span>
            </div>
          </div>
        )}

        {currentTier === "vip" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
            <Crown className="w-4 h-4" />
            <span className="font-medium">You've reached the highest tier! Enjoy priority access to top advisors.</span>
          </div>
        )}

        {/* Points earning info */}
        <div className="mt-6 pt-4 border-t border-current/10">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Earn Points</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-background/60 rounded px-3 py-2 text-center">
              <p className="font-medium">100 pts</p>
              <p className="text-muted-foreground">Per booking</p>
            </div>
            <div className="bg-background/60 rounded px-3 py-2 text-center">
              <p className="font-medium">5 pts</p>
              <p className="text-muted-foreground">Per review</p>
            </div>
            <div className="bg-background/60 rounded px-3 py-2 text-center">
              <p className="font-medium">200 pts</p>
              <p className="text-muted-foreground">Per referral</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClientRewardsCard;
