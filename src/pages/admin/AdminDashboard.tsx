import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Image, Calendar, DollarSign, Loader2, Star, MapPin } from "lucide-react";

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
  const [stats, setStats] = useState({
    totalAdvisors: 0,
    pendingApplications: 0,
    totalBookings: 0,
    lookbookItems: 0,
  });
  const [demoAdvisors, setDemoAdvisors] = useState<DemoAdvisor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch dashboard stats and demo advisors - AdminRoute already verified admin access
      const [advisorsRes, applicationsRes, bookingsRes, lookbookRes, demoAdvisorsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("is_advisor", true),
        supabase.from("advisor_applications").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact" }),
        supabase.from("lookbook_items").select("id", { count: "exact" }),
        supabase
          .from("profiles")
          .select("id, full_name, specialty, avatar_url, location, rating, is_demo")
          .eq("is_advisor", true)
          .eq("is_demo", true)
          .order("full_name"),
      ]);

      setStats({
        totalAdvisors: advisorsRes.count || 0,
        pendingApplications: applicationsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        lookbookItems: lookbookRes.count || 0,
      });

      setDemoAdvisors((demoAdvisorsRes.data as DemoAdvisor[]) || []);
      setLoading(false);
    };

    fetchData();
  }, []);

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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your Cook a Look platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Advisors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAdvisors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
              {stats.pendingApplications > 0 && (
                <p className="text-xs text-orange-600">Requires attention</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lookbook Items</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lookbookItems}</div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Advisors Section */}
        {demoAdvisors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Demo Advisors</h2>
            <Card>
              <CardHeader>
                <CardDescription>
                  These are demo/test advisors used for showcasing the platform
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
                          <Badge variant="outline" className="text-xs">Demo</Badge>
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
                          {advisor.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {advisor.rating.toFixed(1)}
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

        {/* Admin Modules */}
        <h2 className="text-xl font-semibold mb-4">Management</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Advisor Management
              </CardTitle>
              <CardDescription>
                Review applications, approve advisors, and manage profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/advisors">Manage Advisors</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Lookbook CMS
              </CardTitle>
              <CardDescription>
                Add, edit, and organize lookbook inspiration content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/lookbook">Manage Lookbook</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payments & Withdrawals
              </CardTitle>
              <CardDescription>
                View revenue, platform fees, and process advisor withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/payments">Manage Payments</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
