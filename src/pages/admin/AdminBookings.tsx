import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Loader2, Search, Video, MapPin, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface BookingWithDetails {
  id: string;
  status: string;
  created_at: string;
  slot: {
    start_time: string;
    end_time: string;
    is_virtual: boolean;
  };
  client: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  advisor: {
    id: string;
    full_name: string | null;
    specialty: string | null;
    avatar_url: string | null;
  };
}

const AdminBookings = () => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchBookings();

    // Subscribe to realtime booking updates
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        slot:availability_slots(*),
        client:profiles!bookings_client_id_fkey(id, full_name, email, avatar_url),
        advisor:profiles!bookings_advisor_id_fkey(id, full_name, specialty, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      setBookings((data as BookingWithDetails[]) || []);
    }
    setLoading(false);
  };

  const filterBookings = (bookingsList: BookingWithDetails[]) => {
    let filtered = bookingsList;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.client?.full_name?.toLowerCase().includes(query) ||
          b.advisor?.full_name?.toLowerCase().includes(query) ||
          b.client?.email?.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        filtered = filtered.filter(
          (b) => b.status === "confirmed" && new Date(b.slot.start_time) > now
        );
        break;
      case "completed":
        filtered = filtered.filter(
          (b) => b.status === "completed" || new Date(b.slot.start_time) <= now
        );
        break;
      case "cancelled":
        filtered = filtered.filter((b) => b.status === "cancelled");
        break;
    }

    return filtered;
  };

  const getStatusBadge = (status: string, slotTime: string) => {
    const isPast = new Date(slotTime) <= new Date();
    
    if (status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (status === "completed" || isPast) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    return <Badge className="bg-primary">Confirmed</Badge>;
  };

  const filteredBookings = filterBookings(bookings);

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
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground">
            View and monitor all platform bookings
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter(
                  (b) => b.status === "confirmed" && new Date(b.slot.start_time) > new Date()
                ).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter(
                  (b) => b.status === "completed" || new Date(b.slot.start_time) <= new Date()
                ).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cancelled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter((b) => b.status === "cancelled").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client or advisor name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {filteredBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No bookings found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Client & Advisor */}
                          <div className="flex items-center gap-6">
                            {/* Client */}
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={booking.client?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(booking.client?.full_name || "C").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {booking.client?.full_name || "Unknown Client"}
                                </p>
                                <p className="text-xs text-muted-foreground">Client</p>
                              </div>
                            </div>

                            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />

                            {/* Advisor */}
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={booking.advisor?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(booking.advisor?.full_name || "A").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {booking.advisor?.full_name || "Unknown Advisor"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {booking.advisor?.specialty || "Advisor"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Date & Status */}
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(booking.slot.start_time), "MMM d, yyyy")} at{" "}
                                {format(new Date(booking.slot.start_time), "h:mm a")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {booking.slot.is_virtual ? (
                                <Badge variant="outline" className="gap-1">
                                  <Video className="h-3 w-3" />
                                  Virtual
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <MapPin className="h-3 w-3" />
                                  In-Person
                                </Badge>
                              )}
                              {getStatusBadge(booking.status, booking.slot.start_time)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default AdminBookings;
