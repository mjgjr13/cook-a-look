import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, User, Bell, Shield, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RewardsCard from "@/components/dashboard/RewardsCard";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  bio: string;
  location: string;
  is_advisor: boolean;
  avatar_url: string;
  // Advisor-specific fields
  specialty: string;
  price_per_session: number;
  session_duration: number;
  virtual_available: boolean;
  in_person_available: boolean;
  personal_philosophy: string;
  instagram_url: string;
  portfolio_url: string;
}

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Notification preferences (local state for now)
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailReminders: true,
    emailPromotions: false,
    smsReminders: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/signin?redirect=/settings");
        return;
      }

      setUserId(session.user.id);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !profileData) {
        toast({
          title: "Error loading profile",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setProfile(profileData);
      setIsLoading(false);
    };

    loadProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location,
        specialty: profile.specialty,
        price_per_session: profile.price_per_session,
        session_duration: profile.session_duration,
        virtual_available: profile.virtual_available,
        in_person_available: profile.in_person_available,
        personal_philosophy: profile.personal_philosophy,
        instagram_url: profile.instagram_url,
        portfolio_url: profile.portfolio_url,
      })
      .eq("id", profile.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });
    }
  };

  const updateProfile = (field: keyof Profile, value: unknown) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading settings...</div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "rewards", label: "Rewards", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <Layout>
      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-1">
                Account Settings
              </p>
              <h1 className="font-serif text-2xl md:text-3xl font-medium">
                Manage Your Account
              </h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="bg-background border border-border p-6 space-y-6">
                <h2 className="font-serif text-xl font-medium">Personal Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile?.full_name || ""}
                      onChange={(e) => updateProfile("full_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile?.location || ""}
                      onChange={(e) => updateProfile("location", e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile?.bio || ""}
                    onChange={(e) => updateProfile("bio", e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Advisor-specific settings */}
              {profile?.is_advisor && (
                <div className="bg-background border border-border p-6 space-y-6">
                  <h2 className="font-serif text-xl font-medium">Advisor Settings</h2>

                  {/* Platform Fee Info Box */}
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-gold mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Platform Fee Structure</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cook a Look charges a 15% platform fee on all bookings. The price you set is what clients pay. 
                          You receive 85% of each booking after the platform fee is deducted.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={profile?.specialty || ""}
                        onChange={(e) => updateProfile("specialty", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price per Session ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={profile?.price_per_session || ""}
                        onChange={(e) => updateProfile("price_per_session", parseInt(e.target.value))}
                      />
                      {profile?.price_per_session && profile.price_per_session > 0 && (
                        <p className="text-sm text-muted-foreground">
                          You will receive: <span className="font-semibold text-green-600">${(profile.price_per_session * 0.85).toFixed(2)}</span> (after 15% Cook a Look fee)
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Session Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={profile?.session_duration || 60}
                        onChange={(e) => updateProfile("session_duration", parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Virtual Sessions</Label>
                        <p className="text-sm text-muted-foreground">Offer online video consultations</p>
                      </div>
                      <Switch
                        checked={profile?.virtual_available ?? true}
                        onCheckedChange={(checked) => updateProfile("virtual_available", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>In-Person Sessions</Label>
                        <p className="text-sm text-muted-foreground">Offer face-to-face consultations</p>
                      </div>
                      <Switch
                        checked={profile?.in_person_available ?? false}
                        onCheckedChange={(checked) => updateProfile("in_person_available", checked)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="philosophy">Personal Philosophy</Label>
                    <Textarea
                      id="philosophy"
                      value={profile?.personal_philosophy || ""}
                      onChange={(e) => updateProfile("personal_philosophy", e.target.value)}
                      placeholder="Share your styling philosophy..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram URL</Label>
                      <Input
                        id="instagram"
                        value={profile?.instagram_url || ""}
                        onChange={(e) => updateProfile("instagram_url", e.target.value)}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio URL</Label>
                      <Input
                        id="portfolio"
                        value={profile?.portfolio_url || ""}
                        onChange={(e) => updateProfile("portfolio_url", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border p-6 space-y-6"
            >
              <h2 className="font-serif text-xl font-medium">Notification Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Booking Confirmations</Label>
                    <p className="text-sm text-muted-foreground">Receive emails when sessions are booked</p>
                  </div>
                  <Switch
                    checked={notifications.emailBookings}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailBookings: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded before your sessions</p>
                  </div>
                  <Switch
                    checked={notifications.emailReminders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailReminders: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Promotional Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about new features and offers</p>
                  </div>
                  <Switch
                    checked={notifications.emailPromotions}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emailPromotions: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get text message reminders for sessions</p>
                  </div>
                  <Switch
                    checked={notifications.smsReminders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, smsReminders: checked })}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Rewards Tab */}
          {activeTab === "rewards" && userId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <RewardsCard userId={userId} />

              <div className="bg-background border border-border p-6 space-y-6">
                <h2 className="font-serif text-xl font-medium">How Rewards Work</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-medium">Earning Points</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                        $1 spent = 1 reward point
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                        Points accumulate with every booking
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                        Points never expire
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">Tier Benefits</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <span className="text-amber-600">●</span>
                        Bronze: Earn points on all bookings
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-slate-400">●</span>
                        Silver (1,000 pts): 10% off sessions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-yellow-500">●</span>
                        Gold (2,500 pts): 15% off sessions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-purple-500">●</span>
                        Platinum (5,000 pts): 20% off sessions
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-border p-6 space-y-6"
            >
              <h2 className="font-serif text-xl font-medium">Security Settings</h2>

              <div className="space-y-4">
                <div>
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Update your password to keep your account secure
                  </p>
                  <Button variant="outline" onClick={() => navigate("/forgot-password")}>
                    Reset Password
                  </Button>
                </div>

                <Separator />

                <div>
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Contact support to delete your account
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AccountSettings;
