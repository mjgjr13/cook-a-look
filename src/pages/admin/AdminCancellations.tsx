import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Row {
  id: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  refund_percentage: number | null;
  refund_amount_cents: number | null;
  refund_status: string | null;
  refund_id: string | null;
  status: string;
  meeting_type: string;
  advisor: { id: string; full_name: string | null } | null;
  client: { id: string; full_name: string | null } | null;
  slot: { start_time: string } | null;
}

const statusOptions = ["all", "pending", "processing", "succeeded", "failed", "voided", "manual", "none"];
const byOptions = ["all", "client", "advisor", "admin", "system"];

const AdminCancellations = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [byFilter, setByFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<Row | null>(null);
  const [overridePct, setOverridePct] = useState<string>("");
  const [overrideNote, setOverrideNote] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, cancelled_at, cancelled_by, cancellation_reason, refund_percentage,
        refund_amount_cents, refund_status, refund_id, status, meeting_type,
        advisor:profiles!bookings_advisor_id_fkey(id, full_name),
        client:profiles!bookings_client_id_fkey(id, full_name),
        slot:availability_slots!bookings_slot_id_fkey(start_time)
      `)
      .eq("status", "cancelled")
      .not("cancelled_at", "is", null)
      .order("cancelled_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data as unknown as Row[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== "all" && (r.refund_status ?? "none") !== statusFilter) return false;
    if (byFilter !== "all" && (r.cancelled_by ?? "") !== byFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const hay = `${r.advisor?.full_name ?? ""} ${r.client?.full_name ?? ""} ${r.refund_id ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, statusFilter, byFilter, search]);

  const fmtMoney = (cents: number | null) => `$${((cents ?? 0) / 100).toFixed(2)}`;
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString() : "—";

  const handleRetry = async (id: string) => {
    setWorking(true);
    const { error } = await supabase.functions.invoke("process-booking-cancellation", { body: { bookingId: id } });
    setWorking(false);
    if (error) toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Retry queued" }); load(); }
  };

  const handleOverride = async () => {
    if (!overrideTarget) return;
    const pct = parseInt(overridePct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast({ title: "Enter 0–100", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase.rpc("admin_override_refund", {
      p_booking_id: overrideTarget.id,
      p_new_percentage: pct,
      p_note: overrideNote || null,
    });
    if (error) {
      setWorking(false);
      toast({ title: "Override failed", description: error.message, variant: "destructive" });
      return;
    }
    // Then process the refund at the new amount
    await supabase.functions.invoke("process-booking-cancellation", { body: { bookingId: overrideTarget.id } });
    setWorking(false);
    setOverrideTarget(null);
    setOverridePct("");
    setOverrideNote("");
    toast({ title: "Refund updated" });
    load();
  };

  const exportCsv = () => {
    const headers = ["cancelled_at", "advisor", "client", "meeting_type", "cancelled_by", "refund_percentage", "refund_amount_usd", "refund_status", "refund_id", "reason"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        r.cancelled_at ?? "",
        (r.advisor?.full_name ?? "").replace(/,/g, " "),
        (r.client?.full_name ?? "").replace(/,/g, " "),
        r.meeting_type,
        r.cancelled_by ?? "",
        String(r.refund_percentage ?? 0),
        ((r.refund_amount_cents ?? 0) / 100).toFixed(2),
        r.refund_status ?? "",
        r.refund_id ?? "",
        (r.cancellation_reason ?? "").replace(/[\n,]/g, " "),
      ];
      lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cancellations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-medium">Cancellations & Refunds</h1>
            <p className="text-sm text-muted-foreground">Review every cancellation, override refund amounts, retry failures.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Search by name or refund id" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Refund status" /></SelectTrigger>
              <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={byFilter} onValueChange={setByFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Cancelled by" /></SelectTrigger>
              <SelectContent>{byOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No cancellations found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3">Cancelled</th>
                    <th className="p-3">Appointment</th>
                    <th className="p-3">Advisor</th>
                    <th className="p-3">Client</th>
                    <th className="p-3">By</th>
                    <th className="p-3">Refund</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">{fmtDate(r.cancelled_at)}</td>
                      <td className="p-3 whitespace-nowrap">{fmtDate(r.slot?.start_time ?? null)}</td>
                      <td className="p-3">{r.advisor?.full_name ?? "—"}</td>
                      <td className="p-3">{r.client?.full_name ?? "—"}</td>
                      <td className="p-3 capitalize">{r.cancelled_by ?? "—"}</td>
                      <td className="p-3">{fmtMoney(r.refund_amount_cents)} ({r.refund_percentage ?? 0}%)</td>
                      <td className="p-3"><Badge variant="outline" className="capitalize">{r.refund_status ?? "none"}</Badge></td>
                      <td className="p-3 text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setOverrideTarget(r); setOverridePct(String(r.refund_percentage ?? 0)); }}>Override</Button>
                        {(r.refund_status === "failed" || r.refund_status === "pending" || r.refund_status === "manual") && (
                          <Button size="sm" variant="ghost" disabled={working} onClick={() => handleRetry(r.id)}>Retry</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!overrideTarget} onOpenChange={(o) => !o && setOverrideTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override refund</DialogTitle>
              <DialogDescription>
                Set a new refund percentage for this booking. A Stripe refund (or void) will be issued for the new amount.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium">New refund percentage (0–100)</label>
              <Input type="number" min={0} max={100} value={overridePct} onChange={(e) => setOverridePct(e.target.value)} />
              <label className="text-sm font-medium">Internal note</label>
              <Input value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideTarget(null)}>Cancel</Button>
              <Button onClick={handleOverride} disabled={working}>
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply & process"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminCancellations;
