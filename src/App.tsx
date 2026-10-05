import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdvisorRoute from "@/components/AdvisorRoute";
import Index from "./pages/Index";
import Advisors from "./pages/Advisors";
import AdvisorProfile from "./pages/AdvisorProfile";
const BecomeAdvisor = lazy(() => import("./pages/BecomeAdvisor"));
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdvisorDashboard = lazy(() => import("./pages/AdvisorDashboard"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const AdvisorAvailability = lazy(() => import("./pages/AdvisorAvailability"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const AdvisorEarnings = lazy(() => import("./pages/AdvisorEarnings"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
import NotFound from "./pages/NotFound";
const OgPreview = lazy(() => import("./pages/OgPreview"));
const Brand = lazy(() => import("./pages/Brand"));
const AIConcierge = lazy(() => import("./pages/StyleConcierge"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminAdvisors = lazy(() => import("./pages/admin/AdminAdvisors"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminRewards = lazy(() => import("./pages/admin/AdminRewards"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));
const AdminCancellations = lazy(() => import("./pages/admin/AdminCancellations"));
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
          {/* Less-visited pages (dashboards, admin, legal, advisor signup) load on demand to keep the first page load small. */}
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/advisors" element={<Advisors />} />
            <Route path="/advisors/:id" element={<AdvisorProfile />} />
            <Route path="/ai-concierge" element={<AIConcierge />} />
            {/* Older names for the AI Concierge */}
            <Route path="/style-concierge" element={<Navigate to="/ai-concierge" replace />} />
            <Route path="/lookbook" element={<Navigate to="/ai-concierge" replace />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/become-advisor" element={<BecomeAdvisor />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/brand" element={<Brand />} />
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
            <Route path="/admin/disputes" element={
              <AdminRoute>
                <AdminDisputes />
              </AdminRoute>
            } />
            <Route path="/admin/cancellations" element={
              <AdminRoute>
                <AdminCancellations />
              </AdminRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
