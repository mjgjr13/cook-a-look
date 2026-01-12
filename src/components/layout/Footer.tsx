import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import CookALookLogo from "@/components/CookALookLogo";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg mb-4">Explore</h4>
            <ul className="space-y-3 font-sans text-sm">
              <li>
                <Link
                  to="/advisors"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Style Advisors
                </Link>
              </li>
              <li>
                <Link
                  to="/lookbook"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Lookbook
                </Link>
              </li>
              <li>
                <Link
                  to="/become-advisor"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  Become an Advisor
                </Link>
              </li>
            </ul>
          </div>

          {/* Center - Logo & Tagline */}
          <div className="flex flex-col items-center text-center">
            <CookALookLogo size="lg" className="mb-3 invert" />
            <p className="text-sm tracking-[0.2em] uppercase text-primary-foreground/80">
              The Recipe to Dressing Well
            </p>
          </div>

          {/* Contact */}
          <div className="md:text-right">
            <h4 className="font-serif text-lg mb-4">Contact Us</h4>
            <a
              href="mailto:info@cookalook.com"
              className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors font-sans text-sm mb-6 md:justify-end"
            >
              <Mail size={16} />
              info@cookalook.com
            </a>
            <div className="flex gap-4 md:justify-end">
              <a
                href="https://www.instagram.com/cookalookofficial?igsh=amNzdmFiM2JzZmF3&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center">
          <p className="font-sans text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} Cook a Look. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
