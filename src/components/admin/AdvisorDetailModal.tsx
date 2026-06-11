import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  DollarSign,
  Calendar,
  Image as ImageIcon,
  Star,
  MapPin,
  Instagram,
  ExternalLink,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { format } from "date-fns";

interface AdvisorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisorId: string;
  userId: string;
}

interface AdvisorDetails {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  specialty: string | null;
  bio: string | null;
  location: string | null;
  price_per_session: number | null;
  rating: number | null;
  review_count: number | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  portfolio_images: string[] | null;
  experience_years: number | null;
  virtual_available: boolean | null;
  in_person_available: boolean | null;
  is_listed?: boolean;
  application_status?: string;
}

interface BookingStat {
  total: number;
  completed: number;
  upcoming: number;
}

interface EarningsData {
  total: number;
  available: number;
  pending: number;
}

export const AdvisorDetailModal = ({
  isOpen,
  onClose,
  advisorId,
  userId,
}: AdvisorDetailModalProps) => {
  const [advisor, setAdvisor] = useState<AdvisorDetails | null>(null);
  const [bookings, setBookings] = useState<BookingStat>({ total: 0, completed: 0, upcoming: 0 });
  const [earnings, setEarnings] = useState<EarningsData>({ total: 0, available: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && advisorId) {
      loadAdvisorDetails();
    }
  }, [isOpen, advisorId]);

  const loadAdvisorDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", advisorId)
        .single();

      if (profileError) throw profileError;

      // Fetch advisor_profiles for is_listed status
      const { data: advisorProfileData } = await supabase
        .from("advisor_profiles")
        .select("is_listed, application_status, portfolio_images")
        .eq("user_id", userId)
        .maybeSingle();

      setAdvisor({
        ...profileData,
        is_listed: advisorProfileData?.is_listed ?? false,
        application_status: advisorProfileData?.application_status ?? "unknown",
        portfolio_images: advisorProfileData?.portfolio_images ?? profileData.portfolio_images,
      });

      // Fetch booking stats
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, status, slot:availability_slots(start_time)")
        .eq("advisor_id", advisorId);

      if (bookingsData) {
        const now = new Date();
        const stats = {
          total: bookingsData.length,
          completed: bookingsData.filter(b => b.status === "completed").length,
          upcoming: bookingsData.filter(
            b => b.status === "confirmed" && b.slot && new Date(b.slot.start_time) > now
          ).length,
        };
        setBookings(stats);
      }

      // Fetch earnings
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("amount, advisor_payout, status, escrow_status")
        .eq("advisor_id", advisorId);

      if (paymentsData) {
        const completedPayments = paymentsData.filter(p => p.status === "completed");
        const total = completedPayments.reduce(
          (sum, p) => sum + Number(p.advisor_payout || p.amount * 0.85),
          0
        );
        const available = completedPayments
          .filter(p => p.escrow_status === "released")
          .reduce((sum, p) => sum + Number(p.advisor_payout || p.amount * 0.85), 0);

        setEarnings({
          total,
          available,
          pending: total - available,
        });
      }
    } catch (err) {
      console.error("Error loading advisor details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Advisor Details</DialogTitle>
          <DialogDescription>
            Complete profile and performance overview
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-20 h-20 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ) : advisor ? (
            <div className="space-y-6 p-1">
              {/* Header with Avatar */}
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={advisor.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {(advisor.full_name || "A").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold">{advisor.full_name || "Unnamed"}</h2>
                    {advisor.is_listed ? (
                      <Badge variant="default" className="gap-1">
                        <Eye className="w-3 h-3" />
                        Listed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <EyeOff className="w-3 h-3" />
                        Hidden
                      </Badge>
                    )}
                    <Badge variant="outline">{advisor.application_status}</Badge>
                  </div>
                  <p className="text-muted-foreground">{advisor.specialty || "No specialty"}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {advisor.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {advisor.email}
                      </span>
                    )}
                    {advisor.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {advisor.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Earnings</span>
                    </div>
                    <p className="text-xl font-bold mt-1">${earnings.total.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Available</span>
                    </div>
                    <p className="text-xl font-bold mt-1">${earnings.available.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Total Bookings</span>
                    </div>
                    <p className="text-xl font-bold mt-1">{bookings.total}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">Rating</span>
                    </div>
                    <p className="text-xl font-bold mt-1">
                      {advisor.rating?.toFixed(1) || "N/A"}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({advisor.review_count || 0})
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="profile">
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio</h3>
                    <p className="text-sm">{advisor.bio || "No bio provided"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Hourly Rate
                      </h3>
                      <p className="font-semibold">
                        ${advisor.price_per_session || 0} / hour
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Experience
                      </h3>
                      <p className="font-semibold">
                        {advisor.experience_years
                          ? `${advisor.experience_years}+ years`
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        Virtual Sessions
                      </h3>
                      <p>{advisor.virtual_available ? "✓ Available" : "Not available"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        In-Person Sessions
                      </h3>
                      <p>{advisor.in_person_available ? "✓ Available" : "Not available"}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {advisor.instagram_url && (
                      <a
                        href={`https://instagram.com/${advisor.instagram_url.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Instagram className="w-4 h-4" />
                        @{advisor.instagram_url.replace("@", "")}
                      </a>
                    )}
                    {advisor.portfolio_url && (
                      <a
                        href={advisor.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Portfolio
                      </a>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="portfolio" className="mt-4">
                  {advisor.portfolio_images && advisor.portfolio_images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {advisor.portfolio_images.map((img, idx) => (
                        <div
                          key={idx}
                          className="aspect-[4/5] bg-muted rounded-lg overflow-hidden"
                        >
                          <img
                            src={img}
                            alt={`Portfolio ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No portfolio images uploaded</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stats" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold">{bookings.completed}</p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold">{bookings.upcoming}</p>
                        <p className="text-sm text-muted-foreground">Upcoming</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-3xl font-bold">${earnings.pending.toFixed(0)}</p>
                        <p className="text-sm text-muted-foreground">In Escrow</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Unable to load advisor details</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AdvisorDetailModal;
