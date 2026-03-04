import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdvisorRoute from "@/components/AdvisorRoute";
import Index from "./pages/Index";
import Advisors from "./pages/Advisors";
import AdvisorProfile from "./pages/AdvisorProfile";
import Lookbook from "./pages/Lookbook";
import BecomeAdvisor from "./pages/BecomeAdvisor";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import BookingSuccess from "./pages/BookingSuccess";
import AdvisorAvailability from "./pages/AdvisorAvailability";
import AccountSettings from "./pages/AccountSettings";
import AdvisorEarnings from "./pages/AdvisorEarnings";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import OgPreview from "./pages/OgPreview";
import AdminLookbook from "./pages/admin/AdminLookbook";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminAdvisors from "./pages/admin/AdminAdvisors";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminRewards from "./pages/admin/AdminRewards";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/advisors" element={<Advisors />} />
            <Route path="/advisors/:id" element={<AdvisorProfile />} />
            <Route path="/lookbook" element={<Lookbook />} />
            <Route path="/become-advisor" element={<BecomeAdvisor />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/og-preview" element={<OgPreview />} />
            
            {/* Client Dashboard - Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Advisor Routes - Advisor Protected */}
            <Route path="/advisor" element={
              <AdvisorRoute>
                <AdvisorDashboard />
              </AdvisorRoute>
            } />
            <Route path="/advisor-availability" element={
              <AdvisorRoute>
                <AdvisorAvailability />
              </AdvisorRoute>
            } />
            <Route path="/advisor/earnings" element={
              <AdvisorRoute>
                <AdvisorEarnings />
              </AdvisorRoute>
            } />
            
            {/* General Protected Routes */}
            <Route path="/booking-success" element={
              <ProtectedRoute>
                <BookingSuccess />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/bookings" element={
              <AdminRoute>
                <AdminBookings />
              </AdminRoute>
            } />
            <Route path="/admin/lookbook" element={
              <AdminRoute>
                <AdminLookbook />
              </AdminRoute>
            } />
            <Route path="/admin/advisors" element={
              <AdminRoute>
                <AdminAdvisors />
              </AdminRoute>
            } />
            <Route path="/admin/payments" element={
              <AdminRoute>
                <AdminPayments />
              </AdminRoute>
            } />
            <Route path="/admin/rewards" element={
              <AdminRoute>
                <AdminRewards />
              </AdminRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
