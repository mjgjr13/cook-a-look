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
  ChevronRight,
  Users,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoCall from "@/components/VideoCall";
import AdvisorOnboardingModal from "@/components/advisor/AdvisorOnboardingModal";
import RoleSwitcher from "@/components/RoleSwitcher";

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

interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_advisor: boolean;
  advisor_status: string;
  avatar_url: string;
  user_id: string;
  onboarding_acknowledged_at: string | null;
  price_per_session: number;
  specialty: string;
}

const AdvisorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoBooking, setActiveVideoBooking] = useState<string | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [earnings, setEarnings] = useState({ available: 0, pending: 0, total: 0 });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/signin?redirect=/advisor");
        return;
      }

      // Get profile - with retry logic for newly created accounts
      let profileData = null;
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries && !profileData) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (data) {
          profileData = data;
        } else {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!profileData) {
        console.error("No profile found after retries");
        navigate("/become-advisor");
        return;
      }

      // Check if user is an advisor
      if (!profileData.is_advisor) {
        toast({
          title: "Not an Advisor",
          description: "You need to apply as an advisor to access this dashboard.",
        });
        navigate("/become-advisor");
        return;
      }

      setProfile(profileData);

      // Check if advisor needs onboarding
      if (!profileData.onboarding_acknowledged_at) {
        setShowOnboardingModal(true);
      }

      // Get bookings where user is the advisor
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          slot:availability_slots(*),
          client:profiles!bookings_client_id_fkey(full_name, email, avatar_url)
        `)
        .eq("advisor_id", profileData.id)
        .order("created_at", { ascending: false });

      setBookings(bookingsData || []);

      // Get earnings summary
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("advisor_id", profileData.id);

      if (paymentsData) {
        const total = paymentsData
          .filter(p => p.status === "completed")
          .reduce((sum, p) => sum + Number(p.advisor_payout || p.amount * 0.85), 0);

        const { data: withdrawalsData } = await supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("advisor_id", profileData.id);

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

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading advisor dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
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

  const pendingApproval = profile.advisor_status === "pending";

  return (
    <Layout>
      {activeVideoBooking && (
        <VideoCall
          bookingId={activeVideoBooking}
          onClose={() => setActiveVideoBooking(null)}
        />
      )}

      {showOnboardingModal && (
        <AdvisorOnboardingModal
          profileId={profile.id}
          isOpen={showOnboardingModal}
          onComplete={() => setShowOnboardingModal(false)}
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
                {pendingApproval && (
                  <Badge variant="outline" className="text-muted-foreground border-muted">
                    Pending Approval
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-medium">
                Welcome, {profile.full_name?.split(" ")[0] || "Advisor"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <RoleSwitcher currentRole="advisor" />
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Pending Approval Notice */}
          {pendingApproval && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/50 border border-accent rounded-lg p-4 mb-8"
            >
              <h3 className="font-medium text-foreground mb-1">Application Under Review</h3>
              <p className="text-sm text-muted-foreground">
                Your advisor application is being reviewed. You'll receive an email once approved.
                In the meantime, you can set up your availability and profile.
              </p>
            </motion.div>
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
                    Total Clients
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
              <Card className="hover:border-gold/50 transition-colors cursor-pointer" onClick={() => navigate("/advisor-availability")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Calendar className="w-8 h-8 text-gold" />
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">Manage Availability</CardTitle>
                  <CardDescription>Set your available time slots for bookings</CardDescription>
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
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Make sure you have availability set so clients can book you
                  </p>
                  <Button variant="outline" asChild>
                    <Link to="/advisor-availability">
                      <Calendar className="w-4 h-4 mr-2" />
                      Set Availability
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-background border border-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-serif font-medium">
                          Session with {booking.client?.full_name || "Client"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.slot.start_time).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(booking.slot.start_time).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {booking.slot.is_virtual && (
                        <Button variant="hero" size="sm" onClick={() => setActiveVideoBooking(booking.id)}>
                          <Video className="w-4 h-4 mr-2" />
                          Start Call
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
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
