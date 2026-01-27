import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Clock, Save, ArrowLeft, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addHours, setHours, setMinutes } from "date-fns";

interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
  is_virtual: boolean;
  is_booked?: boolean;
}

const AdvisorAvailability = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/signin");
        return;
      }

      // Get advisor profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_advisor")
        .eq("user_id", session.user.id)
        .single();

      if (!profile?.is_advisor) {
        toast({
          title: "Access denied",
          description: "Only advisors can manage availability.",
          variant: "destructive",
        });
        navigate("/advisor"); // Navigate back to advisor dashboard
        return;
      }

      setProfileId(profile.id);
      setIsLoading(false);
    };

    loadData();
  }, [navigate, toast]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!profileId || !selectedDate) return;

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("advisor_id", profileId)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time");

      setSlots(data || []);
    };

    loadSlots();
  }, [profileId, selectedDate]);

  const addSlot = () => {
    if (!selectedDate) return;

    const startTime = setMinutes(setHours(new Date(selectedDate), 9), 0);
    const endTime = addHours(startTime, 1);

    setSlots([
      ...slots,
      {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_virtual: true,
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: unknown) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const updateSlotTime = (index: number, field: "start_time" | "end_time", timeString: string) => {
    if (!selectedDate) return;
    
    const [hours, minutes] = timeString.split(":").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);
    
    updateSlot(index, field, newDate.toISOString());
  };

  const saveSlots = async () => {
    if (!profileId) return;

    setIsSaving(true);

    try {
      // Delete existing slots for this date
      const startOfDay = new Date(selectedDate!);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate!);
      endOfDay.setHours(23, 59, 59, 999);

      await supabase
        .from("availability_slots")
        .delete()
        .eq("advisor_id", profileId)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .eq("is_booked", false);

      // Insert new slots (only non-booked ones)
      const slotsToInsert = slots
        .filter((slot) => !slot.is_booked)
        .map((slot) => ({
          advisor_id: profileId,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_virtual: slot.is_virtual,
        }));

      if (slotsToInsert.length > 0) {
        const { error } = await supabase.from("availability_slots").insert(slotsToInsert);
        if (error) throw error;
      }

      toast({
        title: "Availability saved",
        description: `${slotsToInsert.length} time slot(s) saved for ${format(selectedDate!, "MMMM d, yyyy")}.`,
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error saving",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeForInput = (isoString: string) => {
    const date = new Date(isoString);
    return format(date, "HH:mm");
  };

  if (isLoading) {
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
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/advisor")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-1">
                Advisor Settings
              </p>
              <h1 className="font-serif text-3xl font-medium">Manage Availability</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-background border border-border p-6"
            >
              <h3 className="font-serif text-xl mb-4">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={{ before: new Date() }}
                className="mx-auto"
              />
            </motion.div>

            {/* Time Slots */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-background border border-border p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif text-xl">
                  {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                </h3>
                <Button variant="outline" size="sm" onClick={addSlot} disabled={!selectedDate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slot
                </Button>
              </div>

              {slots.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h4 className="font-medium text-foreground mb-2">No Availability Set</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    You haven't added any time slots for this date.
                  </p>
                  <Button variant="outline" size="sm" onClick={addSlot} disabled={!selectedDate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Slot
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {slots.map((slot, index) => (
                    <div
                      key={slot.id || index}
                      className={`border p-4 ${slot.is_booked ? "bg-secondary/50 opacity-60" : "border-border"}`}
                    >
                      {slot.is_booked && (
                        <p className="text-sm text-gold mb-2 font-medium">Booked</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Start</Label>
                          <Input
                            type="time"
                            value={formatTimeForInput(slot.start_time)}
                            onChange={(e) => updateSlotTime(index, "start_time", e.target.value)}
                            className="w-32"
                            disabled={slot.is_booked}
                          />
                        </div>
                        <span className="text-muted-foreground">to</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">End</Label>
                          <Input
                            type="time"
                            value={formatTimeForInput(slot.end_time)}
                            onChange={(e) => updateSlotTime(index, "end_time", e.target.value)}
                            className="w-32"
                            disabled={slot.is_booked}
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Switch
                            checked={slot.is_virtual}
                            onCheckedChange={(checked) => updateSlot(index, "is_virtual", checked)}
                            disabled={slot.is_booked}
                          />
                          <Label className="text-sm">Virtual</Label>
                        </div>
                        {!slot.is_booked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSlot(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={saveSlots}
                  disabled={isSaving || !selectedDate}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Availability"}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorAvailability;
