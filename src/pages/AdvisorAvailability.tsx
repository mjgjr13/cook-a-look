import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Info, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import CalendarAvailabilityManager from "@/components/advisor/CalendarAvailabilityManager";
import { useAdvisorAvailability } from "@/hooks/useAdvisorAvailability";
import { useDateOverrides } from "@/hooks/useDateOverrides";
import { useProfile } from "@/hooks/useProfile";
import { BreakConfig } from "@/components/advisor/BreakTimeManager";
import { getBrowserTimezone, getTimezoneLabel } from "@/hooks/useTimezone";

const AdvisorAvailability = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isLoading: profileLoading } = useProfile();
  const [profileId, setProfileId] = useState<string | null>(null);

  const { 
    windows, 
    breaks, 
    isLoading, 
    isSaving, 
    saveWeeklyDefaults 
  } = useAdvisorAvailability(profileId);

  const {
    overrides: dateOverrides,
    blocks: dateBlocks,
    isLoading: overridesLoading,
    isSaving: overridesSaving,
    saveOverride,
    deleteOverride,
    addBlock,
    deleteBlock,
  } = useDateOverrides(profileId);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (!roles.isAdvisor) {
        toast({
          title: "Access denied",
          description: "Only advisors can manage availability.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setProfileId(profile.id);
    }
  }, [profileLoading, profile, roles.isAdvisor, navigate, toast]);

  const handleBack = () => {
    navigate("/advisor");
  };

  // Convert breaks to BreakConfig format
  const breaksAsConfig: BreakConfig[] = breaks.map((b) => ({
    id: b.id || "",
    day_of_week: b.day_of_week,
    start_time: b.start_time,
    end_time: b.end_time,
    label: b.label || "Break",
  }));

  const detectedTimezone = getBrowserTimezone();

  if (profileLoading || isLoading || overridesLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-1">
                Advisor Settings
              </p>
              <h1 className="font-serif text-3xl font-medium">Manage Availability</h1>
            </div>
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">How it works</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>
                        <strong>Quick Setup:</strong> Choose a preset to set your availability in seconds
                      </li>
                      <li>
                        <strong>Weekly Defaults:</strong> Set your regular hours for each day of the week
                      </li>
                      <li>
                        <strong>Calendar Overrides:</strong> Click any date to customize hours or block the day
                      </li>
                      <li>
                        <strong>Block Time:</strong> Mark portions of any day as unavailable (no labels needed)
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 pt-1">
                      <Clock className="w-4 h-4" />
                      All times are shown in your local timezone ({getTimezoneLabel(detectedTimezone)}). 
                      Clients will see times converted to their own timezone automatically.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-xl">Calendar-Based Scheduling</CardTitle>
                    <CardDescription>
                      Set weekly defaults and customize specific dates as needed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CalendarAvailabilityManager
                  windows={windows}
                  breaks={breaksAsConfig}
                  dateOverrides={dateOverrides}
                  dateBlocks={dateBlocks}
                  isSaving={isSaving || overridesSaving}
                  onSaveWeeklyDefaults={saveWeeklyDefaults}
                  onSaveDateOverride={saveOverride}
                  onDeleteDateOverride={deleteOverride}
                  onAddDateBlock={addBlock}
                  onDeleteDateBlock={deleteBlock}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Clients can book appointments up to 1 month in advance.{" "}
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link to="/settings">Update your profile settings</Link>
              </Button>
            </p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorAvailability;
