import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CheckCircle2, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PayoutStatus {
  connected: boolean;
  country?: string;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  transfers_active?: boolean;
  requirements_due?: number;
}

const callConnect = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("stripe-connect", { body });
  if (error) {
    let message = error.message;
    const ctx = (error as unknown as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.clone().json();
        if (parsed?.error) message = parsed.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  return data;
};

/**
 * Stripe Connect payouts: set up (Stripe-hosted onboarding), finish setup, or
 * open the Stripe Express dashboard. Earnings are sent automatically once the
 * account is active.
 */
const PayoutSetupCard = ({ onStatus }: { onStatus?: (s: PayoutStatus) => void }) => {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [country, setCountry] = useState<string>("US");
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const s = (await callConnect({ action: "status" })) as PayoutStatus;
      setStatus(s);
      onStatus?.(s);
    } catch {
      setStatus({ connected: false });
    }
  }, [onStatus]);

  useEffect(() => {
    refresh();
    // Coming back from Stripe: clear the marker so a reload doesn't repeat it.
    if (searchParams.get("payouts")) {
      searchParams.delete("payouts");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = async (action: "onboard" | "dashboard") => {
    setBusy(true);
    try {
      const { url } = await callConnect(action === "onboard" ? { action, country } : { action });
      if (!url) throw new Error("No link received");
      window.location.href = url;
    } catch (e) {
      toast({
        title: action === "onboard" ? "Couldn't start payout setup" : "Couldn't open Stripe",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const active = !!status?.transfers_active && !!status?.payouts_enabled;
  const started = !!status?.connected && !active;

  return (
    <Card className="mb-8 border-gold/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-gold" aria-hidden="true" />
          Payouts
        </CardTitle>
        <CardDescription>
          {active
            ? "Your earnings are sent to your bank automatically, 48 hours after each completed session."
            : "Connect your bank account through Stripe to get paid automatically after each session."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!status ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking your payout setup…
          </div>
        ) : active ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Payouts are on
            </p>
            <Button variant="outline" onClick={() => go("dashboard")} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
              View payouts and bank details
            </Button>
          </div>
        ) : started ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 text-gold shrink-0" aria-hidden="true" />
              {status.details_submitted
                ? "Stripe is reviewing your details. This usually takes a few minutes; we'll start sending payouts as soon as it's done."
                : "Your payout setup isn't finished yet. It takes about 5 minutes."}
            </p>
            {(!status.details_submitted || (status.requirements_due ?? 0) > 0) && (
              <Button onClick={() => go("onboard")} disabled={busy} className="bg-gold hover:bg-gold/90 text-black">
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Finish payout setup
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1.5 sm:w-56">
              <label className="text-sm font-medium" htmlFor="payout-country">Where you'll be paid</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="payout-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => go("onboard")} disabled={busy} className="bg-gold hover:bg-gold/90 text-black">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Set up payouts with Stripe
            </Button>
          </div>
        )}
        {!active && (
          <p className="text-xs text-muted-foreground mt-3">
            Stripe asks for your name, date of birth, bank account and tax details. Cook A Look never sees your bank details.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutSetupCard;
