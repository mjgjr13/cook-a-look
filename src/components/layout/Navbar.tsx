import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, Settings, LogOut, LayoutDashboard, Shield, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CookALookLogo from "@/components/CookALookLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, signOut } = useAuth();
  const { profile, roles } = useProfile();

  const navLinks = [
    { name: "Style Advisors", path: "/advisors" },
    { name: "Lookbook", path: "/lookbook" },
    { name: "Become an Advisor", path: "/become-advisor" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Determine default dashboard based on role
  const defaultDashboard = roles.isAdvisor ? "/advisor" : "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center text-foreground">
            <CookALookLogo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm tracking-wide font-sans transition-colors duration-200 ${
                  isActive(link.path) ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons / User Menu */}
          <div className="hidden lg:flex items-center gap-4">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(profile?.full_name || null)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {/* Dashboard link - route based on role */}
                  <DropdownMenuItem asChild>
                    <Link to={defaultDashboard} className="cursor-pointer flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Show advisor dashboard option for advisors currently in client view */}
                  {roles.isAdvisor && location.pathname === "/dashboard" && (
                    <DropdownMenuItem asChild>
                      <Link to="/advisor" className="cursor-pointer flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Advisor Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  {roles.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: Avatar or Sign In + Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(profile?.full_name || null)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={defaultDashboard}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  {roles.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !isLoading ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
            ) : null}
            <button className="p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="container mx-auto px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block py-2 text-lg font-sans ${
                    isActive(link.path) ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {!user && (
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <Button variant="ghost" asChild>
                    <Link to="/signin" onClick={() => setIsOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/signup" onClick={() => setIsOpen(false)}>
                      Create Account
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
