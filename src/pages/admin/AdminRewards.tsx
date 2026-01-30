import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Settings, Gift, History, Plus, Save, Search, CreditCard, Users, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RewardSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string;
  updated_at: string;
}

interface PointTransaction {
  id: string;
  user_id: string;
  action_type: string;
  points: number;
  description: string | null;
  created_at: string;
  created_by: string | null;
  user_email?: string;
}

interface SiteCreditLog {
  id: string;
  user_id: string;
  action_type: string;
  amount_cents: number;
  balance_after_cents: number;
  description: string | null;
  created_at: string;
  created_by: string | null;
  user_email?: string;
}

interface UserReward {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  current_tier: string;
  site_credit_cents: number;
  credit_expires_at: string | null;
  email?: string;
  full_name?: string;
}

const AdminRewards = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RewardSetting[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [creditLogs, setCreditLogs] = useState<SiteCreditLog[]>([]);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [editedSettings, setEditedSettings] = useState<Record<string, number>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Manual credit/points modal state
  const [manualCreditOpen, setManualCreditOpen] = useState(false);
  const [manualAction, setManualAction] = useState<"points" | "credit">("points");
  const [manualUserId, setManualUserId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [processingManual, setProcessingManual] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, transactionsRes, creditLogsRes, userRewardsRes] = await Promise.all([
        supabase.from("reward_settings").select("*").order("setting_key"),
        supabase.from("point_transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("site_credits_log").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("user_rewards").select("*").order("lifetime_points", { ascending: false }),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        const edits: Record<string, number> = {};
        settingsRes.data.forEach((s) => {
          edits[s.setting_key] = s.setting_value;
        });
        setEditedSettings(edits);
      }

      setTransactions(transactionsRes.data || []);
      setCreditLogs(creditLogsRes.data || []);
      setUserRewards(userRewardsRes.data || []);
    } catch (error) {
      console.error("Error fetching rewards data:", error);
      toast({
        title: "Error",
        description: "Failed to load rewards data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      for (const [key, value] of Object.entries(editedSettings)) {
        await supabase
          .from("reward_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq("setting_key", key);
      }

      toast({
        title: "Settings saved",
        description: "Reward settings have been updated successfully.",
      });

      fetchData();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleManualAward = async () => {
    if (!manualUserId || !manualAmount) {
      toast({
        title: "Missing information",
        description: "Please provide user ID and amount",
        variant: "destructive",
      });
      return;
    }

    setProcessingManual(true);
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      if (manualAction === "points") {
        // Award points using the database function
        const { error } = await supabase.rpc("award_client_points", {
          _user_id: manualUserId,
          _action_type: "admin_adjustment",
          _points: parseInt(manualAmount),
          _description: manualDescription || "Manual admin adjustment",
          _reference_id: null,
          _created_by: currentUser?.id || null,
        });

        if (error) throw error;

        toast({
          title: "Points awarded",
          description: `${manualAmount} points have been awarded to the user.`,
        });
      } else {
        // First get current credit balance
        const { data: currentRewards } = await supabase
          .from("user_rewards")
          .select("site_credit_cents")
          .eq("user_id", manualUserId)
          .single();
        
        const currentCredit = currentRewards?.site_credit_cents || 0;
        const newCredit = currentCredit + parseInt(manualAmount) * 100;

        // Update credit
        const { error } = await supabase
          .from("user_rewards")
          .update({
            site_credit_cents: newCredit,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", manualUserId);

        if (error) throw error;

        // Log the credit
        await supabase.from("site_credits_log").insert({
          user_id: manualUserId,
          action_type: "admin_issue",
          amount_cents: parseInt(manualAmount) * 100,
          balance_after_cents: newCredit,
          description: manualDescription || "Manual admin credit",
          created_by: currentUser?.id || null,
        });

        toast({
          title: "Credit issued",
          description: `$${manualAmount} credit has been added to the user.`,
        });
      }

      setManualCreditOpen(false);
      setManualUserId("");
      setManualAmount("");
      setManualDescription("");
      fetchData();
    } catch (error) {
      console.error("Error with manual award:", error);
      toast({
        title: "Error",
        description: "Failed to process manual award",
        variant: "destructive",
      });
    } finally {
      setProcessingManual(false);
    }
  };

  const formatActionType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "vip":
        return "default";
      case "insider":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filteredUserRewards = userRewards.filter((ur) =>
    searchQuery
      ? ur.user_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const settingsGroups = {
    points: settings.filter((s) => s.setting_key.includes("points") || s.setting_key.includes("threshold")),
    credits: settings.filter((s) => s.setting_key.includes("credit") || s.setting_key.includes("expiry")),
    advisor: settings.filter((s) => s.setting_key.includes("advisor") || s.setting_key.includes("fee")),
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Rewards Management</h1>
              <p className="text-muted-foreground">
                Configure point values, tier thresholds, and manage user rewards
              </p>
            </div>
          </div>
          <Dialog open={manualCreditOpen} onOpenChange={setManualCreditOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Manual Award
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Points/Credit Award</DialogTitle>
                <DialogDescription>
                  Award points or site credits to a specific user
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Award Type</Label>
                  <Select value={manualAction} onValueChange={(v) => setManualAction(v as "points" | "credit")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Points</SelectItem>
                      <SelectItem value="credit">Site Credit ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    placeholder="Enter user UUID"
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount {manualAction === "credit" ? "($)" : "(points)"}</Label>
                  <Input
                    type="number"
                    placeholder={manualAction === "credit" ? "25" : "100"}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Reason for the award..."
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManualCreditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualAward} disabled={processingManual}>
                  {processingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Award
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Points Log
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Credits Log
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Points Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-gold" />
                    Point Values & Tiers
                  </CardTitle>
                  <CardDescription>Configure how points are earned and tier thresholds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settingsGroups.points.map((setting) => (
                    <div key={setting.id} className="space-y-2">
                      <Label className="text-sm">{setting.description}</Label>
                      <Input
                        type="number"
                        value={editedSettings[setting.setting_key] ?? setting.setting_value}
                        onChange={(e) =>
                          setEditedSettings({
                            ...editedSettings,
                            [setting.setting_key]: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Credit Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Site Credits
                  </CardTitle>
                  <CardDescription>Tier upgrade bonuses and expiration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settingsGroups.credits.map((setting) => (
                    <div key={setting.id} className="space-y-2">
                      <Label className="text-sm">{setting.description}</Label>
                      <Input
                        type="number"
                        value={editedSettings[setting.setting_key] ?? setting.setting_value}
                        onChange={(e) =>
                          setEditedSettings({
                            ...editedSettings,
                            [setting.setting_key]: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      {setting.setting_key.includes("cents") && (
                        <p className="text-xs text-muted-foreground">
                          Currently: ${((editedSettings[setting.setting_key] ?? setting.setting_value) / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Advisor Fee Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    Advisor Fees
                  </CardTitle>
                  <CardDescription>Platform fee structure for advisors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settingsGroups.advisor.map((setting) => (
                    <div key={setting.id} className="space-y-2">
                      <Label className="text-sm">{setting.description}</Label>
                      <Input
                        type="number"
                        value={editedSettings[setting.setting_key] ?? setting.setting_value}
                        onChange={(e) =>
                          setEditedSettings({
                            ...editedSettings,
                            [setting.setting_key]: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      {setting.setting_key.includes("percent") && <p className="text-xs text-muted-foreground">%</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </Button>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Rewards</CardTitle>
                <CardDescription>View and manage user points and tiers</CardDescription>
                <div className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 max-w-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="text-right">Lifetime</TableHead>
                      <TableHead className="text-right">Site Credit</TableHead>
                      <TableHead>Credit Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserRewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell className="font-mono text-xs">
                          {reward.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTierBadgeVariant(reward.current_tier)}>
                            {reward.current_tier.charAt(0).toUpperCase() + reward.current_tier.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{reward.total_points.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{reward.lifetime_points.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {reward.site_credit_cents > 0 ? (
                            <span className="text-primary font-medium">
                              ${(reward.site_credit_cents / 100).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {reward.credit_expires_at ? (
                            <span className={new Date(reward.credit_expires_at) < new Date() ? "text-destructive" : ""}>
                              {format(new Date(reward.credit_expires_at), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUserRewards.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Points Log Tab */}
          <TabsContent value="points">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Points Transaction Log
                </CardTitle>
                <CardDescription>Full audit log of all points earned</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell className="font-mono text-xs">{tx.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatActionType(tx.action_type)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          +{tx.points}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{tx.description || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Log Tab */}
          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Site Credits Log
                </CardTitle>
                <CardDescription>Full audit log of credits issued and redeemed</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell className="font-mono text-xs">{log.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant={log.action_type === "redeemed" ? "destructive" : "default"}>
                            {formatActionType(log.action_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${log.amount_cents >= 0 ? "text-primary" : "text-destructive"}`}>
                          {log.amount_cents >= 0 ? "+" : ""}${(log.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">${(log.balance_after_cents / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">{log.description || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {creditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No credit transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminRewards;
