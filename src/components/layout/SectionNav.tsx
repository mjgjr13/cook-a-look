import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Section {
  label: string;
  to: string;
  end?: boolean;
}

const ADMIN_SECTIONS: Section[] = [
  { label: "Overview", to: "/admin", end: true },
  { label: "Advisors", to: "/admin/advisors" },
  { label: "Bookings", to: "/admin/bookings" },
  { label: "Payments", to: "/admin/payments" },
  { label: "Cancellations", to: "/admin/cancellations" },
  { label: "Disputes", to: "/admin/disputes" },
  { label: "Rewards", to: "/admin/rewards" },
];

const ADVISOR_SECTIONS: Section[] = [
  { label: "Dashboard", to: "/advisor", end: true },
  { label: "Availability", to: "/advisor-availability" },
  { label: "Earnings", to: "/advisor/earnings" },
  { label: "Settings", to: "/settings" },
];

const sectionsFor = (path: string): { title: string; sections: Section[] } | null => {
  if (path === "/admin" || path.startsWith("/admin/")) return { title: "Admin", sections: ADMIN_SECTIONS };
  if (path === "/advisor" || path.startsWith("/advisor/") || path === "/advisor-availability")
    return { title: "Advisor", sections: ADVISOR_SECTIONS };
  return null;
};

/**
 * Persistent sub-navigation for the admin area and the advisor workspace, so
 * every page in a section is one click away (replaces per-page "Back" links).
 */
const SectionNav = () => {
  const { pathname } = useLocation();
  const config = sectionsFor(pathname);
  if (!config) return null;

  return (
    <nav aria-label={`${config.title} sections`} className="border-b border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="-mb-px flex gap-6 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none]">
          {config.sections.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                end={s.end}
                className={({ isActive }) =>
                  cn(
                    "inline-block border-b-2 py-3.5 transition-colors",
                    isActive
                      ? "border-foreground font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {s.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default SectionNav;
