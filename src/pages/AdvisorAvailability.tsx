import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Calendar, Info } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AvailabilityWindowPicker from "@/components/advisor/AvailabilityWindowPicker";
import { useAdvisorAvailability } from "@/hooks/useAdvisorAvailability";
import { useProfile } from "@/hooks/useProfile";

const AdvisorAvailability = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isLoading: profileLoading } = useProfile();
  const [profileId, setProfileId] = useState<string | null>(null);

  const { windows, isLoading, isSaving, saveBulkWindows } = useAdvisorAvailability(profileId);

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
    // Always navigate to the advisor dashboard - never to client dashboard
    navigate("/advisor");
  };

  if (profileLoading || isLoading) {
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
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
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
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">How it works</p>
                    <p className="text-sm text-muted-foreground">
                      Set your available hours for each day of the week. The system automatically creates 
                      60-minute appointment slots starting on the hour. When a client books, the next 
                      available slot starts 15 minutes after the previous appointment ends.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Example:</strong> If you're available 9 AM - 5 PM, clients can book 9:00, 10:00, 11:00, etc.
                      If someone books 10:00-11:00, the next available slot is 11:15.
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
                    <CardTitle className="font-serif text-xl">Weekly Availability</CardTitle>
                    <CardDescription>
                      Set your recurring availability for each day of the week
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AvailabilityWindowPicker
                  windows={windows}
                  isSaving={isSaving}
                  onSave={saveBulkWindows}
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
              Need help setting up your availability?{" "}
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
