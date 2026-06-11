import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Shield, Clock, DollarSign, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdvisorOnboardingModalProps {
  profileId: string;
  isOpen: boolean;
  onComplete: () => void;
}

const AdvisorOnboardingModal = ({
  profileId,
  isOpen,
  onComplete,
}: AdvisorOnboardingModalProps) => {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections = [
    {
      icon: Shield,
      title: "Professional Expectations",
      content: [
        "Maintain professional conduct during all sessions (virtual and in-person)",
        "Be punctual and prepared for every consultation",
        "Communicate respectfully with all clients",
        "No harassment, discrimination, or inappropriate behavior of any kind",
        "Violations may result in suspension or permanent removal from the platform",
      ],
    },
    {
      icon: Video,
      title: "Virtual Session Recording Policy",
      content: [
        "All virtual sessions are automatically recorded for quality assurance and dispute resolution",
        "Recordings are securely stored and only accessible by platform administrators",
        "Recordings may be reviewed in the event of a dispute or quality review",
        "Clients are informed of this policy before joining calls",
        "Recording retention follows our data privacy guidelines",
      ],
    },
    {
      icon: Clock,
      title: "Dispute & Escrow Process",
      content: [
        "Client payments are held in escrow until 48 hours after the session",
        "Clients may raise disputes within 48 hours of the session start time",
        "If a dispute is raised, funds remain held until admin review",
        "Disputes are resolved by our team after reviewing session details and recordings",
        "Fair resolution is our priority - both advisor and client interests are considered",
      ],
    },
    {
      icon: DollarSign,
      title: "Payout Schedule",
      content: [
        "You set your own hourly rate - clients see your full price and choose 1, 2, or 3 hours per booking",
        "Standard platform fee is 15% per booking",
        "After your 9th completed booking in a calendar month, every additional booking that month is charged a reduced 10% fee",
        "Your net payout is automatically calculated and shown in your dashboard",
        "Funds are released 48 hours after successful sessions (no disputes), and you can request withdrawals once funds are available",
      ],
    },
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledged) {
      toast({
        title: "Please acknowledge",
        description: "You must check the acknowledgment box to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_acknowledged_at: new Date().toISOString() })
        .eq("id", profileId);

      if (error) throw error;

      toast({
        title: "Welcome aboard!",
        description: "You're all set to start receiving bookings.",
      });

      onComplete();
    } catch (error) {
      console.error("Error acknowledging onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to save acknowledgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentIcon = sections[currentSection].icon;
  const isLastSection = currentSection === sections.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-center">
            Welcome to Cook a Look
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {sections.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSection ? "bg-gold" : index < currentSection ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Section content */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 mb-4">
              <CurrentIcon className="w-8 h-8 text-gold" />
            </div>
            <h3 className="font-serif text-xl font-medium mb-4">
              {sections[currentSection].title}
            </h3>
          </div>

          <ScrollArea className="h-[200px] pr-4">
            <ul className="space-y-3">
              {sections[currentSection].content.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          {/* Acknowledgment checkbox on last section */}
          {isLastSection && (
            <div className="flex items-start gap-3 mt-6 p-4 bg-muted/50 border border-border rounded-lg">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <label
                htmlFor="acknowledge"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I have read and understand the professional expectations, recording policy, 
                dispute process, and payout schedule. I agree to comply with these guidelines.
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {currentSection > 0 && (
              <Button
                variant="outline"
                onClick={handlePrev}
                className="flex-1"
              >
                Previous
              </Button>
            )}
            {!isLastSection ? (
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleAcknowledge}
                disabled={isSubmitting || !acknowledged}
                className="flex-1"
              >
                {isSubmitting ? "Saving..." : "I Understand & Agree"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvisorOnboardingModal;
