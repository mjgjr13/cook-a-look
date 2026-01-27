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
  Calendar,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AdvisorApplication {
  id: string;
  user_id: string;
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

interface AdvisorProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  is_demo: boolean;
  advisor_approved: boolean;
  advisor_status: string | null;
  demo_availability_enabled: boolean;
  created_at: string;
}

interface AdvisorProfileRecord {
  id: string;
  user_id: string;
  status: string;
  is_published: boolean;
  price: number | null;
  bio: string | null;
  created_at: string;
}

const AdminAdvisors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState<AdvisorApplication[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [advisorProfiles, setAdvisorProfiles] = useState<AdvisorProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  
  const [selectedApplication, setSelectedApplication] = useState<AdvisorApplication | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "applications") {
        // Only show pending applications
        const { data, error } = await supabase
          .from("advisor_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setApplications((data as AdvisorApplication[]) || []);
      } else {
        // Fetch active advisors from advisor_profiles with status approved or active
        const [profilesResult, advisorProfilesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, user_id, full_name, email, specialty, is_demo, advisor_approved, advisor_status, demo_availability_enabled, created_at")
            .or("is_advisor.eq.true,is_demo.eq.true")
            .order("created_at", { ascending: false }),
          supabase
            .from("advisor_profiles")
            .select("*")
            .in("status", ["approved", "active"])
            .order("created_at", { ascending: false }),
        ]);

        if (profilesResult.error) throw profilesResult.error;
        setAdvisors((profilesResult.data as AdvisorProfile[]) || []);
        setAdvisorProfiles((advisorProfilesResult.data as AdvisorProfileRecord[]) || []);
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
      const userId = selectedApplication.user_id;

      // 1. Update advisor_profiles status to 'approved'
      const { error: advisorProfileError } = await supabase
        .from("advisor_profiles")
        .update({
          status: "approved",
          is_published: false, // Not published until onboarding complete
        })
        .eq("user_id", userId);

      if (advisorProfileError) {
        console.error("Advisor profile update error:", advisorProfileError);
        // If no advisor_profile exists, create one
        await supabase
          .from("advisor_profiles")
          .insert({
            user_id: userId,
            status: "approved",
            is_published: false,
            bio: selectedApplication.bio,
            specialties: [selectedApplication.specialty],
          });
      }

      // 2. Update the profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_advisor: true,
          advisor_approved: true,
          advisor_status: "approved",
          specialty: selectedApplication.specialty,
          bio: selectedApplication.bio,
          instagram_url: selectedApplication.instagram,
          portfolio_url: selectedApplication.portfolio,
          full_name: `${selectedApplication.first_name} ${selectedApplication.last_name}`,
          verified: true,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // 3. Delete from advisor_applications (approved = no longer pending)
      const { error: deleteError } = await supabase
        .from("advisor_applications")
        .delete()
        .eq("id", selectedApplication.id);

      if (deleteError) {
        // If delete fails, just update status
        await supabase
          .from("advisor_applications")
          .update({
            status: "approved",
            admin_notes: adminNotes,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", selectedApplication.id);
      }

      toast.success("Advisor approved! They will be prompted to complete onboarding.");
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
      const userId = selectedApplication.user_id;

      // Update advisor_profiles status to rejected
      await supabase
        .from("advisor_profiles")
        .update({
          status: "rejected",
          is_published: false,
        })
        .eq("user_id", userId);

      // Update profiles
      await supabase
        .from("profiles")
        .update({
          advisor_approved: false,
          advisor_status: "rejected",
        })
        .eq("user_id", userId);

      // Update application status
      await supabase
        .from("advisor_applications")
        .update({
          status: "denied",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

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

  const toggleDemoAvailability = async (advisorId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ demo_availability_enabled: enabled })
        .eq("id", advisorId);

      if (error) throw error;

      if (enabled) {
        await generateDemoSlots(advisorId);
      }

      toast.success(enabled ? "Demo availability enabled" : "Demo availability disabled");
      loadData();
    } catch (err) {
      console.error("Error toggling demo availability:", err);
      toast.error("Failed to update availability settings");
    }
  };

  const generateDemoSlots = async (advisorId: string) => {
    const slots = [];
    const now = new Date();

    for (let day = 0; day < 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      for (const hour of [10, 14, 16]) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1);

        if (startTime > now) {
          slots.push({
            advisor_id: advisorId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            is_virtual: true,
            is_booked: false,
          });
        }
      }
    }

    if (slots.length > 0) {
      await supabase.from("availability_slots").insert(slots);
    }
  };

  const toggleAdvisorPublished = async (userId: string, published: boolean) => {
    try {
      const { error } = await supabase
        .from("advisor_profiles")
        .update({ 
          is_published: published,
          status: published ? "active" : "approved",
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(published ? "Advisor is now publicly visible" : "Advisor hidden from public");
      loadData();
    } catch (err) {
      console.error("Error toggling published:", err);
      toast.error("Failed to update advisor visibility");
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredAdvisors = advisors.filter((advisor) =>
    (advisor.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (advisor.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get advisor profile status for each advisor
  const getAdvisorStatus = (userId: string) => {
    const ap = advisorProfiles.find(p => p.user_id === userId);
    return ap ? { status: ap.status, is_published: ap.is_published } : null;
  };

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
              <TabsTrigger value="advisors" className="gap-2">
                <User className="w-4 h-4" />
                Active Advisors
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
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value="applications">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">No applications found</p>
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

            <TabsContent value="advisors">
              {filteredAdvisors.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">No active advisors found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAdvisors.map((advisor, index) => {
                    const apStatus = getAdvisorStatus(advisor.user_id);
                    return (
                      <motion.div
                        key={advisor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card border border-border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium">{advisor.full_name || "Unnamed"}</h3>
                              {advisor.is_demo && (
                                <Badge variant="outline">Demo</Badge>
                              )}
                              {apStatus?.is_published && (
                                <Badge variant="default" className="bg-primary">Published</Badge>
                              )}
                              {apStatus && !apStatus.is_published && (
                                <Badge variant="secondary">Not Published</Badge>
                              )}
                              {advisor.advisor_status === "approved" && (
                                <Badge variant="outline" className="border-primary text-primary">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approved
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {advisor.email} • {advisor.specialty || "No specialty"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            {advisor.is_demo && (
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`demo-${advisor.id}`} className="text-sm">
                                  Demo Availability
                                </Label>
                                <Switch
                                  id={`demo-${advisor.id}`}
                                  checked={advisor.demo_availability_enabled}
                                  onCheckedChange={(checked) => toggleDemoAvailability(advisor.id, checked)}
                                />
                              </div>
                            )}
                            {advisor.user_id && (
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`published-${advisor.id}`} className="text-sm">
                                  Published
                                </Label>
                                <Switch
                                  id={`published-${advisor.id}`}
                                  checked={apStatus?.is_published || false}
                                  onCheckedChange={(checked) => toggleAdvisorPublished(advisor.user_id, checked)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review the advisor application and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 py-4">
              {/* Applicant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {selectedApplication.first_name} {selectedApplication.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedApplication.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Specialty</p>
                  <p className="font-medium">{selectedApplication.specialty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Session Types</p>
                  <div className="flex gap-2">
                    {selectedApplication.virtual && <Badge>Virtual</Badge>}
                    {selectedApplication.in_person && <Badge>In-Person</Badge>}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bio</p>
                <p className="text-sm bg-secondary/50 p-3 rounded">
                  {selectedApplication.bio}
                </p>
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
                    @{selectedApplication.instagram.replace("@", "")}
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

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add notes about this application..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmAction("deny")}
                  disabled={isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
                <Button
                  onClick={() => setConfirmAction("approve")}
                  disabled={isProcessing}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Approve Application?" : "Deny Application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "This will approve the advisor and remove them from the applications list. They'll be prompted to complete onboarding before becoming publicly visible."
                : "This will deny the application. The applicant will be notified."}
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
    </Layout>
  );
};

export default AdminAdvisors;
