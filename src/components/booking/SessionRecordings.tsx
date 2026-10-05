import { useState } from "react";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Recording {
  id: string;
  start_ts: number;
  duration: number;
  download_link: string | null;
}

/**
 * Lists a video session's recordings (clients see their own; admins any).
 * Links are short-lived and fetched on demand from admin-get-recordings.
 */
const SessionRecordings = ({ bookingId }: { bookingId: string }) => {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("admin-get-recordings", { body: { bookingId } });
    setLoading(false);
    if (error) {
      setMessage("Couldn't load recordings right now. Please try again.");
      return;
    }
    const list = ((data?.recordings ?? []) as Recording[]).filter((r) => r.download_link);
    setRecordings(list);
    if (list.length === 0) setMessage(data?.note || "No recording is available for this session yet. Recordings appear shortly after a call ends.");
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Session recordings</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Film aria-hidden="true" />}
          {recordings ? "Refresh" : "Show"}
        </Button>
      </div>
      {recordings && recordings.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {recordings.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                Recording {i + 1} · {new Date(r.start_ts * 1000).toLocaleString()} · {Math.max(1, Math.round(r.duration / 60))} min
              </span>
              <a href={r.download_link!} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
                Watch
              </a>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
      <p className="mt-2 text-xs text-muted-foreground">Links expire after a short time for your privacy.</p>
    </div>
  );
};

export default SessionRecordings;
