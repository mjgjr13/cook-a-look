import { Link, useNavigate } from "react-router-dom";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentRole === "advisor" ? (
            <>
              <Briefcase className="w-4 h-4" />
              Advisor View
            </>
          ) : (
            <>
              <Users className="w-4 h-4" />
              Client View
            </>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => navigate("/dashboard")}
          className={currentRole === "client" ? "bg-accent" : ""}
        >
          <Users className="w-4 h-4 mr-2" />
          Client Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => navigate("/advisor")}
          className={currentRole === "advisor" ? "bg-accent" : ""}
        >
          <Briefcase className="w-4 h-4 mr-2" />
          Advisor Dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSwitcher;
