import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Calendar, Image as ImageIcon, Eye, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { ProfileCompletionStatus } from "@/hooks/useAdvisorProfile";

interface NewAdvisorSetupCardProps {
  completionStatus: ProfileCompletionStatus;
  isListed: boolean;
  hasBeenVisibleBefore: boolean;
  hasAvailability: boolean;
  portfolioCount: number;
  onToggleVisibility: () => void;
  isPending?: boolean;
}

const NewAdvisorSetupCard = ({
  completionStatus,
  isListed,
  hasBeenVisibleBefore,
  hasAvailability,
  portfolioCount,
  onToggleVisibility,
  isPending = false,
}: NewAdvisorSetupCardProps) => {
  // Hide card if already visible OR if they've published before (use Settings toggle instead)
  if (isListed || hasBeenVisibleBefore) return null;

  const steps = [
    {
      id: "availability",
      label: "Set your availability",
      description: "Choose when you're available for consultations",
      complete: hasAvailability,
      href: "/advisor-availability",
      icon: Calendar,
    },
    {
      id: "portfolio",
      label: "Add portfolio photos",
      description: "Showcase your styling work (at least 3 recommended)",
      complete: portfolioCount >= 3,
      href: "/settings",
      icon: ImageIcon,
    },
    {
      id: "visibility",
      label: "Make your profile visible",
      description: "Go live on the Style Advisors directory",
      complete: isListed,
      action: true,
      icon: Eye,
    },
  ];

  const canGoLive = completionStatus.isComplete;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {isPending ? "👋 Welcome — let's get you ready" : "🎉 You're Approved!"}
              </CardTitle>
              <CardDescription className="mt-1">
                {isPending
                  ? "Finish setting up your profile now so you can go live the moment you're approved."
                  : "Complete these steps to start receiving bookings"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-gold border-gold/50">
              {completionStatus.completedSteps}/{completionStatus.totalSteps} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                step.complete
                  ? "bg-primary/5 border-primary/20"
                  : "bg-background border-border hover:border-gold/30"
              }`}
            >
              <div className="mt-0.5">
                {step.complete ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${step.complete ? "text-primary" : ""}`}>
                  {step.label}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {!step.complete && (
                step.action ? (
                  <Button
                    size="sm"
                    onClick={onToggleVisibility}
                    disabled={!canGoLive || isPending}
                    className="shrink-0"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {isPending ? "Pending Approval" : "Go Live"}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to={step.href!}>
                      <step.icon className="w-4 h-4 mr-1" />
                      Set Up
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                )
              )}
            </motion.div>
          ))}

          {isPending ? (
            <p className="text-sm text-muted-foreground text-center pt-2">
              Your application is under review. Get these steps done now and you'll be able to go live as soon as you're approved.
            </p>
          ) : !canGoLive && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              Complete all required steps above to make your profile visible.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewAdvisorSetupCard;
