import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Camera, DollarSign, FileText, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ProfileCompletionStatus } from "@/hooks/useAdvisorProfile";

interface ProfileCompletionCardProps {
  completionStatus: ProfileCompletionStatus;
  isApproved: boolean;
}

const ProfileCompletionCard = ({ completionStatus, isApproved }: ProfileCompletionCardProps) => {
  const steps = [
    {
      id: "avatar",
      label: "Profile Photo",
      description: "Add a professional photo",
      completed: completionStatus.hasAvatar,
      icon: Camera,
      link: "/settings",
    },
    {
      id: "price",
      label: "Set Your Price",
      description: "Define your session rate",
      completed: completionStatus.hasPrice,
      icon: DollarSign,
      link: "/settings",
    },
    {
      id: "bio",
      label: "Write Your Bio",
      description: "Tell clients about yourself",
      completed: completionStatus.hasBio,
      icon: FileText,
      link: "/settings",
    },
    {
      id: "availability",
      label: "Set Availability",
      description: "Add available time slots",
      completed: completionStatus.hasAvailability,
      icon: Calendar,
      link: "/advisor-availability",
    },
  ];

  const progressPercent = (completionStatus.completedSteps / completionStatus.totalSteps) * 100;

  if (completionStatus.isComplete) {
    return null; // Don't show if complete
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-serif">Complete Your Profile</CardTitle>
              <CardDescription>
                {isApproved
                  ? "Finish setting up to list yourself on the Style Advisors page"
                  : "Get ready while your application is being reviewed"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-gold border-gold/50">
              {completionStatus.completedSteps}/{completionStatus.totalSteps}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {Math.round(progressPercent)}% complete
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {steps.map((step) => (
              <Link
                key={step.id}
                to={step.link}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  step.completed
                    ? "bg-primary/5 border-primary/20"
                    : "bg-background border-border hover:border-gold/50 hover:bg-gold/5"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.completed ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.completed ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.completed ? "Completed" : step.description}
                  </p>
                </div>
                {!step.completed && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfileCompletionCard;
