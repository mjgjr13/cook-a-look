import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Clock, DollarSign, Settings, LogOut, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VideoCall from "@/components/VideoCall";

interface Booking {
  id: string;
  status: string;
  created_at: string;
  slot: {
    start_time: string;
    end_time: string;
    is_virtual: boolean;
  };
  advisor?: {
    full_name: string;
    specialty: string;
    avatar_url: string;
  };
  client?: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  account_type: string;
  is_advisor: boolean;
  avatar_url: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoBooking, setActiveVideoBooking] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/signin?redirect=/dashboard");
        return;
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Error loading profile",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setProfile(profileData);

      // Get bookings based on account type
      const bookingsQuery = profileData.is_advisor
        ? supabase
            .from("bookings")
            .select(`
              *,
              slot:availability_slots(*),
              client:profiles!bookings_client_id_fkey(full_name, email, avatar_url)
            `)
            .eq("advisor_id", profileData.id)
            .order("created_at", { ascending: false })
        : supabase
            .from("bookings")
            .select(`
              *,
              slot:availability_slots(*),
              advisor:profiles!bookings_advisor_id_fkey(full_name, specialty, avatar_url)
            `)
            .eq("client_id", profileData.id)
            .order("created_at", { ascending: false });

      const { data: bookingsData } = await bookingsQuery;
      setBookings(bookingsData || []);
      setIsLoading(false);
    };

    loadDashboard();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleJoinCall = (bookingId: string) => {
    setActiveVideoBooking(bookingId);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      </Layout>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.slot.start_time) > new Date()
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.slot.start_time) <= new Date()
  );

  return (
    <Layout>
      {activeVideoBooking && (
        <VideoCall
          bookingId={activeVideoBooking}
          onClose={() => setActiveVideoBooking(null)}
        />
      )}

      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-2">
                {profile?.is_advisor ? "Advisor Dashboard" : "Client Dashboard"}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium">
                Welcome, {profile?.full_name?.split(" ")[0] || "there"}
              </h1>
            </div>
            <div className="flex gap-3">
              {profile?.is_advisor && (
                <Button variant="outline" asChild>
                  <Link to="/advisor/availability">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Availability
                  </Link>
                </Button>
              )}
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-background border border-border p-6"
            >
              <DollarSign className="w-8 h-8 text-gold mb-3" />
              <p className="text-3xl font-serif font-medium">{bookings.length}</p>
              <p className="text-muted-foreground">Total Bookings</p>
            </motion.div>
          </div>

          {/* Upcoming Sessions */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl font-medium mb-6">Upcoming Sessions</h2>
            {upcomingBookings.length === 0 ? (
              <div className="bg-background border border-border p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                {!profile?.is_advisor && (
                  <Button variant="hero" asChild>
                    <Link to="/advisors">Book a Consultation</Link>
                  </Button>
                )}
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
                          {profile?.is_advisor
                            ? `Session with ${booking.client?.full_name}`
                            : `Session with ${booking.advisor?.full_name}`}
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
                        <Button variant="hero" size="sm" onClick={() => handleJoinCall(booking.id)}>
                          <Video className="w-4 h-4 mr-2" />
                          Join Call
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
                        {profile?.is_advisor
                          ? `Session with ${booking.client?.full_name}`
                          : `Session with ${booking.advisor?.full_name}`}
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
