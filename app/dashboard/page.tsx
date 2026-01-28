"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useProfile } from "@/hooks/use-profile"
import { Calendar, Star, Clock, Settings, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { profile, isLoading: profileLoading } = useProfile()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin?redirect=/dashboard")
    }
  }, [user, authLoading, router])

  if (authLoading || profileLoading) {
    return (
      <LayoutWrapper>
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutWrapper>
    )
  }

  if (!user) {
    return null
  }

  return (
    <LayoutWrapper>
      <section className="py-16 bg-card min-h-[80vh]">
        <div className="container mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="font-serif text-3xl md:text-4xl font-medium mb-2">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="font-sans text-muted-foreground">
              Manage your bookings and discover new style advisors
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card rounded-full border border-border">
                      <Calendar className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Upcoming Sessions</CardTitle>
                      <CardDescription className="font-sans">Your scheduled consultations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-muted-foreground mb-4">
                    No upcoming sessions scheduled.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/advisors">Book a Session</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card rounded-full border border-border">
                      <Clock className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Past Sessions</CardTitle>
                      <CardDescription className="font-sans">Your consultation history</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-muted-foreground mb-4">
                    No past sessions yet.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/advisors">Find an Advisor</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-card rounded-full border border-border">
                      <Star className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <CardTitle className="font-serif text-lg">Favorite Advisors</CardTitle>
                      <CardDescription className="font-sans">Advisors you've saved</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-sans text-sm text-muted-foreground mb-4">
                    No favorite advisors yet.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/advisors">Browse Advisors</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card rounded-full border border-border">
                    <Settings className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-lg">Account Settings</CardTitle>
                    <CardDescription className="font-sans">Manage your profile and preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">Go to Settings</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </LayoutWrapper>
  )
}
