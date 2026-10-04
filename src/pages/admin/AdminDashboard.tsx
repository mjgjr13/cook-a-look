import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { SAMPLE_ADVISOR_IDS, TEST_BOOKABLE_SAMPLE_ADVISOR_IDS } from "@/lib/sampleAdvisors";
import { TEST_ADVISOR_ACTS_AS_REAL } from "@/lib/featureFlags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, Loader2, MapPin } from "lucide-react";
import AdminInbox from "@/components/admin/AdminInbox";

interface DemoAdvisor {
  id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
  location: string | null;
  rating: number | null;
  is_demo: boolean;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAdvisors: 0,
    pendingApplications: 0,
    totalBookings: 0,
  });
  const [demoAdvisors, setDemoAdvisors] = useState<DemoAdvisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch dashboard stats and demo advisors - AdminRoute already verified admin access
      const [advisorsRes, applicationsRes, bookingsRes, demoAdvisorsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("is_advisor", true),
        supabase.from("advisor_applications").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact" }),
        supabase
          .from("profiles")
          .select("id, full_name, specialty, avatar_url, location, rating, is_demo")
          .eq("is_advisor", true)
          .or(`is_demo.eq.true,id.in.(${SAMPLE_ADVISOR_IDS.join(",")})`)
          .order("full_name"),
      ]);

      setStats({
        totalAdvisors: advisorsRes.count || 0,
        pendingApplications: applicationsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
      });

      setDemoAdvisors((demoAdvisorsRes.data as DemoAdvisor[]) || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-medium">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your Cook A Look platform
          </p>
        </div>

        {/* Stats Grid - Clickable Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => handleCardClick("/admin/advisors")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Advisors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAdvisors}</div>
              <p className="text-xs text-primary mt-1">Click to manage →</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => handleCardClick("/admin/advisors")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              {stats.pendingApplications > 0 && (
                <p className="text-xs text-orange-600">Requires attention →</p>
              )}
              {stats.pendingApplications === 0 && (
                <p className="text-xs text-muted-foreground">All caught up</p>
              )}
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => handleCardClick("/admin/bookings")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-primary mt-1">Click to view →</p>
            </CardContent>
          </Card>

        </div>

        {/* Demo Advisors Section */}
        {demoAdvisors.length > 0 && (
          <div className="mb-8">
            <h2 className="font-serif text-2xl mb-3">Sample advisors</h2>
            <Card>
              <CardHeader>
                <CardDescription>
                  Sample profiles are labeled on the site and send visitors to the waitlist. James Whitaker is the test advisor: bookable like a real advisor while Stripe is in test mode. Remove samples from Advisors → Active.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {demoAdvisors.map((advisor) => (
                    <div
                      key={advisor.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={advisor.avatar_url || undefined} />
                        <AvatarFallback>
                          {(advisor.full_name || "D").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{advisor.full_name || "Demo Advisor"}</p>
                          <Badge variant="outline" className="text-xs">
                            {TEST_ADVISOR_ACTS_AS_REAL && TEST_BOOKABLE_SAMPLE_ADVISOR_IDS.includes(advisor.id) ? "Test · bookable" : "Sample"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {advisor.specialty || "Style Advisor"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {advisor.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {advisor.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Inbox for Advisor Conversations */}
        <div className="mb-8">
          <AdminInbox />
        </div>

        {/* Sections are in the admin menu above; only resources that aren't live here. */}
        <h2 className="font-serif text-2xl mb-3">Resources</h2>
        <Link
          to="/brand"
          className="flex items-center justify-between border border-border bg-card px-4 py-3 text-sm hover:border-foreground transition-colors"
        >
          <span>
            <span className="font-semibold">Press kit</span>
            <span className="text-muted-foreground"> · Logos and brand assets for promotional use</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
