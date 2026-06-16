import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, X, Loader2, Video, MapPin } from "lucide-react";
import { format } from "date-fns";

interface PendingBooking {
  id: string;
  meeting_type: string | null;
  suggested_location: { name?: string; address?: string } | null;
  client: { full_name: string | null; avatar_url: string | null } | null;
  slot: { start_time: string; end_time: string; is_virtual: boolean } | null;
}

interface Props {
  advisorProfileId: string;
  onChanged?: () => void;
}

const PendingBookingRequests = ({ advisorProfileId, onChanged }: Props) => {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, meeting_type, suggested_location,
        client:profiles!bookings_client_id_fkey(full_name, avatar_url),
        slot:availability_slots!bookings_slot_id_fkey(start_time, end_time, is_virtual)
      `)
      .eq("advisor_id", advisorProfileId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load requests", description: error.message, variant: "destructive" });
    } else {
      setPending((data || []) as unknown as PendingBooking[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`pending-bookings-${advisorProfileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `advisor_id=eq.${advisorProfileId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorProfileId]);

  const respond = async (id: string, action: "accept" | "decline") => {
    setBusyId(id);
    const { error } = await supabase.rpc("advisor_respond_booking", {
      p_booking_id: id,
      p_action: action,
    });
    setBusyId(null);
    if (error) {
      toast({ title: action === "accept" ? "Couldn't accept" : "Couldn't decline", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: action === "accept" ? "Booking accepted" : "Booking declined" });
    load();
    onChanged?.();
  };

  if (loading || pending.length === 0) return null;

  return (
    <div className="border border-primary/40 bg-primary/5 rounded-md p-4 space-y-3 mb-8">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <h3 className="font-medium">Booking requests waiting on you ({pending.length})</h3>
      </div>
      {pending.map((b) => (
        <div key={b.id} className="bg-background border border-border rounded p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm min-w-0">
            <p className="font-medium truncate">{b.client?.full_name || "Client"}</p>
            <p className="text-muted-foreground flex items-center gap-1">
              {b.slot?.is_virtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
              {b.slot?.start_time
                ? `${format(new Date(b.slot.start_time), "EEE MMM d, h:mm a")} – ${format(new Date(b.slot.end_time), "h:mm a")}`
                : "Time TBD"}
            </p>
            {b.meeting_type === "in_person" && b.suggested_location?.address && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Suggested: {b.suggested_location.name ? `${b.suggested_location.name}, ` : ""}
                {b.suggested_location.address}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => respond(b.id, "accept")} disabled={busyId === b.id}>
              {busyId === b.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => respond(b.id, "decline")} disabled={busyId === b.id}>
              <X className="w-3 h-3 mr-1" />
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingBookingRequests;
