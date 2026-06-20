import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Calendar, Image as ImageIcon, User, DollarSign, ArrowRight } from "lucide-react";
import type { ProfileCompletionStatus } from "@/hooks/useAdvisorProfile";

interface FinishSetupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  completionStatus: ProfileCompletionStatus;
  isPending: boolean;
}

const FinishSetupPromptModal = ({
  isOpen,
  onClose,
  completionStatus,
  isPending,
}: FinishSetupPromptModalProps) => {
  const steps = [
    { label: "Add a profile photo", complete: completionStatus.hasAvatar, icon: User },
    { label: "Set your session price", complete: completionStatus.hasPrice, icon: DollarSign },
    { label: "Write your bio", complete: completionStatus.hasBio, icon: ImageIcon },
    { label: "Set your availability", complete: completionStatus.hasAvailability, icon: Calendar },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            👋 Welcome to Cook A Look
          </DialogTitle>
          <DialogDescription className="pt-2">
            {isPending
              ? "Your application is under review. Finish setting up your profile now so you can go live the moment you're approved."
              : "Let's finish setting up your profile so clients can start booking you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                step.complete ? "bg-primary/5 border-primary/20" : "bg-background border-border"
              }`}
            >
              {step.complete ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className={`text-sm ${step.complete ? "text-primary" : ""}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Maybe later
          </Button>
          <Button asChild onClick={onClose}>
            <Link to="/settings">
              Finish Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinishSetupPromptModal;
