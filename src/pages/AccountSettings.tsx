import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, User, Bell, Shield, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import PortfolioUpload from "@/components/advisor/PortfolioUpload";
import ProfilePhotoUpload from "@/components/profile/ProfilePhotoUpload";
import MeetingLocationsManager from "@/components/advisor/MeetingLocationsManager";
import { useAdvisorProfile } from "@/hooks/useAdvisorProfile";
import VisibilityToggle from "@/components/advisor/VisibilityToggle";
import { useProfile } from "@/hooks/useProfile";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
import CategorySelect, { CLIENT_FOCUS_OPTIONS, USE_CASE_OPTIONS, STYLE_CATEGORY_OPTIONS } from "@/components/advisor/CategorySelect";
import LanguageSelect from "@/components/advisor/LanguageSelect";

// Separate component for Security Tab to manage delete account flow
interface SecurityTabProps {
  userId: string | null;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>["toast"];
}

const SecurityTab = ({ userId, navigate, toast }: SecurityTabProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userId) return;
    if (confirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: "Please type DELETE to confirm.",
        variant: "destructive",
      });
      return;
    }
    setIsDeleting(true);

    try {
      // 1. Find profile id
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (pErr) throw pErr;

      // 2. Delete related data (bookings, payments, rewards, withdrawal_requests, advisor_applications)
      // Note: Order matters – delete child rows first
      await supabase.from("disputes").delete().eq("raised_by", userId);
      await supabase.from("user_rewards").delete().eq("user_id", userId);
      await supabase.from("advisor_applications").delete().eq("user_id", userId);
      // Bookings referencing the user as client
      await supabase.from("bookings").delete().eq("client_id", profile.id);
      await supabase.from("availability_slots").delete().eq("advisor_id", profile.id);
      await supabase.from("withdrawal_requests").delete().eq("advisor_id", profile.id);
      // Payments referencing user as client
      // Note: payments cannot be deleted per RLS (for audit), but we'll clear profile anyway
      
      // 3. Anonymize the profile instead of delete (soft-delete)
      await supabase
        .from("profiles")
        .update({
          full_name: "Deleted User",
          email: null,
          bio: null,
          avatar_url: null,
          location: null,
          instagram_url: null,
          portfolio_url: null,
          portfolio_images: [],
          personal_philosophy: null,
          specialty: null,
          is_advisor: false,
          advisor_approved: false,
          demo_availability_enabled: false,
        } satisfies ProfileUpdate)
        .eq("id", profile.id);

      // 4. Sign out
      await supabase.auth.signOut();

      toast({
        title: "Account deleted",
        description: "Your data has been removed and you have been signed out.",
      });
      navigate("/");
    } catch (err) {
      console.error("Delete account error:", err);
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConfirmText("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-border p-6 space-y-6"
    >
      <h2 className="font-serif text-xl font-medium">Security Settings</h2>

      <div className="space-y-4">
        <div>
          <Label>Change Password</Label>
          <p className="text-sm text-muted-foreground mb-3">Update your password to keep your account secure</p>
          <Button variant="outline" onClick={() => navigate("/forgot-password")}>
            Reset Password
          </Button>
        </div>

        <Separator />

        <div>
          <Label className="text-destructive">Delete Account</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            Delete Account
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your profile, bookings, and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label>Type DELETE to confirm</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmText !== "DELETE"}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

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
  price_per_session: number;
  virtual_available: boolean;
  in_person_available: boolean;
  in_person_surcharge: number;
  personal_philosophy: string;
  instagram_url: string;
  portfolio_url: string;
  portfolio_images: string[];
  languages: string[];
  style_tags: string[];
  target_demographics: string[];
  use_cases: string[];
}

const AccountSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const { 
    advisorProfile, 
    completionStatus, 
    pendingBookingsCount, 
    toggleVisibility 
  } = useAdvisorProfile();
  const { roles } = useProfile();

  // Check if user is an advisor - advisors don't see rewards tab
  const isAdvisor = roles.isAdvisor;
  const isApprovedAdvisor = roles.isApprovedAdvisor;

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
        price_per_session: profile.price_per_session,
        virtual_available: profile.virtual_available,
        in_person_available: profile.in_person_available,
        in_person_surcharge: profile.in_person_surcharge ?? 0,
        personal_philosophy: profile.personal_philosophy,
        instagram_url: profile.instagram_url,
        portfolio_url: profile.portfolio_url,
        portfolio_images: profile.portfolio_images,
        languages: profile.languages,
        style_tags: profile.style_tags,
        target_demographics: profile.target_demographics,
        use_cases: profile.use_cases,
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

  // Tabs - rewards tab is removed entirely (clients use dashboard rewards card)
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  // Navigate back to the appropriate dashboard
  const handleBack = () => {
    if (isAdvisor) {
      navigate("/advisor");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <Layout>
      <section className="py-16 bg-card min-h-screen">
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={handleBack}>
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
                <h2 className="font-serif text-xl font-medium">Profile Photo</h2>
                
                {userId && profile && (
                  <ProfilePhotoUpload
                    currentPhotoUrl={profile.avatar_url}
                    userId={userId}
                    profileId={profile.id}
                    userName={profile.full_name}
                    isAdvisor={profile.is_advisor}
                    isListed={advisorProfile?.is_listed ?? false}
                    onPhotoUpdated={(newUrl) => {
                      updateProfile("avatar_url", newUrl);
                    }}
                    size="lg"
                    showGuidance={profile.is_advisor}
                  />
                )}
              </div>

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
                <div className="space-y-6">
                  {/* Visibility Toggle for approved advisors - always show in settings */}
                  {isApprovedAdvisor && (
                    <VisibilityToggle
                      isListed={advisorProfile?.is_listed ?? false}
                      isApproved={isApprovedAdvisor}
                      completionStatus={completionStatus}
                      pendingBookingsCount={pendingBookingsCount}
                      onToggle={toggleVisibility}
                    />
                  )}

                  <div className="bg-background border border-border p-6 space-y-6">
                    <h2 className="font-serif text-xl font-medium">Advisor Settings</h2>

                  {/* Payout Info Box - Hide percentage from advisors */}
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-gold mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Your Earnings</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          The price you set is what clients pay. Your payout is calculated after platform fees are deducted.
                          Funds are released 48 hours after successful sessions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price">Hourly Rate ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={profile?.price_per_session || ""}
                        onChange={(e) => updateProfile("price_per_session", parseInt(e.target.value))}
                      />
                      {profile?.price_per_session && profile.price_per_session > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Your payout: <span className="font-semibold text-green-600">${(profile.price_per_session * 0.85).toFixed(2)}</span> per hour (clients book 1–3 hours per session)
                        </p>
                      )}
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

                    {profile?.in_person_available && (
                      <div className="space-y-4 pl-2 border-l-2 border-border">
                        <div className="space-y-2">
                          <Label htmlFor="surcharge">In-Person Surcharge ($)</Label>
                          <Input
                            id="surcharge"
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={profile?.in_person_surcharge ?? 0}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              updateProfile("in_person_surcharge", v);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Flat fee added to in-person bookings on top of your hourly rate (max $100).
                          </p>
                        </div>
                        <MeetingLocationsManager advisorProfileId={profile?.id ?? null} />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Languages */}
                  <LanguageSelect
                    selected={profile?.languages || []}
                    onChange={(languages) => updateProfile("languages", languages)}
                    required={false}
                  />

                  <Separator />

                  {/* Style Categories, Client Focus & Use Cases */}
                  <div className="space-y-6">
                    <CategorySelect
                      label="Style Categories"
                      description="What style categories best describe your expertise?"
                      options={STYLE_CATEGORY_OPTIONS}
                      selected={profile?.style_tags || []}
                      onChange={(selected) => updateProfile("style_tags", selected)}
                    />

                    <CategorySelect
                      label="Who Do You Style?"
                      description="Select the client groups you specialize in"
                      options={CLIENT_FOCUS_OPTIONS}
                      selected={profile?.target_demographics || []}
                      onChange={(selected) => updateProfile("target_demographics", selected)}
                    />

                    <CategorySelect
                      label="What Occasions Do You Style For?"
                      description="Select the use cases you help clients with"
                      options={USE_CASE_OPTIONS}
                      selected={profile?.use_cases || []}
                      onChange={(selected) => updateProfile("use_cases", selected)}
                    />
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

                  <Separator />

                  {/* Portfolio Photos */}
                  {userId && (
                    <PortfolioUpload
                      userId={userId}
                      currentImages={profile?.portfolio_images || []}
                      onImagesChange={(images) => updateProfile("portfolio_images", images)}
                    />
                  )}

                  <Separator />

                  {/* Earnings Link */}
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-gold mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Earnings & Withdrawals</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            View your earnings, request withdrawals, and track payment history.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => navigate("/advisor/earnings")}>
                        View Earnings
                      </Button>
                    </div>
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

          {/* Security Tab */}
          {activeTab === "security" && (
            <SecurityTab userId={userId} navigate={navigate} toast={toast} />
          )}
        </div>
      </section>
    </Layout>
  );
};

export default AccountSettings;
