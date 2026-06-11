import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, ExternalLink, ShieldAlert, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Dispute {
  id: string;
  booking_id: string;
  payment_id: string;
  raised_by: string;
  reason: string;
  description: string | null;
  status: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface RecordingItem {
  id: string;
  start_ts: number;
  duration: number;
  status: string;
  download_link: string | null;
  expires: number | null;
}

const AdminDisputes = () => {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [recordings, setRecordings] = useState<Record<string, RecordingItem[]>>({});
  const [loadingRec, setLoadingRec] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setDisputes((data as Dispute[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const fetchRecordings = async (dispute: Dispute) => {
    setLoadingRec((s) => ({ ...s, [dispute.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-recordings", {
        body: { bookingId: dispute.booking_id },
      });
      if (error) throw error;
      setRecordings((s) => ({ ...s, [dispute.id]: data.recordings ?? [] }));
      if (data.note) {
        toast({ title: "Recordings", description: data.note });
      } else if ((data.recordings ?? []).length === 0) {
        toast({ title: "No recordings", description: "No Daily.co recordings found for this booking." });
      }
    } catch (e) {
      toast({
        title: "Failed to load recordings",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoadingRec((s) => ({ ...s, [dispute.id]: false }));
    }
  };

  const updateDispute = async (id: string, patch: Partial<Dispute>) => {
    const { error } = await supabase.from("disputes").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: "Dispute updated." });
    load();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-primary" />
              Dispute Resolution
            </h1>
            <p className="text-muted-foreground">
              Review booking disputes and inspect session recordings.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {disputes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No disputes have been raised.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{d.reason}</CardTitle>
                      <CardDescription>
                        Booking <code className="text-xs">{d.booking_id.slice(0, 8)}…</code> ·
                        Opened {format(new Date(d.created_at), "MMM d, yyyy p")}
                      </CardDescription>
                    </div>
                    <Badge variant={d.status === "resolved" ? "secondary" : "destructive"}>
                      {d.status ?? "open"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {d.description && (
                    <p className="text-sm whitespace-pre-wrap bg-muted/40 p-3 rounded">
                      {d.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Video className="h-4 w-4" /> Session Recordings
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchRecordings(d)}
                        disabled={loadingRec[d.id]}
                      >
                        {loadingRec[d.id] ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : null}
                        Load recordings
                      </Button>
                    </div>

                    {recordings[d.id]?.length ? (
                      <ul className="space-y-2">
                        {recordings[d.id].map((r) => (
                          <li
                            key={r.id}
                            className="flex items-center justify-between border rounded p-3 text-sm"
                          >
                            <div>
                              <div className="font-medium">
                                {format(new Date(r.start_ts * 1000), "MMM d, yyyy p")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Duration: {Math.round(r.duration / 60)} min · Status: {r.status}
                                {r.expires
                                  ? ` · Link expires ${format(new Date(r.expires * 1000), "p")}`
                                  : ""}
                              </div>
                            </div>
                            {r.download_link ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  window.open(r.download_link!, "_blank", "noopener,noreferrer")
                                }
                              >
                                <ExternalLink className="h-3 w-3 mr-1" /> Open
                              </Button>
                            ) : (
                              <Badge variant="outline">Unavailable</Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : recordings[d.id] ? (
                      <p className="text-xs text-muted-foreground">No recordings available.</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Admin notes</label>
                    <Textarea
                      defaultValue={d.admin_notes ?? ""}
                      placeholder="Resolution notes, decision rationale, payout outcome…"
                      onChange={(e) => setNotes((s) => ({ ...s, [d.id]: e.target.value }))}
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateDispute(d.id, { admin_notes: notes[d.id] ?? d.admin_notes ?? "" })
                        }
                      >
                        Save notes
                      </Button>
                      {d.status !== "resolved" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateDispute(d.id, {
                              admin_notes: notes[d.id] ?? d.admin_notes ?? "",
                              status: "resolved",
                              resolved_at: new Date().toISOString(),
                            })
                          }
                        >
                          Mark resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDisputes;
