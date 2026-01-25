import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Image, Calendar, DollarSign, Loader2 } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalAdvisors: 0,
    pendingApplications: 0,
    totalBookings: 0,
    lookbookItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch dashboard stats - AdminRoute already verified admin access
      const [advisorsRes, applicationsRes, bookingsRes, lookbookRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("is_advisor", true),
        supabase.from("advisor_applications").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact" }),
        supabase.from("lookbook_items").select("id", { count: "exact" }),
      ]);

      setStats({
        totalAdvisors: advisorsRes.count || 0,
        pendingApplications: applicationsRes.count || 0,
        totalBookings: bookingsRes.count || 0,
        lookbookItems: lookbookRes.count || 0,
      });

      setLoading(false);
    };

    fetchStats();
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
