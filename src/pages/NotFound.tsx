import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: no route for", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <Seo title="Page Not Found | Cook A Look" description="This page doesn't exist." path={location.pathname} noindex />
      <section className="flex min-h-[70vh] items-center justify-center bg-card px-4">
        <div className="text-center max-w-md">
          <p className="text-gold font-sans text-sm tracking-[0.3em] uppercase mb-4">404</p>
          <h1 className="font-serif text-4xl font-medium mb-4">We couldn't find that page</h1>
          <p className="font-sans text-muted-foreground mb-8">
            The link may be old or mistyped. Here are some good places to pick up from.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" asChild>
              <Link to="/advisors">Find an Advisor</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Go to Homepage</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
