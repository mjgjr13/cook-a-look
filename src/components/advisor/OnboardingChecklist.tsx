import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Circle,
  User,
  Image,
  Camera,
  DollarSign,
  Calendar,
  ArrowRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
  icon: React.ElementType;
  locked?: boolean;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onStartVerification: () => void;
}

const OnboardingChecklist = ({ steps, onStartVerification }: OnboardingChecklistProps) => {
  const navigate = useNavigate();
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="font-serif text-xl flex items-center justify-between">
          <span>Complete Your Profile</span>
          <span className="text-sm font-sans text-muted-foreground">
            {completedCount} of {steps.length} complete
          </span>
        </CardTitle>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete all steps below to become visible to clients and start receiving bookings.
        </p>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLocked = step.locked && !steps.slice(0, index).every((s) => s.completed);

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-all",
                  step.completed
                    ? "bg-background border-primary/30"
                    : isLocked
                    ? "bg-muted/20 border-border opacity-60"
                    : "bg-background border-border hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    step.completed
                      ? "bg-primary text-primary-foreground"
                      : isLocked
                      ? "bg-muted text-muted-foreground"
                      : "bg-gold/10 text-gold"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "font-medium text-sm",
                      step.completed
                        ? "text-foreground"
                        : isLocked
                        ? "text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>

                {!step.completed && !isLocked && step.action && (
                  <Button
                    size="sm"
                    variant={step.id === "verification" ? "default" : "outline"}
                    onClick={step.action}
                    className="flex-shrink-0"
                  >
                    {step.actionLabel || "Complete"}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}

                {step.completed && (
                  <span className="text-xs text-primary font-medium">Done</span>
                )}
              </div>
            );
          })}
        </div>

        {allComplete && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-foreground">All steps complete!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your profile is ready. An admin will verify your identity shortly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
