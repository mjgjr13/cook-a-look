import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import GooglePlacesAutocomplete, { type SelectedPlace } from "@/components/ui/google-places-autocomplete";


interface MeetingLocation {
  id: string;
  advisor_id: string;
  name: string;
  address: string;
  city: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  advisorProfileId: string | null;
}

const MAX_LOCATIONS = 5;

const MeetingLocationsManager = ({ advisorProfileId }: Props) => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<MeetingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLoc, setNewLoc] = useState({ name: "", address: "", city: "" });

  const load = async () => {
    if (!advisorProfileId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("advisor_meeting_locations")
      .select("*")
      .eq("advisor_id", advisorProfileId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load locations", description: error.message, variant: "destructive" });
    } else {
      setLocations((data || []) as MeetingLocation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorProfileId]);

  const activeCount = locations.filter((l) => l.is_active).length;

  const addLocation = async () => {
    if (!advisorProfileId) return;
    const name = newLoc.name.trim();
    const address = newLoc.address.trim();
    if (!name || !address) {
      toast({ title: "Name and address required", variant: "destructive" });
      return;
    }
    if (activeCount >= MAX_LOCATIONS) {
      toast({ title: `Maximum ${MAX_LOCATIONS} active locations`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("advisor_meeting_locations").insert({
      advisor_id: advisorProfileId,
      name,
      address,
      city: newLoc.city.trim() || null,
      sort_order: locations.length,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't add location", description: error.message, variant: "destructive" });
      return;
    }
    setNewLoc({ name: "", address: "", city: "" });
    load();
  };

  const toggleActive = async (loc: MeetingLocation, is_active: boolean) => {
    if (is_active && activeCount >= MAX_LOCATIONS && !loc.is_active) {
      toast({ title: `Maximum ${MAX_LOCATIONS} active locations`, variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("advisor_meeting_locations")
      .update({ is_active })
      .eq("id", loc.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (loc: MeetingLocation) => {
    const { error } = await supabase
      .from("advisor_meeting_locations")
      .delete()
      .eq("id", loc.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  if (!advisorProfileId) return null;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Meeting Locations</Label>
        <p className="text-sm text-muted-foreground">
          Add up to {MAX_LOCATIONS} spots where you're willing to meet clients in person (e.g. local malls,
          coffee shops). Clients pick one when booking — or can suggest another for you to accept or decline.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {locations.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No locations added yet.</p>
          )}
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-start justify-between gap-3 p-3 border border-border rounded-md bg-background">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{loc.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{loc.address}{loc.city ? `, ${loc.city}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={loc.is_active}
                  onCheckedChange={(c) => toggleActive(loc, c)}
                  aria-label="Active"
                />
                <Button variant="ghost" size="icon" onClick={() => remove(loc)} aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCount < MAX_LOCATIONS && (
        <div className="grid gap-2 sm:grid-cols-3 p-3 border border-dashed border-border rounded-md">
          <Input
            placeholder="Place name (e.g. Westfield Valley Fair)"
            value={newLoc.name}
            maxLength={120}
            onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
          />
          <Input
            placeholder="Address"
            value={newLoc.address}
            maxLength={300}
            onChange={(e) => setNewLoc({ ...newLoc, address: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              placeholder="City"
              value={newLoc.city}
              maxLength={120}
              onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })}
            />
            <Button onClick={addLocation} disabled={saving} size="icon" aria-label="Add">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingLocationsManager;
