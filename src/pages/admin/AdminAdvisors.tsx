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
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  is_demo: boolean;
  advisor_approved: boolean;
  demo_availability_enabled: boolean;
  created_at: string;
}

const AdminAdvisors = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState<AdvisorApplication[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
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
        const { data, error } = await supabase
          .from("advisor_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setApplications((data as AdvisorApplication[]) || []);
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, specialty, is_demo, advisor_approved, demo_availability_enabled, created_at")
          .eq("is_advisor", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAdvisors((data as AdvisorProfile[]) || []);
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

      // If user has an account, update their profile to be an advisor
      if (selectedApplication.email) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("id, user_id")
          .eq("email", selectedApplication.email)
          .single();

        if (userProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              is_advisor: true,
              advisor_approved: true,
              specialty: selectedApplication.specialty,
              bio: selectedApplication.bio,
              instagram_url: selectedApplication.instagram,
              portfolio_url: selectedApplication.portfolio,
              full_name: `${selectedApplication.first_name} ${selectedApplication.last_name}`,
            })
            .eq("id", userProfile.id);

          if (profileError) throw profileError;
        }
      }

      toast.success("Application approved successfully");
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
      const { error } = await supabase
        .from("advisor_applications")
        .update({
          status: "denied",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

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
        // Generate demo availability slots for next 14 days
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
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Generate 3 slots per day: 10am, 2pm, 4pm
      for (const hour of [10, 14, 16]) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1);

        // Only add future slots
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
      const { error } = await supabase
        .from("availability_slots")
        .insert(slots);

      if (error) {
        console.error("Error generating slots:", error);
      }
    }
  };

  const toggleAdvisorApproval = async (advisorId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ advisor_approved: approved })
        .eq("id", advisorId);

      if (error) throw error;

      toast.success(approved ? "Advisor activated" : "Advisor deactivated");
      loadData();
    } catch (err) {
      console.error("Error toggling approval:", err);
      toast.error("Failed to update advisor status");
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
                  <p className="text-muted-foreground">No advisors found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAdvisors.map((advisor, index) => (
                    <motion.div
                      key={advisor.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium">{advisor.full_name || "Unnamed"}</h3>
                            {advisor.is_demo && (
                              <Badge variant="outline">Demo</Badge>
                            )}
                            <Badge variant={advisor.advisor_approved ? "default" : "secondary"}>
                              {advisor.advisor_approved ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {advisor.email} • {advisor.specialty || "No specialty"}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`demo-${advisor.id}`} className="text-sm">
                              Demo Availability
                            </Label>
                            <Switch
                              id={`demo-${advisor.id}`}
                              checked={advisor.demo_availability_enabled}
                              onCheckedChange={(checked) =>
                                toggleDemoAvailability(advisor.id, checked)
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${advisor.id}`} className="text-sm">
                              Active
                            </Label>
                            <Switch
                              id={`active-${advisor.id}`}
                              checked={advisor.advisor_approved}
                              onCheckedChange={(checked) =>
                                toggleAdvisorApproval(advisor.id, checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
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

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "approve" ? "Approve Application?" : "Deny Application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "approve"
                ? "This will approve the application and create/update their advisor profile. They will be able to receive bookings."
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
    </Layout>
  );
};

export default AdminAdvisors;
