import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Video, 
  Clock, 
  Settings, 
  DollarSign, 
  Image as ImageIcon,
  TrendingUp,
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  User,
  Camera,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoCall from "@/components/VideoCall";
import AdvisorOnboardingModal from "@/components/advisor/AdvisorOnboardingModal";
import PlatformFeeStatus from "@/components/advisor/PlatformFeeStatus";
import ListingStatusPanel from "@/components/advisor/ListingStatusPanel";
import OnboardingChecklist from "@/components/advisor/OnboardingChecklist";
import CameraVerificationModal from "@/components/advisor/CameraVerificationModal";
import { useProfile, calculatePlatformFee } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

interface Booking {
  id: string;
  status: string;
  created_at: string;
  slot: {
    start_time: string;
    end_time: string;
    is_virtual: boolean;
  };
  client?: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

const AdvisorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, advisorProfile, roles, isLoading: profileLoading, refetch } = useProfile();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoBooking, setActiveVideoBooking] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showCameraVerification, setShowCameraVerification] = useState(false);
  const [earnings, setEarnings] = useState({ available: 0, pending: 0, total: 0 });
  const [platformFee, setPlatformFee] = useState({ feePercent: 15, bookingsThisMonth: 0 });
  const [availabilityCount, setAvailabilityCount] = useState(0);
  const [isTogglingListing, setIsTogglingListing] = useState(false);

  useEffect(() => {
    if (!profileLoading) {
      if (!roles.isAdvisor) {
        navigate("/become-advisor");
        return;
      }
      loadDashboard();
    }
  }, [profileLoading, roles.isAdvisor]);

  const loadDashboard = async () => {
    if (!profile) return;

    try {
      // Check if advisor needs onboarding modal (approved but NOT acknowledged yet)
      // Use the new onboarding_status field from advisor_profiles
      const onboardingStatusVal = advisorProfile?.onboarding_status;
      const needsOnboardingModal = 
        onboardingStatusVal === "required" &&
        !profile.onboarding_acknowledged_at &&
        (!advisorProfile?.onboarding_completed_at);

      if (needsOnboardingModal) {
        setShowOnboardingModal(true);
      }

      // Fetch bookings, earnings, platform fee, and availability count in parallel
      const [bookingsResult, paymentsResult, feeResult, availabilityResult] = await Promise.all([
        supabase
          .from("bookings")
          .select(`
            *,
            slot:availability_slots(*),
            client:profiles!bookings_client_id_fkey(full_name, email, avatar_url)
          `)
          .eq("advisor_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("advisor_id", profile.id),
        calculatePlatformFee(profile.id),
        supabase
          .from("availability_slots")
          .select("id", { count: "exact" })
          .eq("advisor_id", profile.id)
          .eq("is_booked", false)
          .gte("start_time", new Date().toISOString()),
      ]);

      setBookings(bookingsResult.data || []);
      setPlatformFee(feeResult);
      setAvailabilityCount(availabilityResult.count || 0);

      // Calculate earnings
      if (paymentsResult.data) {
        const total = paymentsResult.data
          .filter(p => p.status === "completed")
          .reduce((sum, p) => sum + Number(p.advisor_payout || p.amount * (1 - feeResult.feePercent / 100)), 0);

        const { data: withdrawalsData } = await supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("advisor_id", profile.id);

        const pending = (withdrawalsData || [])
          .filter(w => w.status === "pending" || w.status === "approved")
          .reduce((sum, w) => sum + Number(w.amount), 0);

        const withdrawn = (withdrawalsData || [])
          .filter(w => w.status === "completed")
          .reduce((sum, w) => sum + Number(w.amount), 0);

        setEarnings({
          total,
          pending,
          available: total - withdrawn - pending,
        });
      }

    } catch (error) {
      console.error("Dashboard error:", error);
      toast({
        title: "Error loading dashboard",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle listing toggle
  const handleToggleListing = async (listed: boolean) => {
    if (!user) return;
    setIsTogglingListing(true);

    try {
      const { error } = await supabase
        .from("advisor_profiles")
        .update({
          is_listed: listed,
          is_published: listed,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: listed ? "Profile is now live!" : "Profile hidden",
        description: listed
          ? "Clients can now find and book you."
          : "Your profile is no longer visible to clients.",
      });

      refetch();
    } catch (error) {
      console.error("Error toggling listing:", error);
      toast({
        title: "Error",
        description: "Failed to update listing status.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingListing(false);
    }
  };

  if (profileLoading || isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading advisor dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (!profile || !roles.isAdvisor) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <h2 className="font-serif text-2xl">Access Denied</h2>
          <p className="text-muted-foreground">You need to be an advisor to view this page.</p>
          <Button asChild>
            <Link to="/become-advisor">Become an Advisor</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.slot.start_time) > new Date()
  );
  const todayBookings = upcomingBookings.filter(b => {
    const bookingDate = new Date(b.slot.start_time).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  });

  // Determine status from advisor_profiles (authoritative) using new fields
  const applicationStatus = advisorProfile?.application_status || "pending";
  const onboardingStatus = advisorProfile?.onboarding_status || "not_started";
  const advisorStatus = advisorProfile?.status || profile.advisor_status || "submitted";
  const isListed = advisorProfile?.is_listed || false;
  
  const isSubmitted = applicationStatus === "pending";
  const isApproved = applicationStatus === "approved" && onboardingStatus !== "complete";
  const isOnboardingRequired = onboardingStatus === "required";
  const isOnboardingComplete = onboardingStatus === "complete";
  const isActive = advisorStatus === "active" && isListed;
  const isRejected = applicationStatus === "denied" || advisorStatus === "rejected";

  // Determine verification status
  const verificationStatus = profile.verification_status || "pending";
  const isVerified = verificationStatus === "approved";

  // Calculate onboarding requirements
  const hasProfileInfo = !!(profile.full_name && profile.bio && profile.specialty);
  const hasProfilePhoto = !!(profile.avatar_url || (profile.profile_photos && profile.profile_photos.length > 0));
  const hasPrice = !!(advisorProfile?.price || profile.price_per_session);
  const hasAvailability = availabilityCount > 0;
  const hasCameraVerification = !!advisorProfile?.verification_completed_at;

  // Build listing requirements
  const listingRequirements = [
    { id: "profile", label: "Profile completed", completed: hasProfileInfo, description: "Name, bio, and specialty" },
    { id: "photo", label: "Profile photo uploaded", completed: hasProfilePhoto },
    { id: "price", label: "Session price set", completed: hasPrice },
    { id: "availability", label: "Availability added", completed: hasAvailability, description: `${availabilityCount} slots available` },
    { id: "verification", label: "Identity verified", completed: hasCameraVerification },
    { id: "admin_verified", label: "Admin verification", completed: isVerified, description: "Pending admin review" },
  ];

  // Build onboarding steps
  const onboardingSteps = [
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add your name, bio, and specialty",
      completed: hasProfileInfo,
      action: () => navigate("/settings"),
      actionLabel: "Edit Profile",
      icon: User,
    },
    {
      id: "photo",
      title: "Upload Profile Photo",
      description: "Add a professional photo",
      completed: hasProfilePhoto,
      action: () => navigate("/settings"),
      actionLabel: "Add Photo",
      icon: ImageIcon,
    },
    {
      id: "price",
      title: "Set Your Rate",
      description: "Define your hourly session price",
      completed: hasPrice,
      action: () => navigate("/settings"),
      actionLabel: "Set Price",
      icon: DollarSign,
    },
    {
      id: "availability",
      title: "Add Availability",
      description: "Create at least one available time slot",
      completed: hasAvailability,
      action: () => navigate("/advisor-availability"),
      actionLabel: "Add Slots",
      icon: Calendar,
    },
    {
      id: "verification",
      title: "Verify Your Identity",
      description: "Complete camera-based verification",
      completed: hasCameraVerification,
      action: () => setShowCameraVerification(true),
      actionLabel: "Start Verification",
      icon: Camera,
      locked: true,
    },
  ];

  // Determine if user can toggle listing
  const allOnboardingComplete = hasProfileInfo && hasProfilePhoto && hasPrice && hasAvailability && hasCameraVerification;
  const canToggleListing = allOnboardingComplete && isVerified;

  return (
    <Layout>
      {activeVideoBooking && (
        <VideoCall
          bookingId={activeVideoBooking}
          onClose={() => setActiveVideoBooking(null)}
        />
      )}

      {showOnboardingModal && profile && (
        <AdvisorOnboardingModal
          profileId={profile.id}
          isOpen={showOnboardingModal}
          onComplete={() => {
            setShowOnboardingModal(false);
            refetch();
          }}
        />
      )}

      {showCameraVerification && user && (
        <CameraVerificationModal
          isOpen={showCameraVerification}
          onClose={() => setShowCameraVerification(false)}
          userId={user.id}
          onVerificationComplete={() => {
            refetch();
            loadDashboard();
          }}
        />
      )}

      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase">
                  Advisor Dashboard
                </p>
                {isSubmitted && (
                  <Badge variant="outline" className="text-gold border-gold/50">
                    Under Review
                  </Badge>
                )}
                {isApproved && !isOnboardingComplete && (
                  <Badge variant="default" className="bg-primary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved - Complete Onboarding
                  </Badge>
                )}
                {isOnboardingComplete && !isVerified && (
                  <Badge variant="outline" className="border-gold text-gold">
                    <Clock className="w-3 h-3 mr-1" />
                    Awaiting Admin Verification
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="default" className="bg-primary">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active & Listed
                  </Badge>
                )}
                {isRejected && (
                  <Badge variant="destructive">
                    Application Not Approved
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium">
                Welcome, {profile.full_name?.split(" ")[0] || "Advisor"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              {isActive && (
                <Button variant="outline" asChild>
                  <Link to={`/advisors/${advisorProfile?.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Under Review Notice */}
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/50 border border-accent rounded-lg p-6 mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gold/20">
                  <Clock className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium text-foreground mb-2">
                    Application Under Review
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Your advisor application is being reviewed by our team. You'll receive an email once approved.
                    This typically takes 2-5 business days.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>You cannot receive bookings until your application is approved.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Onboarding Required - Show checklist */}
          {(isApproved || isOnboardingRequired) && !isOnboardingComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <OnboardingChecklist
                steps={onboardingSteps}
                onStartVerification={() => setShowCameraVerification(true)}
              />
            </motion.div>
          )}

          {/* Listing Status Panel - Show for approved advisors who have completed onboarding */}
          {isOnboardingComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <ListingStatusPanel
                requirements={listingRequirements}
                isListed={isListed}
                canToggleListing={canToggleListing}
                onToggleListing={handleToggleListing}
                isLoading={isTogglingListing}
              />
            </motion.div>
          )}

          {/* Platform Fee Status - only show for approved/active advisors */}
          {(isOnboardingComplete || isActive) && (
            <div className="mb-8">
              <PlatformFeeStatus 
                feePercent={platformFee.feePercent} 
                bookingsThisMonth={platformFee.bookingsThisMonth} 
              />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Today's Sessions
                  </CardTitle>
                  <Calendar className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayBookings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {upcomingBookings.length} total upcoming
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${earnings.available.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${earnings.pending.toFixed(2)} pending
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Earnings
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.total.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Sessions
                  </CardTitle>
                  <Users className="w-4 h-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bookings.length}</div>
                  <p className="text-xs text-muted-foreground">Sessions booked</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card 
                className={`hover:border-gold/50 transition-colors ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !isSubmitted && navigate("/advisor-availability")}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Calendar className="w-8 h-8 text-gold" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">Manage Availability</CardTitle>
                  <CardDescription>
                    {isSubmitted ? "Available after approval" : "Set your available time slots"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="hover:border-gold/50 transition-colors cursor-pointer" onClick={() => navigate("/advisor/earnings")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <DollarSign className="w-8 h-8 text-gold" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">Earnings & Withdrawals</CardTitle>
                  <CardDescription>View earnings and request payouts</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="hover:border-gold/50 transition-colors cursor-pointer" onClick={() => navigate("/settings")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <ImageIcon className="w-8 h-8 text-gold" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">Edit Profile & Portfolio</CardTitle>
                  <CardDescription>Update your bio, photos, and rates</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </div>

          {/* Upcoming Sessions */}
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-medium mb-6">Upcoming Sessions</h2>
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {isSubmitted 
                      ? "Sessions will appear here once you're approved" 
                      : !isListed
                      ? "Complete onboarding and enable your listing to receive bookings"
                      : "No upcoming sessions scheduled"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              {booking.client?.avatar_url ? (
                                <img
                                  src={booking.client.avatar_url}
                                  alt={booking.client.full_name || "Client"}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{booking.client?.full_name || "Client"}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.slot.start_time).toLocaleDateString()} at{" "}
                                {new Date(booking.slot.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {booking.slot.is_virtual && (
                              <Badge variant="outline" className="gap-1">
                                <Video className="w-3 h-3" />
                                Virtual
                              </Badge>
                            )}
                            {booking.slot.is_virtual && new Date(booking.slot.start_time) <= new Date(Date.now() + 15 * 60 * 1000) && (
                              <Button
                                size="sm"
                                onClick={() => setActiveVideoBooking(booking.id)}
                              >
                                <Video className="w-4 h-4 mr-2" />
                                Join Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default AdvisorDashboard;
