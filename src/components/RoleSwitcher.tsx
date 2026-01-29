// RoleSwitcher component removed - role-based routing is now strict
// Admins only see admin dashboard
// Advisors only see advisor dashboard  
// Clients only see client dashboard
// No cross-role view switching allowed

const RoleSwitcher = () => {
  // This component is deprecated and returns null
  // Role navigation is now handled directly in the layout/navbar
  return null;
};

export default RoleSwitcher;
