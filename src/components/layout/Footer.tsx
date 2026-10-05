import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import CookALookLogo from "@/components/CookALookLogo";

const INSTAGRAM_URL = "https://www.instagram.com/cookalookofficial";

const linkClass = "text-primary-foreground/75 hover:text-primary-foreground transition-colors";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-12 md:items-start">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <CookALookLogo size="md" variant="light" />
            <p className="mt-2 text-xs tracking-[0.2em] uppercase text-primary-foreground/60">
              The Recipe to Dressing Well
            </p>
          </div>

          {/* Explore */}
          <nav aria-label="Explore" className="md:col-span-3">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-3">Explore</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/advisors" className={linkClass}>Style Advisors</Link></li>
              <li><Link to="/ai-concierge" className={linkClass}>AI Concierge</Link></li>
              <li><Link to="/become-advisor" className={linkClass}>Become an Advisor</Link></li>
              <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal" className="md:col-span-2">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-3">Legal</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className={linkClass}>Terms of Use</Link></li>
              <li><Link to="/privacy" className={linkClass}>Privacy Policy</Link></li>
            </ul>
          </nav>

          {/* Contact */}
          <div className="col-span-2 md:col-span-3 md:text-right">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-3">Contact</h2>
            <a href="mailto:info@cookalook.com" className={`inline-flex items-center gap-2 text-sm ${linkClass}`}>
              <Mail size={15} aria-hidden="true" />
              info@cookalook.com
            </a>
            <div className="mt-3 flex md:justify-end">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="Cook A Look on Instagram">
                <Instagram size={19} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/15 pt-5">
          <p className="text-xs text-primary-foreground/50">© {new Date().getFullYear()} Cook A Look. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
