import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import PayoutSetupCard, { type PayoutStatus } from "@/components/advisor/PayoutSetupCard";

interface Payment {
  id: string;
  amount: number;
  advisor_payout: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  booking_id: string;
  escrow_status: string | null;
  stripe_transfer_id: string | null;
  transferred_at?: string | null;
  booking?: { status?: string | null; slot?: { start_time?: string | null; end_time?: string | null } | null } | null;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  processed_at: string | null;
}

interface EarningsSummary {
  totalEarnings: number;
  paidOut: number;
  onTheWay: number;
  totalSessions: number;
  thisMonthEarnings: number;
}

type PayoutState = "paid" | "scheduled" | "escrow" | "disputed" | "refunded" | "needs_setup";

const ESCROW_HOURS = 48;

const payoutOf = (p: Payment) => Number(p.advisor_payout || p.amount * 0.85);

const AdvisorEarnings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [payoutsActive, setPayoutsActive] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    paidOut: 0,
    onTheWay: 0,
    totalSessions: 0,
    thisMonthEarnings: 0,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signin?redirect=/advisor/earnings");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_advisor")
        .eq("user_id", session.user.id)
        .single();

      if (!profile || !profile.is_advisor) {
        toast({
          title: "Access denied",
          description: "This page is only available for advisors.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      const [{ data: paymentsData, error: paymentsError }, { data: withdrawalsData }] = await Promise.all([
        supabase
          .from("payments")
          .select("*, booking:bookings(status, slot:availability_slots(start_time, end_time))")
          .eq("advisor_id", profile.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false }),
        // Older manual withdrawal requests, shown only if there are any.
        supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("advisor_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);

      if (paymentsError) throw paymentsError;
      const list = (paymentsData || []) as unknown as Payment[];
      setPayments(list);
      setWithdrawals(withdrawalsData || []);

      let paidOut = 0;
      let onTheWay = 0;
      let totalEarnings = 0;
      for (const p of list) {
        if (p.escrow_status === "refunded" || p.booking?.status === "cancelled") continue;
        totalEarnings += payoutOf(p);
        if (p.stripe_transfer_id) paidOut += payoutOf(p);
        else onTheWay += payoutOf(p);
      }
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEarnings = list
        .filter((p) => new Date(p.created_at) >= thisMonthStart && p.escrow_status !== "refunded" && p.booking?.status !== "cancelled")
        .reduce((sum, p) => sum + payoutOf(p), 0);

      setSummary({
        totalEarnings,
        paidOut,
        onTheWay,
        totalSessions: list.length,
        thisMonthEarnings,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading earnings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const payoutState = (p: Payment): PayoutState => {
    if (p.stripe_transfer_id) return "paid";
    if (p.escrow_status === "refunded" || p.booking?.status === "cancelled") return "refunded";
    if (p.escrow_status === "disputed") return "disputed";
    const end = p.booking?.slot?.end_time || p.booking?.slot?.start_time;
    const cleared = end ? Date.now() >= new Date(end).getTime() + ESCROW_HOURS * 3600_000 : false;
    if (!cleared) return "escrow";
    return payoutsActive ? "scheduled" : "needs_setup";
  };

  const payoutBadge = (p: Payment) => {
    switch (payoutState(p)) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid out</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Sending soon</Badge>;
      case "escrow":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">In escrow</Badge>;
      case "disputed":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">On hold (problem reported)</Badge>;
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>;
      case "needs_setup":
        return <Badge className="bg-gold/10 text-foreground border-gold/30">Set up payouts to receive</Badge>;
    }
  };

  const withdrawalBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </Layout>
    );
  }

  const cards = [
    { title: "Paid Out", value: summary.paidOut, note: "Sent to your bank account", Icon: Wallet, tone: "text-green-600" },
    { title: "Total Earnings", value: summary.totalEarnings, note: "Lifetime earnings", Icon: DollarSign, tone: "" },
    { title: "This Month", value: summary.thisMonthEarnings, note: `${summary.totalSessions} sessions total`, Icon: TrendingUp, tone: "" },
    { title: "On the Way", value: summary.onTheWay, note: "In escrow or about to be sent", Icon: Clock, tone: "text-yellow-600" },
  ];

  return (
    <Layout>
      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-medium">
              Your Earnings & Payouts
            </h1>
          </div>

          <PayoutSetupCard onStatus={(s: PayoutStatus) => setPayoutsActive(!!s.transfers_active && !!s.payouts_enabled)} />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(({ title, value, note, Icon, tone }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <Icon className="w-4 h-4 text-gold" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${tone}`}>${value.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{note}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="space-y-8">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold" />
                  Recent Payments
                </CardTitle>
                <CardDescription>
                  Your earnings from each session, after the platform fee
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No payments yet. Complete sessions to start earning!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Session Total</TableHead>
                          <TableHead>Platform Fee</TableHead>
                          <TableHead>Your Earnings</TableHead>
                          <TableHead>Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.slice(0, 20).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.booking?.slot?.start_time || payment.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              -${Number(payment.platform_fee || payment.amount * 0.15).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              ${payoutOf(payment).toFixed(2)}
                            </TableCell>
                            <TableCell>{payoutBadge(payment)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {withdrawals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownToLine className="w-5 h-5 text-gold" />
                    Earlier Withdrawal Requests
                  </CardTitle>
                  <CardDescription>
                    Requests made before automatic payouts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Requested</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Processed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>{format(new Date(withdrawal.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="font-semibold">${Number(withdrawal.amount).toFixed(2)}</TableCell>
                            <TableCell>{withdrawalBadge(withdrawal.status)}</TableCell>
                            <TableCell>
                              {withdrawal.processed_at ? format(new Date(withdrawal.processed_at), "MMM d, yyyy") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Box */}
          <Card className="mt-8 bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2">How Payouts Work</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  You keep 85% of each session price. After 9 completed bookings in a calendar month, the platform fee drops to 10% for the rest of that month.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Payment is held in escrow until 48 hours after your session, in case the client reports a problem.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Then your share is sent to your Stripe account automatically. Nothing to request.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  Stripe deposits it into your bank account, usually within 2 to 5 business days.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorEarnings;
