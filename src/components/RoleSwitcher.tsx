import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Briefcase, ChevronDown } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: "client" | "advisor";
}

const RoleSwitcher = ({ currentRole }: RoleSwitcherProps) => {
  const navigate = useNavigate();

  // Only show switcher for advisors who can switch between views
  // Clients cannot switch to advisor view - they must apply first
  if (currentRole === "client") {
    // On client dashboard, show option to go to advisor dashboard
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => navigate("/advisor")}
      >
        <Briefcase className="w-4 h-4" />
        Advisor Dashboard
      </Button>
    );
  }

  // On advisor dashboard, show option to switch to client view
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Briefcase className="w-4 h-4" />
          Advisor View
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => navigate("/dashboard")}
        >
          <Users className="w-4 h-4 mr-2" />
          Switch to Client View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
