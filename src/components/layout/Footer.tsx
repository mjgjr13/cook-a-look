import { Link } from "react-router-dom";
import { Instagram, Facebook, Twitter, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <h3 className="font-serif text-2xl font-semibold">Cook a Look</h3>
              <p className="text-xs tracking-[0.3em] uppercase text-primary-foreground/70">
                The Recipe to Dressing Well
              </p>
            </Link>
            <p className="text-primary-foreground/80 font-sans text-sm max-w-md leading-relaxed">
              Connecting you with world-class style advisors to transform your
              wardrobe and elevate your personal style.
            </p>
          </div>

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

          {/* Contact */}
          <div>
            <h4 className="font-serif text-lg mb-4">Contact Us</h4>
            <a
              href="mailto:hello@cookalook.com"
              className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground transition-colors font-sans text-sm mb-6"
            >
              <Mail size={16} />
              hello@cookalook.com
            </a>
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/80 hover:text-gold transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
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
