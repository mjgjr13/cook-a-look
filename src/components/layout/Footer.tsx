import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border py-16">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img 
                src={logo} 
                alt="Cook a Look" 
                className="h-8 w-auto"
              />
            </Link>
            <p className="text-muted-foreground font-sans text-sm max-w-sm leading-relaxed">
              Connecting you with world-class style advisors to transform your
              wardrobe and elevate your personal style.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">Explore</h4>
            <ul className="space-y-3 font-sans text-sm">
              <li>
                <Link
                  to="/advisors"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Style Advisors
                </Link>
              </li>
              <li>
                <Link
                  to="/lookbook"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lookbook
                </Link>
              </li>
              <li>
                <Link
                  to="/become-advisor"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Become an Advisor
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-sans text-sm font-medium mb-4 text-foreground">Contact</h4>
            <a
              href="mailto:hello@cookalook.com"
              className="text-muted-foreground hover:text-foreground transition-colors font-sans text-sm"
            >
              hello@cookalook.com
            </a>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <p className="font-sans text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cook a Look. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
