import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Wallet,
  ArrowDownToLine,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  availableBalance: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
  totalSessions: number;
  thisMonthEarnings: number;
}

const AdvisorEarnings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    totalWithdrawn: 0,
    totalSessions: 0,
    thisMonthEarnings: 0,
  });
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/signin?redirect=/advisor/earnings");
        return;
      }

      // Get profile ID
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

      setProfileId(profile.id);

      // Load payments where this advisor received money
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("advisor_id", profile.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Load withdrawal requests
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("advisor_id", profile.id)
        .order("created_at", { ascending: false });

      if (withdrawalsError) throw withdrawalsError;
      setWithdrawals(withdrawalsData || []);

      // Calculate summary
      const totalEarnings = (paymentsData || []).reduce(
        (sum, p) => sum + Number(p.advisor_payout || p.amount * 0.85), 
        0
      );

      const pendingWithdrawals = (withdrawalsData || [])
        .filter(w => w.status === "pending" || w.status === "approved")
        .reduce((sum, w) => sum + Number(w.amount), 0);

      const totalWithdrawn = (withdrawalsData || [])
        .filter(w => w.status === "completed")
        .reduce((sum, w) => sum + Number(w.amount), 0);

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthEarnings = (paymentsData || [])
        .filter(p => new Date(p.created_at) >= thisMonthStart)
        .reduce((sum, p) => sum + Number(p.advisor_payout || p.amount * 0.85), 0);

      setSummary({
        totalEarnings,
        availableBalance: totalEarnings - totalWithdrawn - pendingWithdrawals,
        pendingWithdrawals,
        totalWithdrawn,
        totalSessions: (paymentsData || []).length,
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

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (amount > summary.availableBalance) {
      toast({
        title: "Insufficient balance",
        description: "You cannot withdraw more than your available balance.",
        variant: "destructive",
      });
      return;
    }

    if (amount < 25) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is $25.",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          advisor_id: profileId,
          amount,
          payment_method: "bank_transfer",
        });

      if (error) throw error;

      toast({
        title: "Withdrawal requested",
        description: "Your withdrawal request has been submitted for review.",
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      loadData();
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Request failed",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  return (
    <Layout>
      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-1">
                Earnings Dashboard
              </p>
              <h1 className="font-serif text-2xl md:text-3xl font-medium">
                Your Earnings & Withdrawals
              </h1>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                  <Wallet className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${summary.availableBalance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready to withdraw
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Earnings
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${summary.totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lifetime earnings
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Month
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${summary.thisMonthEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.totalSessions} sessions total
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Withdrawals
                  </CardTitle>
                  <Clock className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${summary.pendingWithdrawals.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${summary.totalWithdrawn.toFixed(2)} withdrawn
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Withdraw Button */}
          <div className="mb-8">
            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  disabled={summary.availableBalance < 25}
                  className="bg-gold hover:bg-gold/90 text-black"
                >
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                  <DialogDescription>
                    Enter the amount you'd like to withdraw. Minimum withdrawal is $25.
                    Withdrawals are typically processed within 3-5 business days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="25"
                      max={summary.availableBalance}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                    <p className="text-sm text-muted-foreground">
                      Available: ${summary.availableBalance.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setWithdrawAmount(summary.availableBalance.toFixed(2))}
                  >
                    Withdraw full balance
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleWithdrawRequest} disabled={isWithdrawing}>
                    {isWithdrawing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {summary.availableBalance < 25 && (
              <p className="text-sm text-muted-foreground mt-2">
                Minimum withdrawal amount is $25. Earn ${(25 - summary.availableBalance).toFixed(2)} more to withdraw.
              </p>
            )}
          </div>

          {/* Tabs for Payments and Withdrawals */}
          <div className="space-y-8">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold" />
                  Recent Payments
                </CardTitle>
                <CardDescription>
                  Your earnings from completed sessions (after 15% platform fee)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No payments yet. Complete sessions to start earning!
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Session Total</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Your Earnings</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 10).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>${Number(payment.amount).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            -${Number(payment.platform_fee || payment.amount * 0.15).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${Number(payment.advisor_payout || payment.amount * 0.85).toFixed(2)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-gold" />
                  Withdrawal History
                </CardTitle>
                <CardDescription>
                  Track your withdrawal requests and payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No withdrawal requests yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date Requested</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>
                            {format(new Date(withdrawal.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${Number(withdrawal.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {withdrawal.payment_method?.replace("_", " ") || "—"}
                          </TableCell>
                          <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                          <TableCell>
                            {withdrawal.processed_at 
                              ? format(new Date(withdrawal.processed_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Box */}
          <Card className="mt-8 bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2">How Payouts Work</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  You receive 85% of each session price (15% platform fee)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  Minimum withdrawal amount is $25
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  Withdrawals are processed within 3-5 business days
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  Payment is sent via bank transfer to your registered account
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