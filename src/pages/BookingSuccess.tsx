import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Video, ArrowRight, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Validate Stripe checkout session ID format
const isValidStripeSessionId = (id: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  // Stripe checkout session IDs start with 'cs_' followed by alphanumeric characters
  return /^cs_[a-zA-Z0-9_]{10,}$/.test(id);
};

const BookingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<{
    bookingId: string;
    totalPaid: number;
    taxPaid: number;
  } | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      // Validate session ID format before making API call
      if (!isValidStripeSessionId(sessionId)) {
        toast({
          title: "Invalid session",
          description: "The payment session is invalid or expired.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });

        if (error) throw error;

        setBookingDetails(data);

        // Send confirmation emails
        if (data.bookingId) {
          await supabase.functions.invoke("send-booking-confirmation", {
            body: { bookingId: data.bookingId },
          });
        }

        toast({
          title: "Booking confirmed!",
          description: "Check your email for confirmation details.",
        });
      } catch (error) {
        console.error("Verification error:", error);
        toast({
          title: "Verification issue",
          description: "Your payment was received. Please check your email for details.",
          variant: "destructive",
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate, toast]);

  if (isVerifying) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Confirming your booking...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-24 bg-card min-h-[70vh] flex items-center">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="mb-8">
              <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
              <h1 className="font-serif text-4xl md:text-5xl font-medium mb-4">
                Booking Confirmed
              </h1>
              <p className="text-muted-foreground text-lg">
                Your style consultation has been successfully booked.
              </p>
            </div>

            {bookingDetails && (
              <div className="bg-background border border-border p-8 mb-8">
                <h3 className="font-serif text-xl mb-6">Payment Summary</h3>
                <div className="space-y-3 text-left">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="font-medium">
                      ${(bookingDetails.totalPaid - bookingDetails.taxPaid).toFixed(2)}
                    </span>
                  </div>
                  {bookingDetails.taxPaid > 0 && (
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">${bookingDetails.taxPaid.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-medium">
                    <span>Total Paid</span>
                    <span>${bookingDetails.totalPaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-secondary/50 border border-border p-6 mb-8">
              <h3 className="font-serif text-lg mb-3">What's Next?</h3>
              <ul className="text-left space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-primary" />
                  <span>Check your email for a calendar invite with session details</span>
                </li>
                <li className="flex items-start gap-3">
                  <Video className="w-5 h-5 mt-0.5 text-primary" />
                  <span>Join the video call at your scheduled time from your dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 mt-0.5 text-primary" />
                  <span>Your payment is held in escrow for 48 hours after the session</span>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 mt-0.5 text-primary" />
                  <span>If something goes wrong, open a dispute within 48 hours for a full refund review</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/advisors">Browse More Advisors</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default BookingSuccess;
