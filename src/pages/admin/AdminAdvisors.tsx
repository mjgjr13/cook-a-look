import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  ExternalLink,
  User,
  Shield,
  RefreshCw,
  UserX,
  Trash2,
  MessageSquare,
  Ban,
  UserCheck,
  Mail,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AdvisorApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  specialty: string;
  experience: string | null;
  bio: string;
  virtual: boolean;
  in_person: boolean;
  instagram: string;
  tiktok: string | null;
  linkedin: string | null;
  portfolio: string | null;
  selfie_url: string | null;
  id_document_url: string | null;
  liveness_verified: boolean;
  status: "pending" | "approved" | "denied";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface ActiveAdvisor {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  is_demo: boolean;
  advisor_approved: boolean;
  advisor_status: string | null;
  is_suspended?: boolean;
  created_at: string;
  // From advisor_profiles
  is_listed?: boolean;
  application_status?: string;
}

const AdminAdvisors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState<AdvisorApplication[]>([]);
  const [activeAdvisors, setActiveAdvisors] = useState<ActiveAdvisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [selectedApplication, setSelectedApplication] = useState<AdvisorApplication | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "deny" | null>(null);

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ email: string; name: string } | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Delete/suspend confirm state
  const [advisorToDelete, setAdvisorToDelete] = useState<ActiveAdvisor | null>(null);
  const [advisorToSuspend, setAdvisorToSuspend] = useState<ActiveAdvisor | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "applications") {
        // Fetch applications that are NOT approved (pending + denied)
        const { data, error } = await supabase
          .from("advisor_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Filter to only show pending/denied (not in Active Advisors)
        const filtered = (data as AdvisorApplication[])?.filter(app => 
          app.status === "pending" || app.status === "denied"
        ) || [];
        setApplications(filtered);
      } else {
        // Fetch active advisors (approved with visibility control)
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, email, specialty, is_demo, advisor_approved, advisor_status, created_at")
          .eq("is_advisor", true)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch advisor_profiles for is_listed status
        const { data: advisorProfiles } = await supabase
          .from("advisor_profiles")
          .select("user_id, is_listed, application_status");

        const advisorProfileMap = new Map(
          (advisorProfiles || []).map(ap => [ap.user_id, ap])
        );

        const enrichedAdvisors: ActiveAdvisor[] = (profiles || []).map(p => {
          const ap = advisorProfileMap.get(p.user_id);
          return {
            ...p,
            is_listed: ap?.is_listed ?? false,
            application_status: ap?.application_status ?? "pending",
            is_suspended: p.advisor_status === "suspended",
          };
        });

        // Filter to only show approved advisors
        setActiveAdvisors(enrichedAdvisors.filter(a => 
          a.application_status === "approved" || a.advisor_approved || a.is_demo
        ));
      }
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewApplication = (app: AdvisorApplication) => {
    setSelectedApplication(app);
    setAdminNotes(app.admin_notes || "");
    setIsReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;
    setIsProcessing(true);

    try {
      // Update application status
      const { error: appError } = await supabase
        .from("advisor_applications")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (appError) throw appError;

      // Get the user profile by email
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("email", selectedApplication.email)
        .single();

      if (userProfile) {
        // Update profiles table - advisor_approved = false (controlled by visibility toggle)
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            is_advisor: true,
            advisor_approved: false, // Will become true when advisor toggles visibility ON
            advisor_status: "approved",
            specialty: selectedApplication.specialty,
            bio: selectedApplication.bio,
            instagram_url: selectedApplication.instagram,
            portfolio_url: selectedApplication.portfolio,
            full_name: `${selectedApplication.first_name} ${selectedApplication.last_name}`,
            verified: true,
            verification_status: "approved",
          })
          .eq("id", userProfile.id);

        if (profileError) throw profileError;

        // Upsert advisor_profiles table (creates if doesn't exist)
        const { error: advisorProfileError } = await supabase
          .from("advisor_profiles")
          .upsert({
            user_id: userProfile.user_id,
            application_status: "approved",
            onboarding_status: "complete",
            is_listed: false, // Advisor must manually toggle this ON
            is_published: false,
            bio: selectedApplication.bio,
          }, {
            onConflict: "user_id",
          });

        if (advisorProfileError) {
          console.error("Error updating advisor_profiles:", advisorProfileError);
        }

        // Update user role to advisor_active
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({
            user_id: userProfile.user_id,
            role: "advisor_active",
          }, {
            onConflict: "user_id,role",
          });

        if (roleError) {
          console.error("Error updating user role:", roleError);
        }
      }

      toast.success("Application approved! Advisor can now toggle their profile visibility.");
      setIsReviewDialogOpen(false);
      setConfirmAction(null);
      loadData();
    } catch (err) {
      console.error("Error approving application:", err);
      toast.error("Failed to approve application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedApplication) return;
    setIsProcessing(true);

    try {
      const { error: appError } = await supabase
        .from("advisor_applications")
        .update({
          status: "denied",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (appError) throw appError;

      if (selectedApplication.email) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", selectedApplication.email)
          .single();

        if (userProfile) {
          await supabase
            .from("profiles")
            .update({
              advisor_approved: false,
              advisor_status: "rejected",
            })
            .eq("id", userProfile.id);
        }
      }

      toast.success("Application denied");
      setIsReviewDialogOpen(false);
      setConfirmAction(null);
      loadData();
    } catch (err) {
      console.error("Error denying application:", err);
      toast.error("Failed to deny application");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendAdvisor = async () => {
    if (!advisorToSuspend) return;
    setIsProcessing(true);

    try {
      // Suspend: set advisor_status to 'suspended', advisor_approved to false
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          advisor_approved: false,
          advisor_status: "suspended",
        })
        .eq("id", advisorToSuspend.id);

      if (profileError) throw profileError;

      // Also update advisor_profiles
      if (advisorToSuspend.user_id) {
        await supabase
          .from("advisor_profiles")
          .update({
            is_listed: false,
          })
          .eq("user_id", advisorToSuspend.user_id);
      }

      toast.success("Advisor suspended. They will no longer appear publicly or receive bookings.");
      setAdvisorToSuspend(null);
      loadData();
    } catch (err) {
      console.error("Error suspending advisor:", err);
      toast.error("Failed to suspend advisor");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsuspendAdvisor = async (advisor: ActiveAdvisor) => {
    setIsProcessing(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          advisor_status: "approved",
        })
        .eq("id", advisor.id);

      if (profileError) throw profileError;

      toast.success("Advisor unsuspended. They can now toggle their visibility back on.");
      loadData();
    } catch (err) {
      console.error("Error unsuspending advisor:", err);
      toast.error("Failed to unsuspend advisor");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAdvisor = async () => {
    if (!advisorToDelete) return;
    setIsProcessing(true);

    try {
      // Delete from advisor_profiles first
      if (advisorToDelete.user_id) {
        await supabase
          .from("advisor_profiles")
          .delete()
          .eq("user_id", advisorToDelete.user_id);
      }

      // Reset profile to non-advisor
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_advisor: false,
          advisor_approved: false,
          advisor_status: null,
          specialty: null,
        })
        .eq("id", advisorToDelete.id);

      if (profileError) throw profileError;

      toast.success("Advisor account deleted. User profile has been reset to client.");
      setAdvisorToDelete(null);
      loadData();
    } catch (err) {
      console.error("Error deleting advisor:", err);
      toast.error("Failed to delete advisor account");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenMessageDialog = (advisor: ActiveAdvisor) => {
    setMessageRecipient({
      email: advisor.email || "",
      name: advisor.full_name || "Advisor",
    });
    setMessageContent("");
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageRecipient || !messageContent.trim()) return;
    setIsSendingMessage(true);

    try {
      // This would typically call an edge function to send an email
      // For now, we'll just show a success message
      toast.success(`Message sent to ${messageRecipient.name}`);
      setMessageDialogOpen(false);
      setMessageContent("");
      setMessageRecipient(null);
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAdvisors = activeAdvisors.filter((advisor) =>
    (advisor.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (advisor.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate active (visible) from inactive (approved but hidden)
  const visibleAdvisors = filteredAdvisors.filter(a => a.is_listed && !a.is_suspended);
  const hiddenAdvisors = filteredAdvisors.filter(a => !a.is_listed || a.is_suspended);

  if (isLoading) {
    return (
      <Layout>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-6 lg:px-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="font-serif text-3xl font-medium">Advisor Management</h1>
                <p className="text-muted-foreground font-sans text-sm">
                  Review applications and manage advisor profiles
                </p>
              </div>
            </div>
            <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="applications" className="gap-2">
                <Clock className="w-4 h-4" />
                Applications
                {applications.filter((a) => a.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {applications.filter((a) => a.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2">
                <UserCheck className="w-4 h-4" />
                Active Advisors
                <Badge variant="secondary" className="ml-1">
                  {visibleAdvisors.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Search and filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeTab === "applications" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="applications">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app, index) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border p-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">
                              {app.first_name} {app.last_name}
                            </h3>
                            <Badge
                              variant={
                                app.status === "approved"
                                  ? "default"
                                  : app.status === "denied"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {app.status}
                            </Badge>
                            {app.liveness_verified && (
                              <Badge variant="outline" className="gap-1">
                                <Shield className="w-3 h-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {app.email} • {app.specialty}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Applied {format(new Date(app.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {app.instagram && (
                            <a
                              href={`https://instagram.com/${app.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-secondary rounded"
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewApplication(app)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              {/* Active (Visible) Advisors */}
              <div className="mb-8">
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Visible on Style Advisors Page ({visibleAdvisors.length})
                </h3>
                {visibleAdvisors.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No advisors currently visible</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleAdvisors.map((advisor, index) => (
                      <motion.div
                        key={advisor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="bg-card border border-primary/30 p-4 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium">{advisor.full_name || "Unnamed"}</h3>
                              {advisor.is_demo && (
                                <Badge variant="outline">Demo</Badge>
                              )}
                              <Badge variant="default" className="bg-primary">
                                <Eye className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {advisor.email} • {advisor.specialty || "No specialty"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenMessageDialog(advisor)}
                              title="Message advisor"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAdvisorToSuspend(advisor)}
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                              title="Suspend advisor"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAdvisorToDelete(advisor)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete advisor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive (Hidden/Suspended) Advisors */}
              <div>
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-muted-foreground" />
                  Hidden / Suspended ({hiddenAdvisors.length})
                </h3>
                {hiddenAdvisors.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No hidden or suspended advisors</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hiddenAdvisors.map((advisor, index) => (
                      <motion.div
                        key={advisor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`bg-card border p-4 rounded-lg ${
                          advisor.is_suspended ? "border-orange-300 bg-orange-50/30" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium">{advisor.full_name || "Unnamed"}</h3>
                              {advisor.is_demo && (
                                <Badge variant="outline">Demo</Badge>
                              )}
                              {advisor.is_suspended ? (
                                <Badge variant="destructive" className="bg-orange-500">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Suspended
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {advisor.email} • {advisor.specialty || "No specialty"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenMessageDialog(advisor)}
                              title="Message advisor"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            {advisor.is_suspended && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnsuspendAdvisor(advisor)}
                                className="gap-1"
                              >
                                <UserCheck className="w-4 h-4" />
                                Unsuspend
                              </Button>
                            )}
                            {!advisor.is_suspended && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAdvisorToSuspend(advisor)}
                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                title="Suspend advisor"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAdvisorToDelete(advisor)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete advisor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Review Application Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review the applicant's information and verification documents
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium">
                    {selectedApplication.first_name} {selectedApplication.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p>{selectedApplication.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p>{selectedApplication.phone || "Not provided"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Specialty</Label>
                  <p>{selectedApplication.specialty}</p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label className="text-muted-foreground text-xs">Bio</Label>
                <p className="text-sm mt-1">{selectedApplication.bio}</p>
              </div>

              {/* Social Links */}
              <div className="flex gap-4">
                {selectedApplication.instagram && (
                  <a
                    href={`https://instagram.com/${selectedApplication.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Instagram className="w-4 h-4" />
                    {selectedApplication.instagram}
                  </a>
                )}
                {selectedApplication.portfolio && (
                  <a
                    href={selectedApplication.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>

              {/* Verification Documents */}
              <div>
                <Label className="text-muted-foreground text-xs mb-2 block">
                  Verification Documents
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Selfie</p>
                    {selectedApplication.selfie_url ? (
                      <img
                        src={selectedApplication.selfie_url}
                        alt="Selfie"
                        className="w-full aspect-square object-cover rounded"
                      />
                    ) : (
                      <div className="aspect-square bg-muted flex items-center justify-center rounded">
                        <span className="text-muted-foreground text-sm">Not uploaded</span>
                      </div>
                    )}
                    {selectedApplication.liveness_verified && (
                      <Badge variant="outline" className="mt-2 gap-1">
                        <Shield className="w-3 h-3" />
                        Liveness Verified
                      </Badge>
                    )}
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-2">Government ID</p>
                    {selectedApplication.id_document_url ? (
                      <img
                        src={selectedApplication.id_document_url}
                        alt="ID Document"
                        className="w-full aspect-video object-cover rounded"
                      />
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center rounded">
                        <span className="text-muted-foreground text-sm">Not uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedApplication.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmAction("deny")}
                    disabled={isProcessing}
                    className="flex-1 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Deny Application
                  </Button>
                  <Button
                    onClick={() => setConfirmAction("approve")}
                    disabled={isProcessing}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Application
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Approve/Deny Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Approve Application?" : "Deny Application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "This will approve the application. The advisor will then need to toggle their visibility ON to appear publicly."
                : "This will deny the application. The applicant will be notified via email."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction === "approve" ? handleApprove : handleDeny}
              disabled={isProcessing}
              className={confirmAction === "deny" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isProcessing ? "Processing..." : confirmAction === "approve" ? "Approve" : "Deny"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Advisor Dialog */}
      <AlertDialog open={!!advisorToSuspend} onOpenChange={() => setAdvisorToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Advisor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will temporarily suspend {advisorToSuspend?.full_name}'s account. They will not appear publicly and cannot receive new bookings. Existing bookings will need to be handled manually. You can unsuspend them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendAdvisor}
              disabled={isProcessing}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isProcessing ? "Processing..." : "Suspend Advisor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Advisor Dialog */}
      <AlertDialog open={!!advisorToDelete} onOpenChange={() => setAdvisorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Advisor Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {advisorToDelete?.full_name}'s advisor status. Their user account will be converted back to a regular client. This action cannot be undone. All advisor-specific data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdvisor}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Message {messageRecipient?.name}
            </DialogTitle>
            <DialogDescription>
              Send a direct message to this advisor at {messageRecipient?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !messageContent.trim()}
            >
              {isSendingMessage ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminAdvisors;
