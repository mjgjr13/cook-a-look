import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Check, X, Loader2 } from "lucide-react";

interface PendingBooking {
  id: string;
  suggested_location: { name?: string; address?: string; note?: string } | null;
  client: { full_name: string | null } | null;
  slot: { start_time: string } | null;
}

interface MeetingLocation {
  id: string;
  name: string;
  address: string;
}

interface Props {
  advisorProfileId: string;
}

const PendingLocationApprovals = ({ advisorProfileId }: Props) => {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingBooking[]>([]);
  const [locations, setLocations] = useState<MeetingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: bookings }, { data: locs }] = await Promise.all([
      supabase
        .from("bookings")
        .select(`id, suggested_location, client:profiles!bookings_client_id_fkey(full_name), slot:availability_slots!bookings_slot_id_fkey(start_time)`)
        .eq("advisor_id", advisorProfileId)
        .eq("meeting_type", "in_person")
        .eq("location_status", "pending_advisor_approval")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }),
      supabase
        .from("advisor_meeting_locations")
        .select("id, name, address")
        .eq("advisor_id", advisorProfileId)
        .eq("is_active", true),
    ]);
    setPending((bookings || []) as unknown as PendingBooking[]);
    setLocations((locs || []) as MeetingLocation[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorProfileId]);

  const accept = async (b: PendingBooking) => {
    setBusyId(b.id);
    const snap = b.suggested_location || {};
    const { error } = await supabase
      .from("bookings")
      .update({
        location_status: "confirmed",
        location_snapshot: snap,
      })
      .eq("id", b.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't accept", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Location accepted" });
    load();
  };

  const declineWith = async (b: PendingBooking, loc: MeetingLocation) => {
    setBusyId(b.id);
    const { error } = await supabase
      .from("bookings")
      .update({
        location_status: "confirmed",
        location_id: loc.id,
        suggested_location: null,
        location_snapshot: { name: loc.name, address: loc.address },
      })
      .eq("id", b.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Counter-location set", description: "Client has been notified in their dashboard." });
    load();
  };

  if (loading || pending.length === 0) return null;

  return (
    <div className="border border-gold/50 bg-gold/5 rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gold" />
        <h3 className="font-medium">Pending location approvals ({pending.length})</h3>
      </div>
      {pending.map((b) => (
        <div key={b.id} className="bg-background border border-border rounded p-3 space-y-2">
          <div className="text-sm">
            <p className="font-medium">{b.client?.full_name || "Client"} suggested:</p>
            <p>{b.suggested_location?.name}</p>
            <p className="text-muted-foreground">{b.suggested_location?.address}</p>
            {b.suggested_location?.note && (
              <p className="text-xs italic text-muted-foreground mt-1">"{b.suggested_location.note}"</p>
            )}
            {b.slot?.start_time && (
              <p className="text-xs text-muted-foreground mt-1">
                Session: {new Date(b.slot.start_time).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => accept(b)} disabled={busyId === b.id}>
              {busyId === b.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              Accept
            </Button>
            {locations.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Or counter with:</span>
                {locations.map((loc) => (
                  <Button
                    key={loc.id}
                    size="sm"
                    variant="outline"
                    disabled={busyId === b.id}
                    onClick={() => declineWith(b, loc)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    {loc.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingLocationApprovals;
