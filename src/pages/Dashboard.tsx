import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Clock, Settings, LogOut, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoCall from "@/components/VideoCall";
import ClientRewardsCard from "@/components/dashboard/ClientRewardsCard";
import BookingDetailsModal from "@/components/booking/BookingDetailsModal";
import ReviewModal from "@/components/reviews/ReviewModal";
import { useProfile } from "@/hooks/useProfile";
import { useReviewPrompt } from "@/hooks/useReviewPrompt";

interface Booking {
  id: string;
  status: string;
  created_at: string;
  advisor_id: string;
  client_id: string;
  slot: {
    start_time: string;
    end_time: string;
    is_virtual: boolean;
  };
  advisor?: {
    id: string;
    full_name: string;
    specialty: string;
    avatar_url: string;
    user_id: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, roles, isLoading: profileLoading } = useProfile();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeVideoBooking, setActiveVideoBooking] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Check for pending reviews
  const { pendingReview, dismissReview } = useReviewPrompt(profile?.user_id || undefined);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Only proceed when profile loading is complete
    if (profileLoading) return;

    // Not logged in: ProtectedRoute will handle redirecting to /signin.
    if (!profile) return;

    // Advisors should not access client dashboard - but don't navigate in useEffect
    // to avoid infinite loops. We'll handle this with a conditional render below.
    if (roles.isAdvisor) {
      return; // Don't load bookings for advisors
    }

    loadBookings();

    // Subscribe to realtime booking updates
    const channel = supabase
      .channel("client-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `client_id=eq.${profile.id}`,
        },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileLoading, profile, roles.isAdvisor]);

  const loadBookings = async () => {
    if (!profile) return;

    try {
      setLoadError(null);
      console.log("[Dashboard] Loading bookings for profile:", profile.id);
      
      // Fetch client bookings
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(`
          *,
          slot:availability_slots(*),
          advisor:profiles!bookings_advisor_id_fkey(id, full_name, specialty, avatar_url, user_id)
        `)
        .eq("client_id", profile.id)
        .order("created_at", { ascending: false });

      console.log("[Dashboard] Bookings query result:", { data: bookingsData, error });

      if (error) throw error;
      
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Dashboard load error:", error);
      setLoadError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinCall = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setActiveVideoBooking(booking);
    }
  };

  // Show advisor redirect message - no navigation to avoid loops
  if (!profileLoading && profile && roles.isAdvisor) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <h2 className="font-serif text-xl">Advisor Dashboard</h2>
          <p className="text-muted-foreground text-center max-w-md">
            As a style advisor, please use the Advisor Dashboard to manage your bookings and availability.
          </p>
          <Button asChild>
            <Link to="/advisor">Go to Advisor Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (profileLoading || isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
          <p className="text-xs text-muted-foreground">This may take a moment...</p>
        </div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <h2 className="font-serif text-xl">Unable to load dashboard</h2>
          <p className="text-muted-foreground text-center max-w-md">{loadError}</p>
          <Button onClick={() => loadBookings()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <h2 className="font-serif text-xl">Session Expired</h2>
          <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
          <Button asChild>
            <Link to="/signin">Sign In</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" && b.slot && new Date(b.slot.start_time) > new Date()
  );
  const pastBookings = bookings.filter(
    (b) => b.slot && new Date(b.slot.start_time) <= new Date()
  );

  return (
    <Layout>
      {activeVideoBooking && (
        <VideoCall
          bookingId={activeVideoBooking.id}
          advisorId={activeVideoBooking.advisor_id}
          clientId={activeVideoBooking.client_id}
          advisorName={activeVideoBooking.advisor?.full_name}
          isClient={true}
          onClose={() => setActiveVideoBooking(null)}
        />
      )}

      {/* Review prompt for completed sessions */}
      {pendingReview && (
        <ReviewModal
          isOpen={!!pendingReview}
          onClose={dismissReview}
          bookingId={pendingReview.bookingId}
          advisorId={pendingReview.advisorId}
          clientId={pendingReview.clientId}
          advisorName={pendingReview.advisorName}
        />
      )}

      <BookingDetailsModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        userRole="client"
        currentUserId={profile?.user_id || undefined}
        onJoinCall={handleJoinCall}
      />

      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-2">
                Client Dashboard
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium">
                Welcome, {profile?.full_name?.split(" ")[0] || "there"}
              </h1>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Stats Grid - Client stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border p-6"
            >
              <Calendar className="w-8 h-8 text-gold mb-3" />
              <p className="text-3xl font-serif font-medium">{upcomingBookings.length}</p>
              <p className="text-muted-foreground">Upcoming Sessions</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-background border border-border p-6"
            >
              <Clock className="w-8 h-8 text-gold mb-3" />
              <p className="text-3xl font-serif font-medium">{pastBookings.length}</p>
              <p className="text-muted-foreground">Completed Sessions</p>
            </motion.div>
          </div>

          {/* Rewards card for clients - full width */}
          {profile.user_id && (
            <div className="mb-12">
              <ClientRewardsCard userId={profile.user_id} />
            </div>
          )}

          {/* Upcoming Sessions */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-medium mb-6">Upcoming Sessions</h2>
            {upcomingBookings.length === 0 ? (
              <div className="bg-background border border-border p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                <Button variant="hero" asChild>
                  <Link to="/advisors">Book a Consultation</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
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
                          Session with {booking.advisor?.full_name}
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Past Sessions */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl font-medium mb-6">Past Sessions</h2>
              <div className="space-y-4">
                {pastBookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-background border border-border p-6 flex justify-between items-center opacity-70"
                  >
                    <div>
                      <p className="font-serif">
                        Session with {booking.advisor?.full_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.slot.start_time).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground capitalize">{booking.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
