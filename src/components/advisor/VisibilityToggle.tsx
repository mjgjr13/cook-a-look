import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, EyeOff, Users, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { ProfileCompletionStatus } from "@/hooks/useAdvisorProfile";

interface VisibilityToggleProps {
  isListed: boolean;
  isApproved: boolean;
  completionStatus: ProfileCompletionStatus;
  pendingBookingsCount: number;
  onToggle: (newValue: boolean) => Promise<{ success: boolean; error?: string }>;
}

const VisibilityToggle = ({
  isListed,
  isApproved,
  completionStatus,
  pendingBookingsCount,
  onToggle,
}: VisibilityToggleProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const result = await onToggle(checked);
    setIsUpdating(false);

    if (!result.success) {
      toast({
        title: "Cannot change visibility",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: checked ? "Profile Listed" : "Profile Hidden",
        description: checked
          ? "Your profile is now visible on the Style Advisors page."
          : "Your profile is now hidden from public search.",
      });
    }
  };

  // Not approved yet - show pending message
  if (!isApproved) {
    return (
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Profile Visibility</CardTitle>
          </div>
          <CardDescription>
            Your profile will be available to list once your application is approved.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Profile not complete
  const canList = completionStatus.isComplete;
  const canHide = pendingBookingsCount === 0;

  return (
    <Card className={isListed ? "border-primary/50 bg-primary/5" : "border-border"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isListed ? (
              <Eye className="w-5 h-5 text-primary" />
            ) : (
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base font-medium">Profile Visibility</CardTitle>
          </div>
          <Badge variant={isListed ? "default" : "secondary"}>
            {isListed ? "Listed" : "Hidden"}
          </Badge>
        </div>
        <CardDescription>
          {isListed
            ? "Your profile is visible on the Style Advisors page"
            : "Your profile is hidden from public search"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gold" />
            <div>
              <p className="text-sm font-medium">Show on Style Advisors page</p>
              <p className="text-xs text-muted-foreground">
                Clients can find and book you
              </p>
            </div>
          </div>
          {isUpdating ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={isListed}
              onCheckedChange={handleToggle}
              disabled={(!canList && !isListed) || (!canHide && isListed)}
            />
          )}
        </div>

        {/* Warnings */}
        <AnimatePresence>
          {!completionStatus.hasAvatar && !isListed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm"
            >
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">
                A profile photo is required to list publicly. Add one in Settings.
              </p>
            </motion.div>
          )}

          {!canList && !isListed && completionStatus.hasAvatar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-sm"
            >
              <AlertTriangle className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Complete your profile setup ({completionStatus.completedSteps}/{completionStatus.totalSteps} done) before listing.
              </p>
            </motion.div>
          )}

          {!canHide && isListed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm"
            >
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-destructive">
                You have {pendingBookingsCount} upcoming booking(s). Complete or cancel them before hiding your profile.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default VisibilityToggle;
